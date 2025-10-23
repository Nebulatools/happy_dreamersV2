import { NextResponse } from 'next/server'
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
      return NextResponse.json({ ok: false, error: 'insufficient_data', details: eligibility.details }, { status: 422 })
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
    safeLog('plan_initial_eligibility', { childId: String(childId), mode: eligibility.mode })
    const out = await svc.generate(childId, 'initial', window)
    if (!out.ok) return NextResponse.json({ ok: false, error: out.error, reason: out.reason, attempts: out.attempts }, { status: 502 })

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

    return NextResponse.json({ ok: true, mode: eligibility.mode, planId: String(created._id), planNumber, planVersion, output: out.output, sourceData })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: 'internal_error', correlationId: corr }, { status: 500 })
  }
}

export async function GET() {
  return new Response(
    JSON.stringify({ ok: false, error: 'method_not_allowed', hint: 'Usa POST a /api/v3/plans/initial con body { childId }' }),
    { status: 405, headers: { 'Content-Type': 'application/json', 'Allow': 'POST' } }
  )
}
