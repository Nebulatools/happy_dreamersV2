// Zoom Webhook endpoint (recording/transcription events)
// Sketch implementation: validates token, stores session stub, and returns 200.

import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { createLogger } from "@/lib/logger"
import { ingestZoomMeetingTranscripts } from "@/lib/integrations/zoom"

const logger = createLogger("API:integrations:zoom:webhook")

export async function POST(req: NextRequest) {
  try {
    // Basic validation via verification token (Marketplace legacy) or header auth
    const token = process.env.ZOOM_VERIFICATION_TOKEN
    if (token) {
      const authHeader = req.headers.get("authorization") || ""
      if (!authHeader.includes(token)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const payload = await req.json().catch(() => null)
    if (!payload) return NextResponse.json({ error: "Invalid payload" }, { status: 400 })

    logger.info("Zoom webhook received", {
      event: payload.event,
      objectId: payload?.payload?.object?.id || payload?.object?.id,
    })

    // Only sketch: on recording completed, create a session stub for later processing
    const eventType: string = payload.event || payload.event_type || ""
    if (eventType.includes("recording.completed")) {
      const meetingId = payload?.payload?.object?.id || payload?.object?.id
      const uuid = payload?.payload?.object?.uuid || payload?.object?.uuid
      const topic = payload?.payload?.object?.topic || payload?.object?.topic
      const startTime = payload?.payload?.object?.start_time || payload?.object?.start_time

      const { db } = await connectToDatabase()
      await db.collection("consultation_sessions").insertOne({
        provider: "zoom",
        meetingId,
        uuid,
        topic,
        startTime,
        status: "awaiting_recording",
        createdAt: new Date(),
        updatedAt: new Date(),
        rawEvent: payload,
      })

      // Attempt automatic ingestion immediately (webhook-triggered)
      try {
        await ingestZoomMeetingTranscripts({ meetingId, uuid, topic })
      } catch (e) {
        logger.error("Ingest error (webhook)", { meetingId, uuid, error: e instanceof Error ? e.message : String(e) })
      }
    }

    // Respond fast per webhook best practices
    return NextResponse.json({ success: true })
  } catch (error: any) {
    logger.error("Zoom webhook error", error)
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 })
  }
}
