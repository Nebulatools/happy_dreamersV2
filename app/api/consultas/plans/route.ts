import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { isObjectIdHex, toObjectId } from '@/src/domain/object-id'
import { canGenerateProgression, defaultWindow, markSupersededPreviousPlans } from '@/core-v3/domain/plan-engine'
import { PlansRepo } from '@/core-v3/infra/repos/plans.repo'
import { CONF } from '@/core-v3/config'
import { EventsRepo } from '@/core-v3/infra/repos/events.repo'
import { computeInitialEligibility } from '@/core-v3/domain/eligibility'
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

// ---- UTILIDADES PARA NORMALIZAR/HIDRATAR PLAN 0 ----
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const hhmm = (s: any, fallback: string) => (typeof s === 'string' && TIME_RE.test(s) ? s : fallback)

const getIn = (obj: any, path: string, dflt?: any) =>
  path.split('.').reduce((o, k) => ((o && o[k] !== undefined) ? o[k] : undefined), obj) ?? dflt

function surveyToFacts(s: any) {
  const h = s?.rutinaHabitos || s?.rutina || {}
  const alim = s?.alimentacion || {}
  const goals = getIn(s, 'sleep_goals') ?? getIn(s, 'objetivos') ?? getIn(s, 'preocupaciones.objetivoPrincipal')
  return {
    bedtimeDeclared: getIn(h, 'horaDormir', getIn(h, 'horaAcostarse', null)),
    bedtimeRoutine: getIn(h, 'rutinaAntesAcostarse', getIn(h, 'rutina', null)),
    napsYesNo: getIn(h, 'haceSiestas', null),
    sleepLocation: getIn(h, 'dondeDuermeNoche', null),
    mealsDeclared: alim.horarioComidas ?? null,
    goals: Array.isArray(goals) ? goals : (goals ? [goals] : []),
  }
}

function defaultsFromSurvey(f: ReturnType<typeof surveyToFacts>) {
  const bedtime = f.bedtimeDeclared && TIME_RE.test(f.bedtimeDeclared) ? f.bedtimeDeclared : '20:30'
  const wakeTime = '07:00'
  const meals = Array.isArray(f.mealsDeclared) && f.mealsDeclared.length
    ? f.mealsDeclared.map((t: any) => ({
        time: TIME_RE.test(t?.time || t) ? (t.time || t) : '07:30',
        type: (t?.type ?? 'desayuno'),
        description: String(t?.description ?? '').trim() || 'Comida',
      }))
    : [
        { time: '07:30', type: 'desayuno', description: 'Desayuno después de despertar' },
        { time: '12:00', type: 'almuerzo', description: 'Almuerzo balanceado' },
        { time: '16:00', type: 'merienda', description: 'Merienda ligera' },
        { time: '19:00', type: 'cena', description: 'Cena temprana' },
      ]

  const naps =
    f.napsYesNo === false || f.napsYesNo === 'no'
      ? []
      : [{ time: '13:30', duration: 90, description: 'Siesta vespertina' }]

  const objectives = (f.goals?.length ? f.goals : ['Establecer una rutina de sueño consistente.']).map((x: any) => String(x))

  const recommendations = [
    'Implementar una rutina relajante 20–30 minutos antes de dormir.',
    'Evitar pantallas al menos 60 minutos antes de acostarse.',
  ]

  return {
    schedule: { bedtime, wakeTime, meals, activities: [], naps },
    objectives,
    recommendations,
  }
}

