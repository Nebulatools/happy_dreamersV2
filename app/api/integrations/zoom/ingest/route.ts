// Manual/cron ingestion endpoint for a specific Zoom meeting
// Accepts meetingId or uuid and optional childId/userId fallback for linking

import { NextRequest, NextResponse } from "next/server"
import { ingestZoomMeetingTranscripts } from "@/lib/integrations/zoom"
import { createLogger } from "@/lib/logger"

const logger = createLogger("API:integrations:zoom:ingest")

function verifyAuth(req: NextRequest): boolean {
  // Allow CRON_SECRET bearer or allow in dev without secret
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  const header = req.headers.get("authorization") || ""
  return header === `Bearer ${secret}`
}

export async function POST(req: NextRequest) {
  try {
    if (!verifyAuth(req)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    const body = await req.json().catch(() => ({}))
    const { meetingId, uuid, childId, userId } = body || {}
    if (!meetingId && !uuid) {
      return NextResponse.json({ error: "meetingId o uuid requerido" }, { status: 400 })
    }
    const result = await ingestZoomMeetingTranscripts({ meetingId, uuid, fallbackChildId: childId, fallbackUserId: userId })
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    logger.error("Zoom ingest error", error)
    return NextResponse.json({ error: error?.message || "Error interno" }, { status: 500 })
  }
}

