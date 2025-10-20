import { NextResponse } from 'next/server'
import { shouldRouteToV3, recordRouting } from '@/core-v3/api/gating'
import * as v3 from '@/app/api/v3/plans/[planId]/route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request, ctx: { params: { planId: string } }) {
  const endpoint = 'plans_get'
  const toV3 = shouldRouteToV3(req, endpoint)
  recordRouting(endpoint, toV3)
  if (toV3) return v3.GET(req as any, ctx as any)
  return NextResponse.json({ error: 'legacy_route_not_implemented', hint: 'Disable v3 or implement legacy handler' }, { status: 501 })
}

