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

    let svc: PlanLLMService
    try {
      svc = new PlanLLMService(getLLM() as any)
    } catch (e: any) {
      if (e && e.message === 'llm_misconfigured') {
        return NextResponse.json({ ok: false, error: 'service_unavailable', reason: 'llm_misconfigured' }, { status: 503 })
      }
      throw e
    }

    const allowSurveyOnly = CONF.PLAN_ALLOW_SURVEY_ONLY && hasSurvey
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

    const planNumber = 0
    const planVersion = await PlansRepo.getNextPlanVersion(cid, planNumber)
    const planVersionLabel = toLegacyPlanVersion(planNumber, planVersion)
    const createdAt = now()
    const ragSources = Array.isArray((out.output as any)?.metadata?.ragSources)
      ? ((out.output as any).metadata.ragSources as unknown[])
          .map((src) => (typeof src === 'string' ? src : src != null ? String(src) : ''))
          .filter(Boolean)
      : []
    const legacySourceData = {
      surveyDataUsed: true,
      childStatsUsed: eventCount > 0,
      ragSources,
      ageInMonths: (out.output as any)?.metrics?.ageInMonths ?? ageInMonths,
      totalEvents: eventCount,
    }

    const created = await PlansRepo.createPlan({
      childId: cid,
      planType: 'initial',
      planNumber,
      planVersion,
      output: out.output,
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
      },
      basedOn: 'survey_stats_rag',
      createdBy: String(targetUserId),
      status: 'active',
    })

    await markSupersededPreviousPlans(cid, String(created._id))

    try {
      const planOutput = out.output as any
      const scheduleRaw = planOutput?.schedule && typeof planOutput.schedule === 'object' ? planOutput.schedule : {}
      const schedule = {
        bedtime: typeof scheduleRaw.bedtime === 'string' ? scheduleRaw.bedtime : '20:00',
        wakeTime: typeof scheduleRaw.wakeTime === 'string' ? scheduleRaw.wakeTime : '07:00',
        meals: Array.isArray(scheduleRaw.meals)
          ? scheduleRaw.meals.map((meal: any) => ({
              time: typeof meal?.time === 'string' ? meal.time : '12:00',
              type: typeof meal?.type === 'string' ? meal.type : 'comida',
              description: typeof meal?.description === 'string' ? meal.description : '',
            }))
          : [],
        activities: Array.isArray(scheduleRaw.activities)
          ? scheduleRaw.activities.map((activity: any) => ({
              time: typeof activity?.time === 'string' ? activity.time : '16:00',
              activity: typeof activity?.activity === 'string' ? activity.activity : 'Actividad',
              duration: typeof activity?.duration === 'number' && activity.duration > 0 ? activity.duration : 30,
              description: typeof activity?.description === 'string' ? activity.description : '',
            }))
          : [],
        naps: Array.isArray(scheduleRaw.naps)
          ? scheduleRaw.naps.map((nap: any) => ({
              time: typeof nap?.time === 'string' ? nap.time : '13:00',
              duration: typeof nap?.duration === 'number' && nap.duration > 0 ? nap.duration : 60,
              description: typeof nap?.description === 'string' ? nap.description : '',
            }))
          : [],
      }

      if (schedule.meals.length === 0) {
        schedule.meals.push({ time: '12:00', type: 'comida', description: 'Asegura una comida principal equilibrada a mediodía.' })
      }
      if (schedule.activities.length === 0) {
        schedule.activities.push({ time: '16:00', activity: 'Actividad tranquila', duration: 30, description: 'Tiempo de juego calmado para preparar la siesta o la noche.' })
      }
      if (schedule.naps.length === 0) {
        schedule.naps.push({ time: '13:00', duration: 60, description: 'Siesta recomendada según encuesta y edad.' })
      }

      const objectives = normalizeStringArray(planOutput?.objectives)
      if (objectives.length === 0) {
        objectives.push(
          'Establecer una rutina de sueño consistente basada en la información de la encuesta.',
          'Optimizar el ambiente del dormitorio para mejorar la conciliación.'
        )
      }

      const recommendations = normalizeStringArray(planOutput?.recommendations)
      if (recommendations.length === 0) {
        recommendations.push(
          'Mantener horario fijo de acostarse y despertar durante al menos 2 semanas.',
          'Implementar una rutina relajante previa al sueño (baño tibio, lectura) cada noche.',
          'Evitar pantallas 60 minutos antes de la hora de dormir.'
        )
      }

      await db.collection('child_plans').insertOne({
        childId: cid,
        userId: targetUserId,
        planType: 'initial',
        planNumber,
        planVersion: planVersionLabel,
        title: typeof planOutput?.title === 'string' ? planOutput.title : 'Plan Inicial',
        summary: typeof planOutput?.summary === 'string' ? planOutput.summary : 'Plan generado a partir de encuesta y políticas por edad.',
        schedule,
        objectives,
        recommendations,
        basedOn: 'survey_stats_rag',
        sourceData: legacySourceData,
        eventAnalysis: eventCount > 0
          ? {
              eventsAnalyzed: eventCount,
              eventTypes: Object.keys(byType),
              ragSources: legacySourceData.ragSources,
              progressFromPrevious: 'Plan inicial generado con eventos recientes y encuesta.',
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
      mode: eventCount > 0 ? 'events' : 'survey_only',
      plan: { planVersion },
      planId: String(created._id),
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: 'internal_error', message: e?.message || 'Error' }, { status: 500 })
  }
}
