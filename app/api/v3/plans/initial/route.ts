import { NextResponse } from 'next/server'
import { json, normalizeError, InsufficientDataError } from '@/server/http'
import { routeGuard } from '@/core-v3/api/feature-flag'
import { requireRole } from '@/core-v3/api/rbac'
import { initialPlanBody } from '@/core-v3/api/schemas/plans'
import { PlansRepo } from '@/core-v3/infra/repos/plans.repo'
import { EventsRepo } from '@/core-v3/infra/repos/events.repo'
import { PlanLLMService } from '@/core-v3/infra/llm/plan-llm-service'
import { getLLM } from '@/core-v3/infra/llm'
import { defaultWindow, markSupersededPreviousPlans } from '@/core-v3/domain/plan-engine'
import { ChildrenRepo } from '@/core-v3/infra/repos/children.repo'
import { computeInitialEligibility } from '@/core-v3/domain/eligibility'
import { CONF } from '@/core-v3/config'
import { getUserOrIPKey, rateLimitResponse, shouldRateLimit } from '@/core-v3/security/rate-limit'
import { safeLog } from '@/core-v3/security/sanitize'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function toObjectId(hex: string) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { ObjectId } = require('mongodb') as { ObjectId: new (h: string) => any }
  return new ObjectId(hex)
}

