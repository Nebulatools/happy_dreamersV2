import type { ObjectId } from 'mongodb'
import { getDb } from '@core-v3/infra/db'
import { safeLog } from '@core-v3/security/sanitize'
import { incSyncDriftDetected, incSyncRepaired } from '@core-v3/observability/metrics'

type MinimalEvent = {
  _id: any
  type: string
  startTime: Date
  endTime?: Date
  sleepDelay?: number
  notes?: string
}

export type DriftReport = {
  childId: string
  canonicalCount: number
  embeddedCount: number
  missing: number
  extra: number
}

export async function detectDriftForChild(childId: ObjectId): Promise<DriftReport> {
  const db = await getDb()
  const canonicalCount = await db.collection('events').countDocuments({ childId })
  const child = await db.collection('children').findOne({ _id: childId }, { projection: { _id: 1, events: 1 } })
  const embeddedCount = Array.isArray((child as any)?.events) ? (child as any).events.length : 0
  const report: DriftReport = {
    childId: String(childId),
    canonicalCount,
    embeddedCount,
    missing: Math.max(canonicalCount - embeddedCount, 0),
    extra: Math.max(embeddedCount - canonicalCount, 0),
  }
  if (report.missing > 0 || report.extra > 0) {
    incSyncDriftDetected()
    safeLog('sync', 'drift_detected', report)
  }
  return report
}

export async function repairEmbeddedFromCanonical(childId: ObjectId): Promise<{ updated: boolean; newCount: number }> {
  const db = await getDb()
  const cursor = db.collection('events').find({ childId }).sort({ startTime: 1 })
  const list = await (cursor as any).toArray()
  const events: MinimalEvent[] = []
  for (const e of list as any[]) {
    events.push({
      _id: e._id,
      type: e.type,
      startTime: e.startTime,
      endTime: e.endTime,
      sleepDelay: e.sleepDelay,
      notes: e.notes,
    })
  }
  const res = await db
    .collection('children')
    .updateOne({ _id: childId }, { $set: { events } })
  const updated = (res as any).matchedCount > 0
  if (updated) {
    incSyncRepaired()
    safeLog('sync', 'repaired_embedded', { childId: String(childId), count: events.length })
  }
  return { updated, newCount: events.length }
}

export async function syncAllChildren(limit?: number): Promise<{ scanned: number; repaired: number; withDrift: number }> {
  const db = await getDb()
  const col = db.collection('children')
  const arr = await (col.find({}, { projection: { _id: 1 } }) as any).toArray()
  let scanned = 0
  let repaired = 0
  let withDrift = 0
  for (const c of arr as any[]) {
    if (limit && scanned >= limit) break
    scanned++
    const drift = await detectDriftForChild(c._id)
    if (drift.missing > 0 || drift.extra > 0) {
      withDrift++
      const r = await repairEmbeddedFromCanonical(c._id)
      if (r.updated) repaired++
    }
  }
  safeLog('sync', 'sync_all_done', { scanned, repaired, withDrift })
  return { scanned, repaired, withDrift }
}

// Retry helpers
export async function withRetry<T>(fn: () => Promise<T>, attempts = 3, backoffMs = 200): Promise<T> {
  let lastErr: any
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (e) {
      lastErr = e
      await new Promise((r) => setTimeout(r, backoffMs * (i + 1)))
    }
  }
  throw lastErr
}