function ensurePlan0FromAI(ai: any, surveyData: any) {
  const f = surveyToFacts(surveyData || {})
  const d = defaultsFromSurvey(f)

  const sc = ai?.schedule ?? {}
  const meals = Array.isArray(sc.meals) ? sc.meals : []
  const activities = Array.isArray(sc.activities) ? sc.activities : []
  const naps = Array.isArray(sc.naps) ? sc.naps : []

  const schedule = {
    bedtime: hhmm(sc.bedtime, d.schedule.bedtime),
    wakeTime: hhmm(sc.wakeTime, d.schedule.wakeTime),
    meals: meals.length
      ? meals.map((m: any) => ({
          time: hhmm(m?.time, '07:30'),
          type: (m?.type ?? 'desayuno'),
          description: String(m?.description ?? '').trim() || '—',
        }))
      : d.schedule.meals,
    activities: activities.length
      ? activities.map((a: any) => ({
          time: hhmm(a?.time, '17:00'),
          activity: String(a?.activity ?? 'actividad'),
          duration: Number.isFinite(a?.duration) ? Math.max(5, Math.min(180, Math.trunc(a.duration))) : 30,
          description: String(a?.description ?? '').trim() || undefined,
        }))
      : d.schedule.activities,
    naps: naps.length
      ? naps.map((n: any) => ({
          time: hhmm(n?.time, '13:30'),
          duration: Number.isFinite(n?.duration) ? Math.max(20, Math.min(180, Math.trunc(n.duration))) : 90,
          description: String(n?.description ?? '').trim() || undefined,
        }))
      : d.schedule.naps,
  }

  const objectives = Array.isArray(ai?.objectives) && ai.objectives.length ? ai.objectives.map(String) : d.objectives
  const recommendations = Array.isArray(ai?.recommendations) && ai.recommendations.length
    ? ai.recommendations.map(String)
    : d.recommendations

  return { schedule, objectives, recommendations }
}

function formatTwo(n: number) {
  return String(Math.floor(Math.max(0, n))).padStart(2, '0')
}

function minutesBetween(a: Date, b: Date) {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000))
}

function average(nums: number[]): number {
  if (!nums.length) return 0
  return nums.reduce((sum, value) => sum + value, 0) / nums.length
}

function avgMinutesFromDates(dates: Date[], options: { nocturnal?: boolean } = {}) {
  if (!dates.length) return 0
  const total = dates
    .map((d) => {
      if (!(d instanceof Date) || Number.isNaN(d.getTime())) return 0
      let mins = d.getHours() * 60 + d.getMinutes()
      if (options.nocturnal && mins < 12 * 60) mins += 24 * 60
      return mins
    })
  const avg = Math.round(average(total))
  return options.nocturnal ? avg % (24 * 60) : avg
}

function minutesToHHMM(mins: number | null | undefined) {
  if (mins == null || Number.isNaN(mins)) return null
  const m = Math.max(0, Math.round(mins))
  const h = Math.floor(m / 60) % 24
  const mm = m % 60
  return `${formatTwo(h)}:${formatTwo(mm)}`
}

function resolveEventType(ev: any): string | undefined {
  if (!ev) return undefined
  return ev.type || ev.eventType || ev.kind
}

function toDate(value: any): Date | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function computeNapStatsFromEvents(events: any[]) {
  const naps = events.filter((e) => resolveEventType(e) === 'nap')
  if (!naps.length) return { count: 0, typicalTime: null, avgDuration: null }

  const startDates = naps
    .map((e) => toDate(e.startTime))
    .filter((d): d is Date => !!d)
  const durationMinutes = naps
    .map((e) => {
      const start = toDate(e.startTime)
      const end = toDate(e.endTime)
      if (start && end) return minutesBetween(start, end)
      if (Number.isFinite(e.durationMinutes)) return Math.max(0, Math.round(e.durationMinutes))
      if (Number.isFinite(e.duration)) return Math.max(0, Math.round(e.duration))
      return 0
    })
    .filter((n) => n > 0)

  return {
    count: naps.length,
    typicalTime: startDates.length ? minutesToHHMM(avgMinutesFromDates(startDates)) : null,
    avgDuration: durationMinutes.length ? Math.round(average(durationMinutes)) : null,
  }
}

function computeBedtimeAvgFromEvents(events: any[]) {
  const sleeps = events.filter((e) => ['sleep', 'bedtime'].includes(resolveEventType(e) || ''))
  const starts = sleeps
    .map((e) => toDate(e.startTime))
    .filter((d): d is Date => !!d)
  return {
    avgBedtime: starts.length ? minutesToHHMM(avgMinutesFromDates(starts, { nocturnal: true })) : null,
  }
}

