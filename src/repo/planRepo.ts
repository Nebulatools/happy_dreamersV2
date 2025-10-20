import type { ChildPlan } from '../domain/entities'
import { getDb } from '@/core-v3/infra/db'
import { mapLegacyStatus, type PlanStatus } from '@/src/domain/status'

function normalize<T extends Record<string, any>>(doc: T | null): (T & { status?: PlanStatus }) | null {
  if (!doc) return null
  if (typeof (doc as any).status !== 'undefined') {
    ;(doc as any).status = mapLegacyStatus(String((doc as any).status))
  }
  return doc as any
}

export const planRepo = {
  async findLatestByCreatedAt(childId: any): Promise<ChildPlan | null> {
    const db = await getDb()
    const doc = await db.collection('plans').find({ childId }).sort({ createdAt: -1 }).limit(1).next()
    return normalize(doc) as ChildPlan | null
  },
  async listByChild(childId: any): Promise<ChildPlan[]> {
    const db = await getDb()
    const items = (await db
      .collection('plans')
      .find({ childId })
      .sort({ createdAt: -1 })
      .toArray()) as ChildPlan[]
    return items.map((d: any) => ({ ...d, status: mapLegacyStatus(String(d.status)) }))
  },
  async findActive(childId: any): Promise<ChildPlan | null> {
    const db = await getDb()
    const active = await db
      .collection('plans')
      .find({ childId, status: { $in: ['active', 'activo'] } })
      .sort({ createdAt: -1 })
      .limit(1)
      .next()
    return normalize(active) as ChildPlan | null
  },
  async insert(plan: ChildPlan): Promise<ChildPlan> {
    const db = await getDb()
    const res = await db.collection('plans').insertOne(plan)
    return { ...plan, _id: res.insertedId } as any
  },
  async applyPlan(childId: any, planId: any): Promise<{ completedPrev: number; activated: number }> {
    const db = await getDb()
    const now = new Date()
    const prev = await db
      .collection('plans')
      .updateMany({ childId, status: { $in: ['active', 'activo'] }, _id: { $ne: planId } }, { $set: { status: 'completed', updatedAt: now } })
    const tgt = await db
      .collection('plans')
      .updateOne({ _id: planId, childId }, { $set: { status: 'active', updatedAt: now } })
    return { completedPrev: prev.modifiedCount || 0, activated: tgt.modifiedCount || 0 }
  },
  async completePlan(childId: any, planId: any): Promise<{ completed: number }> {
    const db = await getDb()
    const now = new Date()
    const res = await db.collection('plans').updateOne({ _id: planId, childId }, { $set: { status: 'completed', updatedAt: now } })
    return { completed: res.modifiedCount || 0 }
  },
  async supersedePlan(childId: any, planId: any): Promise<{ superseded: number }> {
    const db = await getDb()
    const now = new Date()
    const res = await db.collection('plans').updateOne({ _id: planId, childId }, { $set: { status: 'superseded', updatedAt: now } })
    return { superseded: res.modifiedCount || 0 }
  },
}
