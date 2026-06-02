// Gestion self-serve de API Keys (autenticada por SESION, no por API key).
//   GET  -> lista las keys del usuario (sin secreto)
//   POST -> crea una key y devuelve el secreto UNA sola vez

import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { requireAuth, withErrorHandler, createSuccessResponse, createErrorResponse, ApiErrorType } from "@/lib/api-utils"
import { createApiKey, listApiKeys, isValidScope } from "@/lib/api/api-keys"
import { ApiScope } from "@/types/models"

export const GET = withErrorHandler(async () => {
  const session = await requireAuth()
  const { db } = await connectToDatabase()
  const keys = await listApiKeys(db, session.user.id)
  return createSuccessResponse(keys)
})

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await requireAuth()
  const body = await req.json().catch(() => null)

  const name = typeof body?.name === "string" ? body.name.trim() : ""
  if (!name) {
    return createErrorResponse(ApiErrorType.VALIDATION_ERROR, "El nombre de la API key es requerido", 400)
  }

  const rawScopes: unknown = body?.scopes
  if (!Array.isArray(rawScopes) || rawScopes.length === 0) {
    return createErrorResponse(ApiErrorType.VALIDATION_ERROR, "Debes seleccionar al menos un scope", 400)
  }
  const scopes = rawScopes.filter((s): s is ApiScope => typeof s === "string" && isValidScope(s))
  if (scopes.length === 0) {
    return createErrorResponse(ApiErrorType.VALIDATION_ERROR, "Scopes inválidos", 400)
  }

  const childIds = Array.isArray(body?.childIds)
    ? body.childIds.filter((c: unknown) => typeof c === "string")
    : undefined

  const expiresAt = body?.expiresAt ? new Date(body.expiresAt) : undefined

  const { db } = await connectToDatabase()
  const { apiKey, secret } = await createApiKey(db, session.user.id, { name, scopes, childIds, expiresAt })

  // El secreto SOLO se devuelve aqui; nunca se vuelve a mostrar ni se guarda en claro.
  return createSuccessResponse(
    { apiKey, secret },
    "API key creada. Copia el secreto ahora; no se volverá a mostrar.",
    201
  )
})
