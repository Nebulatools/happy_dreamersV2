import { createHash, randomUUID } from "crypto"
import { connectToDatabase } from "@/lib/mongodb"

export type IntegrationLogSource =
  | "zoom"
  | "consultas"
  | "ui-transcripts"
  | "ui-consultas"

export type IntegrationLogLevel = "error" | "warning" | "info"

export type PersistIntegrationLogInput = {
  source: IntegrationLogSource
  level: IntegrationLogLevel
  traceId?: string
  message: string
  endpoint?: string
  action?: string
  statusCode?: number
  context?: unknown
  snippetSource?: unknown
  actor?: {
    role?: string
    userId?: string
  }
}

const MAX_SNIPPET_LENGTH = 180
const MAX_STRING_LENGTH = 240
const MAX_OBJECT_DEPTH = 4
const MAX_KEYS = 40
const MAX_ARRAY_LENGTH = 20

let indexesReady = false
let ensuringIndexes: Promise<void> | null = null

const SENSITIVE_KEYS = [
  "authorization",
  "token",
  "secret",
  "password",
  "apikey",
  "api_key",
  "clientsecret",
  "client_secret",
  "access_token",
  "refresh_token",
]

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === "[object Object]"
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9_]/g, "")
  return SENSITIVE_KEYS.some((token) => normalized.includes(token.replace(/[^a-z0-9_]/g, "")))
}

export function createTraceId(prefix = "hd"): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`
}

function normalizeText(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "string") return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function sanitizeString(value: string): string {
  const compact = value.replace(/\s+/g, " ").trim()
  if (compact.length <= MAX_STRING_LENGTH) return compact
  return `${compact.slice(0, MAX_STRING_LENGTH)}…`
}

export function sanitizeForLog(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value

  if (typeof value === "string") return sanitizeString(value)
  if (typeof value === "number" || typeof value === "boolean") return value

  if (value instanceof Date) return value.toISOString()

  if (Array.isArray(value)) {
    if (depth >= MAX_OBJECT_DEPTH) return `[Array(${value.length})]`
    return value.slice(0, MAX_ARRAY_LENGTH).map((item) => sanitizeForLog(item, depth + 1))
  }

  if (isPlainObject(value)) {
    if (depth >= MAX_OBJECT_DEPTH) return "[Object]"

    const entries = Object.entries(value).slice(0, MAX_KEYS)
    const output: Record<string, unknown> = {}

    for (const [key, item] of entries) {
      if (isSensitiveKey(key)) {
        output[key] = "[REDACTED]"
      } else {
        output[key] = sanitizeForLog(item, depth + 1)
      }
    }

    return output
  }

  return sanitizeString(String(value))
}

function buildSnippetMetadata(raw: unknown): {
  snippet?: string
  snippetHash?: string
  snippetLength?: number
} {
  const text = normalizeText(raw).replace(/\s+/g, " ").trim()
  if (!text) return {}

  const snippet = text.slice(0, MAX_SNIPPET_LENGTH)
  const snippetHash = createHash("sha256").update(text).digest("hex")

  return {
    snippet,
    snippetHash,
    snippetLength: text.length,
  }
}

async function ensureIndexes(): Promise<void> {
  if (indexesReady) return
  if (ensuringIndexes) return ensuringIndexes

  ensuringIndexes = (async () => {
    const { db } = await connectToDatabase()
    const collection = db.collection("integration_debug_logs")

    await collection.createIndex({ createdAt: -1 })
    await collection.createIndex({ source: 1, level: 1, createdAt: -1 })
    await collection.createIndex({ traceId: 1 })
    await collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 })

    indexesReady = true
  })().finally(() => {
    ensuringIndexes = null
  })

  return ensuringIndexes
}

export async function persistIntegrationLog(input: PersistIntegrationLogInput): Promise<string> {
  const traceId = input.traceId || createTraceId("int")

  try {
    await ensureIndexes()
    const { db } = await connectToDatabase()

    const base = {
      createdAt: new Date(),
      source: input.source,
      level: input.level,
      traceId,
      message: sanitizeString(input.message),
      endpoint: input.endpoint,
      action: input.action,
      statusCode: input.statusCode,
      context: sanitizeForLog(input.context),
      actor: input.actor ? sanitizeForLog(input.actor) : undefined,
    }

    const snippetMetadata = buildSnippetMetadata(input.snippetSource)

    await db.collection("integration_debug_logs").insertOne({
      ...base,
      ...snippetMetadata,
    })
  } catch (error) {
    // Nunca romper el flujo principal por errores de observabilidad
    console.error("[integration-debug-log] failed to persist log", error)
  }

  return traceId
}
