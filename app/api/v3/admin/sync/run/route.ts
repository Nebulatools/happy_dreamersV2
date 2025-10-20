import { NextResponse } from 'next/server'
import { routeGuard } from '@/core-v3/api/feature-flag'
import { requireRole } from '@/core-v3/api/rbac'
import { syncAllChildren } from '@/core-v3/infra/sync-service'
import { getUserOrIPKey, shouldRateLimit, rateLimitResponse } from '@/core-v3/security/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const blocked = routeGuard()
  if (blocked) return blocked
  const headers = req.headers
  const cronSecret = headers.get('x-cron-secret')
  const validCron = cronSecret && process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET

  let authorized = false
  if (validCron) authorized = true
  else {
    const auth = await requireRole(req, ['admin'])
    if (auth instanceof NextResponse) return auth
    authorized = true
  }

  const id = getUserOrIPKey(req)
  const rl = shouldRateLimit(id, { key: 'admin_sync_run', limit: 2, windowMs: 60_000 })
  if (rl.limited) return rateLimitResponse(rl.resetAt)

  const res = await syncAllChildren()
  return NextResponse.json({ ok: true, summary: res })
}

