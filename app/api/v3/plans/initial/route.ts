import { NextResponse } from 'next/server'
import { routeGuard } from '@/core-v3/api/feature-flag'
import { requireRole } from '@/core-v3/api/rbac'
import { initialPlanBody } from '@/core-v3/api/schemas/plans'
import { PlansRepo } from '@/core-v3/infra/repos/plans.repo'
import { EventsRepo } from '@/core-v3/infra/repos/events.repo'
import { PlanLLMService } from '@/core-v3/infra/llm/plan-llm-service'
import { getLLM } from '@/core-v3/infra/llm'
import { canGenerateInitial, defaultWindow, markSupersededPreviousPlans } from '@/core-v3/domain/plan-engine'
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
  // Rate limit per user/IP for plan generation
  const id = getUserOrIPKey(req)
  const rl = shouldRateLimit(id, { key: 'plans_initial', limit: 5, windowMs: 60_000 })
  if (rl.limited) return rateLimitResponse(rl.resetAt)

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }
  const parsed = initialPlanBody.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 })

  const childId = toObjectId(parsed.data.childId)
  const window = defaultWindow()
  const gate = await canGenerateInitial(childId, window)
  if (!gate.ok) return NextResponse.json({ error: 'gate_failed', reason: gate.reason, context: gate.context }, { status: 400 })

  // LLM provider
  let svc: PlanLLMService
  try {
    svc = new PlanLLMService(getLLM() as any)
  } catch (e: any) {
    if (e && e.message === 'llm_misconfigured') {
      return NextResponse.json({ error: 'service_unavailable', reason: 'llm_misconfigured' }, { status: 503 })
    }
    throw e
  }
  const out = await svc.generate(childId, 'initial', window)
  if (!out.ok) return NextResponse.json({ error: out.error, reason: out.reason, attempts: out.attempts }, { status: 502 })

  const planNumber = 0
  const planVersion = 0
  const sourceData = {
    window: { from: window.from.toISOString(), to: window.to.toISOString() },
    byType: await EventsRepo.countByTypes(childId, window.from, window.to),
    eventCount: gate.context.eventCount,
    distinctTypes: gate.context.distinctTypes,
    ageInMonths: gate.context.ageInMonths,
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

  return NextResponse.json({ ok: true, planId: String(created._id), planNumber, planVersion, output: out.output, sourceData })
}
