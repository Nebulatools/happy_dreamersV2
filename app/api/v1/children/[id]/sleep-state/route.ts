// GET /api/v1/children/{id}/sleep-state - estado de sueño actual del niño.

import { withApiKey, apiSuccess, assertChildAllowed } from "@/lib/api/api-key-auth"
import { resolveChildAccess } from "@/lib/api/child-access"
import { computeCurrentSleepState } from "@/lib/events/sleep-state"

export const GET = withApiKey("children:read", async (_req, ctx, actor, db) => {
  const params = await ctx.params
  const childId = String(params?.id || "")
  assertChildAllowed(actor, childId)

  await resolveChildAccess(db, actor, childId, "canViewEvents")
  const state = await computeCurrentSleepState(db, childId)

  return apiSuccess(state)
})
