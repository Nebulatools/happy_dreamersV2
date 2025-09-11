// Google Drive webhook endpoint (Push notifications for Drive changes)
// Sketch implementation: validates channel token, stores change stub, returns 200.

import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { createLogger } from "@/lib/logger"

const logger = createLogger("API:integrations:google:drive:webhook")

export async function POST(req: NextRequest) {
  try {
    // Validate channel token
    const expected = process.env.GOOGLE_DRIVE_CHANNEL_TOKEN
    const token = req.headers.get("x-goog-channel-token") || req.headers.get("X-Goog-Channel-Token")
    if (expected && token !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Metadata headers from Drive push notifications
    const resourceState = req.headers.get("x-goog-resource-state") || req.headers.get("X-Goog-Resource-State")
    const resourceId = req.headers.get("x-goog-resource-id") || req.headers.get("X-Goog-Resource-Id")
    const changed = { resourceState, resourceId }

    logger.info("Drive change notification", changed)

    const { db } = await connectToDatabase()
    await db.collection("consultation_sessions").insertOne({
      provider: "google",
      resourceId,
      resourceState,
      status: "drive_change_received",
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    logger.error("Drive webhook error", error)
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 })
  }
}

// Google may send GET for sync/verification in some flows; respond 200
export async function GET() {
  return NextResponse.json({ ok: true })
}

