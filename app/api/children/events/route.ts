// API para gestionar eventos de niños
// Permite registrar eventos para un niño específico

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { differenceInMinutes, parseISO } from "date-fns"

import * as Sentry from "@sentry/nextjs"
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
    Sentry.captureException(error)
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
    Sentry.captureException(error)
    return 0
  }
}

/**
 * Convierte minutos a formato legible (Ej: "2h 30min")
 * @param minutes - Duración en minutos
 * @returns String legible de la duración
 */
function formatDurationReadable(minutes: number | null): string {
  if (!minutes || minutes === 0) return ""
  
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
    if (data.eventType === "night_waking") {
      logger.info("[NIGHT_WAKING] Recibido evento de despertar nocturno:", {
        childId: data.childId,
        startTime: data.startTime,
        emotionalState: data.emotionalState,
        fullData: data,
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

    // Validaciones específicas para notas de bitácora
    if (data.eventType === "note") {
      // noteText o notes es requerido (soportamos ambos campos por compatibilidad)
      const noteContent = data.noteText || data.notes
      if (!noteContent || noteContent.trim().length < 1) {
        logger.error("Contenido de nota requerido")
        return NextResponse.json(
          { error: "El contenido de la nota es requerido" },
          { status: 400 }
        )
      }

      // Validar longitud máxima
      if (noteContent.length > 1000) {
        logger.error("Nota muy larga")
        return NextResponse.json(
          { error: "La nota no puede exceder 1000 caracteres" },
          { status: 400 }
        )
      }

      // Normalizar: guardar en noteText
      data.noteText = noteContent.trim()
    }

    // Validaciones específicas para eventos de alimentación
    if (data.eventType === "feeding") {
      // feedingType es requerido
      if (!data.feedingType || !["breast", "bottle", "solids"].includes(data.feedingType)) {
        logger.error("Tipo de alimentación inválido o faltante")
        return NextResponse.json(
          { error: "Tipo de alimentación requerido: 'breast', 'bottle', o 'solids'" },
          { status: 400 }
        )
      }

      // Normalización de estado: sólidos siempre es 'awake'
      if (data.feedingType === "solids") {
        data.babyState = "awake"
      }

      // Validar babyState
      if (!data.babyState || !["awake", "asleep"].includes(data.babyState)) {
        logger.error("Estado del bebé inválido o faltante")
        return NextResponse.json(
          { error: "Estado del bebé requerido: 'awake' o 'asleep'" },
          { status: 400 }
        )
      }

      // Validaciones específicas por tipo
      // NOTA: feedingDuration ya NO es obligatorio - se calcula automáticamente desde startTime/endTime
      if (data.feedingType === "breast") {
        // Pecho: sin validaciones obligatorias - duración se calcula automáticamente
        // feedingAmount es opcional; si existe validar rango
        if (data.feedingAmount !== undefined && data.feedingAmount !== null) {
          if (data.feedingAmount < 1 || data.feedingAmount > 500) {
            logger.error("Cantidad de alimentación inválida (opcional en pecho)")
            return NextResponse.json(
              { error: "Cantidad (si se proporciona) debe estar entre 1 y 500" },
              { status: 400 }
            )
          }
        }
      } else if (data.feedingType === "bottle") {
        // Biberón: feedingAmount es opcional pero si existe, validar rango
        if (data.feedingAmount !== undefined && data.feedingAmount !== null) {
          if (data.feedingAmount < 1 || data.feedingAmount > 500) {
            logger.error("Cantidad de alimentación inválida (biberón)")
            return NextResponse.json(
              { error: "En biberón, la cantidad debe estar entre 1 y 500 ml" },
              { status: 400 }
            )
          }
        }
        // Sin validación de feedingDuration - se calcula automáticamente
      } else if (data.feedingType === "solids") {
        // Sólidos: sin validaciones obligatorias - solo descripción en notas
        // feedingAmount es opcional
        if (data.feedingAmount !== undefined && data.feedingAmount !== null) {
          if (data.feedingAmount < 1 || data.feedingAmount > 500) {
            logger.error("Cantidad de alimentación inválida (sólidos)")
            return NextResponse.json(
              { error: "En sólidos, la cantidad debe estar entre 1 y 500 gr" },
              { status: 400 }
            )
          }
        }
        // Sin validación de feedingDuration - se calcula automáticamente
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
      notes: data.noteText || data.notes || "", // Soporta noteText (NoteModal) y notes (legacy)
      duration: data.duration || null, // Se calculará automáticamente si es posible
      durationReadable: "", // Se calculará si hay duration
      sleepDelay: data.sleepDelay ?? null, // Usar ?? para preservar 0
      awakeDelay: data.awakeDelay ?? null, // Para eventos night_waking
      didNotSleep: data.didNotSleep || false,
      createdAt: new Date().toISOString(),
    }

    // Agregar campos específicos de alimentación si aplica (feeding y night_feeding legacy)
    if (data.eventType === "feeding" || data.eventType === "night_feeding") {
      event.feedingType = data.feedingType
      event.feedingSubtype = data.feedingSubtype || data.feedingType
      event.feedingAmount = data.feedingAmount
      event.feedingDuration = data.feedingDuration
      event.babyState = data.babyState
      event.feedingNotes = data.feedingNotes || ""
      // Nuevos campos para alimentación nocturna (reemplaza eventType: "night_feeding")
      event.isNightFeeding = data.isNightFeeding ?? false
      event.feedingContext = data.feedingContext || "awake"
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
      if (["sleep", "nap"].includes(event.eventType)) {
        event.duration = calculateSleepDuration(event.startTime, event.endTime, event.sleepDelay)
        event.durationReadable = formatDurationReadable(event.duration)
        logger.info(`Duración calculada automáticamente: ${event.duration} minutos (${event.durationReadable})`)
      } else if (event.eventType === "night_waking") {
        // Para night_waking, usar calculateAwakeDuration con awakeDelay
        event.duration = calculateAwakeDuration(event.startTime, event.endTime, event.awakeDelay)
        event.durationReadable = formatDurationReadable(event.duration)
        logger.info(`Duración de despertar calculada automáticamente: ${event.duration} minutos (${event.durationReadable})`)
      } else if (["feeding", "night_feeding"].includes(event.eventType)) {
        // Para eventos de alimentación, calcular duración desde startTime/endTime
        const durationMinutes = differenceInMinutes(parseISO(event.endTime), parseISO(event.startTime))
        event.feedingDuration = Math.max(0, durationMinutes)
        event.duration = event.feedingDuration
        event.durationReadable = formatDurationReadable(event.duration)
        logger.info(`Duración de alimentación calculada automáticamente: ${event.duration} minutos (${event.durationReadable})`)
      }
    } else if (event.duration) {
      // Si ya tiene duration, calcular el formato legible
      event.durationReadable = formatDurationReadable(event.duration)
    }

    logger.info("Evento a registrar:", event)

    const ownerObjectId = new ObjectId(accessContext.ownerId)

    // GUARDAR EN COLECCIÓN CANÓNICA 'events' (fuente principal de verdad)
    try {
      await db.collection("events").insertOne({
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
        didNotSleep: event.didNotSleep,
        feedingType: event.feedingType,
        feedingSubtype: event.feedingSubtype,
        feedingAmount: event.feedingAmount,
        feedingDuration: event.feedingDuration,
        babyState: event.babyState,
        feedingNotes: event.feedingNotes,
        isNightFeeding: event.isNightFeeding,
        feedingContext: event.feedingContext,
        medicationName: event.medicationName,
        medicationDose: event.medicationDose,
        medicationTime: event.medicationTime,
        medicationNotes: event.medicationNotes,
        activityDescription: event.activityDescription,
        activityDuration: event.activityDuration,
        activityImpact: event.activityImpact,
        activityNotes: event.activityNotes,
        createdAt: event.createdAt,
      })
      logger.info(`✅ Evento ${event._id} guardado en colección 'events'`)
    } catch (insertError: any) {
      logger.error(`❌ Error guardando evento ${event._id} en colección 'events':`, insertError)
      Sentry.captureException(insertError)
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
        parentId: ownerObjectId.toString(),
        createdBy: session.user.id,
        eventType: event.eventType,
        emotionalState: event.emotionalState,
        startTime: event.startTime,
        endTime: event.endTime,
        duration: event.duration,
        durationReadable: event.durationReadable,
        notes: event.notes,
        sleepDelay: event.sleepDelay,
        awakeDelay: event.awakeDelay,
        didNotSleep: event.didNotSleep,
        feedingType: event.feedingType,
        feedingSubtype: event.feedingSubtype,
        feedingAmount: event.feedingAmount,
        feedingDuration: event.feedingDuration,
        babyState: event.babyState,
        feedingNotes: event.feedingNotes,
        isNightFeeding: event.isNightFeeding,
        feedingContext: event.feedingContext,
        medicationName: event.medicationName,
        medicationDose: event.medicationDose,
        medicationTime: event.medicationTime,
        medicationNotes: event.medicationNotes,
        activityDescription: event.activityDescription,
        activityDuration: event.activityDuration,
        activityImpact: event.activityImpact,
        activityNotes: event.activityNotes,
        createdAt: event.createdAt,
      })
      logger.info(`Evento ${event._id} sincronizado a colección analytics`)
    } catch (syncError) {
      logger.warn(`No se pudo sincronizar evento ${event._id} a analytics:`, syncError)
      Sentry.captureException(syncError)
      // No fallar la operación principal por error de sincronización
    }

    return NextResponse.json(
      { message: "Evento registrado exitosamente", event },
      { status: 201 }
    )
  } catch (error: any) {
    logger.error("Error al registrar evento:", { message: error.message, stack: error.stack })
    Sentry.captureException(error)
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
    Sentry.captureException(error)
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
      notes: data.noteText || data.notes || "", // Soporta noteText (NoteModal) y notes (legacy)
      createdAt: data.createdAt || new Date().toISOString(),
    }

    // Agregar campos específicos de alimentación si aplica
    if (data.eventType === "feeding" || data.eventType === "night_feeding") {
      updatedEvent.feedingType = data.feedingType
      updatedEvent.feedingSubtype = data.feedingSubtype || data.feedingType
      updatedEvent.feedingAmount = data.feedingAmount
      updatedEvent.feedingDuration = data.feedingDuration
      updatedEvent.babyState = data.babyState
      updatedEvent.feedingNotes = data.feedingNotes || ""
      updatedEvent.isNightFeeding = data.isNightFeeding ?? false
      updatedEvent.feedingContext = data.feedingContext || "awake"
    }

    // Agregar campos específicos de medicamentos si aplica
    if (data.eventType === "medication") {
      updatedEvent.medicationName = data.medicationName || ""
      updatedEvent.medicationDose = data.medicationDose || ""
      updatedEvent.medicationTime = data.medicationTime || data.startTime
      updatedEvent.medicationNotes = data.medicationNotes || ""
    }

    // Agregar campos específicos de actividad extra si aplica
    if (data.eventType === "extra_activities") {
      updatedEvent.activityDescription = data.activityDescription || data.description || ""
      updatedEvent.activityDuration = data.activityDuration || null
      updatedEvent.activityImpact = data.activityImpact || "neutral"
      updatedEvent.activityNotes = data.activityNotes || ""
    }

    // Agregar campos de sueño si aplica
    if (["sleep", "nap", "night_waking"].includes(data.eventType)) {
      updatedEvent.sleepDelay = data.sleepDelay || null
      updatedEvent.awakeDelay = data.awakeDelay || null
      updatedEvent.didNotSleep = data.didNotSleep || false

      // Calcular duración si hay startTime y endTime
      if (data.startTime && data.endTime) {
        if (["sleep", "nap"].includes(data.eventType)) {
          updatedEvent.duration = calculateSleepDuration(data.startTime, data.endTime, data.sleepDelay)
        } else if (data.eventType === "night_waking") {
          updatedEvent.duration = calculateAwakeDuration(data.startTime, data.endTime, data.awakeDelay)
        }
        updatedEvent.durationReadable = formatDurationReadable(updatedEvent.duration)
      }
    }

    logger.info("Evento a actualizar:", updatedEvent)

    // ACTUALIZAR EN COLECCIÓN CANÓNICA 'events' (fuente única de verdad)
    const eventsCol = db.collection("events")
    let eventObjectId: any

    // Intentar convertir el ID a ObjectId
    try {
      eventObjectId = new ObjectId(data.id)
    } catch {
      eventObjectId = data.id // Usar como string si no es ObjectId válido
    }

    // Preparar los campos a actualizar (sin _id)
    const { _id: _ignoreId, ...updateFields } = updatedEvent

    // Buscar y actualizar el evento
    const result = await eventsCol.updateOne(
      {
        _id: eventObjectId,
        childId: new ObjectId(data.childId),
      },
      {
        $set: {
          ...updateFields,
          updatedAt: new Date().toISOString(),
        }
      }
    )

    logger.info("Resultado de la actualización en colección events:", result)

    if (result.matchedCount === 0) {
      // Intentar buscar con string ID (eventos legacy)
      const legacyResult = await eventsCol.updateOne(
        {
          _id: data.id,
          childId: new ObjectId(data.childId),
        },
        {
          $set: {
            ...updateFields,
            updatedAt: new Date().toISOString(),
          }
        }
      )

      if (legacyResult.matchedCount === 0) {
        logger.error("Evento no encontrado en colección events")
        return NextResponse.json(
          { error: "Evento no encontrado" },
          { status: 404 }
        )
      }

      logger.info("Evento actualizado (legacy string ID)")
    }

    // SINCRONIZAR CON COLECCIÓN ANALYTICS (no bloquear si falla)
    try {
      await syncEventToAnalyticsCollection({
        _id: data.id,
        childId: data.childId,
        parentId: accessContext.ownerId,
        eventType: updatedEvent.eventType,
        emotionalState: updatedEvent.emotionalState,
        startTime: updatedEvent.startTime,
        endTime: updatedEvent.endTime,
        duration: updatedEvent.duration,
        durationReadable: updatedEvent.durationReadable,
        notes: updatedEvent.notes,
        sleepDelay: updatedEvent.sleepDelay,
        awakeDelay: updatedEvent.awakeDelay,
        didNotSleep: updatedEvent.didNotSleep,
        feedingType: updatedEvent.feedingType,
        feedingSubtype: updatedEvent.feedingSubtype,
        feedingAmount: updatedEvent.feedingAmount,
        feedingDuration: updatedEvent.feedingDuration,
        babyState: updatedEvent.babyState,
        feedingNotes: updatedEvent.feedingNotes,
        isNightFeeding: updatedEvent.isNightFeeding,
        feedingContext: updatedEvent.feedingContext,
        medicationName: updatedEvent.medicationName,
        medicationDose: updatedEvent.medicationDose,
        medicationTime: updatedEvent.medicationTime,
        medicationNotes: updatedEvent.medicationNotes,
        activityDescription: updatedEvent.activityDescription,
        activityDuration: updatedEvent.activityDuration,
        activityImpact: updatedEvent.activityImpact,
        activityNotes: updatedEvent.activityNotes,
        createdAt: updatedEvent.createdAt,
      })
      logger.info(`Evento ${data.id} sincronizado a colección analytics`)
    } catch (syncError) {
      logger.warn(`No se pudo sincronizar evento ${data.id} a analytics:`, syncError)
      Sentry.captureException(syncError)
      // No fallar la operación principal por error de sincronización
    }

    return NextResponse.json(
      { message: "Evento actualizado exitosamente", event: updatedEvent },
      { status: 200 }
    )
  } catch (error: any) {
    logger.error("Error al actualizar evento:", { message: error.message, stack: error.stack })
    Sentry.captureException(error)
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

    // ACTUALIZAR EN COLECCIÓN CANÓNICA 'events' (fuente única de verdad)
    const eventsCol = db.collection("events")
    let eventObjectId: any

    // Intentar convertir el ID a ObjectId
    try {
      eventObjectId = new ObjectId(data.eventId)
    } catch {
      eventObjectId = data.eventId // Usar como string si no es ObjectId válido
    }

    // Primero obtener el evento existente para acceder a sus datos
    let existingEvent: any = null
    try {
      existingEvent = await eventsCol.findOne({ _id: eventObjectId })
    } catch {
      existingEvent = await eventsCol.findOne({ _id: data.eventId })
    }

    if (!existingEvent) {
      logger.error("Evento no encontrado en colección events")
      return NextResponse.json(
        { error: "Evento no encontrado" },
        { status: 404 }
      )
    }

    // Preparar los campos a actualizar
    const updateFields: any = {}
    if (data.endTime) updateFields.endTime = data.endTime
    if (data.duration !== undefined) updateFields.duration = data.duration
    if (data.notes !== undefined) updateFields.notes = data.notes
    if (data.emotionalState) updateFields.emotionalState = data.emotionalState
    if (data.sleepDelay !== undefined) updateFields.sleepDelay = data.sleepDelay
    if (data.awakeDelay !== undefined) updateFields.awakeDelay = data.awakeDelay
    if (data.didNotSleep !== undefined) updateFields.didNotSleep = data.didNotSleep

    // Campos específicos de alimentación
    if (data.feedingType) updateFields.feedingType = data.feedingType
    if (data.feedingAmount !== undefined) updateFields.feedingAmount = data.feedingAmount
    if (data.feedingDuration !== undefined) updateFields.feedingDuration = data.feedingDuration
    if (data.babyState) updateFields.babyState = data.babyState
    if (data.feedingNotes !== undefined) updateFields.feedingNotes = data.feedingNotes
    if (data.isNightFeeding !== undefined) updateFields.isNightFeeding = data.isNightFeeding
    if (data.feedingContext) updateFields.feedingContext = data.feedingContext

    // CALCULAR DURACIÓN AUTOMÁTICAMENTE si se está agregando endTime y no hay duration explícita
    if (data.endTime && data.duration === undefined && existingEvent.startTime) {
      // Para eventos de sueño/siesta, usar calculateSleepDuration
      if (["sleep", "nap"].includes(existingEvent.eventType)) {
        const sleepDelay = data.sleepDelay !== undefined ? data.sleepDelay : existingEvent.sleepDelay
        const calculatedDuration = calculateSleepDuration(existingEvent.startTime, data.endTime, sleepDelay)
        updateFields.duration = calculatedDuration
        updateFields.durationReadable = formatDurationReadable(calculatedDuration)
        logger.info(`Duración calculada automáticamente en PATCH: ${calculatedDuration} minutos (${formatDurationReadable(calculatedDuration)})`)
      }
      // Para eventos night_waking, usar calculateAwakeDuration
      else if (existingEvent.eventType === "night_waking") {
        const awakeDelay = data.awakeDelay !== undefined ? data.awakeDelay : existingEvent.awakeDelay
        const calculatedDuration = calculateAwakeDuration(existingEvent.startTime, data.endTime, awakeDelay)
        updateFields.duration = calculatedDuration
        updateFields.durationReadable = formatDurationReadable(calculatedDuration)
        logger.info(`Duración de despertar calculada automáticamente en PATCH: ${calculatedDuration} minutos (${formatDurationReadable(calculatedDuration)})`)
      }
    } else if (data.duration !== undefined) {
      // Si se proporciona duration manualmente, también calcular el formato legible
      updateFields.durationReadable = formatDurationReadable(data.duration)
    }

    // Agregar timestamp de actualización
    updateFields.updatedAt = new Date().toISOString()

    logger.info("Actualizando evento con campos:", updateFields)

    // Actualizar el evento en la colección events
    const result = await eventsCol.updateOne(
      { _id: eventObjectId },
      { $set: updateFields }
    )

    logger.info("Resultado de la actualización parcial:", result)

    if (result.matchedCount === 0) {
      // Intentar con string ID (eventos legacy)
      const legacyResult = await eventsCol.updateOne(
        { _id: data.eventId },
        { $set: updateFields }
      )

      if (legacyResult.matchedCount === 0) {
        return NextResponse.json(
          { error: "Evento no encontrado" },
          { status: 404 }
        )
      }
    }

    // SINCRONIZAR CON COLECCIÓN ANALYTICS (no bloquear si falla)
    try {
      await syncEventToAnalyticsCollection({
        _id: data.eventId,
        childId: existingEvent.childId?.toString() || data.childId,
        parentId: existingEvent.parentId?.toString() || accessContext.ownerId,
        eventType: existingEvent.eventType,
        emotionalState: updateFields.emotionalState || existingEvent.emotionalState,
        startTime: existingEvent.startTime,
        endTime: updateFields.endTime || existingEvent.endTime,
        duration: updateFields.duration || existingEvent.duration,
        durationReadable: updateFields.durationReadable || existingEvent.durationReadable,
        notes: updateFields.notes !== undefined ? updateFields.notes : existingEvent.notes,
        sleepDelay: updateFields.sleepDelay !== undefined ? updateFields.sleepDelay : existingEvent.sleepDelay,
        awakeDelay: updateFields.awakeDelay !== undefined ? updateFields.awakeDelay : existingEvent.awakeDelay,
        didNotSleep: updateFields.didNotSleep !== undefined ? updateFields.didNotSleep : existingEvent.didNotSleep,
        feedingType: updateFields.feedingType || existingEvent.feedingType,
        feedingSubtype: existingEvent.feedingSubtype,
        feedingAmount: updateFields.feedingAmount !== undefined ? updateFields.feedingAmount : existingEvent.feedingAmount,
        feedingDuration: updateFields.feedingDuration !== undefined ? updateFields.feedingDuration : existingEvent.feedingDuration,
        babyState: updateFields.babyState || existingEvent.babyState,
        feedingNotes: updateFields.feedingNotes !== undefined ? updateFields.feedingNotes : existingEvent.feedingNotes,
        isNightFeeding: updateFields.isNightFeeding !== undefined ? updateFields.isNightFeeding : existingEvent.isNightFeeding,
        feedingContext: updateFields.feedingContext || existingEvent.feedingContext,
        medicationName: existingEvent.medicationName,
        medicationDose: existingEvent.medicationDose,
        medicationTime: existingEvent.medicationTime,
        medicationNotes: existingEvent.medicationNotes,
        activityDescription: existingEvent.activityDescription,
        activityDuration: existingEvent.activityDuration,
        activityImpact: existingEvent.activityImpact,
        activityNotes: existingEvent.activityNotes,
        createdAt: existingEvent.createdAt,
      })
      logger.info(`Evento ${data.eventId} sincronizado a colección analytics`)
    } catch (syncError) {
      logger.warn(`No se pudo sincronizar evento ${data.eventId} a analytics:`, syncError)
      Sentry.captureException(syncError)
      // No fallar la operación principal por error de sincronización
    }

    return NextResponse.json(
      { message: "Evento actualizado exitosamente" },
      { status: 200 }
    )
  } catch (error: any) {
    logger.error("Error al actualizar evento:", error.message)
    Sentry.captureException(error)
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
      const eventsCol = db.collection("events")
      // Intentar eliminar con ObjectId
      let deleteResult = await eventsCol.deleteOne({ _id: new ObjectId(eventId) })
      deletedFromEvents = deleteResult.deletedCount || 0
      logger.info(`Eliminado de colección events (ObjectId): ${deletedFromEvents}`)

      // Si no se eliminó, intentar con string (eventos antiguos)
      if (deletedFromEvents === 0) {
        deleteResult = await eventsCol.deleteOne({ _id: eventId as any })
        deletedFromEvents = deleteResult.deletedCount || 0
        logger.info(`Eliminado de colección events (string): ${deletedFromEvents}`)
      }
    } catch (e) {
      logger.warn("Error eliminando de colección events:", e)
      Sentry.captureException(e)
    }

    // Verificar que se elimino de la coleccion events
    if (deletedFromEvents === 0) {
      logger.warn("Evento no encontrado en coleccion events - puede ser evento legacy muy antiguo")
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
      Sentry.captureException(syncError)
      // No fallar la operación principal por error de sincronización
    }

    return NextResponse.json(
      { message: "Evento eliminado exitosamente" },
      { status: 200 }
    )
  } catch (error: any) {
    logger.error("Error al eliminar evento:", { message: error.message, stack: error.stack })
    Sentry.captureException(error)
    return NextResponse.json(
      { error: "Error al eliminar el evento" },
      { status: 500 }
    )
  }
} 
