// GET /api/v1/children - lista de niños accesibles por la API key (respeta allowlist).

import { withApiKey, apiSuccess } from "@/lib/api/api-key-auth"
import { getAccessibleChildren } from "@/lib/db/user-child-access"

export const GET = withApiKey("children:read", async (_req, _ctx, actor) => {
  let children = await getAccessibleChildren(actor.id)
  if (actor.childIds.length > 0) {
    children = children.filter((c) => actor.childIds.includes(c._id.toString()))
  }

  return apiSuccess(
    children.map((c) => ({
      id: c._id.toString(),
      firstName: c.firstName,
      lastName: c.lastName,
      birthDate: c.birthDate ?? null,
      archived: c.archived ?? false,
    }))
  )
})
