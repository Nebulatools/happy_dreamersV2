import type { Db, Document, ObjectId } from 'mongodb'
import { getDb } from '../db'
import { SleepEventType } from '@core-v3/domain/entities'

function assertDate(d: unknown, name: string) {
  if (!(d instanceof Date) || isNaN(d.getTime())) {
    throw new Error(`${name} must be a valid Date`)
  }
}

function log(event: string, data: Record<string, unknown>) {
  // logging estructurado simple
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ scope: 'EventsRepo', event, ...data }))
}

function collection(db: Db) {
  return db.collection('events')
}

export type InsertEvent = {
  _id?: ObjectId
  childId: ObjectId
  type: keyof typeof SleepEventType | (typeof SleepEventType)[keyof typeof SleepEventType]
  startTime: Date
  endTime?: Date
  notes?: string
  sleepDelay?: number
  createdAt: Date
  updatedAt: Date
}

export const EventsRepo = {
  async findByChildAndRange(childId: ObjectId, from: Date, to: Date) {
    assertDate(from, 'from')
    assertDate(to, 'to')
    const db = await getDb()
    const cur = collection(db).find({
      childId,
      startTime: { $gte: from, $lte: to },
    })
    const out = await cur.toArray()
    log('findByChildAndRange', { childId: String(childId), from, to, count: out.length })
    return out as Document[]
  },

  async countByTypes(childId: ObjectId, from: Date, to: Date) {
    assertDate(from, 'from')
    assertDate(to, 'to')
    const db = await getDb()
    const pipeline = [
      { $match: { childId, startTime: { $gte: from, $lte: to } } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]
    const rows = await collection(db).aggregate(pipeline).toArray()
    const result: Record<string, number> = {}
    for (const r of rows) result[r._id as string] = r.count as number
    log('countByTypes', { childId: String(childId), from, to, result })
    return result
  },

  async insertManyValidated(events: InsertEvent[]) {
    if (!Array.isArray(events) || events.length === 0) return { insertedCount: 0 }
    // Validaciones básicas de Date vs Date + invariantes mínimos
    for (const ev of events) {
      assertDate(ev.startTime, 'startTime')
      if (ev.endTime) assertDate(ev.endTime, 'endTime')
      if (ev.endTime && !(ev.endTime > ev.startTime)) {
        throw new Error('endTime must be greater than startTime')
      }
      if (ev.sleepDelay !== undefined) {
        if (ev.sleepDelay < 0 || ev.sleepDelay > 180) {
          throw new Error('sleepDelay must be between 0 and 180')
        }
        if (ev.type !== 'sleep') {
          throw new Error('sleepDelay only allowed for type "sleep"')
        }
      }
    }
    const db = await getDb()
    const res = await collection(db).insertMany(events)
    log('insertManyValidated', { count: events.length })
    return { insertedCount: res.insertedCount }
  },
}
