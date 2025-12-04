import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

import { createLogger } from "@/lib/logger"
import { resolveChildAccess, ChildAccessError } from "@/lib/api/child-access"

const logger = createLogger("API:children:events:[id]:route")


// PUT /api/children/events/[id] - actualizar un evento específico por ID
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Usar await con params para evitar el warning de Next.js
    const { id: eventId } = await Promise.resolve(params)
    logger.info("ID del evento a actualizar:", eventId)

    // Verificar la sesión del usuario
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      logger.error("No hay sesión de usuario activa")
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener datos del cuerpo de la solicitud
    const data = await req.json()
    logger.info("Datos recibidos para actualización:", data)

    // Validar que se proporcionen los campos requeridos
    if (!data.childId || !data.eventType) {
      logger.error("Faltan campos requeridos", { data })
      return NextResponse.json(
        { error: "Se requieren childId y eventType" },
        { status: 400 }
      )
    }

    // Conectar a la base de datos
    const { db } = await connectToDatabase()
    logger.info("Conectado a MongoDB")

    let accessContext
    try {
      accessContext = await resolveChildAccess(db, session.user, data.childId, "canEditEvents")
    } catch (error) {
      if (error instanceof ChildAccessError) {
        return NextResponse.json({ error: error.message }, { status: error.status })
      }
      throw error
    }

    // Crear el objeto de evento actualizado
    const updatedEvent = {
      _id: eventId,
      eventType: data.eventType,
      emotionalState: data.emotionalState || "neutral",
      startTime: data.startTime,
      endTime: data.endTime || null,
      notes: data.notes || "",
      createdAt: data.createdAt || new Date().toISOString(),
    }

    logger.info("Evento a actualizar:", updatedEvent)

    // Actualizar el evento específico en el array de eventos del niño
    const result = await db.collection("children").updateOne(
      { 
        _id: new ObjectId(data.childId),
        parentId: new ObjectId(accessContext.ownerId),
        "events._id": eventId,
      },
      { $set: { "events.$": updatedEvent } }
    )

    logger.info("Resultado de la actualización:", result)

    if (result.matchedCount === 0) {
      logger.error("Evento no encontrado")
      return NextResponse.json(
        { error: "Evento no encontrado" },
        { status: 404 }
      )
    }

    if (result.modifiedCount === 0) {
      logger.error("No se realizaron cambios en el evento")
      return NextResponse.json(
        { message: "No se realizaron cambios en el evento" },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { message: "Evento actualizado exitosamente", event: updatedEvent },
      { status: 200 }
    )
  } catch (error: any) {
    logger.error("Error al actualizar evento:", error.message, error.stack)
    return NextResponse.json(
      { error: "Error al actualizar el evento" },
      { status: 500 }
    )
  }
}

// DELETE /api/children/events/[id] - eliminar un evento específico por ID
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Usar await con params para evitar el warning de Next.js
    const { id: eventId } = await Promise.resolve(params)
    logger.info("ID del evento a eliminar:", eventId)

    // Verificar la sesión del usuario
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      logger.error("No hay sesión de usuario activa")
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Conectar a la base de datos
    const { db } = await connectToDatabase()
    logger.info("Conectado a MongoDB")

    const childIdParam = req.nextUrl.searchParams.get("childId")

    const eventsCol = db.collection("events")
    let eventDoc: any = null
    try {
      eventDoc = await eventsCol.findOne({ _id: new ObjectId(eventId) })
    } catch (error) {
      // Ignorar si no es ObjectId válido
    }

    if (!eventDoc) {
      eventDoc = await eventsCol.findOne({ _id: eventId })
    }

    const targetChildId = childIdParam || eventDoc?.childId?.toString?.()

    if (!targetChildId) {
      logger.error("No se pudo determinar childId para el evento")
      return NextResponse.json({ error: "No se pudo determinar el niño asociado al evento" }, { status: 400 })
    }

    let accessContext
    try {
      accessContext = await resolveChildAccess(db, session.user, targetChildId, "canEditEvents")
    } catch (error) {
      if (error instanceof ChildAccessError) {
        return NextResponse.json({ error: error.message }, { status: error.status })
      }
      throw error
    }

    // Intentar eliminar de la colección canónica 'events'
    let deletedFromEvents = 0
    try {
      const deleteResult = await eventsCol.deleteOne({ _id: new ObjectId(eventId) })
      deletedFromEvents = deleteResult.deletedCount || 0
    } catch (error) {
      // Si no es ObjectId válido, intentar como string
      const deleteResult = await eventsCol.deleteOne({ _id: eventId })
      deletedFromEvents = deleteResult.deletedCount || 0
    }

    // Si no se eliminó con ObjectId, intentar string (para eventos antiguos)
    if (deletedFromEvents === 0) {
      const deleteResult = await eventsCol.deleteOne({ _id: eventId })
      deletedFromEvents = deleteResult.deletedCount || 0
    }

    if (deletedFromEvents === 0) {
      logger.warn("Evento no encontrado en colección events, intentando en children.events")
    }

    // También eliminar de la colección embebida para compatibilidad
    const childrenResult = await db.collection("children").updateOne(
      { 
        _id: new ObjectId(targetChildId),
        parentId: new ObjectId(accessContext.ownerId),
      },
      { $pull: { events: { _id: eventId } } as any }
    )

    if (deletedFromEvents === 0 && childrenResult.modifiedCount === 0) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ message: "Evento eliminado exitosamente" }, { status: 200 })
  } catch (error: any) {
    logger.error("Error al eliminar evento:", error.message, error.stack)
    return NextResponse.json(
      { error: "Error al eliminar el evento" },
      { status: 500 }
    )
  }
}
