import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import {
  createTraceId,
  persistIntegrationLog,
  sanitizeForLog,
  type IntegrationLogLevel,
  type IntegrationLogSource,
} from "@/lib/observability/integration-debug-log"

const ALLOWED_SOURCES = new Set<IntegrationLogSource>([
  "zoom",
  "consultas",
  "ui-transcripts",
  "ui-consultas",
])

const ALLOWED_LEVELS = new Set<IntegrationLogLevel>(["error", "warning", "info"])
const ALLOWED_READ_ROLES = new Set(["admin", "professional"])
const ALLOWED_WRITE_ROLES = new Set(["admin", "professional"])

type IntegrationDebugLogDoc = {
  _id?: unknown
  createdAt?: Date | string
  source?: string
  level?: string
  message?: string
  traceId?: string
  endpoint?: string
  action?: string
  statusCode?: number
  [key: string]: unknown
}

function isValidDate(value: string | null): value is string {
  return !!value && !Number.isNaN(new Date(value).getTime())
}

function parseLimit(raw: string | null): number {
  const parsed = parseInt(raw || "50", 10)
  return Math.min(Math.max(parsed || 50, 1), 200)
}

export async function GET(req: NextRequest) {
  const requestTraceId = createTraceId("debug_get")

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !ALLOWED_READ_ROLES.has(session.user.role)) {
      return NextResponse.json({ error: "No autorizado", traceId: requestTraceId }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const source = searchParams.get("source")
    const level = searchParams.get("level")
    const traceId = searchParams.get("traceId")
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    const limit = parseLimit(searchParams.get("limit"))

    const query: Record<string, unknown> = {}

    if (source) {
      if (!ALLOWED_SOURCES.has(source as IntegrationLogSource)) {
        return NextResponse.json({ error: "source inválido", traceId: requestTraceId }, { status: 400 })
      }
      query.source = source
    }

    if (level) {
      if (!ALLOWED_LEVELS.has(level as IntegrationLogLevel)) {
        return NextResponse.json({ error: "level inválido", traceId: requestTraceId }, { status: 400 })
      }
      query.level = level
    }

    if (traceId) {
      query.traceId = traceId
    }

    if (from || to) {
      const createdAt: Record<string, Date> = {}
      if (isValidDate(from)) createdAt.$gte = new Date(from)
      if (isValidDate(to)) createdAt.$lte = new Date(to)
      if (Object.keys(createdAt).length > 0) {
        query.createdAt = createdAt
      }
    }

    const { db } = await connectToDatabase()
    const logs = await db
      .collection("integration_debug_logs")
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()

    const serialized = logs.map((entry) => {
      const row = entry as IntegrationDebugLogDoc
      return {
        _id: row?._id?.toString?.() || String(row?._id || ""),
        createdAt: row?.createdAt instanceof Date ? row.createdAt.toISOString() : row?.createdAt,
        source: row?.source || "unknown",
        level: row?.level || "error",
        message: row?.message || "",
        traceId: row?.traceId || "",
        endpoint: row?.endpoint,
        action: row?.action,
        statusCode: row?.statusCode,
        snippet: typeof row?.snippet === "string" ? row.snippet : undefined,
        snippetLength: typeof row?.snippetLength === "number" ? row.snippetLength : undefined,
      }
    })

    return NextResponse.json({
      success: true,
      traceId: requestTraceId,
      count: serialized.length,
      logs: serialized,
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error obteniendo logs de integración"
    const errorName = error instanceof Error ? error.name : "UnknownError"

    await persistIntegrationLog({
      source: "consultas",
      level: "error",
      traceId: requestTraceId,
      endpoint: "/api/admin/debug/integration-logs",
      action: "GET",
      message: errorMessage,
      context: {
        errorName,
      },
    })

    return NextResponse.json(
      { error: errorMessage || "Error interno", traceId: requestTraceId },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const requestTraceId = createTraceId("debug_post")

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !ALLOWED_WRITE_ROLES.has(session.user.role)) {
      return NextResponse.json({ error: "No autorizado", traceId: requestTraceId }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))

    const source = body?.source
    const level = body?.level
    const message = typeof body?.message === "string" ? body.message.trim() : ""

    if (!ALLOWED_SOURCES.has(source as IntegrationLogSource)) {
      return NextResponse.json({ error: "source inválido", traceId: requestTraceId }, { status: 400 })
    }

    if (!ALLOWED_LEVELS.has(level as IntegrationLogLevel)) {
      return NextResponse.json({ error: "level inválido", traceId: requestTraceId }, { status: 400 })
    }

    if (!message) {
      return NextResponse.json({ error: "message requerido", traceId: requestTraceId }, { status: 400 })
    }

    const persistedTraceId = await persistIntegrationLog({
      source,
      level,
      traceId: typeof body?.traceId === "string" && body.traceId ? body.traceId : requestTraceId,
      message,
      endpoint: typeof body?.endpoint === "string" ? body.endpoint : undefined,
      action: typeof body?.action === "string" ? body.action : "UI_ERROR",
      statusCode: typeof body?.statusCode === "number" ? body.statusCode : undefined,
      context: sanitizeForLog(body?.context),
      snippetSource: body?.snippetSource,
      actor: {
        role: session.user.role,
        userId: session.user.id,
      },
    })

    return NextResponse.json({ success: true, traceId: persistedTraceId })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error interno"
    return NextResponse.json(
      { error: errorMessage, traceId: requestTraceId },
      { status: 500 }
    )
  }
}
