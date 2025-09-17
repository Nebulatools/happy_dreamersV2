// GET /api/invitations/me - Invitaciones pendientes para el usuario actual

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getInvitationsForEmail } from "@/lib/db/invitations"
import { createLogger } from "@/lib/logger"

const logger = createLogger("API:Invitations:Me")

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const invitations = await getInvitationsForEmail(session.user.email)

    return NextResponse.json({
      success: true,
      invitations,
    })
  } catch (error) {
    logger.error("Error listando invitaciones del usuario:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

