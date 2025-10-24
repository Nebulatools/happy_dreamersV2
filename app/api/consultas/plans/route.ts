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
import { generatePlan0WithAIFromSurvey, PROMPT_VERSION } from '@/app/lib/ai/generate-plan0'

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

function computeNapStats(events: any[]) {
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

function computeBedtimeStats(events: any[]) {
  const sleeps = events.filter((e) => ['sleep', 'bedtime'].includes(resolveEventType(e) || ''))
  const starts = sleeps
    .map((e) => toDate(e.startTime))
    .filter((d): d is Date => !!d)
  return {
    avgBedtime: starts.length ? minutesToHHMM(avgMinutesFromDates(starts, { nocturnal: true })) : null,
  }
}

function computeFeedingStats(events: any[]) {
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
    const hasEvents = events.length > 0
    const byType = await EventsRepo.countByTypes(cid, window.from, window.to)
    const eventCount = Object.values(byType).reduce((a: number, b: number) => a + b, 0)
    const distinctTypes = Object.keys(byType).length

    const napStats = hasEvents ? computeNapStats(events) : undefined
    const bedtimeStats = hasEvents ? computeBedtimeStats(events) : undefined
    const feedingStats = hasEvents ? computeFeedingStats(events) : undefined
    const enrichedStats = hasEvents ? { napStats, bedtimeStats, feedingStats } : undefined

    const ragContext = await getPlanRagContext(ageInMonths)
    const ragSources = Array.isArray(ragContext) ? ragContext.map((entry: any) => entry.source || entry.title || 'KB') : []

    const policies = derivePlanPolicy({ ageInMonths: ageInMonths ?? null, events })

    let aiPlan
    try {
      aiPlan = await generatePlan0WithAIFromSurvey({
        child: { firstName: child.firstName, lastName: child.lastName, ageInMonths },
        surveyData: surveyData || {},
        ragContext,
        policies,
        enrichedStats,
      })
    } catch (error: any) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('llm_misconfigured')) {
        return NextResponse.json({ ok: false, error: 'service_unavailable', reason: 'llm_misconfigured' }, { status: 503 })
      }
      throw error
    }

    const generationMode: 'events' | 'survey_only' = hasEvents ? 'events' : 'survey_only'
    console.log('[plan0.generate]', { childId: String(cid), mode: generationMode, promptVersion: PROMPT_VERSION })

    const planOutput = {
      planType: 'initial',
      title: `Plan inicial para ${child.firstName || 'el niño'}`,
      summary: hasEvents
        ? 'Plan generado con datos históricos y encuesta familiar.'
        : 'Plan generado a partir de la encuesta familiar (sin eventos registrados).',
      schedule: aiPlan.schedule,
      objectives: aiPlan.objectives,
      recommendations: aiPlan.recommendations,
      metrics: {
        eventCount,
        distinctTypes,
        byType,
        ageInMonths,
      },
      metadata: {
        ragSources,
        promptVersion: PROMPT_VERSION,
        generationMode,
      },
    }

    const planNumber = 0
    const planVersion = await PlansRepo.getNextPlanVersion(cid, planNumber)
    const planVersionLabel = toLegacyPlanVersion(planNumber, planVersion)
    const createdAt = now()

    const legacySourceData: Record<string, unknown> = {
      surveyDataUsed: !!child.surveyData,
      childStatsUsed: hasEvents,
      ragSources,
      ageInMonths: ageInMonths || 0,
      totalEvents: events.length,
      promptVersion: PROMPT_VERSION,
    }
    if (enrichedStats) legacySourceData.enrichedStats = enrichedStats

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
        surveyDataUsed: !!child.surveyData,
        childStatsUsed: hasEvents,
        totalEvents: events.length,
        ragSources,
        ageInMonths,
        promptVersion: PROMPT_VERSION,
        ...(enrichedStats ? { enrichedStats } : {}),
      },
      basedOn: 'survey_stats_rag',
      createdBy: String(targetUserId),
      status: 'active',
    })

    await markSupersededPreviousPlans(cid, String(created._id))

    try {
      await db.collection('child_plans').insertOne({
        childId: cid,
        userId: targetUserId,
        planType: 'initial',
        planNumber,
        planVersion: planVersionLabel,
        title: planOutput.title,
        summary: planOutput.summary,
        schedule: aiPlan.schedule,
        objectives: aiPlan.objectives,
        recommendations: aiPlan.recommendations,
        basedOn: 'survey_stats_rag',
        sourceData: legacySourceData,
        eventAnalysis: hasEvents
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
