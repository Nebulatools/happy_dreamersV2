// Link a Zoom consultation session to a child (and user) - Admin only
// Body: { uuid?: string, meetingId?: string|number, childId: string, userId?: string }

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { ingestZoomMeetingTranscripts } from "@/lib/integrations/zoom"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { uuid, meetingId, childId, userId } = body || {}

    if (!uuid && !meetingId) {
      return NextResponse.json({ error: "uuid o meetingId requerido" }, { status: 400 })
    }
    if (!childId || !ObjectId.isValid(childId)) {
      return NextResponse.json({ error: "childId requerido o inválido" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Derive userId if not provided from the child's parentId
    let linkUserId: string | null = userId && ObjectId.isValid(userId) ? userId : null
    if (!linkUserId) {
      const child = await db.collection("children").findOne({ _id: new ObjectId(childId) })
      if (child?.parentId) linkUserId = String(child.parentId)
    }
    if (!linkUserId) {
      return NextResponse.json({ error: "No se pudo determinar el usuario propietario del niño" }, { status: 400 })
    }

    // Ensure the session exists
    const sessQuery: any = { provider: "zoom" }
    if (uuid) sessQuery.uuid = uuid
    if (meetingId) sessQuery.meetingId = meetingId
    const sess = await db.collection("consultation_sessions").findOne(sessQuery)
    // Use the ingestion helper to create the report and update (or create) the session
    const result = await ingestZoomMeetingTranscripts({
      uuid: sess?.uuid || uuid,
      meetingId: sess?.meetingId || meetingId,
      topic: sess?.topic,
      fallbackChildId: childId,
      fallbackUserId: linkUserId,
    })

    return NextResponse.json({ success: true, linked: result.linked, processed: result.processed, reportId: result.reportId })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 })
  }
}
