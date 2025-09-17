// API Route para denegar una invitación
// POST /api/invitation/decline

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { declineInvitation } from "@/lib/db/invitations"
import { createLogger } from "@/lib/logger"

const logger = createLogger("API:DeclineInvitation")

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para denegar la invitación" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { error: "Token de invitación requerido" },
        { status: 400 }
      )
    }

    const result = await declineInvitation(token, session.user.id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "No se pudo denegar la invitación" },
        { status: 400 }
      )
    }

    logger.info(`Invitación denegada por usuario ${session.user.id}`)

    return NextResponse.json({ success: true, message: "Invitación denegada" })
  } catch (error) {
    logger.error("Error denegando invitación:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

