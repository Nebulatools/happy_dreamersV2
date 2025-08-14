// API para gestionar eventos de niños
// Permite registrar eventos para un niño específico

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { differenceInMinutes, parseISO } from "date-fns"

import { createLogger } from "@/lib/logger"

const logger = createLogger("API:children:events:route")

/**
 * Calcula la duración real de sueño considerando sleepDelay
 * @param startTime - Hora de acostarse (ISO string)
 * @param endTime - Hora de despertar (ISO string)
 * @param sleepDelay - Tiempo en minutos para dormirse (default: 0)
 * @returns Duración real de sueño en minutos
 */
function calculateSleepDuration(startTime: string, endTime: string, sleepDelay: number = 0): number {
  try {
    const start = parseISO(startTime)
    const end = parseISO(endTime)
    
    // Calcular duración total en cama
    const totalMinutes = differenceInMinutes(end, start)
    
    // Restar el tiempo que tardó en dormirse (máximo 180 minutos = 3 horas)
    const limitedSleepDelay = Math.min(Math.max(sleepDelay || 0, 0), 180)
    const realSleepDuration = Math.max(0, totalMinutes - limitedSleepDelay)
    
    logger.info(`Cálculo de duración: ${totalMinutes}min total - ${limitedSleepDelay}min delay = ${realSleepDuration}min real`)
    
    return realSleepDuration
  } catch (error) {
    logger.error("Error calculando duración de sueño:", error)
    return 0
  }
}

// POST /api/children/events - registrar un nuevo evento para un niño
export async function POST(req: NextRequest) {
  try {
    // Verificar la sesión del usuario
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      logger.error("No hay sesión de usuario activa")
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener datos del cuerpo de la solicitud
    const data = await req.json()
    logger.info("Datos recibidos:", data)

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

    // Verificar si el usuario es administrador
    const isAdmin = session.user.role === "admin"
    
    // Verificar que el niño exista y pertenezca al usuario (o sea admin)
    const query = isAdmin 
      ? { _id: new ObjectId(data.childId) }
      : { _id: new ObjectId(data.childId), parentId: session.user.id }
    
    const child = await db.collection("children").findOne(query)

    if (!child) {
      logger.error("Niño no encontrado o no tienes permiso")
      return NextResponse.json(
        { error: "Niño no encontrado o no tienes permiso para registrar eventos" },
        { status: 404 }
      )
    }

    // Validación específica para actividades extra - ahora usa notes en lugar de description
    if (data.eventType === "extra_activities" && (!data.notes || data.notes.length < 10)) {
      logger.error("Notas requeridas para actividades extra")
      return NextResponse.json(
        { error: "Las notas son requeridas para actividades extra (mínimo 10 caracteres)" },
        { status: 400 }
      )
    }

    // Crear el objeto de evento con ID único
    const event: any = {
      _id: new ObjectId().toString(), // Generar un ID único para el evento
      childId: data.childId,
      eventType: data.eventType,
      emotionalState: data.emotionalState || "neutral",
      notes: data.notes || "",
      duration: data.duration || null, // Se calculará automáticamente si es posible
      sleepDelay: data.sleepDelay || null,
      createdAt: new Date().toISOString(),
    }
    
    // Solo agregar startTime si está presente
    if (data.startTime) {
      event.startTime = data.startTime
    }
    
    // Para eventos con sleepDelay, calcular endTime automáticamente
    if ((data.eventType === "sleep" || data.eventType === "night_waking") && data.sleepDelay && data.sleepDelay > 0 && data.startTime) {
      // Para sleep: el endTime es cuando finalmente se durmió
      // Para night_waking: el endTime es cuando volvió a dormirse
      const startDate = new Date(data.startTime)
      const endDate = new Date(startDate.getTime() + (data.sleepDelay * 60 * 1000)) // sleepDelay está en minutos
      event.endTime = endDate.toISOString()
    } else if (data.endTime) {
      // Solo agregar endTime si está presente y no es un evento con delay autocalculado
      event.endTime = data.endTime
    }

    // CALCULAR DURACIÓN AUTOMÁTICAMENTE si tiene startTime y endTime pero no duration manual
    if (event.startTime && event.endTime && !data.duration) {
      // Solo calcular para eventos de sueño/siesta que se benefician del cálculo de duración
      if (['sleep', 'nap', 'night_waking'].includes(event.eventType)) {
        event.duration = calculateSleepDuration(event.startTime, event.endTime, event.sleepDelay)
        logger.info(`Duración calculada automáticamente: ${event.duration} minutos`)
      }
    }

    logger.info("Evento a registrar:", event)

    // Actualizar el documento del niño para agregar el evento
    // Usamos Object.assign para resolver el error de tipo con $push
    const result = await db.collection("children").updateOne(
      { _id: new ObjectId(data.childId) },
      { $push: { events: event } as any }
    )

    logger.info("Resultado de la operación:", result)

    if (result.modifiedCount === 0) {
      logger.error("No se pudo registrar el evento")
      return NextResponse.json(
        { error: "No se pudo registrar el evento" },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: "Evento registrado exitosamente", event },
      { status: 201 }
    )
  } catch (error: any) {
    logger.error("Error al registrar evento:", error.message, error.stack)
    return NextResponse.json(
      { error: "Error al registrar el evento" },
      { status: 500 }
    )
  }
}

