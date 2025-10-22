import { withApi } from '@/lib/api-middleware'
import { stdOk, stdError } from '@/lib/api-utils-v2'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isObjectIdHex, toObjectId } from '@/src/domain/object-id'
import { checkPlanSanityOrThrow } from '@/lib/plan-sanity'
import { planRepo } from '@/src/repo/planRepo'
import { PlanLLMService } from '@/core-v3/infra/llm/plan-llm-service'
import { getLLM } from '@/core-v3/infra/llm'
import { defaultWindow } from '@/core-v3/domain/plan-engine'
import { EventsRepo } from '@/core-v3/infra/repos/events.repo'
import { PlansRepo } from '@/core-v3/infra/repos/plans.repo'

const paramsSchema = z.object({ childId: z.string() })

const bodySchema = z.object({
  planType: z.enum(['initial', 'event_based', 'transcript_refinement']),
  basePlanId: z.string().optional(),
  reportId: z.string().optional(),
})

export const POST = withApi(
  async ({ params, body, requestId, userId }) => {
    const childHex = params.childId
    if (!isObjectIdHex(childHex)) return stdError('invalid_params', 'Invalid childId', requestId, 400)
    const childId = toObjectId(childHex)

    // Precondición de sanidad (Fase 1): aborta con 422 si falla
    try {
      await checkPlanSanityOrThrow(childId, String(userId))
    } catch (e: any) {
      const status = Number.isFinite(e?.status) ? e.status : 422
      const code = e?.code || 'plan_sanity_failed'
      if (code === 'insufficient_data' || code === 'not_enough_data') {
        return stdError('insufficient_data', 'Faltan datos para generar el plan', requestId, 422, e?.details)
      }
      return stdError(code, e?.message || 'Preconditions failed', requestId, status)
    }

    // Ventana por defecto definida en reglas
    const window = defaultWindow()

    // LLM service
    let svc: PlanLLMService
    try {
      svc = new PlanLLMService(getLLM() as any)
    } catch (e: any) {
      if (e && e.message === 'llm_misconfigured') {
        return NextResponse.json({ error: 'service_unavailable', reason: 'llm_misconfigured' }, { status: 503 })
      }
      throw e
    }

    // Ejecutar generación
    const kind = body.planType
    const result = await svc.generate(childId as any, kind as any, window)
    if (!result.ok) {
      if (result.error === 'insufficient_data') return stdError('insufficient_data', result.reason || 'Insufficient data', requestId, 422)
      if (result.error === 'validation_failed') return stdError('validation_failed', 'Model output failed validation', requestId, 502)
      return stdError('model_error', 'LLM provider error', requestId, 502)
    }

    // Versionado según reglas
    let planNumber = 0
    let planVersion = 0
    if (kind === 'initial') {
      planNumber = 0
      planVersion = 0
    } else if (kind === 'event_based') {
      planNumber = await PlansRepo.getNextPlanNumber(childId as any)
      planVersion = 0
    } else {
      // transcript_refinement
      if (!body.basePlanId || !isObjectIdHex(body.basePlanId)) return stdError('invalid_body', 'basePlanId required for transcript_refinement', requestId, 400)
      const base = await PlansRepo.getById(body.basePlanId)
      if (!base) return stdError('not_found', 'Base plan not found', requestId, 404)
      planNumber = (base as any).planNumber ?? 0
      // Minor versions increment; fallback to integer if repo enforces integer; UI puede renderizar como x.y
      const nextMinor = await PlansRepo.getNextPlanVersion(childId as any, planNumber)
      planVersion = nextMinor
    }

    // Metadata de fuente (no sensible)
    const byType = await EventsRepo.countByTypes(childId as any, window.from, window.to)
    const eventCount = Object.values(byType).reduce((a, b) => a + b, 0)
    const distinctTypes = Object.keys(byType).length

    const now = new Date()
    const created = await planRepo.insert({
      _id: undefined as any,
      childId: childId as any,
      userId: (userId as any),
      planType: kind,
      planNumber,
      planVersion,
      status: 'draft',
      output: result.output,
      sourceData: {
        window: { from: window.from.toISOString(), to: window.to.toISOString() },
        eventCount,
        distinctTypes,
        byType,
        ragSources: [],
        reportId: body.reportId || null,
      },
      createdAt: now,
      updatedAt: now,
    } as any)

    return stdOk({ planId: String((created as any)._id), planNumber, planVersion, status: 'draft' }, requestId, {
      attempts: result.attempts,
      inference_ms: result.inference_ms,
    })
  },
  { auth: 'user', validate: { params: paramsSchema, body: bodySchema }, rateLimit: { limit: 5, windowMs: 60_000, key: 'v2_child_plan_generate' } }
)