export async function POST(req: Request) {
  const blocked = routeGuard()
  if (blocked) return blocked
  const auth = await requireRole(req, ['admin', 'parent'])
  if (auth instanceof NextResponse) return auth
  const id = getUserOrIPKey(req)
  const rl = shouldRateLimit(id, { key: 'plans_initial', limit: 5, windowMs: 60_000 })
  if (rl.limited) return rateLimitResponse(rl.resetAt)

  const corr = `cid_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
  try {
    const body = await req.json()
    const parsed = initialPlanBody.safeParse(body)
    if (!parsed.success) return NextResponse.json({ ok: false, error: 'invalid_body', issues: parsed.error.issues }, { status: 400 })

    const childId = toObjectId(parsed.data.childId)
    const window = defaultWindow()

    // Kill-switch SOLO para Preview: permitir generar sin validación de gates
    const BYPASS_GATES = String(process.env.HD_PLAN_DISABLE_GATES || '').toLowerCase() === 'true' && (process.env.VERCEL_ENV === 'preview')
    if (BYPASS_GATES) {
      let svc: PlanLLMService
      try {
        svc = new PlanLLMService(getLLM() as any)
      } catch (e: any) {
        if (e && e.message === 'llm_misconfigured') {
          return json({ ok: false, error: 'service_unavailable', reason: 'llm_misconfigured' }, 503)
        }
        throw e
      }
      const out = await svc.generate(childId, 'initial', window)
      if (!out.ok) {
        if (out.error === 'insufficient_data') {
          // Fallback: generar Plan 0 básico con Survey + RAG (solo preview)
          const childBypass = await ChildrenRepo.findById(childId as any)
          const fallbackOutput = {
            planType: 'initial',
            title: `Plan Inicial`,
            summary: 'Plan generado a partir de la encuesta (sin eventos).',
            window: { from: window.from.toISOString(), to: window.to.toISOString() },
            metrics: { eventCount: 0, distinctTypes: 0, byType: {}, ageInMonths: undefined },
            recommendations: [
              { key: 'rutina', action: 'Establecer una rutina de sueño consistente (baño, cuento, cama).', rationale: 'Basado en datos de encuesta y edad.' },
              { key: 'ambiente', action: 'Optimizar el ambiente: oscuro, silencioso y temperatura adecuada.', rationale: 'Buenas prácticas generales de sueño infantil.' },
            ],
          } as any

          const byTypeBypass = await EventsRepo.countByTypes(childId, window.from, window.to)
          const eventCountBypass = 0
          const distinctTypesBypass = 0
          const createdBypass = await PlansRepo.createPlan({
            childId,
            planType: 'initial',
            planNumber: 0,
            planVersion: 0,
            output: fallbackOutput,
            sourceData: {
              window: { from: window.from.toISOString(), to: window.to.toISOString() },
              byType: byTypeBypass,
              eventCount: eventCountBypass,
              distinctTypes: distinctTypesBypass,
              surveyDataUsed: true,
              childStatsUsed: false,
              totalEvents: 0,
            },
            createdBy: auth.userId,
            status: 'active',
            basedOn: 'survey_stats_rag',
          })
          safeLog('plan_created_bypass', { childId: String(childId), planId: String(createdBypass._id), note: 'Plan 0: sin eventos; usando Survey + RAG + políticas por edad' })
          return json({ ok: true, mode: 'survey_only', planId: String(createdBypass._id), planNumber: 0, planVersion: 0, output: fallbackOutput })
        }
        return json({ ok: false, error: out.error, reason: out.reason, attempts: out.attempts }, 500)
      }

      const byTypeBypass = await EventsRepo.countByTypes(childId, window.from, window.to)
      const eventCountBypass = Object.values(byTypeBypass).reduce((a, b) => a + (b as number), 0)
      const distinctTypesBypass = Object.keys(byTypeBypass).length
      const createdBypass = await PlansRepo.createPlan({
        childId,
        planType: 'initial',
        planNumber: 0,
        planVersion: 0,
        output: out.output,
        sourceData: {
          window: { from: window.from.toISOString(), to: window.to.toISOString() },
          byType: byTypeBypass,
          eventCount: eventCountBypass,
          distinctTypes: distinctTypesBypass,
        },
        createdBy: auth.userId,
        status: 'active',
      })
      safeLog('plan_created_bypass', { childId: String(childId), planId: String(createdBypass._id) })
      return json({ ok: true, mode: 'survey_only', planId: String(createdBypass._id), planNumber: 0, planVersion: 0, output: out.output })
    }
    // Calcular métricas actuales
    const byType = await EventsRepo.countByTypes(childId, window.from, window.to)
    const eventCount = Object.values(byType).reduce((a, b) => a + b, 0)
    const distinctTypes = Object.keys(byType).length
    const child = await ChildrenRepo.findById(childId as any)
    const s: any = (child as any)?.surveyData
    const surveyComplete = !!(s?.completed === true || (s && Object.keys(s).length > 0 && s?.isPartial !== true))
    // Flags desde entorno
    const allowSurveyOnly = String(process.env.HD_PLAN_ALLOW_SURVEY_ONLY || '').toLowerCase() === 'true'
    const minEvents = Number.parseInt(String(process.env.HD_PLAN_MIN_EVENTS ?? '10'), 10)
    const minDistinctTypes = Number.parseInt(String(process.env.HD_PLAN_MIN_DISTINCT_TYPES ?? '2'), 10)

    const eligibility = computeInitialEligibility({
      eventCount,
      distinctTypes,
      surveyComplete,
      minEvents,
      minDistinctTypes,
      allowSurveyOnly,
    })
    if (!eligibility.canGenerate) {
      return json({ ok: false, error: 'insufficient_data', details: eligibility.details }, 422)
    }

    let svc: PlanLLMService
    try {
      svc = new PlanLLMService(getLLM() as any)
    } catch (e: any) {
    if (e && e.message === 'llm_misconfigured') {
        return json({ ok: false, error: 'service_unavailable', reason: 'llm_misconfigured' }, 503)
    }
      throw e
    }
    safeLog('plan_initial_eligibility', { childId: String(childId), mode: eligibility.mode })
    const out = await svc.generate(childId, 'initial', window)
    if (!out.ok) {
      if (out.error === 'insufficient_data' && eligibility.mode === 'survey_only' && process.env.VERCEL_ENV === 'preview') {
        // Fallback en Preview: generar Plan 0 básico con encuesta
        const fallbackOutput = {
          planType: 'initial',
          title: `Plan Inicial`,
          summary: 'Plan generado a partir de la encuesta (sin eventos).',
          window: { from: window.from.toISOString(), to: window.to.toISOString() },
          metrics: { eventCount, distinctTypes, byType, ageInMonths: undefined },
          recommendations: [
            { key: 'rutina', action: 'Establecer una rutina de sueño consistente (baño, cuento, cama).', rationale: 'Basado en datos de encuesta y edad.' },
            { key: 'ambiente', action: 'Optimizar el ambiente: oscuro, silencioso y temperatura adecuada.', rationale: 'Buenas prácticas generales de sueño infantil.' },
          ],
        } as any

        const createdFallback = await PlansRepo.createPlan({
          childId,
          planType: 'initial',
          planNumber,
          planVersion,
          output: fallbackOutput,
          sourceData: {
            window: { from: window.from.toISOString(), to: window.to.toISOString() },
            byType,
            eventCount,
            distinctTypes,
            surveyDataUsed: true,
            childStatsUsed: false,
            totalEvents: 0,
          },
          createdBy: auth.userId,
          status: 'active',
          basedOn: 'survey_stats_rag',
        })
        safeLog('plan_created_fallback', { childId: String(childId), planId: String(createdFallback._id), note: 'Plan 0: sin eventos; usando Survey + RAG + políticas por edad' })
        await markSupersededPreviousPlans(childId, String(createdFallback._id))
        return json({ ok: true, mode: 'survey_only', planId: String(createdFallback._id), planNumber, planVersion, output: fallbackOutput, sourceData })
      }
      if (out.error === 'insufficient_data') return json({ ok: false, error: 'insufficient_data', details: eligibility.details }, 422)
      return json({ ok: false, error: out.error, reason: out.reason, attempts: out.attempts }, 500)
    }

  const planNumber = 0
  const planVersion = 0
  const sourceData = {
    window: { from: window.from.toISOString(), to: window.to.toISOString() },
    byType,
    eventCount,
    distinctTypes,
  }
    const created = await PlansRepo.createPlan({
    childId,
    planType: 'initial',
    planNumber,
    planVersion,
    output: out.output,
    sourceData,
    createdBy: auth.userId,
    status: 'active',
  })

    await markSupersededPreviousPlans(childId, String(created._id))
    safeLog('audit', 'plan_created', { planType: 'initial', childId: String(childId), planId: String(created._id), createdBy: auth.userId })

    return json({ ok: true, mode: eligibility.mode, planId: String(created._id), planNumber, planVersion, output: out.output, sourceData })
  } catch (e: any) {
    const kind = normalizeError(e)
    if (kind.type === 'insufficient_data') return json({ ok: false, error: 'insufficient_data', details: kind.details, correlationId: corr }, 422)
    if (kind.type === 'llm_misconfigured') return json({ ok: false, error: 'service_unavailable', reason: 'llm_misconfigured', correlationId: corr }, 503)
    return json({ ok: false, error: 'internal_error', correlationId: corr }, 500)
  }
}

export async function GET() {
  return json({ ok: false, error: 'method_not_allowed', hint: 'Usa POST a /api/v3/plans/initial con body { childId }' }, 405, { 'Allow': 'POST' })
}
function json(data: any, status = 200, headers: Record<string, string> = {}) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}
