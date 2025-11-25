// API para gestionar eventos de niños
// Permite registrar eventos para un niño específico

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { differenceInMinutes, parseISO } from "date-fns"

import { createLogger } from "@/lib/logger"
import { syncEventToAnalyticsCollection, removeEventFromAnalyticsCollection } from "@/lib/event-sync"
import { resolveChildAccess, ChildAccessError } from "@/lib/api/child-access"

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

/**
 * Calcula la duración real de despertar nocturno
 * @param startTime - Hora cuando empezó el despertar nocturno (ISO string)
 * @param endTime - Hora cuando volvió a dormirse (ISO string)
 * @param awakeDelay - Tiempo en minutos que estuvo despierto (metadata informativa)
 * @returns Duración real del despertar en minutos
 */
function calculateAwakeDuration(startTime: string, endTime: string, awakeDelay: number = 0): number {
  try {
    const start = parseISO(startTime)
    const end = parseISO(endTime)
    
    // La duración del despertar nocturno es simplemente el tiempo entre startTime y endTime
    // awakeDelay es información adicional pero no se resta porque ES el tiempo despierto
    const totalMinutes = differenceInMinutes(end, start)
    
    // Si awakeDelay está presente, usarlo como referencia (pero no para cálculos)
    if (awakeDelay > 0) {
      logger.info(`Despertar nocturno: ${totalMinutes}min calculados, ${awakeDelay}min reportados por usuario`)
    }
    
    return totalMinutes
  } catch (error) {
    logger.error("Error calculando duración de despertar:", error)
    return 0
  }
}

/**
 * Convierte minutos a formato legible (Ej: "2h 30min")
 * @param minutes - Duración en minutos
 * @returns String legible de la duración
 */
function formatDurationReadable(minutes: number | null): string {
  if (!minutes || minutes === 0) return ''
  
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  if (hours === 0) {
    return `${mins}min`
  } else if (mins === 0) {
    return `${hours}h`
  } else {
    return `${hours}h ${mins}min`
  }
}

