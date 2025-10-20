import { getDb } from '@/core-v3/infra/db'
import { parseMode, ensureBackupDir, backupCollection, logJSON } from './utils'
import { mapLegacyStatus } from '@/src/domain/status'

async function normalizeStatus() {
  const mode = parseMode()
  const outDir = await ensureBackupDir('003-normalize-status')
  const db = await getDb()

  const name = 'plans'
  const filter = { status: { $exists: true } }
  const plans = await db.collection(name).find(filter, { projection: { status: 1, childId: 1, createdAt: 1 } }).toArray()
  if (!plans.length) {
    await logJSON('migrate-003', 'skip_collection', { name })
    return
  }
  const backed = await backupCollection(name, filter, outDir)
  let migrated = 0
  if (mode === 'apply') {
    for (const p of plans) {
      const mapped = mapLegacyStatus((p as any).status)
      if (mapped !== (p as any).status) {
        await db.collection(name).updateOne({ _id: p._id }, { $set: { status: mapped } })
        migrated++
      }
    }
    // Optional: mark older actives as superseded per child
    const children = Array.from(new Set(plans.map((p) => String((p as any).childId))))
    for (const cid of children) {
      const list = plans.filter((p) => String((p as any).childId) === cid).sort((a, b) => ((a as any).createdAt > (b as any).createdAt ? -1 : 1))
      const latestActive = list.find((p) => mapLegacyStatus((p as any).status) === 'active')
      if (latestActive) {
        const older = list.filter((p) => (p as any)._id !== (latestActive as any)._id && mapLegacyStatus((p as any).status) === 'active')
        if (older.length) {
          await db.collection(name).updateMany({ _id: { $in: older.map((o) => (o as any)._id) } }, { $set: { status: 'superseded' } })
        }
      }
    }
  }
  await logJSON('migrate-003', 'collection_done', { name, candidates: plans.length, backup: backed, migrated, mode })
}

normalizeStatus().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('[003-normalize-status] Error', e)
  process.exit(1)
})

