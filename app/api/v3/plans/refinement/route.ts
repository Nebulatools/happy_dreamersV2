import { NextResponse } from 'next/server'
import { routeGuard } from '@/core-v3/api/feature-flag'
import { requireRole } from '@/core-v3/api/rbac'
import { refinementPlanBody } from '@/core-v3/api/schemas/plans'
import { PlansRepo } from '@/core-v3/infra/repos/plans.repo'
import { EventsRepo } from '@/core-v3/infra/repos/events.repo'
import { PlanLLMService } from '@/core-v3/infra/llm/plan-llm-service'
import { getLLM } from '@/core-v3/infra/llm'
import { canRefine, markSupersededPreviousPlans } from '@/core-v3/domain/plan-engine'
import { getUserOrIPKey, shouldRateLimit, rateLimitResponse } from '@/core-v3/security/rate-limit'
import { safeLog } from '@/core-v3/security/sanitize'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function toObjectId(hex: string) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { ObjectId } = require('mongodb') as { ObjectId: new (h: string) => any }
  return new ObjectId(hex)
}

// Simple resolver placeholder; en producción conectar a transcripts reales
async function resolveTranscriptCreatedAt(_: string) { return new Date() }

export async function POST(req: Request) {
  const blocked = routeGuard()
  if (blocked) return blocked
  const auth = await requireRole(req, ['admin', 'parent'])
  if (auth instanceof NextResponse) return auth
  // Rate limit per user/IP
  const id = getUserOrIPKey(req)
  const rl = shouldRateLimit(id, { key: 'plans_refinement', limit: 8, windowMs: 60_000 })
  if (rl.limited) return rateLimitResponse(rl.resetAt)

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }
  const parsed = refinementPlanBody.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 })

  const childId = toObjectId(parsed.data.childId)
  const basePlan = await PlansRepo.getById(parsed.data.basePlanId)
  if (!basePlan) return NextResponse.json({ error: 'gate_failed', reason: 'base_plan_not_found' }, { status: 400 })

  const gate = await canRefine(childId, parsed.data.basePlanId, parsed.data.transcriptId)
  if (!gate.ok) return NextResponse.json({ error: 'gate_failed', reason: gate.reason, context: gate.context }, { status: 400 })

  const window = gate.context.window
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
  const out = await svc.generate(childId, 'transcript_refinement', window)
  if (!out.ok) return NextResponse.json({ error: out.error, reason: out.reason, attempts: out.attempts }, { status: 502 })

  const planNumber = (basePlan as any)?.planNumber ?? 0
  const planVersion = await PlansRepo.getNextPlanVersion(childId, planNumber)
  const sourceData = {
    window: { from: window.from.toISOString(), to: window.to.toISOString() },
    byType: await EventsRepo.countByTypes(childId, window.from, window.to),
    eventCount: gate.context.eventCount,
    distinctTypes: gate.context.distinctTypes,
    ageInMonths: gate.context.ageInMonths,
    basePlanId: parsed.data.basePlanId,
    transcriptId: parsed.data.transcriptId,
  }
  const created = await PlansRepo.createPlan({
    childId,
    planType: 'transcript_refinement',
    planNumber,
    planVersion,
    output: out.output,
    sourceData,
    createdBy: auth.userId,
    status: 'active',
  })

  // No se supersedean planes en refinamiento
  safeLog('audit', 'plan_created', { planType: 'transcript_refinement', childId: String(childId), planId: String(created._id), createdBy: auth.userId })

  return NextResponse.json({ ok: true, planId: String(created._id), planNumber, planVersion, output: out.output, sourceData })
}
