// API para vincular usuarios existentes como cuidadores
// Permite dar acceso a usuarios ya registrados sin necesidad de invitación

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { createLogger } from "@/lib/logger"
import { createInvitation } from "@/lib/db/invitations"
import { sendInvitationEmail } from "@/lib/email/invitation-email"

const logger = createLogger("API:children:access:link")

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar sesión
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const childId = params.id
    
    // Validar childId
    if (!ObjectId.isValid(childId)) {
      return NextResponse.json({ error: "ID de niño inválido" }, { status: 400 })
    }

    // Obtener datos del body
    const body = await request.json()
    const {
      userId,
      role = "caregiver",
      relationshipType = "familiar",
      relationshipDescription,
      expiresAt,
    } = body

    if (!userId || !ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "ID de usuario inválido" }, { status: 400 })
    }

    // Conectar a la base de datos
    const client = await clientPromise
    const db = client.db()

    // Verificar que el niño existe y pertenece al usuario
    const child = await db.collection("children").findOne({
      _id: new ObjectId(childId),
      parentId: new ObjectId(session.user.id)
    })

    if (!child) {
      return NextResponse.json(
        { error: "No tienes permisos para compartir este perfil" },
        { status: 403 }
      )
    }

    // Verificar que el usuario a vincular existe
    const userToLink = await db.collection("users").findOne({
      _id: new ObjectId(userId)
    })

    if (!userToLink) {
      return NextResponse.json(
        { error: "El usuario que intentas vincular no existe" },
        { status: 404 }
      )
    }

    // Verificar si ya existe acceso
    const existingAccess = await db.collection("userChildAccess").findOne({
      userId: new ObjectId(userId),
      childId: new ObjectId(childId),
      $or: [
        { invitationStatus: "accepted" },
        { invitationStatus: { $exists: false } }
      ]
    })

    if (existingAccess) {
      return NextResponse.json(
        { error: "Este usuario ya tiene acceso al perfil" },
        { status: 400 }
      )
    }

    // Crear invitación pendiente para el usuario existente
    const invitationResult = await createInvitation(
      session.user.id,
      childId,
      userToLink.email,
      role,
      relationshipType,
      relationshipDescription
    )

    if (!invitationResult.success || !invitationResult.invitation) {
      return NextResponse.json(
        { error: invitationResult.error || "No se pudo crear la invitación" },
        { status: 400 }
      )
    }

    const invitation = invitationResult.invitation

    // Registrar notificación para el usuario invitado
    try {
      const now = new Date()
      const inviterName = session.user.name || session.user.email || "Un familiar"
      await db.collection("notificationlogs").insertOne({
        userId: userToLink._id,
        childId: new ObjectId(childId),
        type: "invitation",
        status: "delivered",
        title: `${inviterName} te invitó a ver el perfil de ${child.firstName}`,
        message: `${inviterName} te envió una invitación para acceder al perfil de ${child.firstName}. Puedes aceptarla o rechazarla desde Notificaciones.`,
        scheduledFor: now,
        createdAt: now,
        updatedAt: now
      } as any)
    } catch (logError) {
      logger.warn("No se pudo registrar notificación de invitación", logError)
    }

    // Opcional: enviar email si hay configuración
    try {
      await sendInvitationEmail(invitation)
    } catch (emailError) {
      logger.warn("No se pudo enviar email de invitación para usuario existente", emailError)
    }

    logger.info(`Invitación creada para usuario ${userId} al niño ${childId} por ${session.user.id}`)

    return NextResponse.json({
      success: true,
      invitationId: invitation._id,
      message: "Invitación enviada. Esperando respuesta del usuario." 
    })
  } catch (error) {
    logger.error("Error vinculando usuario:", error)
    return NextResponse.json(
      { error: "Error al vincular usuario" },
      { status: 500 }
    )
  }
}
