import { getDb } from '@/core-v3/infra/db'
import { sanitize } from './sanitize'

export async function audit(action: string, actorUserId: string, target: Record<string, any>, metadata: Record<string, any> = {}) {
  const db = await getDb()
  const doc = {
    action,
    actorUserId,
    target: sanitize(target),
    metadata: sanitize(metadata),
    createdAt: new Date(),
  }
  await db.collection('audit_logs').insertOne(doc)
}

