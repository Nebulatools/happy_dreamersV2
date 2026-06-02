// GET /api/v1/children/{id} - detalle de un niño accesible por la API key.

import { withApiKey, apiSuccess, assertChildAllowed } from "@/lib/api/api-key-auth"
import { resolveChildAccess } from "@/lib/api/child-access"

export const GET = withApiKey("children:read", async (_req, ctx, actor, db) => {
  const params = await ctx.params
  const childId = String(params?.id || "")
  assertChildAllowed(actor, childId)

  const { child } = await resolveChildAccess(db, actor, childId, "canViewEvents")

  return apiSuccess({
    id: child._id.toString(),
    firstName: child.firstName,
    lastName: child.lastName,
    birthDate: child.birthDate ?? null,
    archived: (child as any).archived ?? false,
    surveyCompleted: child.surveyData?.completed ?? false,
  })
})
