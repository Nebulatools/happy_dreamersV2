import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { createTraceId } from "@/lib/observability/integration-debug-log"

const ALLOWED_ROLES = new Set(["admin", "professional"])
const ALLOWED_SOURCES = ["zoom", "consultas", "ui-transcripts", "ui-consultas"]

type IntegrationLogRow = {
  _id?: unknown
  createdAt?: Date | string
  source?: string
  level?: string
  message?: string
  traceId?: string
  endpoint?: string
  action?: string
  statusCode?: number
}

function parseLimit(raw: string | null): number {
  const parsed = parseInt(raw || "25", 10)
  return Math.min(Math.max(parsed || 25, 1), 100)
}

export async function GET(req: NextRequest) {
  const requestTraceId = createTraceId("bug_ctx")

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !ALLOWED_ROLES.has(session.user.role)) {
      return NextResponse.json({ error: "No autorizado", traceId: requestTraceId }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseLimit(searchParams.get("limit"))
    const traceIdFilter = searchParams.get("traceId")

    const query: Record<string, unknown> = {
      source: { $in: ALLOWED_SOURCES },
      level: { $in: ["error", "warning"] },
    }

    if (traceIdFilter) {
      query.traceId = traceIdFilter
    }

    const { db } = await connectToDatabase()
    const rows = await db
      .collection("integration_debug_logs")
      .find(query)
      .project({
        createdAt: 1,
        source: 1,
        level: 1,
        message: 1,
        traceId: 1,
        endpoint: 1,
        action: 1,
        statusCode: 1,
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()

    const logs = rows.map((row) => {
      const item = row as IntegrationLogRow
      return {
        _id: item?._id?.toString?.() || String(item?._id || ""),
        createdAt: item?.createdAt instanceof Date ? item.createdAt.toISOString() : item?.createdAt,
        source: item?.source || "unknown",
        level: item?.level || "error",
        message: item?.message || "",
        traceId: item?.traceId || "",
        endpoint: item?.endpoint,
        action: item?.action,
        statusCode: item?.statusCode,
      }
    })

    return NextResponse.json({
      success: true,
      traceId: requestTraceId,
      count: logs.length,
      logs,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno"
    return NextResponse.json({ error: message, traceId: requestTraceId }, { status: 500 })
  }
}
