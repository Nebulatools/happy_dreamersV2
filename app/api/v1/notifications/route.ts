// /api/v1/notifications
//   GET  ?childId=&limit=&status=  -> historial de notificaciones (notifications:read)
//   POST {childId,title,message,type?,scheduledFor?} -> crea una notificacion (notifications:write)

import { ObjectId } from "mongodb"
import { withApiKey, apiSuccess, assertChildAllowed } from "@/lib/api/api-key-auth"
import { resolveChildAccess } from "@/lib/api/child-access"
import { EventServiceError } from "@/lib/events/event-service"

export const GET = withApiKey("notifications:read", async (req, _ctx, actor, db) => {
  const sp = req.nextUrl.searchParams
  const childId = sp.get("childId")
  const status = sp.get("status")
  const limit = Math.min(parseInt(sp.get("limit") || "50", 10) || 50, 200)

  const filter: any = { userId: new ObjectId(actor.id) }
  if (childId) {
    assertChildAllowed(actor, childId)
    await resolveChildAccess(db, actor, childId, "canViewReports")
    filter.childId = new ObjectId(childId)
  }
  if (status) filter.status = status

  const notifications = await db
    .collection("notificationlogs")
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray()

  return apiSuccess(
    notifications.map((n: any) => ({
      id: n._id.toString(),
      type: n.type ?? null,
      title: n.title ?? null,
      message: n.message ?? null,
      status: n.status ?? null,
      childId: n.childId?.toString() ?? null,
      createdAt: n.createdAt ?? null,
    }))
  )
})

export const POST = withApiKey("notifications:write", async (req, _ctx, actor, db) => {
  const data = await req.json().catch(() => {
    throw new EventServiceError("Cuerpo JSON inválido", 400)
  })
  if (!data?.childId) throw new EventServiceError("Se requiere childId", 400)
  if (!data?.title || !data?.message) {
    throw new EventServiceError("Se requieren title y message", 400)
  }
  assertChildAllowed(actor, data.childId)
  await resolveChildAccess(db, actor, data.childId, "canViewReports")

  const now = new Date()
  const doc = {
    _id: new ObjectId(),
    userId: new ObjectId(actor.id),
    childId: new ObjectId(data.childId),
    type: typeof data.type === "string" ? data.type : "custom",
    title: String(data.title).slice(0, 140),
    message: String(data.message).slice(0, 1000),
    status: data.scheduledFor ? "scheduled" : "sent",
    scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
    source: "api",
    createdAt: now.toISOString(),
  }
  await db.collection("notificationlogs").insertOne(doc as any)

  return apiSuccess({ id: doc._id.toString(), status: doc.status }, 201)
})
