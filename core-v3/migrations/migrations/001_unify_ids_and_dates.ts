import { getDb } from '../../infra/db'

type Mode = 'dry-run' | 'apply'

function log(event: string, data: Record<string, unknown> = {}) {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ scope: 'migrate-001', event, ...data }))
}

function isObjectIdHex(s: unknown): s is string {
  return typeof s === 'string' && /^[a-f\d]{24}$/i.test(s)
}

function parseDateMaybe(d: unknown): Date | null {
  if (d instanceof Date && !isNaN(d.getTime())) return d
  if (typeof d === 'string') {
    const v = new Date(d)
    if (!isNaN(v.getTime())) return v
  }
  return null
}

export async function run({ mode }: { mode: Mode }) {
  const db = await getDb()

  // Events: unify childId to ObjectId and start/end as Date
  const events = db.collection('events')
  const quarantine = db.collection('quarantine_events')

  const cursor = events.find({}, { projection: { childId: 1, startTime: 1, endTime: 1 } })
  let updated = 0
  let quarantined = 0
  let examined = 0

  // Import dinámico de ObjectId para evitar ESM en tests
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { ObjectId } = require('mongodb') as { ObjectId: new (s?: string) => any }

  while (await cursor.hasNext()) {
    const doc = await cursor.next()
    if (!doc) break
    examined++

    const updates: Record<string, unknown> = {}
    let invalid = false
    let reason = ''

    if (isObjectIdHex(doc.childId)) {
      updates.childId = new ObjectId(doc.childId)
    } else if (doc.childId && typeof doc.childId !== 'object') {
      invalid = true
      reason = 'invalid childId'
    }

    const st = parseDateMaybe(doc.startTime)
    const et = parseDateMaybe(doc.endTime)
    if (!st) {
      invalid = true
      reason = reason || 'invalid startTime'
    } else if (!(doc.startTime instanceof Date)) {
      updates.startTime = st
    }
    if (doc.endTime !== undefined) {
      if (et === null) {
        invalid = true
        reason = reason || 'invalid endTime'
      } else if (doc.endTime && !(doc.endTime instanceof Date)) {
        updates.endTime = et
      }
    }

    if (invalid) {
      if (mode === 'apply') {
        await quarantine.insertOne({
          _originalId: doc._id,
          original: doc,
          reason,
          quarantinedAt: new Date(),
        })
        await events.deleteOne({ _id: doc._id })
      }
      quarantined++
      continue
    }

    if (Object.keys(updates).length > 0) {
      updated++
      if (mode === 'apply') {
        await events.updateOne({ _id: doc._id }, { $set: updates })
      }
    }
  }

  log('events_done', { examined, updated, quarantined, mode })

  // children.events[]: normalizar fechas en embebidos (si existen)
  const children = db.collection('children')
  const cCursor = children.find({ events: { $exists: true, $type: 'array' } }, { projection: { events: 1 } })
  let childrenTouched = 0
  while (await cCursor.hasNext()) {
    const child = await cCursor.next()
    if (!child) break
    let changed = false
    const newEvents = (child.events || []).map((e: any) => {
      const copy = { ...e }
      if (typeof copy.startTime === 'string') {
        const d = parseDateMaybe(copy.startTime)
        if (d) {
          copy.startTime = d
          changed = true
        }
      }
      if (typeof copy.endTime === 'string') {
        const d = parseDateMaybe(copy.endTime)
        if (d) {
          copy.endTime = d
          changed = true
        }
      }
      return copy
    })

    if (changed) {
      childrenTouched++
      if (mode === 'apply') {
        await children.updateOne({ _id: child._id }, { $set: { events: newEvents } })
      }
    }
  }

  log('children_done', { childrenTouched, mode })
}

