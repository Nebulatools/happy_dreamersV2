// API para vincular usuarios existentes como cuidadores
// Permite dar acceso a usuarios ya registrados sin necesidad de invitación

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { createLogger } from "@/lib/logger"
import { UserChildAccess } from "@/types/models"
import { ROLE_PERMISSIONS } from "@/lib/db/user-child-access"

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
    const { userId, role = "caregiver", relationshipType = "familiar" } = body

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
      childId: new ObjectId(childId)
    })

    if (existingAccess) {
      return NextResponse.json(
        { error: "Este usuario ya tiene acceso al perfil" },
        { status: 400 }
      )
    }

    // Crear el acceso
    const newAccess: UserChildAccess = {
      _id: new ObjectId(),
      userId: new ObjectId(userId),
      childId: new ObjectId(childId),
      grantedBy: new ObjectId(session.user.id),
      role: role as "viewer" | "caregiver" | "editor",
      permissions: ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS],
      relationshipType: relationshipType as any,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await db.collection("userChildAccess").insertOne(newAccess as any)

    // Actualizar el array sharedWith en el niño
    await db.collection("children").updateOne(
      { _id: new ObjectId(childId) },
      { 
        $addToSet: { sharedWith: userId },
        $set: { updatedAt: new Date() }
      }
    )

    logger.info(`Usuario ${userId} vinculado al niño ${childId} por ${session.user.id}`)

    return NextResponse.json({
      success: true,
      message: "Usuario vinculado exitosamente"
    })
  } catch (error) {
    logger.error("Error vinculando usuario:", error)
    return NextResponse.json(
      { error: "Error al vincular usuario" },
      { status: 500 }
    )
  }
}