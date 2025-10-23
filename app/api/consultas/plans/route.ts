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
      const gate = await canGenerateInitial(cid, defaultWindow())
      if (gate.ok) {
        const surveyOnly = CONF.PLAN_ALLOW_SURVEY_ONLY && !!gate.context.surveyComplete && (
          gate.context.eventCount < CONF.PLAN_MIN_EVENTS || gate.context.distinctTypes < CONF.PLAN_MIN_DISTINCT_TYPES
        )
        return NextResponse.json({
          canGenerate: true,
          mode: surveyOnly ? 'survey_only' : 'events',
          nextVersion: 0,
          additionalInfo: { eventCount: gate.context.eventCount, distinctTypes: gate.context.distinctTypes, surveyComplete: !!gate.context.surveyComplete },
        })
      }
      const reason = `Necesitas al menos ${CONF.PLAN_MIN_EVENTS} eventos y ${CONF.PLAN_MIN_DISTINCT_TYPES} tipos distintos, o completar la encuesta.`
      return NextResponse.json({
        canGenerate: false,
        reason,
        details: {
          eventCount: gate.context.eventCount,
          distinctTypes: gate.context.distinctTypes,
          required: { minEvents: CONF.PLAN_MIN_EVENTS, minDistinctTypes: CONF.PLAN_MIN_DISTINCT_TYPES },
          surveyComplete: !!gate.context.surveyComplete,
        },
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
    const gate = await canGenerateInitial(cid, window)
    if (!gate.ok) {
      return NextResponse.json({ ok: false, error: 'insufficient_data', message: 'Faltan datos para generar el plan', details: { eventCount: gate.context.eventCount, distinctTypes: gate.context.distinctTypes, required: { minEvents: CONF.PLAN_MIN_EVENTS, minDistinctTypes: CONF.PLAN_MIN_DISTINCT_TYPES }, surveyComplete: !!gate.context.surveyComplete } }, { status: 422 })
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
      },
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
