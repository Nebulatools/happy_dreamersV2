import { NextResponse } from 'next/server'
import { routeGuard } from '@/core-v3/api/feature-flag'
import { requireRole } from '@/core-v3/api/rbac'
import { detectDriftForChild } from '@/core-v3/infra/sync-service'
import { getUserOrIPKey, shouldRateLimit, rateLimitResponse } from '@/core-v3/security/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function toObjectId(hex: string) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { ObjectId } = require('mongodb') as { ObjectId: new (h: string) => any }
  return new ObjectId(hex)
}

export async function POST(req: Request, { params }: { params: { childId: string } }) {
  const blocked = routeGuard()
  if (blocked) return blocked
  const auth = await requireRole(req, ['admin'])
  if (auth instanceof NextResponse) return auth
  const id = getUserOrIPKey(req)
  const rl = shouldRateLimit(id, { key: 'admin_sync_verify', limit: 20, windowMs: 60_000 })
  if (rl.limited) return rateLimitResponse(rl.resetAt)

  const childId = toObjectId(params.childId)
  const drift = await detectDriftForChild(childId)
  return NextResponse.json({ ok: true, drift })
}

