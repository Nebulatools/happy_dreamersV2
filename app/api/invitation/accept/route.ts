// API Route para aceptar una invitación
// POST /api/invitation/accept

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { acceptInvitation } from "@/lib/db/invitations"
import { createLogger } from "@/lib/logger"

const logger = createLogger("API:AcceptInvitation")

export async function POST(request: NextRequest) {
  try {
    // Verificar que el usuario esté autenticado
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para aceptar la invitación" },
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

    // Aceptar la invitación
    const result = await acceptInvitation(token, session.user.id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    logger.info(`Invitación aceptada por usuario ${session.user.id}`)

    return NextResponse.json({
      success: true,
      childId: result.childId,
      message: "Invitación aceptada exitosamente",
    })

  } catch (error) {
    logger.error("Error aceptando invitación:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}