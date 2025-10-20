import { getDb } from '@/core-v3/infra/db'

async function main() {
  const db = await getDb()
  const children = db.collection('children')
  const eventsCol = db.collection('events')
  const cursor = children.find({ events: { $exists: true, $type: 'array', $ne: [] } }, { projection: { events: 1 } })
  let moved = 0
  for await (const doc of cursor as any) {
    const childId = doc._id
    const evs = Array.isArray(doc.events) ? doc.events : []
    if (!evs.length) continue
    const toInsert = evs.map((e: any) => ({
      _id: e._id, // if strings, driver will accept; else duplicates will error and be skipped in manual runs
      childId,
      type: e.eventType || e.type,
      startTime: e.startTime ? new Date(e.startTime) : undefined,
      endTime: e.endTime ? new Date(e.endTime) : undefined,
      notes: e.notes,
      createdAt: e.createdAt ? new Date(e.createdAt) : new Date(),
      updatedAt: new Date(),
    }))
    const valid = toInsert.filter((e: any) => e.childId && e.type && e.startTime instanceof Date && !isNaN(e.startTime.getTime()))
    if (valid.length) {
      try { await eventsCol.insertMany(valid, { ordered: false }) } catch { /* ignore dup errors */ }
      moved += valid.length
    }
    await children.updateOne({ _id: childId }, { $unset: { events: '' } })
  }
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ scope: 'janitor', event: 'children_events_migrated', moved }))
}

main().catch((e) => { console.error(e); process.exit(1) })

