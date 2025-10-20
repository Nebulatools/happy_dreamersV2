import { withApi } from '@/lib/api-middleware'
import { stdOk, stdError } from '@/lib/api-utils-v2'
import { z } from 'zod'
import { zObjectIdString } from '@/src/domain/object-id'
import { planRepo } from '@/src/repo/planRepo'

const paramsSchema = z.object({ childId: zObjectIdString(z) })

const postBodySchema = z.object({
  planType: z.enum(['initial', 'event_based', 'transcript_refinement']).default('initial'),
  planNumber: z.coerce.number().int().min(0).default(0).optional(),
  planVersion: z.coerce.number().int().min(0).default(0).optional(),
  output: z.unknown().optional(),
  sourceData: z.unknown().optional(),
})

export const GET = withApi(
  async ({ params, requestId }) => {
    const childId = params.childId
    const [items, active] = await Promise.all([planRepo.listByChild(childId), planRepo.findActive(childId)])
    return stdOk({ items, active }, requestId)
  },
  { auth: 'user', validate: { params: paramsSchema }, rateLimit: { limit: 60, windowMs: 60_000, key: 'v2_child_plans_get' } }
)

export const POST = withApi(
  async ({ params, body, requestId, userId }) => {
    const now = new Date()
    const plan = await planRepo.insert({
      _id: undefined as any,
      childId: params.childId,
      userId: (userId as any),
      planType: body.planType,
      planNumber: body.planNumber ?? 0,
      planVersion: body.planVersion ?? 0,
      status: 'draft',
      output: body.output,
      sourceData: body.sourceData,
      createdAt: now,
      updatedAt: now,
    } as any)
    return stdOk({ planId: String((plan as any)._id) }, requestId)
  },
  { auth: 'user', validate: { params: paramsSchema, body: postBodySchema }, rateLimit: { limit: 30, windowMs: 60_000, key: 'v2_child_plans_post' } }
)

