import { getDb } from './db'

/**
 * Crea índices necesarios para v3. Idempotente.
 */
export async function ensureIndexes() {
  const db = await getDb()

  await db.collection('events').createIndexes([
    {
      key: { childId: 1, startTime: 1 },
      name: 'events_childId_startTime',
      background: true,
    },
  ])

  await db.collection('plans').createIndexes([
    {
      key: { childId: 1, createdAt: -1 },
      name: 'plans_childId_createdAt_desc',
      background: true,
    },
  ])
}

