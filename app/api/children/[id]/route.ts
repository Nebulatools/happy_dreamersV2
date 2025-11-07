// API para gestionar un niño específico por ID
// Permite obtener, actualizar y eliminar un niño específico

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { resolveChildAccess, ChildAccessError, OWNER_FULL_PERMISSIONS } from "@/lib/api/child-access"

import { createLogger } from "@/lib/logger"

const logger = createLogger("API:children:[id]:route")


// GET /api/children/[id] - obtener un niño específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    logger.info(`Buscando niño con ID: ${id} para el usuario ${session.user.id}`)
    
    const { db } = await connectToDatabase()

    let accessContext
    try {
      accessContext = await resolveChildAccess(db, session.user, id)
    } catch (error) {
      if (error instanceof ChildAccessError) {
        return NextResponse.json({ error: error.message }, { status: error.status })
      }
      throw error
    }

    const child = accessContext.child
    if (!child) {
      logger.error(`Niño con ID ${id} no encontrado`)
      return NextResponse.json({ error: "Niño no encontrado" }, { status: 404 })
    }
    
    // Enriquecer surveyData con flags estándar
    const surveyData = child?.surveyData
      ? {
          ...child.surveyData,
          completed:
            child.surveyData.completed ??
            (!!child.surveyData.completedAt && child.surveyData.isPartial !== true),
          lastUpdated: child.surveyData.lastUpdated ?? (child.surveyUpdatedAt || child.updatedAt || child.createdAt),
        }
      : undefined

    // Agregar información sobre el tipo de acceso
    const childWithAccess = {
      ...child,
      ...(surveyData && { surveyData }),
      isOwner: accessContext.isOwner,
      userPermissions: accessContext.isOwner
        ? OWNER_FULL_PERMISSIONS
        : accessContext.permissions
    }

    logger.info(`Niño encontrado: ${child.firstName} ${child.lastName}`)
    logger.info(`Es dueño: ${accessContext.isOwner}, parentId: ${child.parentId}, userId: ${session.user.id}`)
    return NextResponse.json(childWithAccess)
  } catch (error) {
    logger.error("Error al obtener niño:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// PUT /api/children/[id] - actualizar un niño existente
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  logger.info("PUT /api/children/[id] - Iniciando solicitud de actualización")
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      logger.error("Error: No hay sesión o usuario autorizado")
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    logger.info(`Actualizando niño con ID: ${id}`)

    const data = await request.json()
    logger.info("Datos recibidos para actualización", {
      childId: id,
      firstName: data.firstName,
      lastName: data.lastName,
      birthDate: data.birthDate,
      hasSurveyData: !!data.surveyData,
    })

    const { db } = await connectToDatabase()

    // Verificar que el niño pertenece al usuario
    const child = await db.collection("children").findOne({
      _id: new ObjectId(id),
      parentId: new ObjectId(session.user.id),
    })

    if (!child) {
      logger.error(`Niño con ID ${id} no encontrado o no pertenece al usuario ${session.user.id}`)
      return NextResponse.json({ error: "Niño no encontrado o no tienes permiso para editarlo" }, { status: 404 })
    }

    // Extraer solo los campos que queremos actualizar
    const updateData: any = {
      firstName: data.firstName,
      lastName: data.lastName,
      birthDate: data.birthDate || "",
      updatedAt: new Date(),
    }

    // Si hay datos de encuesta, incluirlos
    if (data.surveyData) {
      updateData.surveyData = data.surveyData
    }

    logger.info("Datos a actualizar:", updateData)
    
    const result = await db.collection("children").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    )

    logger.info("Resultado de la actualización", {
      childId: id,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    })

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "No se encontró el niño para actualizar" }, { status: 404 })
    }

    return NextResponse.json({ 
      message: "Información del niño actualizada correctamente",
      updated: result.modifiedCount > 0,
    })
  } catch (error) {
    logger.error("Error al actualizar niño:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// DELETE /api/children/[id] - eliminar un niño
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    
    const { db } = await connectToDatabase()

    // Verificar que el niño pertenece al usuario
    const child = await db.collection("children").findOne({
      _id: new ObjectId(id),
      parentId: new ObjectId(session.user.id),
    })

    if (!child) {
      return NextResponse.json({ error: "Niño no encontrado o no tienes permiso para eliminarlo" }, { status: 404 })
    }

    // Eliminar el niño
    const result = await db.collection("children").deleteOne({ _id: new ObjectId(id) })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "No se pudo eliminar el niño" }, { status: 500 })
    }

    return NextResponse.json({ message: "Niño eliminado correctamente" })
  } catch (error) {
    logger.error("Error al eliminar niño:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
} 
