import { NextResponse } from 'next/server'
import { routeGuard } from '@/core-v3/api/feature-flag'
import { requireRole } from '@/core-v3/api/rbac'
import { conversionSummary } from '@/core-v3/api/gating'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const blocked = routeGuard()
  if (blocked) return blocked
  const auth = await requireRole(req, ['admin'])
  if (auth instanceof NextResponse) return auth
  const summary = conversionSummary()
  return NextResponse.json({ ok: true, summary })
}

