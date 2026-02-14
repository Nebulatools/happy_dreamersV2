import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import * as Sentry from "@sentry/nextjs"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { createTraceId, sanitizeForLog } from "@/lib/observability/integration-debug-log"

const ALLOWED_ROLES = new Set(["admin", "professional"])
const MAX_TITLE_LENGTH = 180
const MAX_DESCRIPTION_LENGTH = 3000
const MAX_TRACE_IDS = 40
const MAX_CLIENT_ERRORS = 40

let bugIndexesReady = false
let ensuringBugIndexes: Promise<void> | null = null

type BugReportBody = {
  title?: unknown
  description?: unknown
  route?: unknown
  traceIds?: unknown
  clientErrors?: unknown
  context?: unknown
}

function normalizeString(value: unknown, maxLength: number, fallback = ""): string {
  if (typeof value !== "string") return fallback
  const trimmed = value.trim()
  if (!trimmed) return fallback
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed
}

function normalizeTraceIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const list = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, MAX_TRACE_IDS)
  return Array.from(new Set(list))
}

function normalizeClientErrors(value: unknown): unknown[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, MAX_CLIENT_ERRORS).map((item) => sanitizeForLog(item))
}

async function ensureBugReportIndexes() {
  if (bugIndexesReady) return
  if (ensuringBugIndexes) return ensuringBugIndexes

  ensuringBugIndexes = (async () => {
    const { db } = await connectToDatabase()
    const collection = db.collection("bug_reports")

    await collection.createIndex({ createdAt: -1 })
    await collection.createIndex({ status: 1, createdAt: -1 })
    await collection.createIndex({ "createdBy.userId": 1, createdAt: -1 })
    await collection.createIndex({ traceIds: 1 })

    bugIndexesReady = true
  })().finally(() => {
    ensuringBugIndexes = null
  })

  return ensuringBugIndexes
}

export async function POST(req: NextRequest) {
  const requestTraceId = createTraceId("bug_report")

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !ALLOWED_ROLES.has(session.user.role)) {
      return NextResponse.json({ error: "No autorizado", traceId: requestTraceId }, { status: 401 })
    }

    const body = (await req.json().catch(() => ({}))) as BugReportBody
    const title = normalizeString(body.title, MAX_TITLE_LENGTH, "Reporte de bug")
    const description = normalizeString(body.description, MAX_DESCRIPTION_LENGTH)
    const route = normalizeString(body.route, 500)
    const traceIds = normalizeTraceIds(body.traceIds)
    const clientErrors = normalizeClientErrors(body.clientErrors)
    const context = sanitizeForLog(body.context)

    await ensureBugReportIndexes()
    const { db } = await connectToDatabase()

    const result = await db.collection("bug_reports").insertOne({
      createdAt: new Date(),
      source: "bug-center",
      status: "open",
      title,
      description,
      route,
      traceIds,
      clientErrors,
      context,
      createdBy: {
        userId: session.user.id,
        role: session.user.role,
        name: session.user.name || null,
      },
      requestTraceId,
    })

    Sentry.withScope((scope) => {
      scope.setTag("feature", "bug-center")
      scope.setTag("role", session.user.role)
      scope.setTag("route", route || "unknown")
      scope.setTag("requestTraceId", requestTraceId)
      if (session.user.id) {
        scope.setUser({ id: session.user.id })
      }
      scope.setContext("bugReport", {
        reportId: result.insertedId.toString(),
        traceIds,
        hasDescription: Boolean(description),
      })
      Sentry.captureMessage("Bug report stored from Bug Center", "info")
    })

    return NextResponse.json({
      success: true,
      traceId: requestTraceId,
      reportId: result.insertedId.toString(),
    })
  } catch (error: unknown) {
    Sentry.captureException(error)
    const message = error instanceof Error ? error.message : "Error interno"
    return NextResponse.json({ error: message, traceId: requestTraceId }, { status: 500 })
  }
}
