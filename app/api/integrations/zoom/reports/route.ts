// List Zoom-sourced consultation reports for a given child (admin only)

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const childId = searchParams.get("childId")
    const userId = searchParams.get("userId")
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "5", 10) || 5, 1), 50)

    if (!childId || !ObjectId.isValid(childId)) {
      return NextResponse.json({ error: "childId requerido o inválido" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    const query: any = { childId: new ObjectId(childId), provider: "zoom" }
    if (userId && ObjectId.isValid(userId)) {
      query.userId = new ObjectId(userId)
    }

    const reports = await db.collection("consultation_reports")
      .aggregate([
        { $match: query },
        { $sort: { createdAt: -1 } },
        { $limit: limit },
        {
          $project: {
            transcript: 1,
            createdAt: 1,
            provider: 1,
            source: 1,
          },
        },
      ])
      .toArray()

    return NextResponse.json({ success: true, reports })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 })
  }
}

