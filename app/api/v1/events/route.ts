// /api/v1/events
//   GET  ?childId=...   -> lista de eventos del niño (events:read)
//   POST {childId,...}  -> registra un evento (events:write)
// Reutiliza el event-service compartido con la UI.

import { withApiKey, apiSuccess, assertChildAllowed } from "@/lib/api/api-key-auth"
import { createEvent, listEvents, EventServiceError } from "@/lib/events/event-service"

export const GET = withApiKey("events:read", async (req, _ctx, actor, db) => {
  const childId = req.nextUrl.searchParams.get("childId") || ""
  if (!childId) throw new EventServiceError("Se requiere el parámetro childId", 400)
  assertChildAllowed(actor, childId)

  const { child, events } = await listEvents(db, actor, childId)

  return apiSuccess({
    child: { id: child._id.toString(), firstName: child.firstName, lastName: child.lastName },
    events,
  })
})

export const POST = withApiKey("events:write", async (req, _ctx, actor, db) => {
  const data = await req.json().catch(() => {
    throw new EventServiceError("Cuerpo JSON inválido", 400)
  })
  if (!data?.childId) throw new EventServiceError("Se requiere childId", 400)
  assertChildAllowed(actor, data.childId)

  const event = await createEvent(db, actor, data)
  return apiSuccess({ event }, 201)
})
