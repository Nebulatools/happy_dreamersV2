import { withApi } from '@/lib/api-middleware'
import { stdOk } from '@/lib/api-utils-v2'
import { z } from 'zod'
import { zObjectIdString } from '@/src/domain/object-id'
import { getDb } from '@/core-v3/infra/db'

const querySchema = z.object({ childId: zObjectIdString(z) })

export const GET = withApi(async ({ query, requestId }) => {
  const db = await getDb()
  const list = await db.collection('zoom_sessions').find({ childId: query.childId }).sort({ createdAt: -1 }).toArray()
  return stdOk({ items: list }, requestId)
}, { auth: 'admin', validate: { query: querySchema }, rateLimit: { limit: 30, windowMs: 60_000, key: 'zoom_sessions_admin' } })