// GET /api/children/events?childId=xxx - obtener eventos de un niño específico
export async function GET(req: NextRequest) {
  try {
    // Verificar la sesión del usuario
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      logger.error("No hay sesión de usuario activa")
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener el ID del niño de los parámetros de consulta
    const searchParams = req.nextUrl.searchParams
    const childId = searchParams.get("childId")

    if (!childId) {
      return NextResponse.json(
        { error: "Se requiere el ID del niño" },
        { status: 400 }
      )
    }

    // Conectar a la base de datos
    const { db } = await connectToDatabase()
    
    // Verificar si el usuario es administrador
    const isAdmin = session.user.role === "admin"
    logger.info(`Usuario: ${session.user.id}, Es admin: ${isAdmin}, Solicitando niño: ${childId}`)

    // Buscar el niño
    // Para admins, permitir acceso a cualquier niño sin verificar el parentId
    const query = isAdmin 
      ? { _id: new ObjectId(childId) }
      : { _id: new ObjectId(childId), parentId: session.user.id }
      
    logger.info("Query para buscar niño:", JSON.stringify(query))
    
    const child = await db.collection("children").findOne(query)

    if (!child) {
      logger.info(`Niño con ID ${childId} no encontrado o no accesible para usuario ${session.user.id}`)
      return NextResponse.json(
        { error: "Niño no encontrado o no tienes permiso para ver sus eventos" },
        { status: 404 }
      )
    }

    logger.info(`Niño encontrado: ${child.firstName} ${child.lastName}, devolviendo eventos`)
    
    // Devolver los detalles del niño, incluyendo sus eventos
    return NextResponse.json({
      _id: child._id,
      firstName: child.firstName,
      lastName: child.lastName,
      events: child.events || [],
    })
  } catch (error: any) {
    logger.error("Error al obtener eventos:", error.message)
    return NextResponse.json(
      { error: "Error al obtener los eventos", details: error.message },
      { status: 500 }
    )
  }
}

