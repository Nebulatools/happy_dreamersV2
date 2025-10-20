import type { NextRequest } from 'next/server'
import { isV3Enabled } from '@/core-v3/api/feature-flag'
import { getClientIP } from '@/core-v3/security/rate-limit'
import { inc as incMetric, snapshot } from '@/core-v3/observability/metrics'

function djb2(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) hash = (hash * 33) ^ str.charCodeAt(i)
  return hash >>> 0
}

function percentForIdentity(id: string): number {
  return djb2(id) % 100
}

export function shouldRouteToV3(req: Request | NextRequest, endpointKey: string): boolean {
  if (!isV3Enabled()) return false
  const h = (req as any).headers as Headers
  const force = (h.get('x-force-v3') || '').toLowerCase()
  if (force === 'true' || force === '1' || force === 'on') return true
  const disable = (h.get('x-disable-v3') || '').toLowerCase()
  if (disable === 'true' || disable === '1' || disable === 'on') return false

  const pctEnv = Number.parseInt(String(process.env.HD_V3_PERCENT || ''), 10)
  const pct = Number.isFinite(pctEnv) ? Math.min(Math.max(pctEnv, 0), 100) : 0
  if (pct >= 100) return true
  if (pct <= 0) return false

  const userId = h.get('x-test-user-id') || ''
  const ip = getClientIP(req as any)
  const identity = userId || ip || endpointKey
  const bucket = percentForIdentity(identity)
  return bucket < pct
}

export function recordRouting(endpointKey: string, routedToV3: boolean) {
  incMetric(routedToV3 ? 'route_v3_total' : 'route_legacy_total', { endpoint: endpointKey })
}

export function conversionSummary() {
  const snap = snapshot()
  const counts = Object.entries(snap.counts).filter(([k]) => k.startsWith('route_'))
  return { counts, llm: snap.llm_durations }
}