function computeFeedingTypicalTimesFromEvents(events: any[]) {
  const fed = events.filter((e) => resolveEventType(e) === 'feeding')
  const buckets: Record<string, { from: number; to: number; dates: Date[] }> = {
    breakfast: { from: 6 * 60, to: 10 * 60, dates: [] },
    lunch: { from: 11 * 60, to: 14 * 60, dates: [] },
    snack: { from: 15 * 60, to: 17 * 60 + 30, dates: [] },
    dinner: { from: 18 * 60, to: 21 * 60, dates: [] },
  }

  for (const entry of fed) {
    const start = toDate(entry.startTime)
    if (!start) continue
    const minutes = start.getHours() * 60 + start.getMinutes()
    for (const bucket of Object.values(buckets)) {
      if (minutes >= bucket.from && minutes <= bucket.to) {
        bucket.dates.push(start)
        break
      }
    }
  }

  const result: Record<string, any> = {}
  for (const [key, bucket] of Object.entries(buckets)) {
    result[key] = bucket.dates.length ? minutesToHHMM(avgMinutesFromDates(bucket.dates)) : null
    result[`${key}Count`] = bucket.dates.length
  }
  result.timesLogged = fed
    .map((entry) => minutesToHHMM(avgMinutesFromDates([toDate(entry.startTime)!])))
    .filter(Boolean)

  return result
}

function truncate(text: string, max = 400): string {
  if (typeof text !== 'string') return ''
  return text.length <= max ? text : `${text.slice(0, max)}…`
}

async function getPlanRagContext(ageInMonths?: number) {
  try {
    const manager = getMongoDBVectorStoreManager()
    const query = typeof ageInMonths === 'number' && Number.isFinite(ageInMonths)
      ? `Plan inicial sueño pediátrico ${ageInMonths} meses`
      : 'Plan inicial sueño pediátrico'
    const docs = await manager.searchSimilar(query, 3)
    return docs.map((doc: any) => ({
      source: doc.metadata?.source || doc.metadata?.title || 'knowledge-base',
      title: doc.metadata?.title,
      content: truncate(doc.pageContent || doc.metadata?.summary || ''),
    }))
  } catch (error) {
    console.warn('plan0_rag_context_failed', error instanceof Error ? error.message : String(error))
    return []
  }
}

type GeneratePlanParams = {
  planType: 'initial'
  childData: any
  ragContext: any
  surveyData: any
  policies: any
  enrichedStats?: { napStats?: any; bedtimeStats?: any; feedingStats?: any }
}

