import { withApi } from '@/lib/api-middleware'
import { stdOk, stdError, logApi } from '@/lib/api-utils-v2'
import { z } from 'zod'
import { zObjectIdString } from '@/src/domain/object-id'
import { eventRepo } from '@/src/repo/eventRepo'
import { getDb } from '@/core-v3/infra/db'
import { isDualWriteEventsEnabled } from '@/lib/flags'

const flagDualWrite = () => isDualWriteEventsEnabled()

const getQuerySchema = z.object({
  childId: zObjectIdString(z),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  types: z.string().optional(), // comma-separated
})

const postBodySchema = z.object({
  childId: zObjectIdString(z),
  type: z.enum(['sleep', 'nap', 'night_waking', 'wakeup', 'bedtime', 'feeding', 'medication', 'extra_activities']),
  startTime: z.coerce.date(),
  endTime: z.coerce.date().optional(),
  sleepDelay: z.number().int().min(0).max(180).optional(),
  notes: z.string().optional(),
})

const deleteBodySchema = z.object({ _id: zObjectIdString(z) })

const flagExplain = () => String(process.env.HD_V2_EVENTS_EXPLAIN || '').toLowerCase() === 'true'

export const GET = withApi(async ({ query, requestId }) => {
  const types = query.types ? String(query.types).split(',').map((s) => s.trim()).filter(Boolean) : undefined
  const items = await eventRepo.findByChildWithFilters(query.childId, query.from, query.to, types)
  // Optional: run explain to verify index usage
  if (flagExplain()) {
    const db = await getDb()
    const q: any = { childId: query.childId }
    if (query.from || query.to) q.startTime = { ...(query.from ? { $gte: query.from } : {}), ...(query.to ? { $lte: query.to } : {}) }
    if (types && types.length) q.type = { $in: types }
    try {
      const explain = await db.collection('events').find(q).sort({ startTime: -1 }).explain('executionStats')
      return stdOk({ items }, requestId, { explain })
    } catch {
      // swallow explain errors in production-like envs
    }
  }
  return stdOk({ items }, requestId)
}, { auth: 'user', rateLimit: { limit: 60, windowMs: 60_000, key: 'v2_events_get' }, validate: { query: getQuerySchema } })

export const POST = withApi(async ({ body, requestId }) => {
  if (body.endTime && !(body.endTime > body.startTime)) return stdError('invalid_body', 'endTime must be greater than startTime', requestId, 400)
  const now = new Date()
  const doc = { ...body, createdAt: now, updatedAt: now }
  const created = await eventRepo.insertOne(doc as any)
  // dual-write removed after migration
  return stdOk({ eventId: String((created as any)._id) }, requestId)
}, { auth: 'user', rateLimit: { limit: 30, windowMs: 60_000, key: 'v2_events_post' }, validate: { body: postBodySchema } })

export const DELETE = withApi(async ({ body, requestId }) => {
  const res = await eventRepo.deleteById(body._id)
  // dual-write removed after migration
  return stdOk({ deleted: res.deleted }, requestId)
}, { auth: 'user', rateLimit: { limit: 30, windowMs: 60_000, key: 'v2_events_delete' }, validate: { body: deleteBodySchema } })
