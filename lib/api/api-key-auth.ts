// Autenticacion por API Key para la superficie publica /api/v1.
// Reutiliza el mismo modelo de acceso a niños que la sesion: el "actor" resultante
// { id, role } se pasa a resolveChildAccess y al event-service sin cambios.

import { NextRequest, NextResponse } from "next/server"
import { Db } from "mongodb"
import * as Sentry from "@sentry/nextjs"
import { connectToDatabase } from "@/lib/mongodb"
import { ApiKey, ApiScope } from "@/types/models"
import { hashApiKeySecret } from "@/lib/api/api-keys"
import { checkRateLimit } from "@/lib/rag/rate-limiter"
import { createLogger } from "@/lib/logger"

const logger = createLogger("api-key-auth")

// Limites mas generosos que el RAG: pensado para integraciones (ej: Yose)
const API_RATE_LIMITS = {
  requests: 120, // por minuto
  window: 60 * 1000,
  burstRequests: 40,
  burstWindow: 10 * 1000,
}

export class ApiAuthError extends Error {
  status: number
  code: string
  constructor(message: string, status: number, code: string) {
    super(message)
    this.name = "ApiAuthError"
    this.status = status
    this.code = code
  }
}

export interface ApiActor {
  // Compatible con EventActor / SessionUser: { id, role }
  id: string
  role: "parent"
  scopes: ApiScope[]
  childIds: string[] // vacio => todos los niños del usuario
  keyId: string
}

/**
 * Resuelve el actor a partir del header Authorization: Bearer <api_key>.
 * Lanza ApiAuthError (401/403/429) si la key es invalida/revocada/expirada/limitada.
 */
export async function authenticateApiKey(req: NextRequest): Promise<{ actor: ApiActor; db: Db }> {
  const authHeader = req.headers.get("authorization") || ""
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  const secret = match?.[1]?.trim()

  if (!secret) {
    throw new ApiAuthError("Falta el header Authorization: Bearer <api_key>", 401, "missing_key")
  }

  const keyHash = hashApiKeySecret(secret)
  const { db } = await connectToDatabase()
  const keyDoc = await db.collection<ApiKey>("apiKeys").findOne({ keyHash })

  if (!keyDoc) {
    throw new ApiAuthError("API key inválida", 401, "invalid_key")
  }
  if (keyDoc.status !== "active") {
    throw new ApiAuthError("API key revocada", 401, "revoked_key")
  }
  if (keyDoc.expiresAt && new Date(keyDoc.expiresAt) < new Date()) {
    throw new ApiAuthError("API key expirada", 401, "expired_key")
  }

  const rl = checkRateLimit(`apikey:${keyDoc._id.toString()}`, API_RATE_LIMITS)
  if (!rl.allowed) {
    throw new ApiAuthError("Límite de solicitudes excedido", 429, "rate_limited")
  }

  // Registrar uso (no bloquear la respuesta)
  db.collection("apiKeys")
    .updateOne({ _id: keyDoc._id as any }, { $set: { lastUsedAt: new Date() } })
    .catch(() => {})

  const actor: ApiActor = {
    id: keyDoc.userId.toString(),
    role: "parent",
    scopes: keyDoc.scopes,
    childIds: (keyDoc.childIds || []).map((c) => c.toString()),
    keyId: keyDoc._id.toString(),
  }

  return { actor, db }
}

/** Lanza 403 si el actor no tiene el scope. */
export function requireScope(actor: ApiActor, scope: ApiScope): void {
  if (!actor.scopes.includes(scope)) {
    throw new ApiAuthError(`Falta el scope requerido: ${scope}`, 403, "insufficient_scope")
  }
}

/** Lanza 403 si la key tiene allowlist de niños y el childId no esta en ella. */
export function assertChildAllowed(actor: ApiActor, childId: string): void {
  if (actor.childIds.length > 0 && !actor.childIds.includes(childId)) {
    throw new ApiAuthError("Esta API key no tiene acceso a este niño", 403, "child_not_allowed")
  }
}

/** Respuesta de exito estandar de la API v1. */
export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status })
}

/**
 * Convierte cualquier error a la respuesta JSON de la API v1.
 * Maneja ApiAuthError, ChildAccessError y EventServiceError por duck-typing de `.status`.
 */
export function apiErrorResponse(error: unknown): NextResponse {
  const anyErr = error as any
  if (anyErr instanceof ApiAuthError) {
    return NextResponse.json(
      { error: { code: anyErr.code, message: anyErr.message } },
      { status: anyErr.status }
    )
  }
  if (anyErr && typeof anyErr.status === "number" && typeof anyErr.message === "string") {
    return NextResponse.json(
      { error: { code: anyErr.code || "request_error", message: anyErr.message } },
      { status: anyErr.status }
    )
  }
  logger.error("Error no controlado en API v1:", anyErr?.message || anyErr)
  Sentry.captureException(error)
  return NextResponse.json(
    { error: { code: "internal_error", message: "Error interno del servidor" } },
    { status: 500 }
  )
}

type RouteCtx = { params?: Record<string, string | string[]> | Promise<Record<string, string | string[]>> }
type ApiHandler = (
  req: NextRequest,
  ctx: RouteCtx,
  actor: ApiActor,
  db: Db
) => Promise<NextResponse>

/**
 * Envuelve un handler de ruta /api/v1: autentica la key, valida el scope y
 * captura los errores en formato consistente.
 */
export function withApiKey(requiredScope: ApiScope | null, handler: ApiHandler) {
  // ctx se tipa como `any` para satisfacer el validador de tipos de rutas de Next.js
  // (RouteContext). Internamente lo tratamos como RouteCtx.
  return async (req: NextRequest, ctx: any): Promise<NextResponse> => {
    try {
      const { actor, db } = await authenticateApiKey(req)
      if (requiredScope) requireScope(actor, requiredScope)
      return await handler(req, ctx as RouteCtx, actor, db)
    } catch (error) {
      return apiErrorResponse(error)
    }
  }
}
