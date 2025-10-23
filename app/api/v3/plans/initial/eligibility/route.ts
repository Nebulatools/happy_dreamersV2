import { NextResponse } from 'next/server'
import { routeGuard } from '@/core-v3/api/feature-flag'
import { requireRole } from '@/core-v3/api/rbac'
import { getUserOrIPKey, rateLimitResponse, shouldRateLimit } from '@/core-v3/security/rate-limit'
import { defaultWindow } from '@/core-v3/domain/plan-engine'
import { EventsRepo } from '@/core-v3/infra/repos/events.repo'
import { ChildrenRepo } from '@/core-v3/infra/repos/children.repo'
import { computeInitialEligibility } from '@/core-v3/domain/eligibility'

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
  const auth = await requireRole(req, ['admin', 'parent'])
  if (auth instanceof NextResponse) return auth
  const id = getUserOrIPKey(req)
  const rl = shouldRateLimit(id, { key: 'plans_initial_eligibility', limit: 30, windowMs: 60_000 })
  if (rl.limited) return rateLimitResponse(rl.resetAt)

  try {
    const { searchParams } = new URL(req.url)
    const childIdHex = searchParams.get('childId') || ''
    if (!/^[a-f\d]{24}$/i.test(childIdHex)) {
      return NextResponse.json({ ok: false, error: 'invalid_params', message: 'childId inválido' }, { status: 400 })
    }
    const childId = toObjectId(childIdHex)
    const window = defaultWindow()

    // 1) Datos de eventos
    const byType = await EventsRepo.countByTypes(childId, window.from, window.to)
    const eventCount = Object.values(byType).reduce((a, b) => a + (b as number), 0)
    const distinctTypes = Object.keys(byType).length

    // 2) Estado de encuesta
    const child = await ChildrenRepo.findById(childId as any)
    const s: any = (child as any)?.surveyData
    const surveyComplete = !!(s?.completed === true || (s && Object.keys(s).length > 0 && s?.isPartial !== true))

    // 3) Flags de entorno
    const allowSurveyOnly = String(process.env.HD_PLAN_ALLOW_SURVEY_ONLY || '').toLowerCase() === 'true'
    const minEvents = Number.parseInt(String(process.env.HD_PLAN_MIN_EVENTS ?? '10'), 10)
    const minDistinctTypes = Number.parseInt(String(process.env.HD_PLAN_MIN_DISTINCT_TYPES ?? '2'), 10)

    // 4) Elegibilidad
    const eligibility = computeInitialEligibility({
      eventCount,
      distinctTypes,
      surveyComplete,
      minEvents,
      minDistinctTypes,
      allowSurveyOnly,
    })

    return NextResponse.json({ ok: true, eligibility })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: 'internal_error', message: e?.message || 'Error' }, { status: 500 })
  }
}

