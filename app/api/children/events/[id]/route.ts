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

    // Crear el objeto de evento actualizado con TODOS los campos especificos
    const updatedEvent: Record<string, any> = {
      _id: eventId,
      eventType: data.eventType,
      emotionalState: data.emotionalState || "neutral",
      startTime: data.startTime,
      endTime: data.endTime || null,
      notes: data.notes || "",
      createdAt: data.createdAt || new Date().toISOString(),
    }

    // Campos especificos de sleep/nap
    if (data.sleepDelay !== undefined) updatedEvent.sleepDelay = data.sleepDelay
    if (data.awakeDelay !== undefined) updatedEvent.awakeDelay = data.awakeDelay
    if (data.didNotSleep !== undefined) updatedEvent.didNotSleep = data.didNotSleep

    // Campos especificos de feeding
    if (data.feedingType !== undefined) updatedEvent.feedingType = data.feedingType
    if (data.feedingSubtype !== undefined) updatedEvent.feedingSubtype = data.feedingSubtype
    if (data.feedingAmount !== undefined) updatedEvent.feedingAmount = data.feedingAmount
    if (data.feedingDuration !== undefined) updatedEvent.feedingDuration = data.feedingDuration
    if (data.babyState !== undefined) updatedEvent.babyState = data.babyState
    if (data.feedingNotes !== undefined) updatedEvent.feedingNotes = data.feedingNotes

    // Campos especificos de medication
    if (data.medicationName !== undefined) updatedEvent.medicationName = data.medicationName
    if (data.medicationDose !== undefined) updatedEvent.medicationDose = data.medicationDose
    if (data.medicationTime !== undefined) updatedEvent.medicationTime = data.medicationTime
    if (data.medicationNotes !== undefined) updatedEvent.medicationNotes = data.medicationNotes

    // Campos especificos de extra_activities
    if (data.activityDescription !== undefined) updatedEvent.activityDescription = data.activityDescription
    if (data.activityDuration !== undefined) updatedEvent.activityDuration = data.activityDuration
    if (data.activityImpact !== undefined) updatedEvent.activityImpact = data.activityImpact
    if (data.activityNotes !== undefined) updatedEvent.activityNotes = data.activityNotes

    // Campos calculados
    if (data.duration !== undefined) updatedEvent.duration = data.duration
    if (data.durationReadable !== undefined) updatedEvent.durationReadable = data.durationReadable

    logger.info("Evento a actualizar:", updatedEvent)

    // Primero intentar actualizar en la colección canónica 'events'
    const eventsCol = db.collection("events")
    let updatedInEvents = false

    // Buscar el evento en la colección events
    let eventDoc: any = null
    try {
      eventDoc = await eventsCol.findOne({ _id: new ObjectId(eventId) })
    } catch {
      // Si no es ObjectId válido, intentar como string
      eventDoc = await eventsCol.findOne({ _id: eventId as any })
    }

    if (eventDoc) {
      // Verificar que el evento pertenece al niño correcto
      const eventChildId = eventDoc.childId?.toString?.() || eventDoc.childId
      if (eventChildId === data.childId) {
        // Actualizar en la colección events (preservar _id original)
        const { _id: _ignoreId, ...updateFields } = updatedEvent
        try {
          const eventsResult = await eventsCol.updateOne(
            { _id: new ObjectId(eventId) },
            { $set: updateFields }
          )
          updatedInEvents = eventsResult.modifiedCount > 0 || eventsResult.matchedCount > 0
          logger.info("Actualizado en colección events:", eventsResult)
        } catch {
          // Si falla con ObjectId, intentar con string
          const eventsResult = await eventsCol.updateOne(
            { _id: eventId as any },
            { $set: updateFields }
          )
          updatedInEvents = eventsResult.modifiedCount > 0 || eventsResult.matchedCount > 0
          logger.info("Actualizado en colección events (string id):", eventsResult)
        }
      }
    }

    // Verificar si se actualizó
    if (!updatedInEvents) {
      logger.error("Evento no encontrado en colección events")
      return NextResponse.json(
        { error: "Evento no encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { message: "Evento actualizado exitosamente", event: updatedEvent },
      { status: 200 }
    )
  } catch (error: any) {
    logger.error("Error al actualizar evento:", { message: error.message, stack: error.stack })
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
      eventDoc = await eventsCol.findOne({ _id: eventId as any })
    }

    const targetChildId = childIdParam || eventDoc?.childId?.toString?.()

    if (!targetChildId) {
      logger.error("No se pudo determinar childId para el evento")
      return NextResponse.json({ error: "No se pudo determinar el niño asociado al evento" }, { status: 400 })
    }

    // Verificar acceso al niño (lanza error si no tiene permisos)
    try {
      await resolveChildAccess(db, session.user, targetChildId, "canEditEvents")
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
      const deleteResult = await eventsCol.deleteOne({ _id: eventId as any })
      deletedFromEvents = deleteResult.deletedCount || 0
    }

    // Si no se eliminó con ObjectId, intentar string (para eventos antiguos)
    if (deletedFromEvents === 0) {
      const deleteResult = await eventsCol.deleteOne({ _id: eventId as any })
      deletedFromEvents = deleteResult.deletedCount || 0
    }

    if (deletedFromEvents === 0) {
      logger.warn("Evento no encontrado en colección events")
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ message: "Evento eliminado exitosamente" }, { status: 200 })
  } catch (error: any) {
    logger.error("Error al eliminar evento:", { message: error.message, stack: error.stack })
    return NextResponse.json(
      { error: "Error al eliminar el evento" },
      { status: 500 }
    )
  }
}
