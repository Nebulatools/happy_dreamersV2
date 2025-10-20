import type { Db, Document, ObjectId } from 'mongodb'
import { getDb } from '../db'

function collection(db: Db) {
  return db.collection('plans')
}

function log(event: string, data: Record<string, unknown>) {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ scope: 'PlansRepo', event, ...data }))
}

export const PlansRepo = {
  async getById(id: string) {
    const db = await getDb()
    // Import dinámico para evitar ESM en tests
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ObjectId } = require('mongodb') as { ObjectId: new (hex: string) => any }
    const doc = await collection(db).findOne({ _id: new ObjectId(id) })
    return doc as Document | null
  },
  async findLatestByCreatedAt(childId: ObjectId) {
    const db = await getDb()
    const doc = await collection(db)
      .find({ childId })
      .sort({ createdAt: -1 })
      .limit(1)
      .next()
    log('findLatestByCreatedAt', { childId: String(childId), found: !!doc })
    return doc as Document | null
  },

  // Base para calcular progresión (p.ej., últimos N planes por fecha ascendente)
  async findProgressionBase(childId: ObjectId, limit = 10) {
    const db = await getDb()
    const cur = collection(db)
      .find({ childId })
      .sort({ createdAt: 1 })
      .limit(limit)
    const out = await cur.toArray()
    log('findProgressionBase', { childId: String(childId), count: out.length })
    return out as Document[]
  },
  async findLatestBasePlan(childId: ObjectId) {
    const db = await getDb()
    const doc = await collection(db)
      .find({ childId, planType: { $ne: 'transcript_refinement' } })
      .sort({ createdAt: -1 })
      .limit(1)
      .next()
    return doc as Document | null
  },
  async getNextPlanNumber(childId: ObjectId) {
    const last = await this.findLatestBasePlan(childId)
    const lastNum = (last as any)?.planNumber ?? -1
    return (lastNum as number) + 1
  },
  async getNextPlanVersion(childId: ObjectId, planNumber: number) {
    const db = await getDb()
    const doc = await collection(db)
      .find({ childId, planNumber })
      .sort({ planVersion: -1 })
      .limit(1)
      .next()
    const last = (doc as any)?.planVersion ?? -1
    return (last as number) + 1
  },
  async createPlan(doc: Record<string, any>) {
    const db = await getDb()
    const now = new Date()
    const payload = { ...doc, createdAt: doc.createdAt ?? now, updatedAt: doc.updatedAt ?? now }
    const res = await collection(db).insertOne(payload)
    return { _id: res.insertedId, ...payload }
  },
  async markSuperseded(childId: ObjectId, newPlanId: string) {
    const db = await getDb()
    // Import dinámico para construir ObjectId
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ObjectId } = require('mongodb') as { ObjectId: new (hex: string) => any }
    await collection(db).updateMany(
      { childId, _id: { $ne: new ObjectId(newPlanId) }, planType: { $ne: 'transcript_refinement' } },
      { $set: { status: 'superseded', updatedAt: new Date() } }
    )
  },
}
