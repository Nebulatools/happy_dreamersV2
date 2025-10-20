type Labels = Record<string, string>

const counters: Record<string, number> = Object.create(null)
const durations: number[] = []
const endpointDurations: Record<string, number[]> = Object.create(null)

function key(name: string, labels?: Labels) {
  if (!labels) return name
  return `${name}${Object.keys(labels).sort().map((k) => `,${k}=${labels[k]}`).join('')}`
}

export function inc(name: string, labels?: Labels, value = 1) {
  const k = key(name, labels)
  counters[k] = (counters[k] || 0) + value
}

export function observeLLMDuration(ms: number) {
  durations.push(ms)
}

export function observeEndpointLatency(route: string, ms: number) {
  const key = route || 'unknown'
  if (!endpointDurations[key]) endpointDurations[key] = []
  endpointDurations[key].push(ms)
}

export function snapshot() {
  const counts = { ...counters }
  const stats = durations.length
    ? {
        count: durations.length,
        avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        p95: percentile(durations, 0.95),
      }
    : { count: 0, avg: 0, p95: 0 }
  const ep: Record<string, { count: number; avg: number; p95: number }> = {}
  for (const [k, arr] of Object.entries(endpointDurations)) {
    ep[k] = arr.length ? { count: arr.length, avg: arr.reduce((a, b) => a + b, 0) / arr.length, p95: percentile(arr, 0.95) } : { count: 0, avg: 0, p95: 0 }
  }
  return { counts, llm_durations: stats, endpoint_latency: ep }
}

export function reset() {
  for (const k of Object.keys(counters)) delete counters[k]
  durations.length = 0
  for (const k of Object.keys(endpointDurations)) delete endpointDurations[k]
}

function percentile(arr: number[], p: number) {
  if (!arr.length) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.floor(p * sorted.length))
  return sorted[idx]
}

// Convenience helpers
export function incPlanGenerated(planType: string) {
  inc('plans_generated_total', { planType })
}
export function incPlanAborted(planType: string, reason: string) {
  inc('plans_aborted_total', { planType, reason })
}
export function incValidationFailed() {
  inc('plan_validation_failed_total')
}

// Sync metrics
export function incSyncDriftDetected() {
  inc('sync_drift_detected_total')
}
export function incSyncRepaired() {
  inc('sync_repaired_total')
}
