// API Routes para gestionar invitaciones pendientes
// GET /api/children/[id]/invitations - Listar invitaciones pendientes

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getPendingInvitations, cancelInvitation } from "@/lib/db/invitations"
import { createLogger } from "@/lib/logger"

const logger = createLogger("API:ChildInvitations")

// GET - Obtener invitaciones pendientes para un niño
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const { id: childId } = await params

    // Obtener invitaciones pendientes
    const result = await getPendingInvitations(childId, session.user.id)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      invitations: result.invitations,
      message: "Invitaciones obtenidas exitosamente"
    })

  } catch (error) {
    logger.error("Error obteniendo invitaciones:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// DELETE - Cancelar una invitación pendiente
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const invitationId = searchParams.get("invitationId")

    if (!invitationId) {
      return NextResponse.json(
        { error: "ID de invitación requerido" },
        { status: 400 }
      )
    }

    // Cancelar invitación
    const result = await cancelInvitation(invitationId, session.user.id)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 403 }
      )
    }

    logger.info(`Invitación ${invitationId} cancelada por usuario ${session.user.id}`)

    return NextResponse.json({
      success: true,
      message: "Invitación cancelada exitosamente"
    })

  } catch (error) {
    logger.error("Error cancelando invitación:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}