// PUT - Actualizar un evento existente
export async function PUT(req: NextRequest) {
  try {
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
    if (!data.id || !data.childId || !data.eventType) {
      logger.error("Faltan campos requeridos", { data })
      return NextResponse.json(
        { error: "Se requieren id, childId y eventType" },
        { status: 400 }
      )
    }

    // Conectar a la base de datos
    const { db } = await connectToDatabase()
    logger.info("Conectado a MongoDB")

    // Verificar si el usuario es administrador
    const isAdmin = session.user.role === "admin"
    
    // Verificar que el niño exista y pertenezca al usuario (o sea admin)
    const query = isAdmin 
      ? { _id: new ObjectId(data.childId) }
      : { _id: new ObjectId(data.childId), parentId: session.user.id }
    
    const child = await db.collection("children").findOne(query)

    if (!child) {
      logger.error("Niño no encontrado o no tienes permiso")
      return NextResponse.json(
        { error: "Niño no encontrado o no tienes permiso para actualizar eventos" },
        { status: 404 }
      )
    }

    // Crear el objeto de evento actualizado
    const updatedEvent = {
      _id: data.id,
      childId: data.childId,
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
        "events._id": data.id,
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

// PATCH - Actualizar parcialmente un evento (usado para añadir endTime)
export async function PATCH(req: NextRequest) {
  try {
    // Verificar la sesión del usuario
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      logger.error("No hay sesión de usuario activa")
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener datos del cuerpo de la solicitud
    const data = await req.json()
    logger.info("Datos recibidos para actualización parcial:", data)

    // Validar que se proporcionen los campos requeridos
    if (!data.eventId || !data.childId) {
      logger.error("Faltan campos requeridos", { data })
      return NextResponse.json(
        { error: "Se requieren eventId y childId" },
        { status: 400 }
      )
    }

    // Conectar a la base de datos
    const { db } = await connectToDatabase()
    
    // Verificar si el usuario es administrador
    const isAdmin = session.user.role === "admin"
    
    // Verificar que el niño exista y pertenezca al usuario (o sea admin)
    const query = isAdmin 
      ? { _id: new ObjectId(data.childId) }
      : { _id: new ObjectId(data.childId), parentId: session.user.id }
    
    const child = await db.collection("children").findOne(query)

    if (!child) {
      logger.error("Niño no encontrado o no tienes permiso")
      return NextResponse.json(
        { error: "Niño no encontrado o no tienes permiso" },
        { status: 404 }
      )
    }

    // Preparar los campos a actualizar
    const updateFields: any = {}
    if (data.endTime) updateFields["events.$.endTime"] = data.endTime
    if (data.duration !== undefined) updateFields["events.$.duration"] = data.duration
    if (data.notes) updateFields["events.$.notes"] = data.notes
    if (data.sleepDelay !== undefined) updateFields["events.$.sleepDelay"] = data.sleepDelay

    // CALCULAR DURACIÓN AUTOMÁTICAMENTE si se está agregando endTime y no hay duration explícita
    if (data.endTime && data.duration === undefined) {
      // Primero necesitamos obtener el evento para acceder a startTime y sleepDelay
      const existingEvent = child.events?.find((e: any) => e._id === data.eventId)
      
      if (existingEvent && existingEvent.startTime) {
        // Solo calcular para eventos de sueño/siesta que se benefician del cálculo de duración
        if (['sleep', 'nap', 'night_waking'].includes(existingEvent.eventType)) {
          const sleepDelay = data.sleepDelay !== undefined ? data.sleepDelay : existingEvent.sleepDelay
          const calculatedDuration = calculateSleepDuration(existingEvent.startTime, data.endTime, sleepDelay)
          updateFields["events.$.duration"] = calculatedDuration
          logger.info(`Duración calculada automáticamente en PATCH: ${calculatedDuration} minutos`)
        }
      }
    }
    
    logger.info("Actualizando evento con campos:", updateFields)
    
    // Actualizar el evento específico en el array events del niño
    const result = await db.collection("children").updateOne(
      { 
        _id: new ObjectId(data.childId),
        "events._id": data.eventId,
      },
      { $set: updateFields }
    )

    logger.info("Resultado de la actualización parcial:", result)

    if (result.matchedCount === 0) {
      // Si no se encontró en el array events, buscar en la colección events
      const eventResult = await db.collection("events").updateOne(
        { 
          _id: data.eventId,
          childId: data.childId
        },
        { 
          $set: {
            endTime: data.endTime,
            duration: data.duration,
            ...(data.notes && { notes: data.notes })
          }
        }
      )
      
      if (eventResult.matchedCount === 0) {
        return NextResponse.json(
          { error: "Evento no encontrado" },
          { status: 404 }
        )
      }
      
      return NextResponse.json(
        { message: "Evento actualizado exitosamente en colección events" },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { message: "Evento actualizado exitosamente" },
      { status: 200 }
    )
  } catch (error: any) {
    logger.error("Error al actualizar evento:", error.message)
    return NextResponse.json(
      { error: "Error al actualizar el evento" },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar un evento existente
export async function DELETE(req: NextRequest) {
  try {
    // Verificar la sesión del usuario
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      logger.error("No hay sesión de usuario activa")
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener el ID del evento de los parámetros de consulta
    const searchParams = req.nextUrl.searchParams
    const eventId = searchParams.get("id")
    const childId = searchParams.get("childId")

    if (!eventId) {
      return NextResponse.json(
        { error: "Se requiere el ID del evento" },
        { status: 400 }
      )
    }
    
    if (!childId) {
      return NextResponse.json(
        { error: "Se requiere el ID del niño" },
        { status: 400 }
      )
    }

    // Conectar a la base de datos
    const { db } = await connectToDatabase()
    logger.info("Conectado a MongoDB")
    
    // Verificar si el usuario es administrador
    const isAdmin = session.user.role === "admin"
    
    // Verificar que el niño exista y pertenezca al usuario (o sea admin)
    const query = isAdmin 
      ? { _id: new ObjectId(childId) }
      : { _id: new ObjectId(childId), parentId: session.user.id }
    
    const child = await db.collection("children").findOne(query)
    
    if (!child) {
      logger.error("Niño no encontrado o no tienes permiso")
      return NextResponse.json(
        { error: "Niño no encontrado o no tienes permiso para eliminar eventos" },
        { status: 404 }
      )
    }

    // Encontrar y eliminar el evento del array de eventos del niño
    const result = await db.collection("children").updateOne(
      { _id: new ObjectId(childId) },
      { $pull: { events: { _id: eventId } } as any }
    )

    logger.info("Resultado de la eliminación:", result)

    if (result.matchedCount === 0) {
      logger.error("Niño no encontrado")
      return NextResponse.json(
        { error: "Niño no encontrado" },
        { status: 404 }
      )
    }

    if (result.modifiedCount === 0) {
      logger.error("No se pudo eliminar el evento o no existe")
      return NextResponse.json(
        { error: "No se pudo eliminar el evento o no existe" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { message: "Evento eliminado exitosamente" },
      { status: 200 }
    )
  } catch (error: any) {
    logger.error("Error al eliminar evento:", error.message, error.stack)
    return NextResponse.json(
      { error: "Error al eliminar el evento" },
      { status: 500 }
    )
  }
} 