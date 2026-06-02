// /api/v1/events/{id}
//   PATCH  {childId, endTime?, ...}  -> actualiza un evento (events:write)
//   DELETE ?childId=...              -> elimina un evento (events:write)

import { withApiKey, apiSuccess, assertChildAllowed } from "@/lib/api/api-key-auth"
import { patchEvent, updateEvent, deleteEvent, EventServiceError } from "@/lib/events/event-service"

export const PATCH = withApiKey("events:write", async (req, ctx, actor, db) => {
  const params = await ctx.params
  const eventId = String(params?.id || "")
  const body = await req.json().catch(() => {
    throw new EventServiceError("Cuerpo JSON inválido", 400)
  })
  if (!body?.childId) throw new EventServiceError("Se requiere childId", 400)
  assertChildAllowed(actor, body.childId)

  // Si viene eventType, es un reemplazo completo (PUT-like); si no, parcial.
  if (body.eventType) {
    const event = await updateEvent(db, actor, { ...body, id: eventId })
    return apiSuccess({ event })
  }

  await patchEvent(db, actor, { ...body, eventId })
  return apiSuccess({ updated: true })
})

export const DELETE = withApiKey("events:write", async (req, ctx, actor, db) => {
  const params = await ctx.params
  const eventId = String(params?.id || "")
  const childId = req.nextUrl.searchParams.get("childId") || ""
  if (!childId) throw new EventServiceError("Se requiere el parámetro childId", 400)
  assertChildAllowed(actor, childId)

  await deleteEvent(db, actor, eventId, childId)
  return apiSuccess({ deleted: true })
})
