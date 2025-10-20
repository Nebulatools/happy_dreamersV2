import { NextResponse } from 'next/server'
import { routeGuard } from '@/core-v3/api/feature-flag'
import { requireRole } from '@/core-v3/api/rbac'
import { getDb } from '@/core-v3/infra/db'
import { detectDriftForChild } from '@/core-v3/infra/sync-service'
import { getUserOrIPKey, shouldRateLimit, rateLimitResponse } from '@/core-v3/security/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function toObjectId(hex: string) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { ObjectId } = require('mongodb') as { ObjectId: new (h: string) => any }
  return new ObjectId(hex)
}

export async function GET(req: Request) {
  const blocked = routeGuard()
  if (blocked) return blocked
  const auth = await requireRole(req, ['admin'])
  if (auth instanceof NextResponse) return auth
  const id = getUserOrIPKey(req)
  const rl = shouldRateLimit(id, { key: 'admin_sync_children', limit: 10, windowMs: 60_000 })
  if (rl.limited) return rateLimitResponse(rl.resetAt)

  const db = await getDb()
  const out: any[] = []
  const cur = db.collection('children').find({}, { projection: { _id: 1 } })
  for await (const c of cur as any) {
    out.push(await detectDriftForChild(c._id))
  }
  return NextResponse.json({ ok: true, drift: out })
}

