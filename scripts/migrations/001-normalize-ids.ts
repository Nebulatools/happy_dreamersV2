import { getDb } from '@/core-v3/infra/db'
import { parseMode, ensureBackupDir, backupCollection, logJSON } from './utils'

function isHex24(s: unknown): s is string {
  return typeof s === 'string' && /^[a-f\d]{24}$/i.test(s)
}

async function toObjectId(hex: string) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { ObjectId } = require('mongodb') as { ObjectId: new (hex: string) => any }
  return new ObjectId(hex)
}

async function normalizeIds() {
  const mode = parseMode()
  const outDir = await ensureBackupDir('001-normalize-ids')
  const db = await getDb()

  const collections = [
    { name: 'events', idFields: ['childId', 'userId'] },
    { name: 'children', idFields: ['userId'] },
    { name: 'plans', idFields: ['childId', 'userId'] },
    { name: 'consultation_reports', idFields: ['childId', 'userId', 'planId'] },
    { name: 'consultation_sessions', idFields: ['childId', 'userId', 'reportId'] },
  ]

  for (const { name, idFields } of collections) {
    const filter = { $or: idFields.map((f) => ({ [f]: { $type: 'string' } })) }
    const toFix = await db.collection(name).find(filter, { projection: idFields.reduce((p, f) => ({ ...p, [f]: 1 }), {}) }).toArray()
    if (!toFix.length) {
      await logJSON('migrate-001', 'skip_collection', { name })
      continue
    }
    const backed = await backupCollection(name, filter, outDir)
    let migrated = 0
    if (mode === 'apply') {
      for (const doc of toFix) {
        const update: Record<string, any> = {}
        for (const f of idFields) {
          const v = (doc as any)[f]
          if (isHex24(v)) update[f] = await toObjectId(v)
        }
        if (Object.keys(update).length) {
          await db.collection(name).updateOne({ _id: doc._id }, { $set: update })
          migrated++
        }
      }
    }
    await logJSON('migrate-001', 'collection_done', { name, candidates: toFix.length, backup: backed, migrated, mode })
  }
}

normalizeIds().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('[001-normalize-ids] Error', e)
  process.exit(1)
})

