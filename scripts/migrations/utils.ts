/* Utility helpers for controlled migrations (idempotent, dry-run capable) */
import fs from 'fs'
import path from 'path'
import { getDb } from '@/core-v3/infra/db'

export type Mode = 'dry-run' | 'apply'

export function parseMode(): Mode {
  const args = process.argv.slice(2)
  if (args.includes('--apply')) return 'apply'
  if (args.includes('--dry-run')) return 'dry-run'
  return 'dry-run'
}

export async function ensureBackupDir(name: string) {
  const base = path.join(process.cwd(), 'backups')
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const dir = path.join(base, `${stamp}-${name}`)
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

export async function backupCollection(collName: string, filter: Record<string, any>, outDir: string) {
  const db = await getDb()
  const docs = await db.collection(collName).find(filter).toArray()
  const safe = JSON.stringify(docs, (_k, v) => {
    if (v && typeof v === 'object') {
      if (v instanceof Date) return v.toISOString()
      if ((v as any)._bsontype === 'ObjectID' || (v as any)._bsontype === 'ObjectId') return v.toString()
    }
    return v
  }, 2)
  fs.writeFileSync(path.join(outDir, `${collName}.json`), safe)
  return docs.length
}

export async function logJSON(scope: string, event: string, data: Record<string, unknown> = {}) {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ scope, event, ...data }))
}

