import type { Db, Document, OptionalId, ObjectId } from 'mongodb'
import { getDb } from '../db'

function collection(db: Db) {
  return db.collection('children')
}

function log(event: string, data: Record<string, unknown>) {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ scope: 'ChildrenRepo', event, ...data }))
}

export const ChildrenRepo = {
  async findById(id: ObjectId) {
    const db = await getDb()
    const doc = await collection(db).findOne({ _id: id })
    log('findById', { id: String(id), found: !!doc })
    return doc as Document | null
  },

  async upsert(doc: OptionalId<Document> & { _id?: ObjectId }) {
    const db = await getDb()
    let id = doc._id as ObjectId | undefined
    if (!id) {
      // Import dinámico para no cargar mongodb ESM en tests
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ObjectId: RuntimeObjectId } = require('mongodb') as { ObjectId: new () => ObjectId }
      id = new RuntimeObjectId()
    }
    const now = new Date()
    const res = await collection(db).updateOne(
      { _id: id },
      { $set: { ...doc, _id: id, updatedAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true }
    )
    log('upsert', { id: String(id), upserted: !!res.upsertedId, matched: res.matchedCount })
    return { _id: id, upserted: !!res.upsertedId }
  },

  // Acceso explícito al modelo operativo: children.events[] (si se usa)
  async listEventsOperational(childId: ObjectId) {
    const db = await getDb()
    const child = await collection(db).findOne({ _id: childId }, { projection: { events: 1 } })
    const events = (child as any)?.events ?? []
    log('listEventsOperational', { childId: String(childId), count: Array.isArray(events) ? events.length : 0 })
    return events as unknown[]
  },
}
