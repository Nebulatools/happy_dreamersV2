// DELETE /api/api-keys/{id} - revoca (no elimina) una API key del usuario autenticado.

import { NextRequest } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { requireAuth, withErrorHandler, createSuccessResponse, createErrorResponse, ApiErrorType } from "@/lib/api-utils"
import { revokeApiKey } from "@/lib/api/api-keys"

export const DELETE = withErrorHandler(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const session = await requireAuth()
    const { id } = await ctx.params

    const { db } = await connectToDatabase()
    const ok = await revokeApiKey(db, session.user.id, id)
    if (!ok) {
      return createErrorResponse(ApiErrorType.NOT_FOUND, "API key no encontrada", 404)
    }
    return createSuccessResponse({ revoked: true }, "API key revocada")
  }
)
