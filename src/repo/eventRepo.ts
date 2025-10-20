import type { Event } from '../domain/entities'
import { getDb } from '@/core-v3/infra/db'

export const eventRepo = {
  async findByChildAndRange(childId: any, from: Date, to: Date): Promise<Event[]> {
    const db = await getDb()
    const cur = db.collection('events').find({ childId, startTime: { $gte: from, $lte: to } })
    return (await cur.toArray()) as Event[]
  },
  async findByChildWithFilters(childId: any, from?: Date, to?: Date, types?: string[]): Promise<Event[]> {
    const db = await getDb()
    const q: any = { childId }
    if (from || to) q.startTime = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) }
    if (types && types.length) q.type = { $in: types }
    return (await db.collection('events').find(q).sort({ startTime: -1 }).toArray()) as Event[]
  },
  async insertMany(events: Event[]) {
    const db = await getDb()
    return db.collection('events').insertMany(events)
  },
  async insertOne(event: Event) {
    const db = await getDb()
    const res = await db.collection('events').insertOne(event)
    return { ...event, _id: res.insertedId }
  },
  async deleteById(id: any) {
    const db = await getDb()
    const res = await db.collection('events').deleteOne({ _id: id })
    return { deleted: res.deletedCount || 0 }
  },
}
