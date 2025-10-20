import { getDb } from '@/core-v3/infra/db'
import { parseMode, ensureBackupDir, backupCollection, logJSON } from './utils'

function parseDateMaybe(v: unknown): Date | null {
  if (v instanceof Date && !isNaN(v.getTime())) return v
  if (typeof v === 'string') {
    const d = new Date(v)
    if (!isNaN(d.getTime())) return d
  }
  return null
}

async function normalizeDates() {
  const mode = parseMode()
  const outDir = await ensureBackupDir('002-normalize-dates')
  const db = await getDb()

  const targets = [
    { name: 'events', fields: ['startTime', 'endTime', 'createdAt', 'updatedAt'] },
    { name: 'children', fields: ['birthdate', 'createdAt', 'updatedAt'] },
    { name: 'plans', fields: ['createdAt', 'updatedAt'] },
    { name: 'consultation_reports', fields: ['createdAt', 'updatedAt'] },
    { name: 'consultation_sessions', fields: ['startedAt', 'endedAt', 'createdAt', 'updatedAt'] },
  ]

  for (const { name, fields } of targets) {
    const or = fields.map((f) => ({ [f]: { $type: 'string' } }))
    const filter = { $or: or }
    const toFix = await db.collection(name).find(filter).toArray()
    if (!toFix.length) {
      await logJSON('migrate-002', 'skip_collection', { name })
      continue
    }
    const backed = await backupCollection(name, filter, outDir)
    let migrated = 0
    if (mode === 'apply') {
      for (const doc of toFix) {
        const update: Record<string, any> = {}
        for (const f of fields) {
          const v = (doc as any)[f]
          const d = parseDateMaybe(v)
          if (d && !(v instanceof Date)) update[f] = d
        }
        if (Object.keys(update).length) {
          await db.collection(name).updateOne({ _id: doc._id }, { $set: update })
          migrated++
        }
      }
    }
    await logJSON('migrate-002', 'collection_done', { name, candidates: toFix.length, backup: backed, migrated, mode })
  }
}

normalizeDates().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('[002-normalize-dates] Error', e)
  process.exit(1)
})