async function generatePlanWithAI(params: GeneratePlanParams) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('llm_misconfigured')
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.HD_OPENAI_BASE_URL })
  const model = process.env.HD_PLAN_LLM_MODEL || 'gpt-4o-mini'
  const temperature = Number.isFinite(Number(process.env.HD_PLAN_LLM_TEMPERATURE)) ? Number(process.env.HD_PLAN_LLM_TEMPERATURE) : 0.4
  const maxTokens = Number.isFinite(Number(process.env.HD_PLAN_LLM_MAX_TOKENS)) ? Number(process.env.HD_PLAN_LLM_MAX_TOKENS) : 2000

  const ragBlock = Array.isArray(params.ragContext) && params.ragContext.length
    ? params.ragContext.map((entry: any, idx: number) => `Fuente ${idx + 1}: ${(entry.title || entry.source || 'KB')} -> ${entry.content || ''}`).join('\n')
    : 'Sin RAG específico; utiliza guías generales documentadas.'

  const systemPrompt = [
    'Eres pediatra del sueño. Genera un Plan Inicial (Plan 0) consistente, accionable y seguro.',
    'Devuelve únicamente JSON con las claves exactas: {"schedule":{"bedtime","wakeTime","meals","activities","naps"},"objectives":[],"recommendations":[]}.',
    'Reglas clave:',
    '- Usa horario HH:MM (24h).',
    '- Mantén un primer paso suave (no ajustes bruscos >30 min respecto a hábitos declarados).',
    '- Si la familia reporta que no hay siestas, permite 0 siestas.',
    '- No inventes comidas inexistentes; puedes sugerir bloques básicos.',
    '- Objetivos y recomendaciones concretos, orientados a padres y en español neutro.',
  ].join('\n')

  const userPrompt = [
    'PROMPT_VERSION=plan0-hydrate-2025-10-24',
    `Niño: ${params.childData?.firstName || 'N/A'} (${params.childData?.ageInMonths ?? 'N/A'} meses)`,
    `Encuesta:\n${JSON.stringify(params.surveyData || {}, null, 2)}`,
    `Estadísticas (pueden provenir de eventos o encuesta):\n${JSON.stringify(params.enrichedStats || {}, null, 2)}`,
    `Políticas por edad:\n${JSON.stringify(params.policies || {}, null, 2)}`,
    `RAG relevante:\n${ragBlock}`,
    'Responde solo con el JSON requerido. Sin comentarios extra.',
  ].join('\n\n')

  const completion = await client.chat.completions.create({
    model,
    temperature,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  })

  const raw = completion.choices?.[0]?.message?.content || '{}'
  try {
    return JSON.parse(raw)
  } catch (error) {
    console.warn('plan0_ai_parse_failed', error instanceof Error ? error.message : String(error), raw)
    return {}
  }
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

    const events = await EventsRepo.findByChildAndRange(cid as any, window.from, window.to)
    const hasEvents = Array.isArray(events) && events.length > 0
    const byType = await EventsRepo.countByTypes(cid, window.from, window.to)
    const eventCount = Object.values(byType).reduce((a: number, b: number) => a + b, 0)
    const distinctTypes = Object.keys(byType).length

    const napStats = hasEvents ? computeNapStatsFromEvents(events) : undefined
    const bedtimeStats = hasEvents ? computeBedtimeAvgFromEvents(events) : undefined
    const feedingStats = hasEvents ? computeFeedingTypicalTimesFromEvents(events) : undefined

    const ragContext = await getPlanRagContext(ageInMonths)
    const policies = derivePlanPolicy({ ageInMonths: ageInMonths ?? null, events })

    const aiRaw = await generatePlanWithAI({
      planType: 'initial',
      childData: { ...child, ageInMonths },
      ragContext,
      surveyData: child.surveyData,
      policies,
      enrichedStats: hasEvents ? { napStats, bedtimeStats, feedingStats } : undefined,
    })

    const aiPlan = ensurePlan0FromAI(aiRaw, child.surveyData)

    const planNumber = 0
    const planVersionNumber = await PlansRepo.getNextPlanVersion(cid, planNumber)
    const planVersionLabel = planVersionNumber.toString()

    const planDocument = {
      childId: cid,
      planType: 'initial',
      planNumber,
      planVersion: planVersionNumber,
      title: `Plan Inicial para ${child.firstName}`,
      schedule: aiPlan.schedule,
      objectives: aiPlan.objectives,
      recommendations: aiPlan.recommendations,
      basedOn: 'survey_stats_rag',
      sourceData: {
        surveyDataUsed: !!child.surveyData,
        childStatsUsed: hasEvents,
        ragSources: Array.isArray(ragContext) ? ragContext.map((r: any) => r.source || r.title || 'KB') : [],
        ageInMonths: ageInMonths || 0,
        totalEvents: events.length,
        promptVersion: 'plan0-hydrate-2025-10-24',
      },
      createdAt: now(),
      updatedAt: now(),
      createdBy: String(targetUserId),
      status: 'active',
    }

    const created = await PlansRepo.createPlan(planDocument)
    await markSupersededPreviousPlans(cid, String(created._id))

    try {
      await db.collection('child_plans').insertOne({
        ...planDocument,
        userId: targetUserId,
        planVersion: planVersionLabel,
      })
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('dual_write_child_plans_failed', { error: err instanceof Error ? err.message : err })
    }

    return NextResponse.json({
      ok: true,
      mode: hasEvents ? 'events' : 'survey_only',
      plan: { planVersion: planVersionLabel },
      planId: String(created._id),
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: 'internal_error', message: e?.message || 'Error' }, { status: 500 })
  }
}
