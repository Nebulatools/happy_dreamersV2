import { NextResponse } from 'next/server'
import { routeGuard } from '@/core-v3/api/feature-flag'
import { requireRole } from '@/core-v3/api/rbac'
import { getLatestParams } from '@/core-v3/api/schemas/plans'
import { PlansRepo } from '@/core-v3/infra/repos/plans.repo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function toObjectId(hex: string) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { ObjectId } = require('mongodb') as { ObjectId: new (h: string) => any }
  return new ObjectId(hex)
}

export async function GET(req: Request, { params }: { params: { childId: string } }) {
  const blocked = routeGuard()
  if (blocked) return blocked
  const auth = await requireRole(req, ['admin', 'parent'])
  if (auth instanceof NextResponse) return auth
  const parsed = getLatestParams.safeParse(params)
  if (!parsed.success) return NextResponse.json({ error: 'invalid_params', issues: parsed.error.issues }, { status: 400 })
  const childId = toObjectId(parsed.data.childId)
  const latest = await PlansRepo.findLatestByCreatedAt(childId)
  if (!latest) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json({ ok: true, plan: { ...latest, _id: String(latest._id) } })
}

