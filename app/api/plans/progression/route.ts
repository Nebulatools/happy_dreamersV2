import { NextResponse } from 'next/server'
import { shouldRouteToV3, recordRouting } from '@/core-v3/api/gating'
import * as v3 from '@/app/api/v3/plans/progression/route'
import { checkPlanSanityOrThrow } from '@/lib/plan-sanity'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const endpoint = 'plans_progression'
  const toV3 = shouldRouteToV3(req, endpoint)
  recordRouting(endpoint, toV3)
  if (toV3) return v3.POST(req)
  try {
    const body = await req.json()
    const childIdHex = body?.childId
    if (!childIdHex || !/^[a-f\d]{24}$/i.test(String(childIdHex))) {
      return NextResponse.json({ error: 'invalid_body', message: 'Missing childId' }, { status: 400 })
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ObjectId } = require('mongodb') as { ObjectId: new (h: string) => any }
    await checkPlanSanityOrThrow(new ObjectId(childIdHex), 'unknown')
  } catch (e: any) {
    const status = e?.status || 422
    return NextResponse.json({ error: e?.code || 'plan_sanity_failed', message: e?.message || 'Sanity checks failed' }, { status })
  }
  return NextResponse.json({ error: 'legacy_route_not_implemented', hint: 'Disable v3 or implement legacy handler' }, { status: 501 })
}
