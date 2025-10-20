import { NextResponse } from 'next/server'
import { routeGuard } from '@/core-v3/api/feature-flag'
import { requireRole } from '@/core-v3/api/rbac'
import { getPlanParams } from '@/core-v3/api/schemas/plans'
import { PlansRepo } from '@/core-v3/infra/repos/plans.repo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { planId: string } }) {
  const blocked = routeGuard()
  if (blocked) return blocked
  const auth = await requireRole(_req, ['admin', 'parent'])
  if (auth instanceof NextResponse) return auth
  const parsed = getPlanParams.safeParse(params)
  if (!parsed.success) return NextResponse.json({ error: 'invalid_params', issues: parsed.error.issues }, { status: 400 })
  const plan = await PlansRepo.getById(parsed.data.planId)
  if (!plan) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json({ ok: true, plan: { ...plan, _id: String(plan._id) } })
}

