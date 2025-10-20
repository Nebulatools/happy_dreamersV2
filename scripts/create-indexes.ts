import { getDb } from '@/core-v3/infra/db'

async function main() {
  const db = await getDb()
  // events: childId + startTime desc
  await db.collection('events').createIndexes([
    { key: { childId: 1, startTime: -1 }, name: 'events_childId_startTime_desc', background: true },
  ])
  // plans: childId + createdAt desc
  await db.collection('plans').createIndexes([
    { key: { childId: 1, createdAt: -1 }, name: 'plans_childId_createdAt_desc', background: true },
    { key: { childId: 1, planNumber: 1, planVersion: 1 }, name: 'plans_version_unique', unique: false, background: true },
  ])
  // consultation_reports (surveys): childId + createdAt
  await db.collection('consultation_reports').createIndexes([
    { key: { childId: 1, createdAt: -1 }, name: 'reports_childId_createdAt_desc', background: true },
  ])
  console.log(JSON.stringify({ scope: 'indexes', event: 'created' }))
}

main().catch((e) => {
  console.error('[create-indexes] Error', e)
  process.exit(1)
})

