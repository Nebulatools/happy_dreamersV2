import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { isObjectIdHex, toObjectId } from '@/src/domain/object-id'
import { canGenerateProgression, defaultWindow, markSupersededPreviousPlans } from '@/core-v3/domain/plan-engine'
import { PlansRepo } from '@/core-v3/infra/repos/plans.repo'
import { CONF } from '@/core-v3/config'
import { EventsRepo } from '@/core-v3/infra/repos/events.repo'
import { PlanLLMService } from '@/core-v3/infra/llm/plan-llm-service'
import { getLLM } from '@/core-v3/infra/llm'
import { computeInitialEligibility } from '@/core-v3/domain/eligibility'
import { planOutputSchema } from '@/core-v3/domain/plan-output-schema'
import { PLAN_SCHEMA } from '@/core-v3/domain/plan-schema'
import { derivePlanPolicy } from '@/lib/plan-policies'
import { getMongoDBVectorStoreManager } from '@/lib/rag/vector-store-mongodb'

function toLegacyPlanVersion(planNumber: number, planVersion: number): string {
  if (planNumber <= 0) return planVersion === 0 ? '0' : `0.${planVersion}`
  return planVersion === 0 ? String(planNumber) : `${planNumber}.${planVersion}`
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (typeof item === 'string') return item.trim()
      if (item && typeof item === 'object') {
        if (typeof (item as any).description === 'string') return (item as any).description.trim()
        if (typeof (item as any).action === 'string') return (item as any).action.trim()
      }
      return typeof item === 'number' ? String(item) : ''
    })
    .filter(Boolean)
}

function now() {
  return new Date()
}

function calcAgeInMonths(birth: unknown, reference: Date): number | undefined {
  if (!birth) return undefined
  const date = birth instanceof Date ? birth : new Date(birth as any)
  if (!(date instanceof Date) || isNaN(date.getTime())) return undefined
  const years = reference.getUTCFullYear() - date.getUTCFullYear()
  const months = reference.getUTCMonth() - date.getUTCMonth()
  let total = years * 12 + months
  if (reference.getUTCDate() < date.getUTCDate()) total -= 1
  return total >= 0 ? total : undefined
}

function normalizeSchedule(raw: any) {
  if (!raw || typeof raw !== 'object') {
    return { bedtime: '', wakeTime: '', meals: [], activities: [], naps: [] }
  }
  const meals = Array.isArray(raw.meals)
    ? raw.meals.map((meal: any) => ({
        time: typeof meal?.time === 'string' ? meal.time : '',
        type: typeof meal?.type === 'string' ? meal.type : 'comida',
        description: typeof meal?.description === 'string' ? meal.description : '',
      }))
    : []
  const activities = Array.isArray(raw.activities)
    ? raw.activities.map((activity: any) => ({
        time: typeof activity?.time === 'string' ? activity.time : '',
        activity: typeof activity?.activity === 'string' ? activity.activity : 'Actividad',
        duration: typeof activity?.duration === 'number' ? activity.duration : 0,
        description: typeof activity?.description === 'string' ? activity.description : '',
      }))
    : []
  const naps = Array.isArray(raw.naps)
    ? raw.naps.map((nap: any) => ({
        time: typeof nap?.time === 'string' ? nap.time : '',
        duration: typeof nap?.duration === 'number' ? nap.duration : 0,
        description: typeof nap?.description === 'string' ? nap.description : '',
      }))
    : []
  return {
    bedtime: typeof raw.bedtime === 'string' ? raw.bedtime : '',
    wakeTime: typeof raw.wakeTime === 'string' ? raw.wakeTime : '',
    meals,
    activities,
    naps,
  }
}

function normalizeLegacyPlanDoc(plan: any) {
  const normalized: any = { ...plan }
  normalized.schedule = normalizeSchedule(plan?.schedule)
  normalized.objectives = normalizeStringArray(plan?.objectives)
  normalized.recommendations = normalizeStringArray(plan?.recommendations)
  if (!Array.isArray(normalized.objectives)) normalized.objectives = []
  if (!Array.isArray(normalized.recommendations)) normalized.recommendations = []
  if (!normalized.sourceData || typeof normalized.sourceData !== 'object') {
    normalized.sourceData = { totalEvents: 0, surveyDataUsed: false, childStatsUsed: false, ragSources: [] }
  } else {
    normalized.sourceData = {
      ...normalized.sourceData,
      totalEvents: typeof normalized.sourceData.totalEvents === 'number' ? normalized.sourceData.totalEvents : Number(normalized.sourceData.eventCount ?? 0),
      surveyDataUsed: Boolean(normalized.sourceData.surveyDataUsed),
      childStatsUsed: Boolean(normalized.sourceData.childStatsUsed),
      ragSources: Array.isArray(normalized.sourceData.ragSources) ? normalized.sourceData.ragSources : [],
    }
  }
  return normalized
}

