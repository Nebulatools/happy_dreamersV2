function truthy(v?: string | null) {
  return String(v || '').toLowerCase() === 'true'
}

export function isProduction() {
  return process.env.NODE_ENV === 'production'
}

// API v2 master switch (Strangler Pattern):
// - In production: requires V2_API_ENABLED=true
// - In non‑prod (dev/test): default enabled unless explicitly false
export function isV2ApiEnabled(): boolean {
  const env = process.env.V2_API_ENABLED
  if (isProduction()) return truthy(env)
  return String(env || '').toLowerCase() !== 'false'
}

// RAG context v2 toggle (default off)
export function isV2RagContextEnabled(): boolean {
  const env = process.env.V2_RAG_CONTEXT_ENABLED || process.env.RAG_CONTEXT_V2
  return truthy(env)
}

// Dual write events (temporary toggle)
export function isDualWriteEventsEnabled(): boolean {
  const env = process.env.DUAL_WRITE_EVENTS || process.env.HD_V2_EVENTS_DUAL_WRITE
  return truthy(env)
}

// Canary helper: returns true for admin/internal or based on percentage
export function isV2CanaryEligible(userRole?: string, hashBase?: string): boolean {
  if (userRole === 'admin') return true
  const pct = Number.parseInt(String(process.env.V2_API_CANARY_PERCENT || ''), 10)
  if (!Number.isFinite(pct) || pct <= 0) return false
  const s = hashBase || Math.random().toString(36)
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return (h % 100) < pct
}

