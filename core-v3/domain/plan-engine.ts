import type { ObjectId } from 'mongodb'
import { EventsRepo } from '@core-v3/infra/repos/events.repo'
import { PlansRepo } from '@core-v3/infra/repos/plans.repo'
import { ChildrenRepo } from '@core-v3/infra/repos/children.repo'
import { CONF } from '@core-v3/config'

export type PlanWindow = { from: Date; to: Date }

export type PlanContext = {
  childId: ObjectId
  window: PlanWindow
  eventCount: number
  typeCounts: Record<string, number>
  distinctTypes: number
  ageInMonths?: number
  lastPlanId?: string
  lastPlanCreatedAt?: Date
  surveyComplete?: boolean
}

export type GateResult = { ok: true; context: PlanContext } | { ok: false; reason: string; context: PlanContext }

function intEnv(key: string, fallback: number): number {
  const v = Number.parseInt(String(process.env[key] || ''), 10)
  return Number.isFinite(v) && v > 0 ? v : fallback
}

function log(event: string, data: Record<string, unknown>) {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ scope: 'PlanEngine', event, ...data }))
}

function monthsBetween(a: Date, b: Date): number {
  const years = b.getUTCFullYear() - a.getUTCFullYear()
  const months = b.getUTCMonth() - a.getUTCMonth()
  const total = years * 12 + months
  // ajustar si el día del mes aún no alcanza
  if (b.getUTCDate() < a.getUTCDate()) return total - 1
  return total
}

export function defaultWindow(now = new Date()): PlanWindow {
  const days = intEnv('HD_PLAN_DEFAULT_WINDOW_DAYS', 30)
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  return { from, to: now }
}

export async function collectPlanContext(childId: ObjectId, window: PlanWindow): Promise<PlanContext> {
  const { from, to } = window
  const counts = await EventsRepo.countByTypes(childId, from, to)
  const eventCount = Object.values(counts).reduce((a, b) => a + b, 0)
  const distinctTypes = Object.keys(counts).length
  const child = await ChildrenRepo.findById(childId)
  let ageInMonths: number | undefined
  if (child?.birthdate instanceof Date) {
    ageInMonths = monthsBetween(child.birthdate as Date, to)
  }
  const s: any = (child as any)?.surveyData
  const surveyComplete = !!(s?.completed === true || (s && Object.keys(s).length > 0 && s?.isPartial !== true))
  const baseCtx: any = { childId, window, eventCount, typeCounts: counts, distinctTypes, surveyComplete }
  if (typeof ageInMonths === 'number') baseCtx.ageInMonths = ageInMonths
  const context: PlanContext = baseCtx
  log('plan_context', {
    childId: String(childId),
    from,
    to,
    eventCount,
    distinctTypes,
    ageInMonths,
  })
  return context
}

function sanityGate(context: PlanContext): { ok: true } | { ok: false; reason: string } {
  const minN = CONF.PLAN_MIN_EVENTS
  const minK = CONF.PLAN_MIN_DISTINCT_TYPES
  if (context.eventCount < minN) return { ok: false, reason: 'not_enough_events' }
  if (context.distinctTypes < minK) return { ok: false, reason: 'not_enough_distinct_types' }
  if (typeof context.ageInMonths !== 'number' || context.ageInMonths < 0) return { ok: false, reason: 'invalid_age' }
  return { ok: true }
}

export async function canGenerateInitial(childId: ObjectId, window: PlanWindow = defaultWindow()): Promise<GateResult> {
  const context = await collectPlanContext(childId, window)
  // Survey-only override for Plan Inicial
  if (CONF.PLAN_ALLOW_SURVEY_ONLY && context.surveyComplete) {
    return { ok: true, context }
  }
  const check = sanityGate(context)
  if (check.ok) return { ok: true, context }
  log('gate_denied', { type: 'initial', reason: check.reason })
  return { ok: false, reason: check.reason, context }
}

export async function canGenerateProgression(childId: ObjectId, afterPlanId: string): Promise<GateResult> {
  const base = await PlansRepo.getById(afterPlanId)
  if (!base) {
    const ctx = await collectPlanContext(childId, defaultWindow())
    return { ok: false, reason: 'base_plan_not_found', context: ctx }
  }
  const win = { from: base.createdAt as Date, to: new Date() }
  const context = await collectPlanContext(childId, win)
  if (context.eventCount <= 0) {
    log('gate_denied', { type: 'progression', reason: 'no_new_events_since_base_plan' })
    return { ok: false, reason: 'no_new_events_since_base_plan', context }
  }
  const check = sanityGate(context)
  if (check.ok) return { ok: true, context }
  log('gate_denied', { type: 'progression', reason: check.reason })
  return { ok: false, reason: check.reason, context }
}

let getTranscriptCreatedAt: (id: string) => Promise<Date | null> = async () => null
export function setTranscriptResolver(fn: (id: string) => Promise<Date | null>) {
  getTranscriptCreatedAt = fn
}

export async function canRefine(childId: ObjectId, basePlanId: string, transcriptId: string): Promise<GateResult> {
  const base = await PlansRepo.getById(basePlanId)
  if (!base) {
    const ctx = await collectPlanContext(childId, defaultWindow())
    return { ok: false, reason: 'base_plan_not_found', context: ctx }
  }
  const tAt = await getTranscriptCreatedAt(transcriptId)
  if (!tAt) {
    const ctx = await collectPlanContext(childId, { from: base.createdAt as Date, to: new Date() })
    return { ok: false, reason: 'transcript_not_found', context: ctx }
  }
  if (!(tAt > (base.createdAt as Date))) {
    const ctx = await collectPlanContext(childId, { from: base.createdAt as Date, to: new Date() })
    return { ok: false, reason: 'transcript_not_after_base_plan', context: ctx }
  }
  // Por defecto no aplicamos el sanity gate para refinamientos; se puede habilitar con env
  const requireSanity = String(process.env.HD_PLAN_SANITY_FOR_REFINEMENT || '').toLowerCase() === 'true'
  const ctx = await collectPlanContext(childId, { from: base.createdAt as Date, to: new Date() })
  if (requireSanity) {
    const check = sanityGate(ctx)
    if (!check.ok) return { ok: false, reason: check.reason, context: ctx }
  }
  return { ok: true, context: ctx }
}

export async function markSupersededPreviousPlans(childId: ObjectId, newPlanId: string) {
  await PlansRepo.markSuperseded(childId, newPlanId)
  log('plans_superseded', { childId: String(childId), newPlanId })
}
