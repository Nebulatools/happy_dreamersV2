import { withApi } from '@/lib/api-middleware'
import { stdOk, stdError } from '@/lib/api-utils-v2'
import { z } from 'zod'
import { isObjectIdHex, toObjectId, zObjectIdString } from '@/src/domain/object-id'
import { childRepo } from '@/src/repo/childRepo'

const getQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  name: z.string().optional(),
})

const postBodySchema = z.object({
  userId: zObjectIdString(z),
  name: z.string().min(1),
  birthdate: z.coerce.date().optional(),
  tz: z.string().optional(),
})

const patchBodySchema = z.object({
  _id: zObjectIdString(z),
  name: z.string().min(1).optional(),
  birthdate: z.coerce.date().optional(),
  tz: z.string().optional(),
})

const deleteBodySchema = z.object({ _id: zObjectIdString(z) })

export const GET = withApi(async ({ query, requestId, userId }) => {
  const filter: any = {}
  if (query.name) filter.name = { $regex: String(query.name), $options: 'i' }
  // Ownership: limit to current user
  const owner = isObjectIdHex(String(userId)) ? toObjectId(String(userId)) : (userId as any)
  filter.userId = owner
  const { items, total } = await childRepo.list(filter, query.page, query.pageSize)
  return stdOk({ items, total, page: query.page, pageSize: query.pageSize }, requestId)
}, { auth: 'user', rateLimit: { limit: 60, windowMs: 60_000, key: 'v2_children_get' }, validate: { query: getQuerySchema } })

export const POST = withApi(async ({ body, requestId, userId }) => {
  // Enforce ownership: body.userId debe coincidir con auth user
  const authOwner = isObjectIdHex(String(userId)) ? toObjectId(String(userId)) : (userId as any)
  const bodyOwner = (body as any).userId
  const authHex = typeof (authOwner as any)?.toHexString === 'function' ? (authOwner as any).toHexString() : (authOwner as any)?._oid || String(authOwner)
  const bodyHex = typeof (bodyOwner as any)?.toHexString === 'function' ? (bodyOwner as any).toHexString() : (bodyOwner as any)?._oid || String(bodyOwner)
  if (authHex !== bodyHex) return stdError('forbidden', 'Not owner', requestId, 403)

  const now = new Date()
  const doc = { _id: (body as any)._id || undefined, ...body, createdAt: now, updatedAt: now }
  const created = await childRepo.insert(doc as any)
  return stdOk({ childId: String((created as any)._id) }, requestId)
}, { auth: 'user', rateLimit: { limit: 30, windowMs: 60_000, key: 'v2_children_post' }, validate: { body: postBodySchema } })

export const PATCH = withApi(async ({ body, requestId, userId }) => {
  const id = body._id
  const owner = isObjectIdHex(String(userId)) ? toObjectId(String(userId)) : (userId as any)
  const patch: any = { updatedAt: new Date() }
  if (typeof body.name !== 'undefined') patch.name = body.name
  if (typeof body.birthdate !== 'undefined') patch.birthdate = body.birthdate
  if (typeof body.tz !== 'undefined') patch.tz = body.tz
  const res = await childRepo.updateBasic(id, patch, owner)
  if (!res.matched) return stdError('forbidden', 'Not owner or not found', requestId, 403)
  return stdOk({ matched: res.matched, modified: res.modified }, requestId)
}, { auth: 'user', rateLimit: { limit: 30, windowMs: 60_000, key: 'v2_children_patch' }, validate: { body: patchBodySchema } })

export const DELETE = withApi(async ({ body, requestId, userId }) => {
  const id = body._id
  const owner = isObjectIdHex(String(userId)) ? toObjectId(String(userId)) : (userId as any)
  const res = await childRepo.deleteById(id, owner)
  if (!res.deleted) return stdError('forbidden', 'Not owner or not found', requestId, 403)
  return stdOk({ deleted: res.deleted }, requestId)
}, { auth: 'user', rateLimit: { limit: 20, windowMs: 60_000, key: 'v2_children_delete' }, validate: { body: deleteBodySchema } })