type SurveyFacts = {
  bedtimeIntent?: string
  bedtimeRoutine?: string
  sleepLocation?: string
  mealSchedule: string[]
  sleepGoals: string[]
  concerns?: string
  expectations?: string
  additionalNotes?: string
  napInfo: {
    doesNap: boolean
    count?: number
    durationMinutes?: number
    typicalTimes: string[]
  }
}

type WeakStats = {
  avgBedtime?: string
  napStats: {
    count: number
    typicalTime?: string
    avgDuration?: number
  }
  feedingStats: {
    times: string[]
  }
}

function sanitizeErrorMessage(message: unknown): string {
  const raw = typeof message === 'string' ? message : (message && typeof message === 'object' ? (message as any).message || JSON.stringify(message) : String(message))
  const apiKey = process.env.OPENAI_API_KEY
  if (apiKey) {
    const escaped = apiKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return raw.replace(new RegExp(escaped, 'g'), '[redacted]')
  }
  return raw
}

function normalizeTimeValue(input?: string | null): string | undefined {
  if (!input || typeof input !== 'string') return undefined
  const text = input.trim()
  const match = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
  if (!match) return undefined
  let hour = parseInt(match[1], 10)
  const minute = match[2] ? parseInt(match[2], 10) : 0
  const suffix = match[3]?.toLowerCase()
  if (suffix === 'pm' && hour < 12) hour += 12
  if (suffix === 'am' && hour === 12) hour = 0
  hour = Math.max(0, Math.min(23, hour))
  const mm = Math.max(0, Math.min(59, minute))
  return `${String(hour).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

function extractTimesFromString(input?: unknown): string[] {
  if (!input) return []
  const asString = Array.isArray(input) ? input.join(', ') : String(input)
  const times = new Set<string>()
  const regex = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/gi
  let match: RegExpExecArray | null
  while ((match = regex.exec(asString)) !== null) {
    const candidate = match[0]
    const normalized = normalizeTimeValue(candidate)
    if (normalized) times.add(normalized)
  }
  return Array.from(times)
}

function extractSurveyFacts(rawSurvey: any): SurveyFacts {
  const survey = rawSurvey && typeof rawSurvey === 'object' ? rawSurvey : {}
  const rutina = survey.rutinaHabitos || survey.sleep_routine || {}
  const alimentacion = survey.alimentacion || survey.nutricion || {}
  const preocupaciones = survey.preocupacionesObjetivos || {}

  const goalsRaw = survey.sleep_goals ?? rutina.objetivosPadres ?? preocupaciones.objetivoPrincipal ?? ''
  const sleepGoals = Array.isArray(goalsRaw)
    ? goalsRaw.filter(Boolean).map((g) => String(g).trim()).filter(Boolean)
    : typeof goalsRaw === 'string'
      ? goalsRaw
          .split(/\n|\r|\.|;/)
          .map((g) => g.trim())
          .filter(Boolean)
      : []

  const mealSchedule = [
    ...extractTimesFromString(alimentacion.horarioComidas),
    ...extractTimesFromString(rutina.horarioComidas),
  ]

  const napInfo = {
    doesNap: Boolean(rutina.haceSiestas ?? (survey.sleep_routine?.naps === 'yes')), 
    count: typeof rutina.numeroSiestas === 'number' ? rutina.numeroSiestas : undefined,
    durationMinutes: typeof rutina.duracionSiestasMinutos === 'number' ? rutina.duracionSiestasMinutos : undefined,
    typicalTimes: extractTimesFromString(rutina.horarioSiestas || rutina.horarioSiesta || rutina.diaTypico),
  }

  return {
    bedtimeIntent: rutina.horaDormir || survey.goal_bedtime || survey.sleep_schedule?.targetBedtime,
    bedtimeRoutine: rutina.rutinaAntesAcostarse || rutina.metodosRelajarse,
    sleepLocation: rutina.dondeDuermeNoche || rutina.dondeDuermeSiestas || survey.sleep_location,
    mealSchedule,
    sleepGoals,
    concerns: typeof preocupaciones.principalPreocupacion === 'string' ? preocupaciones.principalPreocupacion.trim() : undefined,
    expectations: typeof preocupaciones.expectativas === 'string' ? preocupaciones.expectativas.trim() : undefined,
    additionalNotes: typeof (rutina.informacionAdicional || survey.additional_info) === 'string'
      ? (rutina.informacionAdicional || survey.additional_info)
      : undefined,
    napInfo,
  }
}

function surveyToFacts(facts: SurveyFacts): string {
  const lines: string[] = []
  if (facts.bedtimeIntent) lines.push(`Hora objetivo para dormir: ${facts.bedtimeIntent}`)
  if (facts.bedtimeRoutine) lines.push(`Rutina antes de acostarse: ${facts.bedtimeRoutine}`)
  if (facts.sleepLocation) lines.push(`Lugar donde duerme por la noche: ${facts.sleepLocation}`)
  lines.push(
    facts.napInfo.doesNap
      ? `Siestas reportadas: ${facts.napInfo.count ?? 'al menos 1'} siesta(s) de aproximadamente ${facts.napInfo.durationMinutes ?? 60} minutos.`
      : 'Padres indican que actualmente no realiza siestas.'
  )
  if (facts.napInfo.typicalTimes.length) {
    lines.push(`Horarios aproximados de siestas en encuesta: ${facts.napInfo.typicalTimes.join(', ')}`)
  }
  if (facts.mealSchedule.length) {
    lines.push(`Horarios de comidas registrados: ${facts.mealSchedule.join(', ')}`)
  }
  if (facts.sleepGoals.length) {
    lines.push(`Metas de la familia: ${facts.sleepGoals.join(' | ')}`)
  }
  if (facts.concerns) lines.push(`Preocupación principal: ${facts.concerns}`)
  if (facts.expectations) lines.push(`Expectativas declaradas: ${facts.expectations}`)
  if (facts.additionalNotes) lines.push(`Notas adicionales: ${facts.additionalNotes}`)
  return lines.join('\n')
}

function weakStatsFromSurvey(facts: SurveyFacts): WeakStats {
  const avgBedtime = normalizeTimeValue(facts.bedtimeIntent)
  const napStats = {
    count: facts.napInfo.doesNap ? (facts.napInfo.count ?? 1) : 0,
    typicalTime: facts.napInfo.typicalTimes[0],
    avgDuration: facts.napInfo.durationMinutes,
  }
  return {
    avgBedtime,
    napStats,
    feedingStats: {
      times: facts.mealSchedule,
    },
  }
}

function formatWeakStatsForPrompt(stats: WeakStats): string {
  const items: string[] = []
  items.push(`Hora objetivo derivada de encuesta: ${stats.avgBedtime || 'no especificada; propone una ventana razonable (19:30-20:30) sin forzar.'}`)
  items.push(
    stats.napStats.count > 0
      ? `Siestas planeadas: ${stats.napStats.count} posibles siesta(s) cerca de ${stats.napStats.typicalTime || '13:00'} con duración aproximada ${stats.napStats.avgDuration ?? 90} min.`
      : 'Padres reportan que no hay siestas planificadas actualmente.'
  )
  items.push(
    stats.feedingStats.times.length
      ? `Horarios de comidas proporcionados: ${stats.feedingStats.times.join(', ')}`
      : 'No se proporcionaron horarios de comida específicos en la encuesta.'
  )
  return items.join('\n- ')
}

function truncate(text: string, max = 400): string {
  if (text.length <= max) return text
  return text.slice(0, max) + '…'
}

async function fetchPlanRag(ageInMonths: number | undefined): Promise<{ source: string; content: string }[]> {
  try {
    const manager = getMongoDBVectorStoreManager()
    const queryAge = typeof ageInMonths === 'number' && Number.isFinite(ageInMonths)
      ? `recomendaciones sueño infantil ${ageInMonths} meses plan inicial`
      : 'recomendaciones sueño infantil plan inicial'
    const docs = await manager.searchSimilar(queryAge, 3)
    return docs.map((doc: any) => ({
      source: doc.metadata?.source || doc.metadata?.title || 'vector_document',
      content: truncate(doc.pageContent || '')
    }))
  } catch (error) {
    console.warn('plan0_rag_fetch_failed', sanitizeErrorMessage(error))
    return []
  }
}

async function generatePlanFromSurvey(params: {
  child: any
  surveyData: any
  ageInMonths?: number
}): Promise<{ plan: any; ragSources: string[]; facts: SurveyFacts; weakStats: WeakStats }> {
  const { child, surveyData, ageInMonths } = params
  const facts = extractSurveyFacts(surveyData)
  const weakStats = weakStatsFromSurvey(facts)
  const ragEntries = await fetchPlanRag(ageInMonths)
  const ragSources = ragEntries.map((entry) => entry.source)

  const ragBlock = ragEntries.length
    ? `CONOCIMIENTO ESPECIALIZADO:\n${ragEntries
        .map((entry) => `Fuente: ${entry.source}\nContenido: ${entry.content}`)
        .join("\n\n---\n\n")}`
    : 'SIN RAG DISPONIBLE: utiliza guías generales basadas en buenas prácticas pediátricas.'

  const policy = derivePlanPolicy({ ageInMonths: typeof ageInMonths === 'number' ? ageInMonths : null })
  const systemPrompt = `Eres la Dra. Mariana, especialista en sueño pediátrico. Genera planes iniciales personalizados solo con la información provista.\n\nREGLAS CLAVE:\n- Devuelve ÚNICAMENTE un JSON válido que cumpla el esquema PlanSchema.\n- No inventes datos inexistentes. Si falta información, propon alternativas claras para los padres.\n- Usa horarios "naturales" (ej. 19:45) y prioriza un primer paso suave.\n- Para comidas, si la encuesta no proporciona horarios, omítelas o marca que son opcionales; jamás inventes horarios nuevos.\n- Mantén objetivos y recomendaciones accionables y medibles.`

  const policyPrompt = `POLÍTICAS CLÍNICAS POR EDAD:\n- Siestas: ${policy.napTransition.note}\n- Destete nocturno: ${policy.nightWeaning.note}`

  const surveyFactsText = surveyToFacts(facts)
  const weakStatsText = formatWeakStatsForPrompt(weakStats)

  const childSummary = `Contexto del paciente:\n- Nombre: ${child.firstName || 'Paciente'}\n- Edad aproximada: ${typeof ageInMonths === 'number' ? `${ageInMonths} meses` : 'No especificada'}\n- Lugar donde duerme actualmente: ${facts.sleepLocation || 'No especificado'}\n\nDatos de la encuesta:\n${surveyFactsText ? surveyFactsText : 'Sin detalles adicionales en la encuesta.'}\n\nEstadísticas derivadas (sin eventos registrados):\n- ${weakStatsText}\n\n${ragBlock}`

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('llm_misconfigured')
  }

  const model = process.env.HD_PLAN_LLM_MODEL || 'gpt-4o-mini'
  const baseURL = process.env.HD_OPENAI_BASE_URL
  const temperature = Number.isFinite(Number(process.env.HD_PLAN_LLM_TEMPERATURE)) ? Number(process.env.HD_PLAN_LLM_TEMPERATURE) : 0.2
  const maxTokens = Number.isFinite(Number(process.env.HD_PLAN_LLM_MAX_TOKENS)) ? Number(process.env.HD_PLAN_LLM_MAX_TOKENS) : 2000

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const OpenAI = require('openai')
  const client = new OpenAI({ apiKey, baseURL })

  let planPayload: any = null
  let rawResponse = ''

  try {
    if (client.responses && typeof client.responses.create === 'function') {
      const response = await client.responses.create({
        model,
        temperature,
        max_output_tokens: maxTokens,
        input: [
          { role: 'system', content: systemPrompt },
          { role: 'system', content: policyPrompt },
          { role: 'user', content: childSummary },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'PlanSchema',
            schema: PLAN_SCHEMA,
            strict: true,
          },
        },
      })
      const content = response?.output?.[0]?.content?.find((chunk: any) => chunk.type === 'output_text')?.text
        || response?.output?.[0]?.content?.find((chunk: any) => chunk.type === 'json_schema')?.text
      if (content) {
        rawResponse = typeof content === 'string' ? content : JSON.stringify(content)
        planPayload = JSON.parse(rawResponse)
      }
    }

    if (!planPayload) {
      const completion = await client.chat.completions.create({
        model,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'system', content: policyPrompt },
          { role: 'user', content: `${childSummary}\n\nDevuelve únicamente el JSON.` },
        ],
        response_format: { type: 'json_object' },
      })
      rawResponse = completion.choices?.[0]?.message?.content || ''
      planPayload = rawResponse ? JSON.parse(rawResponse) : null
    }
  } catch (error) {
    console.warn('plan0_survey_llm_error', sanitizeErrorMessage(error))
  }

  if (!planPayload || typeof planPayload !== 'object') {
    // Fallback a plan mínimo basado en encuesta
    const fallbackMeals = weakStats.feedingStats.times.map((time) => ({
      time,
      type: 'comida',
      description: 'Horario habitual reportado por la familia.'
    }))
    const fallbackNaps = weakStats.napStats.count > 0
      ? [{
          time: weakStats.napStats.typicalTime || '13:00',
          duration: weakStats.napStats.avgDuration || 90,
          description: 'Siesta propuesta según edad y rutina familiar.'
        }]
      : []

    planPayload = {
      planType: 'initial',
      title: `Plan inicial para ${child.firstName || 'el niño'}`,
      summary: 'Plan generado a partir de la encuesta familiar (sin eventos registrados).',
      schedule: {
        bedtime: weakStats.avgBedtime || '20:30',
        wakeTime: '07:00',
        meals: fallbackMeals,
        activities: [],
        naps: fallbackNaps,
      },
      objectives: facts.sleepGoals.length
        ? facts.sleepGoals
        : ['Establecer una rutina de sueño consistente basada en la información de la encuesta.'],
      recommendations: [
        policy.summary || 'Inicia con ajustes suaves y consistentes para consolidar el sueño nocturno.',
        facts.sleepLocation ? `Mantén ${facts.sleepLocation} como entorno principal y consistente.` : 'Asegura un ambiente oscuro, tranquilo y con temperatura agradable.',
      ],
      metrics: {
        eventCount: 0,
        distinctTypes: 0,
        byType: {},
        ageInMonths: typeof ageInMonths === 'number' ? ageInMonths : undefined,
      },
      metadata: { ragSources },
    }
  }

  planPayload.planType = 'initial'
  planPayload.title = planPayload.title || `Plan inicial para ${child.firstName || 'el niño'}`
  planPayload.summary = planPayload.summary || 'Plan diseñado a partir de la encuesta familiar.'
  planPayload.schedule = planPayload.schedule || {}
  planPayload.schedule.meals = Array.isArray(planPayload.schedule.meals) ? planPayload.schedule.meals : []
  planPayload.schedule.activities = Array.isArray(planPayload.schedule.activities) ? planPayload.schedule.activities : []
  planPayload.schedule.naps = Array.isArray(planPayload.schedule.naps) ? planPayload.schedule.naps : []
  planPayload.schedule.bedtime = planPayload.schedule.bedtime || weakStats.avgBedtime || '20:30'
  planPayload.schedule.wakeTime = planPayload.schedule.wakeTime || '07:00'
  planPayload.objectives = Array.isArray(planPayload.objectives) && planPayload.objectives.length > 0
    ? planPayload.objectives
    : (facts.sleepGoals.length ? facts.sleepGoals : ['Establecer rutina de sueño consistente.'])
  planPayload.recommendations = Array.isArray(planPayload.recommendations) && planPayload.recommendations.length > 0
    ? planPayload.recommendations
    : [policy.summary || 'Aplicar ajustes graduales conforme a la edad.']
  planPayload.metrics = planPayload.metrics || {
    eventCount: 0,
    distinctTypes: 0,
    byType: {},
    ageInMonths: typeof ageInMonths === 'number' ? ageInMonths : undefined,
  }
  if (!planPayload.metrics.byType) planPayload.metrics.byType = {}
  planPayload.metrics.eventCount = 0
  planPayload.metrics.distinctTypes = 0
  if (typeof ageInMonths === 'number') planPayload.metrics.ageInMonths = ageInMonths
  planPayload.metadata = {
    ...(planPayload.metadata || {}),
    ragSources,
    rawResponse: rawResponse || undefined,
    generation: 'survey_only',
  }

  const parsed = planOutputSchema.safeParse(planPayload)
  if (!parsed.success) {
    throw new Error('plan_generation_invalid')
  }

  return { plan: parsed.data, ragSources, facts, weakStats }
}

// GET /api/consultas/plans?childId=...&userId=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const childIdHex = searchParams.get('childId') || ''
    const userIdHex = searchParams.get('userId') || ''
    if (!isObjectIdHex(childIdHex)) {
      return NextResponse.json({ success: false, error: 'invalid_params', message: 'childId inválido' }, { status: 400 })
    }
    const childId = toObjectId(childIdHex)
    const userFilter = isObjectIdHex(userIdHex) ? { userId: toObjectId(userIdHex) } : {}

    const { db } = await connectToDatabase()
    // Compat: esta ruta usa la colección legacy `child_plans`
    const rawPlans = await db
      .collection('child_plans')
      .find({ childId, ...userFilter })
      .sort({ createdAt: -1 })
      .toArray()
    const plans = rawPlans.map(normalizeLegacyPlanDoc)

    return NextResponse.json({ success: true, plans })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: 'internal_error', message: e?.message || 'Error' }, { status: 500 })
  }
}

// Validación de capacidades de planes
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { childId, planType } = body || {}
    if (!isObjectIdHex(childId) || !planType) {
      return NextResponse.json({ canGenerate: false, reason: 'Parámetros inválidos' }, { status: 200 })
    }
    const cid = toObjectId(childId)

    if (planType === 'initial') {
      const { db } = await connectToDatabase()
      const child = await db.collection('children').findOne({ _id: cid })
      if (!child) {
        return NextResponse.json({ canGenerate: false, reason: 'Niño no encontrado' })
      }

      const surveyData = (child as any)?.surveyData
      const hasSurvey = !!(surveyData && (
        surveyData.completed === true ||
        surveyData.completedAt ||
        Object.keys(surveyData).length > 0
      ))

      const reqUserIdHex = (body?.userId && typeof body.userId === 'string' && isObjectIdHex(body.userId)) ? body.userId : null
      const ownerId = (child as any)?.parentId
      const userToCheck = reqUserIdHex ? toObjectId(reqUserIdHex) : ownerId

      const window = defaultWindow()
      const byType = await EventsRepo.countByTypes(cid, window.from, window.to)
      const eventCount = Object.values(byType).reduce((a: number, b: number) => a + b, 0)
      const distinctTypes = Object.keys(byType).length
      const minEvents = Number.isFinite(CONF.PLAN_MIN_EVENTS) ? CONF.PLAN_MIN_EVENTS : 10
      const minDistinctTypes = Number.isFinite(CONF.PLAN_MIN_DISTINCT_TYPES) ? CONF.PLAN_MIN_DISTINCT_TYPES : 2
      const eligibility = computeInitialEligibility({
        eventCount,
        distinctTypes,
        surveyComplete: hasSurvey,
        minEvents,
        minDistinctTypes,
        allowSurveyOnly: CONF.PLAN_ALLOW_SURVEY_ONLY,
      })

      const existingInitial = userToCheck
        ? await db.collection('child_plans').findOne({ childId: cid, userId: userToCheck, planNumber: 0, planType: 'initial' })
        : null

      if (existingInitial) {
        return NextResponse.json({ canGenerate: false, reason: 'Ya existe un Plan 0 para este niño', details: eligibility.details })
      }

      if (!hasSurvey) {
        return NextResponse.json({ canGenerate: false, reason: 'Completa el survey para generar el Plan 0', details: eligibility.details })
      }

      return NextResponse.json({
        canGenerate: true,
        mode: eligibility.mode ?? 'survey_only',
        nextVersion: 0,
        details: eligibility.details,
      })
    }

    if (planType === 'event_based') {
      const lastBase = await PlansRepo.findLatestBasePlan(cid)
      if (!lastBase) {
        return NextResponse.json({ canGenerate: false, reason: 'Se requiere un plan base previo (Plan Inicial o Progresión) para generar progresión.' })
      }
      const gate = await canGenerateProgression(cid, String((lastBase as any)._id))
      if (gate.ok) {
        const nextNum = await PlansRepo.getNextPlanNumber(cid)
        return NextResponse.json({ canGenerate: true, nextVersion: nextNum, additionalInfo: { eventCount: gate.context.eventCount, distinctTypes: gate.context.distinctTypes } })
      }
      const reason = 'Aún no hay suficientes nuevos eventos desde el plan base.'
      return NextResponse.json({ canGenerate: false, reason })
    }

    if (planType === 'transcript_refinement') {
      // Validación ligera: se requiere transcript asociado
      return NextResponse.json({ canGenerate: false, reason: 'Se requiere un análisis de transcript previo para generar un refinamiento.' })
    }

    return NextResponse.json({ canGenerate: false, reason: 'Tipo de plan no soportado' })
  } catch (e: any) {
    return NextResponse.json({ canGenerate: false, reason: 'Error de validación' })
  }
}

// Generación de Plan (compat) — implementa sólo Plan Inicial aquí para evitar 405 del frontend legacy
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { childId, planType } = body || {}
    if (!isObjectIdHex(childId) || !planType) {
      return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 })
    }
    const cid = toObjectId(childId)

    if (planType !== 'initial') {
      return NextResponse.json({ ok: false, error: 'not_implemented', message: 'Sólo initial implementado en este endpoint' }, { status: 405 })
    }

    const window = defaultWindow()
    const { db } = await connectToDatabase()
    const child = await db.collection('children').findOne({ _id: cid })
    if (!child) {
      return NextResponse.json({ ok: false, error: 'child_not_found' }, { status: 404 })
    }

    const surveyData = (child as any)?.surveyData
    const ageInMonths = calcAgeInMonths((child as any)?.birthdate ?? (child as any)?.birthDate, window.to)
    const hasSurvey = !!(surveyData && (
      surveyData.completed === true ||
      surveyData.completedAt ||
      Object.keys(surveyData).length > 0
    ))

    if (!hasSurvey) {
      return NextResponse.json({ ok: false, error: 'bad_request', message: 'Completa el survey para generar el Plan 0' }, { status: 400 })
    }

    const requestedUserId = body?.userId && typeof body.userId === 'string' && isObjectIdHex(body.userId)
      ? toObjectId(body.userId)
      : null
    const ownerId = (child as any)?.parentId
    const targetUserId = requestedUserId || ownerId
    if (!targetUserId) {
      return NextResponse.json({ ok: false, error: 'bad_request', message: 'userId requerido para asignar el plan' }, { status: 400 })
    }

    const existingInitial = await db.collection('child_plans').findOne({ childId: cid, userId: targetUserId, planNumber: 0, planType: 'initial' })
    if (existingInitial) {
      return NextResponse.json({ ok: false, error: 'bad_request', message: 'Ya existe un Plan 0 para este niño' }, { status: 400 })
    }

    const byType = await EventsRepo.countByTypes(cid, window.from, window.to)
    const eventCount = Object.values(byType).reduce((a: number, b: number) => a + b, 0)
    const distinctTypes = Object.keys(byType).length

    const allowSurveyOnly = CONF.PLAN_ALLOW_SURVEY_ONLY && hasSurvey

    let planOutput: any
    let ragSources: string[] = []
    let generationMode: 'events' | 'survey_only'
    let surveyFacts: SurveyFacts | undefined
    let weakStats: WeakStats | undefined

    if (eventCount > 0) {
      let svc: PlanLLMService
      try {
        svc = new PlanLLMService(getLLM() as any)
      } catch (e: any) {
        if (e && e.message === 'llm_misconfigured') {
          return NextResponse.json({ ok: false, error: 'service_unavailable', reason: 'llm_misconfigured' }, { status: 503 })
        }
        throw e
      }

      const out = await svc.generate(cid as any, 'initial', window, {
        allowSurveyOnly,
        surveyData,
        surveyComplete: hasSurvey,
        extraContext: {
          surveyOnly: allowSurveyOnly,
          eventCount,
          distinctTypes,
        },
      })

      if (!out.ok) {
        if (out.error === 'insufficient_data') {
          return NextResponse.json({ ok: false, error: 'insufficient_data', details: { eventCount, distinctTypes } }, { status: 422 })
        }
        return NextResponse.json({ ok: false, error: out.error, reason: out.reason, attempts: out.attempts }, { status: 500 })
      }

      planOutput = out.output
      ragSources = Array.isArray((planOutput as any)?.metadata?.ragSources)
        ? ((planOutput as any).metadata.ragSources as unknown[])
            .map((src) => (typeof src === 'string' ? src : src != null ? String(src) : ''))
            .filter(Boolean)
        : []
      planOutput.metadata = {
        ...(planOutput.metadata || {}),
        ragSources,
        generation: 'events',
      }
      generationMode = 'events'
    } else {
      try {
        const surveyPlan = await generatePlanFromSurvey({ child, surveyData, ageInMonths })
        planOutput = surveyPlan.plan
        ragSources = surveyPlan.ragSources
        surveyFacts = surveyPlan.facts
        weakStats = surveyPlan.weakStats
        generationMode = 'survey_only'
      } catch (error: any) {
        if (error instanceof Error && error.message === 'llm_misconfigured') {
          return NextResponse.json({ ok: false, error: 'service_unavailable', reason: 'llm_misconfigured' }, { status: 503 })
        }
        if (error instanceof Error && error.message === 'plan_generation_invalid') {
          return NextResponse.json({ ok: false, error: 'internal_error', message: 'Plan generado inválido' }, { status: 500 })
        }
        throw error
      }
    }

    const planNumber = 0
    const planVersion = await PlansRepo.getNextPlanVersion(cid, planNumber)
    const planVersionLabel = toLegacyPlanVersion(planNumber, planVersion)
    const createdAt = now()

    const legacySourceData: Record<string, unknown> = {
      surveyDataUsed: true,
      childStatsUsed: eventCount > 0,
      ragSources,
      ageInMonths: (planOutput as any)?.metrics?.ageInMonths ?? ageInMonths,
      totalEvents: eventCount,
    }
    if (surveyFacts) legacySourceData.surveyFacts = surveyFacts
    if (weakStats) legacySourceData.weakStats = weakStats

    const created = await PlansRepo.createPlan({
      childId: cid,
      planType: 'initial',
      planNumber,
      planVersion,
      output: planOutput,
      sourceData: {
        window: { from: window.from.toISOString(), to: window.to.toISOString() },
        byType,
        eventCount,
        distinctTypes,
        surveyDataUsed: true,
        childStatsUsed: eventCount > 0,
        totalEvents: eventCount,
        ragSources,
        ageInMonths,
        ...(surveyFacts ? { surveyFacts } : {}),
        ...(weakStats ? { weakStats } : {}),
      },
      basedOn: 'survey_stats_rag',
      createdBy: String(targetUserId),
      status: 'active',
    })

    await markSupersededPreviousPlans(cid, String(created._id))

    try {
      const planOutputData = planOutput as any
      const scheduleRaw = planOutputData?.schedule && typeof planOutputData.schedule === 'object' ? planOutputData.schedule : {}
      const schedule = {
        bedtime: typeof scheduleRaw.bedtime === 'string' ? scheduleRaw.bedtime : '20:00',
        wakeTime: typeof scheduleRaw.wakeTime === 'string' ? scheduleRaw.wakeTime : '07:00',
        meals: Array.isArray(scheduleRaw.meals)
          ? scheduleRaw.meals.map((meal: any) => ({
              time: typeof meal?.time === 'string' ? meal.time : '',
              type: typeof meal?.type === 'string' ? meal.type : 'comida',
              description: typeof meal?.description === 'string' ? meal.description : '',
            })).filter((item: any) => item.time)
          : [],
        activities: Array.isArray(scheduleRaw.activities)
          ? scheduleRaw.activities.map((activity: any) => ({
              time: typeof activity?.time === 'string' ? activity.time : '',
              activity: typeof activity?.activity === 'string' ? activity.activity : 'Actividad',
              duration: typeof activity?.duration === 'number' && activity.duration > 0 ? activity.duration : 0,
              description: typeof activity?.description === 'string' ? activity.description : '',
            })).filter((item: any) => item.time)
          : [],
        naps: Array.isArray(scheduleRaw.naps)
          ? scheduleRaw.naps.map((nap: any) => ({
              time: typeof nap?.time === 'string' ? nap.time : '',
              duration: typeof nap?.duration === 'number' && nap.duration > 0 ? nap.duration : 0,
              description: typeof nap?.description === 'string' ? nap.description : '',
            })).filter((item: any) => item.time)
          : [],
      }

      const objectives = normalizeStringArray(planOutputData?.objectives)
      const recommendations = normalizeStringArray(planOutputData?.recommendations)

      await db.collection('child_plans').insertOne({
        childId: cid,
        userId: targetUserId,
        planType: 'initial',
        planNumber,
        planVersion: planVersionLabel,
        title: typeof planOutputData?.title === 'string' ? planOutputData.title : 'Plan Inicial',
        summary: typeof planOutputData?.summary === 'string' ? planOutputData.summary : 'Plan generado a partir de encuesta y políticas por edad.',
        schedule,
        objectives: objectives.length ? objectives : ['Establecer una rutina de sueño consistente.'],
        recommendations: recommendations.length ? recommendations : ['Aplicar ajustes graduales basados en la encuesta.'],
        basedOn: 'survey_stats_rag',
        sourceData: legacySourceData,
        eventAnalysis: eventCount > 0
          ? {
              eventsAnalyzed: eventCount,
              eventTypes: Object.keys(byType),
              ragSources,
              progressFromPrevious: 'Plan inicial generado con datos históricos y encuesta.',
              basePlanVersion: planVersionLabel,
            }
          : undefined,
        createdAt,
        updatedAt: createdAt,
        createdBy: targetUserId,
        status: 'active',
      })
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('dual_write_child_plans_failed', { error: err instanceof Error ? err.message : err })
    }

    return NextResponse.json({
      ok: true,
      mode: generationMode,
      plan: { planVersion },
      planId: String(created._id),
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: 'internal_error', message: e?.message || 'Error' }, { status: 500 })
  }
}
