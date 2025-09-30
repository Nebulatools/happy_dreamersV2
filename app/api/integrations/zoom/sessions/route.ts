// List Zoom consultation sessions (e.g., unlinked transcripts) - Admin only

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") || "transcript_unlinked"
    const limitParam = parseInt(searchParams.get("limit") || "50", 10)
    const limit = Math.min(Math.max(limitParam || 50, 1), 200)

    const { db } = await connectToDatabase()

    const match: any = { provider: "zoom" }
    if (status) match.status = status

    const sessions = await db.collection("consultation_sessions")
      .aggregate([
        { $match: match },
        { $sort: { updatedAt: -1, createdAt: -1 } },
        { $limit: limit },
        { $project: {
            uuid: 1,
            meetingId: 1,
            topic: 1,
            startTime: 1,
            status: 1,
            updatedAt: 1,
            createdAt: 1,
            userId: 1,
            childId: 1,
            // Cap the preview to avoid huge payloads
            transcriptPreview: { $substr: ["$transcriptText", 0, 800] },
          }
        }
      ])
      .toArray()

    return NextResponse.json({ success: true, sessions })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 })
  }
}