// NOTA: función validateEventOverlap eliminada - ya no se valida el solapamiento de eventos

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
    
    // LOG ESPECIAL PARA NIGHT_WAKING
    if (data.eventType === 'night_waking') {
      logger.info("[NIGHT_WAKING] Recibido evento de despertar nocturno:", {
        childId: data.childId,
        startTime: data.startTime,
        emotionalState: data.emotionalState,
        fullData: data
      })
    }
    
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

    let accessContext
    try {
      accessContext = await resolveChildAccess(db, session.user, data.childId, "canCreateEvents")
    } catch (error) {
      if (error instanceof ChildAccessError) {
        return NextResponse.json({ error: error.message }, { status: error.status })
      }
      throw error
    }

    // NOTA: Validación de traslape eliminada - ahora se permiten eventos traslapados

    // Validación específica para actividades extra - valida activityDescription
    if (data.eventType === "extra_activities") {
      // activityDescription es requerido
      if (!data.activityDescription || data.activityDescription.trim().length < 3) {
        logger.error("Descripción de actividad requerida")
        return NextResponse.json(
          { error: "La descripción de la actividad es requerida (mínimo 3 caracteres)" },
          { status: 400 }
        )
      }
      
      // activityDuration debe estar en rango apropiado
      if (data.activityDuration && (data.activityDuration < 5 || data.activityDuration > 180)) {
        logger.error("Duración de actividad inválida")
        return NextResponse.json(
          { error: "La duración de la actividad debe estar entre 5 y 180 minutos" },
          { status: 400 }
        )
      }
    }

    // Validaciones específicas para medicamentos
    if (data.eventType === "medication") {
      // medicationName es requerido
      if (!data.medicationName || data.medicationName.trim().length < 1) {
        logger.error("Nombre del medicamento requerido")
        return NextResponse.json(
          { error: "El nombre del medicamento es requerido" },
          { status: 400 }
        )
      }
      
      // medicationDose es requerido
      if (!data.medicationDose || data.medicationDose.trim().length < 1) {
        logger.error("Dosis del medicamento requerida")
        return NextResponse.json(
          { error: "La dosis del medicamento es requerida" },
          { status: 400 }
        )
      }
    }
    
    // Validaciones específicas para eventos de alimentación
    if (data.eventType === "feeding") {
      // feedingType es requerido
      if (!data.feedingType || !['breast', 'bottle', 'solids'].includes(data.feedingType)) {
        logger.error("Tipo de alimentación inválido o faltante")
        return NextResponse.json(
          { error: "Tipo de alimentación requerido: 'breast', 'bottle', o 'solids'" },
          { status: 400 }
        )
      }

      // Normalización de estado: sólidos siempre es 'awake'
      if (data.feedingType === 'solids') {
        data.babyState = 'awake'
      }

      // Validar babyState
      if (!data.babyState || !['awake', 'asleep'].includes(data.babyState)) {
        logger.error("Estado del bebé inválido o faltante")
        return NextResponse.json(
          { error: "Estado del bebé requerido: 'awake' o 'asleep'" },
          { status: 400 }
        )
      }

      // Validaciones específicas por tipo
      if (data.feedingType === 'breast') {
        // Pecho: minutos
        if (!data.feedingDuration || data.feedingDuration < 1 || data.feedingDuration > 60) {
          logger.error("Duración de alimentación inválida (pecho)")
          return NextResponse.json(
            { error: "En pecho, la duración debe estar entre 1 y 60 minutos" },
            { status: 400 }
          )
        }
        // feedingAmount opcional; si existe validar rango genérico
        if (data.feedingAmount !== undefined && data.feedingAmount !== null) {
          if (data.feedingAmount < 1 || data.feedingAmount > 500) {
            logger.error("Cantidad de alimentación inválida (opcional en pecho)")
            return NextResponse.json(
              { error: "Cantidad (si se proporciona) debe estar entre 1 y 500" },
              { status: 400 }
            )
          }
        }
      } else if (data.feedingType === 'bottle') {
        // Biberón: cantidad (ml) y duración requeridas
        if (!data.feedingAmount || data.feedingAmount < 1 || data.feedingAmount > 500) {
          logger.error("Cantidad de alimentación inválida (biberón)")
          return NextResponse.json(
            { error: "En biberón, la cantidad debe estar entre 1 y 500 ml" },
            { status: 400 }
          )
        }
        if (!data.feedingDuration || data.feedingDuration < 1 || data.feedingDuration > 60) {
          logger.error("Duración de alimentación inválida (biberón)")
          return NextResponse.json(
            { error: "Duración de alimentación debe estar entre 1 y 60 minutos" },
            { status: 400 }
          )
        }
      } else if (data.feedingType === 'solids') {
        // Sólidos: cantidad (gr) y duración requeridas; estado siempre awake
        if (!data.feedingAmount || data.feedingAmount < 1 || data.feedingAmount > 500) {
          logger.error("Cantidad de alimentación inválida (sólidos)")
          return NextResponse.json(
            { error: "En sólidos, la cantidad debe estar entre 1 y 500 gr" },
            { status: 400 }
          )
        }
        if (!data.feedingDuration || data.feedingDuration < 1 || data.feedingDuration > 60) {
          logger.error("Duración de alimentación inválida (sólidos)")
          return NextResponse.json(
            { error: "Duración de alimentación debe estar entre 1 y 60 minutos" },
            { status: 400 }
          )
        }
      }

      // feedingNotes es opcional pero si existe, validar longitud
      if (data.feedingNotes && data.feedingNotes.length > 500) {
        logger.error("Notas de alimentación muy largas")
        return NextResponse.json(
          { error: "Las notas de alimentación no pueden exceder 500 caracteres" },
          { status: 400 }
        )
      }
    }

    // Validaciones para sleepDelay y awakeDelay
    if (data.sleepDelay !== undefined && data.sleepDelay !== null) {
      if (data.sleepDelay < 0 || data.sleepDelay > 180) {
        logger.error("sleepDelay fuera de rango")
        return NextResponse.json(
          { error: "sleepDelay debe estar entre 0 y 180 minutos" },
          { status: 400 }
        )
      }
    }

    if (data.awakeDelay !== undefined && data.awakeDelay !== null) {
      if (data.awakeDelay < 0 || data.awakeDelay > 180) {
        logger.error("awakeDelay fuera de rango")
        return NextResponse.json(
          { error: "awakeDelay debe estar entre 0 y 180 minutos" },
          { status: 400 }
        )
      }
    }

    // Crear el objeto de evento con ID único
    const event: any = {
      _id: new ObjectId().toString(), // Generar un ID único para el evento
      childId: data.childId,
      eventType: data.eventType,
      emotionalState: data.emotionalState || "neutral",
      notes: data.notes || "", // Dejar vacío si no se proporciona
      duration: data.duration || null, // Se calculará automáticamente si es posible
      durationReadable: "", // Se calculará si hay duration
      sleepDelay: data.sleepDelay || null,
      awakeDelay: data.awakeDelay || null, // Para eventos night_waking
      createdAt: new Date().toISOString(),
    }

    // Agregar campos específicos de alimentación si aplica
    if (data.eventType === "feeding") {
      event.feedingType = data.feedingType
      event.feedingAmount = data.feedingAmount
      event.feedingDuration = data.feedingDuration
      event.babyState = data.babyState
      event.feedingNotes = data.feedingNotes || ""
    }
    
    // Agregar campos específicos de medicamentos si aplica
    if (data.eventType === "medication") {
      event.medicationName = data.medicationName || ""
      event.medicationDose = data.medicationDose || ""
      event.medicationTime = data.medicationTime || data.startTime // Usar medicationTime o startTime como fallback
      event.medicationNotes = data.medicationNotes || ""
    }
    
    // Agregar campos específicos de actividad extra si aplica
    if (data.eventType === "extra_activities") {
      event.activityDescription = data.activityDescription || data.description || ""
      event.activityDuration = data.activityDuration || null
      event.activityImpact = data.activityImpact || "neutral"
      event.activityNotes = data.activityNotes || ""
    }
    
    // Solo agregar startTime si está presente
    if (data.startTime) {
      event.startTime = data.startTime
    }
    
    // Solo agregar endTime si está presente explícitamente
    // NO calcular endTime automáticamente basándose en sleepDelay
    // sleepDelay es solo metadata para estadísticas, no afecta los tiempos
    if (data.endTime) {
      event.endTime = data.endTime
    }

    // CALCULAR DURACIÓN AUTOMÁTICAMENTE si tiene startTime y endTime pero no duration manual
    if (event.startTime && event.endTime && !data.duration) {
      // Solo calcular para eventos de sueño/siesta que se benefician del cálculo de duración
      if (['sleep', 'nap'].includes(event.eventType)) {
        event.duration = calculateSleepDuration(event.startTime, event.endTime, event.sleepDelay)
        event.durationReadable = formatDurationReadable(event.duration)
        logger.info(`Duración calculada automáticamente: ${event.duration} minutos (${event.durationReadable})`)
      } else if (event.eventType === 'night_waking') {
        // Para night_waking, usar calculateAwakeDuration con awakeDelay
        event.duration = calculateAwakeDuration(event.startTime, event.endTime, event.awakeDelay)
        event.durationReadable = formatDurationReadable(event.duration)
        logger.info(`Duración de despertar calculada automáticamente: ${event.duration} minutos (${event.durationReadable})`)
      }
    } else if (event.duration) {
      // Si ya tiene duration, calcular el formato legible
      event.durationReadable = formatDurationReadable(event.duration)
    }

    logger.info("Evento a registrar:", event)

    const ownerObjectId = new ObjectId(accessContext.ownerId)

    // GUARDAR EN COLECCIÓN CANÓNICA 'events' (fuente principal de verdad)
    try {
      await db.collection('events').insertOne({
        _id: new ObjectId(event._id),
        childId: new ObjectId(event.childId),
        parentId: ownerObjectId,
        createdBy: new ObjectId(session.user.id),
        eventType: event.eventType,
        emotionalState: event.emotionalState,
        startTime: event.startTime,
        endTime: event.endTime,
        duration: event.duration,
        durationReadable: event.durationReadable,
        notes: event.notes,
        sleepDelay: event.sleepDelay,
        awakeDelay: event.awakeDelay,
        feedingType: event.feedingType,
        feedingAmount: event.feedingAmount,
        feedingDuration: event.feedingDuration,
        babyState: event.babyState,
        feedingNotes: event.feedingNotes,
        medicationName: event.medicationName,
        medicationDose: event.medicationDose,
        medicationTime: event.medicationTime,
        medicationNotes: event.medicationNotes,
        activityDescription: event.activityDescription,
        activityDuration: event.activityDuration,
        activityImpact: event.activityImpact,
        activityNotes: event.activityNotes,
        createdAt: event.createdAt
      })
      logger.info(`✅ Evento ${event._id} guardado en colección 'events'`)
    } catch (insertError: any) {
      logger.error(`❌ Error guardando evento ${event._id} en colección 'events':`, insertError)
      return NextResponse.json(
        { error: "No se pudo registrar el evento", details: insertError.message },
        { status: 500 }
      )
    }

    // SINCRONIZAR CON COLECCIÓN ANALYTICS (no bloquear si falla)
    try {
      await syncEventToAnalyticsCollection({
        _id: event._id,
        childId: event.childId,
        parentId: ownerObjectId,
        createdBy: new ObjectId(session.user.id),
        eventType: event.eventType,
        emotionalState: event.emotionalState,
        startTime: event.startTime,
        endTime: event.endTime,
        duration: event.duration,
        notes: event.notes,
        sleepDelay: event.sleepDelay,
        awakeDelay: event.awakeDelay,
        feedingType: event.feedingType,
        feedingAmount: event.feedingAmount,
        feedingDuration: event.feedingDuration,
        babyState: event.babyState,
        feedingNotes: event.feedingNotes,
        medicationName: event.medicationName,
        medicationDose: event.medicationDose,
        medicationTime: event.medicationTime,
        medicationNotes: event.medicationNotes,
        activityDescription: event.activityDescription,
        activityDuration: event.activityDuration,
        activityImpact: event.activityImpact,
        activityNotes: event.activityNotes,
        createdAt: event.createdAt
      })
      logger.info(`Evento ${event._id} sincronizado a colección analytics`)
    } catch (syncError) {
      logger.warn(`No se pudo sincronizar evento ${event._id} a analytics:`, syncError)
      // No fallar la operación principal por error de sincronización
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

    let accessContext
    try {
      accessContext = await resolveChildAccess(db, session.user, childId, "canViewEvents")
    } catch (error) {
      if (error instanceof ChildAccessError) {
        return NextResponse.json({ error: error.message }, { status: error.status })
      }
      throw error
    }

    const isAdmin = session.user.role === "admin"
    logger.info(`Usuario: ${session.user.id}, Es admin: ${isAdmin}, Solicitando niño: ${childId}`)

    const child = accessContext.child
    logger.info(`Niño encontrado: ${child.firstName} ${child.lastName}, buscando eventos`)

    // Buscar eventos SOLO en la colección 'events' (fuente única de verdad)
    // Para admins, no filtrar por parentId
    const eventsQuery = isAdmin
      ? { childId: new ObjectId(childId) }
      : { childId: new ObjectId(childId), parentId: new ObjectId(accessContext.ownerId) }

    const events = await db.collection("events").find(eventsQuery).toArray()
    logger.info(`✅ Eventos encontrados en colección 'events': ${events.length}`)

    // Ordenar eventos por startTime antes de devolver
    const sortedEvents = events.sort((a: any, b: any) => {
      if (!a.startTime || !b.startTime) return 0
      const timeA = new Date(a.startTime).getTime()
      const timeB = new Date(b.startTime).getTime()
      return timeA - timeB // Orden cronológico ascendente
    })

    logger.info(`Total de eventos ordenados: ${sortedEvents.length}`)
    
    // Devolver los detalles del niño, incluyendo sus eventos ordenados
    return NextResponse.json({
      _id: child._id,
      firstName: child.firstName,
      lastName: child.lastName,
      events: sortedEvents,
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

    let accessContext
    try {
      accessContext = await resolveChildAccess(db, session.user, data.childId, "canEditEvents")
    } catch (error) {
      if (error instanceof ChildAccessError) {
        return NextResponse.json({ error: error.message }, { status: error.status })
      }
      throw error
    }

    // NOTA: Validación de traslape eliminada - ahora se permiten eventos traslapados

    // Crear el objeto de evento actualizado
    const updatedEvent: any = {
      _id: data.id,
      childId: data.childId,
      eventType: data.eventType,
      emotionalState: data.emotionalState || "neutral",
      startTime: data.startTime,
      endTime: data.endTime || null,
      notes: data.notes || "",
      createdAt: data.createdAt || new Date().toISOString(),
    }

    // Agregar campos específicos de alimentación si aplica
    if (data.eventType === "feeding") {
      updatedEvent.feedingType = data.feedingType
      updatedEvent.feedingAmount = data.feedingAmount
      updatedEvent.feedingDuration = data.feedingDuration
      updatedEvent.babyState = data.babyState
      updatedEvent.feedingNotes = data.feedingNotes || ""
    }

    logger.info("Evento a actualizar:", updatedEvent)

    // Actualizar el evento específico en el array de eventos del niño
    const result = await db.collection("children").updateOne(
      { 
        _id: new ObjectId(data.childId),
        parentId: new ObjectId(accessContext.ownerId),
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

    let accessContext
    try {
      accessContext = await resolveChildAccess(db, session.user, data.childId, "canEditEvents")
    } catch (error) {
      if (error instanceof ChildAccessError) {
        return NextResponse.json({ error: error.message }, { status: error.status })
      }
      throw error
    }

    let child = accessContext.child
    if (!child?.events) {
      const childWithEvents = await db.collection("children").findOne(
        { _id: new ObjectId(data.childId) },
        { projection: { events: 1, parentId: 1 } }
      )
      child = childWithEvents || child
    }

    // Validaciones para sleepDelay y awakeDelay en PATCH
    if (data.sleepDelay !== undefined && data.sleepDelay !== null) {
      if (data.sleepDelay < 0 || data.sleepDelay > 180) {
        logger.error("sleepDelay fuera de rango en PATCH")
        return NextResponse.json(
          { error: "sleepDelay debe estar entre 0 y 180 minutos" },
          { status: 400 }
        )
      }
    }

    if (data.awakeDelay !== undefined && data.awakeDelay !== null) {
      if (data.awakeDelay < 0 || data.awakeDelay > 180) {
        logger.error("awakeDelay fuera de rango en PATCH")
        return NextResponse.json(
          { error: "awakeDelay debe estar entre 0 y 180 minutos" },
          { status: 400 }
        )
      }
    }

    // Preparar los campos a actualizar
    const updateFields: any = {}
    if (data.endTime) updateFields["events.$.endTime"] = data.endTime
    if (data.duration !== undefined) updateFields["events.$.duration"] = data.duration
    if (data.notes !== undefined) updateFields["events.$.notes"] = data.notes
    if (data.emotionalState) updateFields["events.$.emotionalState"] = data.emotionalState
    if (data.sleepDelay !== undefined) updateFields["events.$.sleepDelay"] = data.sleepDelay
    if (data.awakeDelay !== undefined) updateFields["events.$.awakeDelay"] = data.awakeDelay
    
    // Campos específicos de alimentación
    if (data.feedingType) updateFields["events.$.feedingType"] = data.feedingType
    if (data.feedingAmount !== undefined) updateFields["events.$.feedingAmount"] = data.feedingAmount
    if (data.feedingDuration !== undefined) updateFields["events.$.feedingDuration"] = data.feedingDuration
    if (data.babyState) updateFields["events.$.babyState"] = data.babyState
    if (data.feedingNotes !== undefined) updateFields["events.$.feedingNotes"] = data.feedingNotes

    // CALCULAR DURACIÓN AUTOMÁTICAMENTE si se está agregando endTime y no hay duration explícita
    if (data.endTime && data.duration === undefined) {
      // Primero necesitamos obtener el evento para acceder a startTime y delays
      const existingEvent = child?.events?.find((e: any) => e._id === data.eventId)
      
      if (existingEvent && existingEvent.startTime) {
        // Para eventos de sueño/siesta, usar calculateSleepDuration
        if (['sleep', 'nap'].includes(existingEvent.eventType)) {
          const sleepDelay = data.sleepDelay !== undefined ? data.sleepDelay : existingEvent.sleepDelay
          const calculatedDuration = calculateSleepDuration(existingEvent.startTime, data.endTime, sleepDelay)
          updateFields["events.$.duration"] = calculatedDuration
          updateFields["events.$.durationReadable"] = formatDurationReadable(calculatedDuration)
          logger.info(`Duración calculada automáticamente en PATCH: ${calculatedDuration} minutos (${formatDurationReadable(calculatedDuration)})`)
        } 
        // Para eventos night_waking, usar calculateAwakeDuration
        else if (existingEvent.eventType === 'night_waking') {
          const awakeDelay = data.awakeDelay !== undefined ? data.awakeDelay : existingEvent.awakeDelay
          const calculatedDuration = calculateAwakeDuration(existingEvent.startTime, data.endTime, awakeDelay)
          updateFields["events.$.duration"] = calculatedDuration
          updateFields["events.$.durationReadable"] = formatDurationReadable(calculatedDuration)
          logger.info(`Duración de despertar calculada automáticamente en PATCH: ${calculatedDuration} minutos (${formatDurationReadable(calculatedDuration)})`)
        }
      }
    } else if (data.duration !== undefined) {
      // Si se proporciona duration manualmente, también calcular el formato legible
      updateFields["events.$.durationReadable"] = formatDurationReadable(data.duration)
    }
    
    logger.info("Actualizando evento con campos:", updateFields)
    
    // Actualizar el evento específico en el array events del niño
    const result = await db.collection("children").updateOne(
      { 
        _id: new ObjectId(data.childId),
        parentId: new ObjectId(accessContext.ownerId),
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
            ...(data.notes !== undefined && { notes: data.notes }),
            ...(data.emotionalState && { emotionalState: data.emotionalState })
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

    let accessContext
    try {
      accessContext = await resolveChildAccess(db, session.user, childId, "canEditEvents")
    } catch (error) {
      if (error instanceof ChildAccessError) {
        return NextResponse.json({ error: error.message }, { status: error.status })
      }
      throw error
    }

    // PASO 1: Eliminar de la colección canónica 'events'
    let deletedFromEvents = 0
    try {
      const eventsCol = db.collection('events')
      // Intentar eliminar con ObjectId
      let deleteResult = await eventsCol.deleteOne({ _id: new ObjectId(eventId) })
      deletedFromEvents = deleteResult.deletedCount || 0
      logger.info(`Eliminado de colección events (ObjectId): ${deletedFromEvents}`)

      // Si no se eliminó, intentar con string (eventos antiguos)
      if (deletedFromEvents === 0) {
        deleteResult = await eventsCol.deleteOne({ _id: eventId })
        deletedFromEvents = deleteResult.deletedCount || 0
        logger.info(`Eliminado de colección events (string): ${deletedFromEvents}`)
      }
    } catch (e) {
      logger.warn('Error eliminando de colección events:', e)
    }

    // PASO 2: Eliminar del array embebido children.events (compatibilidad)
    const result = await db.collection("children").updateOne(
      { 
        _id: new ObjectId(childId),
        parentId: new ObjectId(accessContext.ownerId)
      },
      { $pull: { events: { _id: eventId } } as any }
    )

    logger.info("Resultado de la eliminación del array embebido:", result)

    // Verificar que al menos se eliminó de uno de los dos lugares
    if (deletedFromEvents === 0 && result.modifiedCount === 0) {
      logger.error("No se pudo eliminar el evento de ninguna colección")
      return NextResponse.json(
        { error: "No se pudo eliminar el evento o no existe" },
        { status: 404 }
      )
    }

    // SINCRONIZAR ELIMINACIÓN CON COLECCIÓN ANALYTICS (no bloquear si falla)
    try {
      await removeEventFromAnalyticsCollection(eventId)
      logger.info(`Evento ${eventId} eliminado de colección analytics`)
    } catch (syncError) {
      logger.warn(`No se pudo eliminar evento ${eventId} de analytics:`, syncError)
      // No fallar la operación principal por error de sincronización
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
