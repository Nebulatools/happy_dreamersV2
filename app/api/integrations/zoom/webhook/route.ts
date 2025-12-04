// Zoom Webhook endpoint (recording/transcription events)
// Sketch implementation: validates token, stores session stub, and returns 200.

import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { createLogger } from "@/lib/logger"
import { ingestZoomMeetingTranscripts } from "@/lib/integrations/zoom"
import crypto from "crypto"

// Ensure Node.js runtime (crypto required on Vercel)
export const runtime = "nodejs"

const logger = createLogger("API:integrations:zoom:webhook")

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json().catch(() => null)
    if (!payload) return NextResponse.json({ error: "Invalid payload" }, { status: 400 })

    // Support Zoom URL validation handshake
    if (payload?.event === "endpoint.url_validation" && (payload?.payload?.plainToken || payload?.payload?.plain_token)) {
      const secret = process.env.ZOOM_WEBHOOK_SECRET || ""
      if (!secret) {
        // Fail fast to surface misconfiguration during Zoom's URL validation
        return NextResponse.json({ error: "ZOOM_WEBHOOK_SECRET is not configured" }, { status: 500 })
      }
      const plainToken: string = payload.payload.plainToken || payload.payload.plain_token
      // Per Zoom docs: encryptedToken = hex(HMAC_SHA256(plainToken, secretToken))
      // Some older guides mention Base64; Zoom's current docs expect hex for CRC response.
      const hmacHex = crypto.createHmac("sha256", secret).update(plainToken).digest("hex")
      // Respond ONLY with the required fields
      return NextResponse.json({ plainToken, encryptedToken: hmacHex })
    }

    // Basic validation via verification token (legacy) if configured
    const legacyToken = process.env.ZOOM_VERIFICATION_TOKEN
    if (legacyToken) {
      const authHeader = req.headers.get("authorization") || ""
      if (!authHeader.includes(legacyToken)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

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

// Support Zoom "Authentication Header Option" validation via GET
// If enabled, Zoom may send a simple GET with Authorization header to validate the endpoint.
export async function GET(req: NextRequest) {
  try {
    // If a verification token is configured, require it in the Authorization header
    const headerToken = process.env.ZOOM_VERIFICATION_TOKEN

    if (headerToken) {
      const authHeader = req.headers.get("authorization") || ""
      // Accept either exact token or Bearer <token>
      const ok = authHeader === headerToken || authHeader === `Bearer ${headerToken}`
      if (!ok) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    // Additionally, if Zoom (or a manual test) provides a plainToken via query, respond with HMAC as convenience
    const url = new URL(req.url)
    const plainToken = url.searchParams.get("plainToken") || url.searchParams.get("plain_token")
    const secret = process.env.ZOOM_WEBHOOK_SECRET || ""
    if (plainToken && secret) {
      const hmacHex = crypto.createHmac("sha256", secret).update(plainToken).digest("hex")
      return NextResponse.json({ plainToken, encryptedToken: hmacHex })
    }

    // Default OK for header-based validation
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal error" }, { status: 500 })
  }
}
