// GET /api/v1/me - identidad de la API key: usuario + niños accesibles.
// Util para que un cliente (ej: Yose) descubra los childId disponibles tras enlazar.

import { ObjectId } from "mongodb"
import { withApiKey, apiSuccess } from "@/lib/api/api-key-auth"
import { getAccessibleChildren } from "@/lib/db/user-child-access"

export const GET = withApiKey(null, async (_req, _ctx, actor, db) => {
  const user = await db
    .collection("users")
    .findOne({ _id: new ObjectId(actor.id) }, { projection: { password: 0 } })

  let children = await getAccessibleChildren(actor.id)
  if (actor.childIds.length > 0) {
    children = children.filter((c) => actor.childIds.includes(c._id.toString()))
  }

  return apiSuccess({
    user: {
      id: actor.id,
      name: user?.name ?? null,
      email: user?.email ?? null,
      role: user?.role ?? "parent",
      timezone: user?.timezone ?? null,
    },
    scopes: actor.scopes,
    children: children.map((c) => ({
      id: c._id.toString(),
      firstName: c.firstName,
      lastName: c.lastName,
      birthDate: c.birthDate ?? null,
    })),
  })
})
