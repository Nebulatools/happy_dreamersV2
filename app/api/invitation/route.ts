// API Route para obtener información de invitación
// GET /api/invitation?token=xxx

import { NextRequest, NextResponse } from "next/server"
import { getInvitationByToken } from "@/lib/db/invitations"
import { createLogger } from "@/lib/logger"

const logger = createLogger("API:Invitation")

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json(
        { error: "Token no proporcionado" },
        { status: 400 }
      )
    }

    // Obtener información de la invitación
    const invitation = await getInvitationByToken(token)

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitación no válida o expirada" },
        { status: 404 }
      )
    }

    // Devolver información de la invitación (sin datos sensibles)
    return NextResponse.json({
      invitation: {
        email: invitation.email,
        childName: invitation.childName,
        invitedByName: invitation.invitedByName,
        role: invitation.role,
        permissions: invitation.permissions,
        relationshipDescription: invitation.relationshipDescription,
        expiresAt: invitation.expiresAt,
      },
    })

  } catch (error) {
    logger.error("Error obteniendo invitación:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}