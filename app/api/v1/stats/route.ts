// GET /api/v1/stats?childId=...&from=ISO -> estadisticas de sueño del niño (stats:read).
// Reutiliza processSleepStatistics (mismo calculo que la UI de estadisticas).

import { ObjectId } from "mongodb"
import { withApiKey, apiSuccess, assertChildAllowed } from "@/lib/api/api-key-auth"
import { resolveChildAccess } from "@/lib/api/child-access"
import { processSleepStatistics, SleepEvent } from "@/lib/sleep-calculations"
import { EventServiceError } from "@/lib/events/event-service"

export const GET = withApiKey("stats:read", async (req, _ctx, actor, db) => {
  const childId = req.nextUrl.searchParams.get("childId") || ""
  if (!childId) throw new EventServiceError("Se requiere el parámetro childId", 400)
  assertChildAllowed(actor, childId)

  const access = await resolveChildAccess(db, actor, childId, "canViewReports")
  const fromParam = req.nextUrl.searchParams.get("from")
  const statsFromDate = fromParam ? new Date(fromParam) : undefined

  // Las API keys actuan siempre como el usuario dueño (parent), nunca como admin.
  const query = { childId: new ObjectId(childId), parentId: new ObjectId(access.ownerId) }

  const rawEvents = await db.collection("events").find(query).toArray()
  const events: SleepEvent[] = rawEvents.map((e: any) => ({
    _id: e._id?.toString(),
    eventType: e.eventType,
    startTime: e.startTime,
    endTime: e.endTime,
    notes: e.notes,
    emotionalState: e.emotionalState,
    sleepDelay: e.sleepDelay,
    didNotSleep: e.didNotSleep,
  }))

  const stats = processSleepStatistics(events, statsFromDate)
  return apiSuccess({ childId, from: fromParam || null, stats })
})
