import { withApi } from '@/lib/api-middleware'
import { stdOk, stdError } from '@/lib/api-utils-v2'
import { z } from 'zod'
import { isObjectIdHex, toObjectId } from '@/src/domain/object-id'
import { planRepo } from '@/src/repo/planRepo'

const paramsSchema = z.object({ childId: z.string(), planId: z.string() })

export const PUT = withApi(
  async ({ params, requestId }) => {
    const { childId, planId } = params
    if (!isObjectIdHex(childId) || !isObjectIdHex(planId)) return stdError('invalid_params', 'Invalid ids', requestId, 400)
    const { completed } = await planRepo.completePlan(toObjectId(childId), toObjectId(planId))
    return stdOk({ completed }, requestId)
  },
  { auth: 'user', validate: { params: paramsSchema }, rateLimit: { limit: 30, windowMs: 60_000, key: 'v2_child_plan_complete' } }
)
