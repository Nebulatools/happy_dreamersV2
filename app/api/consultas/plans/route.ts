import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { isObjectIdHex, toObjectId } from '@/src/domain/object-id'
import { canGenerateInitial, canGenerateProgression, defaultWindow } from '@/core-v3/domain/plan-engine'
import { PlansRepo } from '@/core-v3/infra/repos/plans.repo'
import { CONF } from '@/core-v3/config'
import { EventsRepo } from '@/core-v3/infra/repos/events.repo'
import { PlanLLMService } from '@/core-v3/infra/llm/plan-llm-service'
import { getLLM } from '@/core-v3/infra/llm'

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
    const plans = await db
      .collection('child_plans')
      .find({ childId, ...userFilter })
      .sort({ createdAt: -1 })
      .toArray()

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
      const hasSurvey = !!(child as any)?.surveyData && (
        (child as any)?.surveyData?.completed === true ||
        !!(child as any)?.surveyData?.completedAt ||
        Object.keys((child as any)?.surveyData || {}).length > 0
      )
      const ownerId = (child as any)?.parentId
      // Preferir el userId explícito del request (admin selecciona padre), si no, usar owner del niño
      const reqUserIdHex = (body?.userId && typeof body.userId === 'string' && isObjectIdHex(body.userId)) ? body.userId : null
      const userToCheck = reqUserIdHex ? toObjectId(reqUserIdHex) : ownerId
      // Sólo considerar Plan 0 existente del usuario objetivo
      const existingInitial = userToCheck
        ? await db.collection('child_plans').findOne({ childId: cid, userId: userToCheck, planNumber: 0, planType: 'initial' })
        : await db.collection('child_plans').findOne({ childId: cid, planNumber: 0, planType: 'initial' })
      const alreadyHasInitial = !!existingInitial
      const canGenerateInitial = hasSurvey && !alreadyHasInitial
      if (canGenerateInitial) {
        return NextResponse.json({ canGenerate: true, mode: 'survey_only', nextVersion: 0, additionalInfo: { surveyComplete: true } })
      }
      const reason = !hasSurvey
        ? 'Completa el survey para generar el Plan 0'
        : 'Ya existe un Plan 0 para este niño'
      return NextResponse.json({ canGenerate: false, reason })
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
    const hasSurvey = !!(child as any)?.surveyData && (
      (child as any)?.surveyData?.completed === true ||
      !!(child as any)?.surveyData?.completedAt ||
      Object.keys((child as any)?.surveyData || {}).length > 0
    )
    const existingPlans = await db.collection('child_plans').find({ childId: cid }).project({ planNumber: 1, planType: 1 }).toArray()
    const alreadyHasInitial = existingPlans.some((p: any) => p.planNumber === 0 && p.planType === 'initial')
    if (!hasSurvey) {
      return NextResponse.json({ ok: false, error: 'bad_request', message: 'Completa el survey para generar el Plan 0' }, { status: 400 })
    }
    if (alreadyHasInitial) {
      return NextResponse.json({ ok: false, error: 'bad_request', message: 'Ya existe un Plan 0 para este niño' }, { status: 400 })
    }

    let svc: PlanLLMService
    try {
      svc = new PlanLLMService(getLLM() as any)
    } catch (e: any) {
      if (e && e.message === 'llm_misconfigured') {
        return NextResponse.json({ ok: false, error: 'service_unavailable', reason: 'llm_misconfigured' }, { status: 503 })
      }
      throw e
    }
    const out = await svc.generate(cid as any, 'initial', window)
    if (!out.ok) {
      if (out.error === 'insufficient_data') {
        // Forzar generación por encuesta aún sin eventos
        // Nota: si el proveedor de LLM requiere contexto mínimo, aquí podríamos ajustar el prompt en PlanLLMService.
        return NextResponse.json({ ok: false, error: 'insufficient_data', message: 'Faltan datos para generar el plan', details: { eventCount, distinctTypes } }, { status: 422 })
      }
      return NextResponse.json({ ok: false, error: out.error, reason: out.reason, attempts: out.attempts }, { status: 500 })
    }

    // Versionado
    const planNumber = 0
    const planVersion = 0
    const byType = await EventsRepo.countByTypes(cid as any, window.from, window.to)
    const eventCount = Object.values(byType).reduce((a: number, b: number) => a + b, 0)
    const distinctTypes = Object.keys(byType).length

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
      },
      basedOn: 'survey_stats_rag',
      createdBy: 'legacy_ui',
      status: 'active',
    })

    const surveyOnly = CONF.PLAN_ALLOW_SURVEY_ONLY && !!gate.context.surveyComplete && (
      gate.context.eventCount < CONF.PLAN_MIN_EVENTS || gate.context.distinctTypes < CONF.PLAN_MIN_DISTINCT_TYPES
    )

    return NextResponse.json({ ok: true, mode: surveyOnly ? 'survey_only' : 'events', plan: { planVersion }, planId: String(created._id) })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: 'internal_error', message: e?.message || 'Error' }, { status: 500 })
  }
}
