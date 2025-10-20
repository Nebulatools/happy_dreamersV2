import type { Child } from '../domain/entities'
import { getDb } from '@/core-v3/infra/db'

export const childRepo = {
  async findById(id: any): Promise<Child | null> {
    const db = await getDb()
    const doc = await db.collection('children').findOne({ _id: id })
    return doc as Child | null
  },
  async list(filter: any, page = 1, pageSize = 20): Promise<{ items: Child[]; total: number }> {
    const db = await getDb()
    const q: any = { ...filter }
    const total = await db.collection('children').countDocuments(q)
    const items = (await db
      .collection('children')
      .find(q)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray()) as Child[]
    return { items, total }
  },
  async insert(child: Child): Promise<Child> {
    const db = await getDb()
    await db.collection('children').insertOne(child)
    return child
  },
  async updateBasic(id: any, patch: Partial<Child>, ownerId?: any): Promise<{ matched: number; modified: number }> {
    const db = await getDb()
    const filter: any = { _id: id }
    if (ownerId) filter.userId = ownerId
    const res = await db.collection('children').updateOne(filter, { $set: patch })
    return { matched: res.matchedCount, modified: res.modifiedCount }
  },
  async deleteById(id: any, ownerId?: any): Promise<{ deleted: number }> {
    const db = await getDb()
    const filter: any = { _id: id }
    if (ownerId) filter.userId = ownerId
    const res = await db.collection('children').deleteOne(filter)
    return { deleted: res.deletedCount || 0 }
  },
}
