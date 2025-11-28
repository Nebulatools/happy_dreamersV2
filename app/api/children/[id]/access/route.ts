// API Routes para Sistema de Acceso Multi-Usuario
// Maneja agregar, listar y eliminar cuidadores con acceso compartido

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { 
  grantAccess, 
  getCaregivers, 
  revokeAccess,
  updateCaregiverPermissions, 
} from "@/lib/db/user-child-access"
import { createLogger } from "@/lib/logger"

const logger = createLogger("API:ChildAccess")

// GET /api/children/[id]/access - Listar cuidadores con acceso
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const childId = params.id

    // Obtener lista de cuidadores
    const result = await getCaregivers(session.user.id, childId)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      caregivers: result.caregivers,
      message: "Cuidadores obtenidos exitosamente",
    })

  } catch (error) {
    logger.error("Error obteniendo cuidadores:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// POST /api/children/[id]/access - Agregar nuevo cuidador
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const childId = params.id
    const body = await request.json()

    // Validar datos requeridos
    const { 
      email, 
      role = "caregiver",
      relationshipType,
      relationshipDescription,
      expiresAt, 
    } = body

    if (!email) {
      return NextResponse.json(
        { error: "Email del cuidador es requerido" },
        { status: 400 }
      )
    }

    // Validar rol
    if (!["viewer", "caregiver", "editor"].includes(role)) {
      return NextResponse.json(
        { error: "Rol inválido" },
        { status: 400 }
      )
    }

    // Otorgar acceso
    const result = await grantAccess(
      session.user.id,
      childId,
      email,
      role,
      relationshipType,
      relationshipDescription,
      expiresAt ? new Date(expiresAt) : undefined,
      (session.user as any).role === "admin"
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    logger.info(`Acceso otorgado a ${email} para niño ${childId} por usuario ${session.user.id}`)

    return NextResponse.json({
      success: true,
      invitationToken: result.invitationToken,
      message: "Acceso otorgado exitosamente",
    })

  } catch (error) {
    logger.error("Error agregando cuidador:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// PUT /api/children/[id]/access - Actualizar permisos de cuidador
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const { id: childId } = await params
    const body = await request.json()

    // Validar datos requeridos
    const { 
      userId,
      role,
      expiresAt,
      relationshipDescription, 
    } = body

    if (!userId) {
      return NextResponse.json(
        { error: "ID del usuario es requerido" },
        { status: 400 }
      )
    }

    // Validar rol si se proporciona
    if (role && !["viewer", "caregiver", "editor"].includes(role)) {
      return NextResponse.json(
        { error: "Rol inválido" },
        { status: 400 }
      )
    }

    // Actualizar permisos
    const result = await updateCaregiverPermissions(
      session.user.id,
      childId,
      userId,
      {
        role,
        expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : undefined,
        relationshipDescription,
      }
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 403 }
      )
    }

    logger.info(`Permisos actualizados para usuario ${userId} en niño ${childId}`)

    return NextResponse.json({
      success: true,
      message: "Permisos actualizados exitosamente",
    })

  } catch (error) {
    logger.error("Error actualizando permisos:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// DELETE /api/children/[id]/access - Revocar acceso de cuidador
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const { id: childId } = await params
    
    // Obtener userId desde query params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        { error: "ID del usuario es requerido" },
        { status: 400 }
      )
    }

    // Revocar acceso
    const result = await revokeAccess(
      session.user.id,
      childId,
      userId
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 403 }
      )
    }

    logger.info(`Acceso revocado para usuario ${userId} en niño ${childId}`)

    return NextResponse.json({
      success: true,
      message: "Acceso revocado exitosamente",
    })

  } catch (error) {
    logger.error("Error revocando acceso:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
