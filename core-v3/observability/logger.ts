import { sanitize } from '@/core-v3/security/sanitize'

export type PlanLog = {
  childId: string
  planType?: 'initial' | 'event_based' | 'transcript_refinement'
  eventCount?: number
  typesCount?: number
  dateRange?: { from: string; to: string }
  ageInMonths?: number
  ragSources?: string[]
  gateStatus?: 'passed' | 'failed'
  reason?: string
}

export function logPlan(event: string, data: PlanLog & Record<string, unknown>): void {
  const payload = sanitize(data)
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ scope: 'PlanObs', event, ...payload }))
}

// OTLP stub exporter (no-op unless enabled)
export async function exportOTLP(spanName: string, attributes: Record<string, unknown> = {}) {
  const endpoint = process.env.HD_V3_OTLP_ENDPOINT
  if (!endpoint) return
  // Stub: in real usage, send to OTLP collector
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ scope: 'OTLPStub', span: spanName, attributes: sanitize(attributes) }))
}
