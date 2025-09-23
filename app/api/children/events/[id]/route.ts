import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

import { createLogger } from "@/lib/logger"

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

    // Verificar que el niño exista y pertenezca al usuario
    const child = await db.collection("children").findOne({
      _id: new ObjectId(data.childId),
      parentId: new ObjectId(session.user.id),
    })

    if (!child) {
      logger.error("Niño no encontrado o no pertenece al usuario")
      return NextResponse.json(
        { error: "Niño no encontrado o no pertenece al usuario" },
        { status: 404 }
      )
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

    // 1) Intentar eliminar en la colección canónica 'events'
    let deleted = 0
    try {
      const eventsCol = db.collection('events')
      const filter: any = { _id: new ObjectId(eventId), parentId: new ObjectId(session.user.id) }
      const res = await eventsCol.deleteOne(filter)
      logger.info('Resultado deleteOne en events:', res)
      deleted += res.deletedCount || 0
    } catch (e) {
      // Si eventId no es ObjectId válido, ignorar y pasar al fallback
      logger.warn('No se pudo usar ObjectId para events, intentando fallback en children.events')
    }

    // 2) Fallback: intentar eliminar en el array embebido children.events (compatibilidad)
    if (deleted === 0) {
      const resChild = await db.collection('children').updateOne(
        { parentId: new ObjectId(session.user.id), "events._id": eventId },
        { $pull: { events: { _id: eventId } } as any }
      )
      logger.info('Resultado updateOne en children.events:', resChild)
      if (resChild.modifiedCount > 0) deleted += resChild.modifiedCount
    }

    if (deleted === 0) {
      logger.error('Evento no encontrado o no pertenece al usuario')
      return NextResponse.json({ error: 'Evento no encontrado o no pertenece al usuario' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Evento eliminado exitosamente' }, { status: 200 })
  } catch (error: any) {
    logger.error("Error al eliminar evento:", error.message, error.stack)
    return NextResponse.json(
      { error: "Error al eliminar el evento" },
      { status: 500 }
    )
  }
}
