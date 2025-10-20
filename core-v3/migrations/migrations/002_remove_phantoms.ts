import { getDb } from '../../infra/db'

type Mode = 'dry-run' | 'apply'

function log(event: string, data: Record<string, unknown> = {}) {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ scope: 'migrate-002', event, ...data }))
}

export async function run({ mode }: { mode: Mode }) {
  const db = await getDb()
  const events = db.collection('events')
  const children = db.collection('children')
  const quarantine = db.collection('quarantine_events')

  // 1) Orphan events: childId no existe en children
  const childIds = new Set<string>()
  for await (const c of children.find({}, { projection: { _id: 1 } })) {
    childIds.add(String(c._id))
  }

  let orphans = 0
  let orphanIds: string[] = []
  const eCursor = events.find({}, { projection: { _id: 1, childId: 1 } })
  while (await eCursor.hasNext()) {
    const doc = await eCursor.next()
    if (!doc) break
    if (!childIds.has(String(doc.childId))) {
      orphans++
      orphanIds.push(String(doc._id))
      if (mode === 'apply') {
        await quarantine.insertOne({ _originalId: doc._id, original: doc, reason: 'orphan childId', quarantinedAt: new Date() })
        await events.deleteOne({ _id: doc._id })
      }
    }
  }
  log('orphans_done', { orphans })

  // 2) Duplicates: por (childId, type, startTime, endTime)
  const dups = await events
    .aggregate([
      {
        $group: {
          _id: { childId: '$childId', type: '$type', startTime: '$startTime', endTime: '$endTime' },
          ids: { $addToSet: '$_id' },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray()

  let removedDup = 0
  let dupGroups = dups.length
  for (const g of dups) {
    const ids: any[] = g.ids || []
    if (ids.length <= 1) continue
    ids.sort((a, b) => (String(a) < String(b) ? -1 : 1))
    const keep = ids[0]
    const toRemove = ids.slice(1)
    if (toRemove.length > 0) {
      if (mode === 'apply') {
        const docs = await events.find({ _id: { $in: toRemove } }).toArray()
        if (docs.length) await quarantine.insertMany(docs.map((d) => ({ _originalId: d._id, original: d, reason: 'duplicate', quarantinedAt: new Date() })))
        await events.deleteMany({ _id: { $in: toRemove } })
      }
      removedDup += toRemove.length
    }
  }
  log('duplicates_done', { groups: dupGroups, removed: removedDup })

  // 3) children.events[]: limpiar duplicados y registros inválidos básicos
  const cCursor = children.find({ events: { $exists: true, $type: 'array' } }, { projection: { events: 1 } })
  let cleanedChildren = 0
  let cleanedItems = 0
  while (await cCursor.hasNext()) {
    const child = await cCursor.next()
    if (!child) break
    const seen = new Set<string>()
    const kept: any[] = []
    const removed: any[] = []
    for (const e of child.events || []) {
      const hasDates = e && e.startTime instanceof Date && (e.endTime === undefined || e.endTime instanceof Date)
      const type = e?.type
      if (!hasDates || !type) {
        removed.push(e)
        continue
      }
      const key = `${String(type)}|${String(e.startTime.getTime())}|${String(e.endTime ? e.endTime.getTime() : 'null')}`
      if (seen.has(key)) {
        removed.push(e)
      } else {
        seen.add(key)
        kept.push(e)
      }
    }
    if (removed.length > 0) {
      cleanedChildren++
      cleanedItems += removed.length
      if (mode === 'apply') {
        await children.updateOne({ _id: child._id }, { $set: { events: kept } })
        const quarantineChild = db.collection('quarantine_children_events')
        await quarantineChild.insertOne({ _childId: child._id, removed, reason: 'invalid_or_duplicate_embedded', quarantinedAt: new Date() })
      }
    }
  }
  log('children_embedded_done', { cleanedChildren, cleanedItems })
}

