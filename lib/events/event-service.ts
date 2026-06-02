// Servicio compartido de eventos: fuente unica de verdad para crear/listar/editar/eliminar.
// Lo usan tanto la ruta de sesion (/api/children/events) como la API publica (/api/v1/events).
// Recibe un "actor" minimo { id, role } que puede venir de una sesion NextAuth o de una API Key.

import { Db, ObjectId } from "mongodb"
import { differenceInMinutes, parseISO } from "date-fns"
import * as Sentry from "@sentry/nextjs"
import { createLogger } from "@/lib/logger"
import { syncEventToAnalyticsCollection, removeEventFromAnalyticsCollection } from "@/lib/event-sync"
import { resolveChildAccess } from "@/lib/api/child-access"

const logger = createLogger("event-service")

export type EventActor = { id: string; role?: string | null }

export class EventServiceError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = "EventServiceError"
    this.status = status
  }
}

// ---------- Helpers de duracion (extraidos de la ruta original) ----------

export function calculateSleepDuration(startTime: string, endTime: string, sleepDelay = 0): number {
  try {
    const start = parseISO(startTime)
    const end = parseISO(endTime)
    const totalMinutes = differenceInMinutes(end, start)
    const limitedSleepDelay = Math.min(Math.max(sleepDelay || 0, 0), 180)
    return Math.max(0, totalMinutes - limitedSleepDelay)
  } catch (error) {
    logger.error("Error calculando duración de sueño:", error)
    Sentry.captureException(error)
    return 0
  }
}

export function calculateAwakeDuration(startTime: string, endTime: string, awakeDelay = 0): number {
  try {
    const start = parseISO(startTime)
    const end = parseISO(endTime)
    return differenceInMinutes(end, start)
  } catch (error) {
    logger.error("Error calculando duración de despertar:", error)
    Sentry.captureException(error)
    return 0
  }
}

export function formatDurationReadable(minutes: number | null): string {
  if (!minutes || minutes === 0) return ""
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}min`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}min`
}

// ---------- Validacion por tipo de evento ----------

function validateEventData(data: any): void {
  if (!data.childId || !data.eventType) {
    throw new EventServiceError("Se requieren childId y eventType", 400)
  }

  if (data.eventType === "extra_activities") {
    if (!data.activityDescription || data.activityDescription.trim().length < 3) {
      throw new EventServiceError("La descripción de la actividad es requerida (mínimo 3 caracteres)", 400)
    }
    if (data.activityDuration && (data.activityDuration < 5 || data.activityDuration > 180)) {
      throw new EventServiceError("La duración de la actividad debe estar entre 5 y 180 minutos", 400)
    }
  }

  if (data.eventType === "medication") {
    if (!data.medicationName || data.medicationName.trim().length < 1) {
      throw new EventServiceError("El nombre del medicamento es requerido", 400)
    }
    if (!data.medicationDose || data.medicationDose.trim().length < 1) {
      throw new EventServiceError("La dosis del medicamento es requerida", 400)
    }
  }

  if (data.eventType === "note") {
    const noteContent = data.noteText || data.notes
    if (!noteContent || noteContent.trim().length < 1) {
      throw new EventServiceError("El contenido de la nota es requerido", 400)
    }
    if (noteContent.length > 1000) {
      throw new EventServiceError("La nota no puede exceder 1000 caracteres", 400)
    }
    data.noteText = noteContent.trim()
  }

  if (data.eventType === "feeding") {
    if (!data.feedingType || !["breast", "bottle", "solids"].includes(data.feedingType)) {
      throw new EventServiceError("Tipo de alimentación requerido: 'breast', 'bottle', o 'solids'", 400)
    }
    if (data.feedingType === "solids") {
      data.babyState = "awake"
    }
    if (!data.babyState || !["awake", "asleep"].includes(data.babyState)) {
      throw new EventServiceError("Estado del bebé requerido: 'awake' o 'asleep'", 400)
    }
    if (data.feedingAmount !== undefined && data.feedingAmount !== null) {
      if (data.feedingAmount < 1 || data.feedingAmount > 500) {
        throw new EventServiceError("La cantidad debe estar entre 1 y 500", 400)
      }
    }
    if (data.feedingNotes && data.feedingNotes.length > 500) {
      throw new EventServiceError("Las notas de alimentación no pueden exceder 500 caracteres", 400)
    }
  }

  if (data.sleepDelay !== undefined && data.sleepDelay !== null) {
    if (data.sleepDelay < 0 || data.sleepDelay > 180) {
      throw new EventServiceError("sleepDelay debe estar entre 0 y 180 minutos", 400)
    }
  }
  if (data.awakeDelay !== undefined && data.awakeDelay !== null) {
    if (data.awakeDelay < 0 || data.awakeDelay > 180) {
      throw new EventServiceError("awakeDelay debe estar entre 0 y 180 minutos", 400)
    }
  }
}

// ---------- CREATE ----------

export async function createEvent(db: Db, actor: EventActor, data: any): Promise<any> {
  validateEventData(data)

  const accessContext = await resolveChildAccess(db, actor, data.childId, "canCreateEvents")

  const event: any = {
    _id: new ObjectId().toString(),
    childId: data.childId,
    eventType: data.eventType,
    emotionalState: data.emotionalState || "neutral",
    notes: data.noteText || data.notes || "",
    duration: data.duration || null,
    durationReadable: "",
    sleepDelay: data.sleepDelay ?? null,
    awakeDelay: data.awakeDelay ?? null,
    didNotSleep: data.didNotSleep || false,
    createdAt: new Date().toISOString(),
  }

  if (data.eventType === "feeding" || data.eventType === "night_feeding") {
    event.feedingType = data.feedingType
    event.feedingSubtype = data.feedingSubtype || data.feedingType
    event.feedingAmount = data.feedingAmount
    event.feedingDuration = data.feedingDuration
    event.babyState = data.babyState
    event.feedingNotes = data.feedingNotes || ""
    event.isNightFeeding = data.isNightFeeding ?? false
    event.feedingContext = data.feedingContext || "awake"
  }

  if (data.eventType === "medication") {
    event.medicationName = data.medicationName || ""
    event.medicationDose = data.medicationDose || ""
    event.medicationTime = data.medicationTime || data.startTime
    event.medicationNotes = data.medicationNotes || ""
  }

  if (data.eventType === "extra_activities") {
    event.activityDescription = data.activityDescription || data.description || ""
    event.activityDuration = data.activityDuration || null
    event.activityImpact = data.activityImpact || "neutral"
    event.activityNotes = data.activityNotes || ""
  }

  if (data.startTime) event.startTime = data.startTime
  if (data.endTime) event.endTime = data.endTime

  if (event.startTime && event.endTime && !data.duration) {
    if (["sleep", "nap"].includes(event.eventType)) {
      event.duration = calculateSleepDuration(event.startTime, event.endTime, event.sleepDelay)
      event.durationReadable = formatDurationReadable(event.duration)
    } else if (event.eventType === "night_waking") {
      event.duration = calculateAwakeDuration(event.startTime, event.endTime, event.awakeDelay)
      event.durationReadable = formatDurationReadable(event.duration)
    } else if (["feeding", "night_feeding"].includes(event.eventType)) {
      const durationMinutes = differenceInMinutes(parseISO(event.endTime), parseISO(event.startTime))
      event.feedingDuration = Math.max(0, durationMinutes)
      event.duration = event.feedingDuration
      event.durationReadable = formatDurationReadable(event.duration)
    }
  } else if (event.duration) {
    event.durationReadable = formatDurationReadable(event.duration)
  }

  const ownerObjectId = new ObjectId(accessContext.ownerId)

  try {
    await db.collection("events").insertOne({
      _id: new ObjectId(event._id),
      childId: new ObjectId(event.childId),
      parentId: ownerObjectId,
      createdBy: new ObjectId(actor.id),
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
    } as any)
  } catch (insertError: any) {
    logger.error(`Error guardando evento ${event._id}:`, insertError)
    Sentry.captureException(insertError)
    throw new EventServiceError("No se pudo registrar el evento", 500)
  }

  // Auto-reactivar nino archivado si se registra un evento
  try {
    await db.collection("children").updateOne(
      { _id: new ObjectId(event.childId), archived: true },
      { $set: { archived: false, updatedAt: new Date() } }
    )
  } catch (reactivateErr) {
    logger.warn("Auto-reactivacion fallo (no critico):", reactivateErr)
  }

  // Sync a analytics (no bloquear si falla)
  try {
    await syncEventToAnalyticsCollection({
      _id: event._id,
      childId: event.childId,
      parentId: ownerObjectId.toString(),
      createdBy: actor.id,
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
  } catch (syncError) {
    logger.warn(`No se pudo sincronizar evento ${event._id} a analytics:`, syncError)
    Sentry.captureException(syncError)
  }

  return event
}

// ---------- LIST ----------

export async function listEvents(
  db: Db,
  actor: EventActor,
  childId: string
): Promise<{ child: any; events: any[] }> {
  if (!childId) throw new EventServiceError("Se requiere el ID del niño", 400)

  const accessContext = await resolveChildAccess(db, actor, childId, "canViewEvents")
  const isAdmin = actor.role === "admin"
  const child = accessContext.child

  const eventsQuery = isAdmin
    ? { childId: new ObjectId(childId) }
    : { childId: new ObjectId(childId), parentId: new ObjectId(accessContext.ownerId) }

  const events = await db.collection("events").find(eventsQuery).toArray()
  const sortedEvents = events.sort((a: any, b: any) => {
    if (!a.startTime || !b.startTime) return 0
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  })

  return { child, events: sortedEvents }
}

// ---------- UPDATE (PUT, reemplazo completo) ----------

export async function updateEvent(db: Db, actor: EventActor, data: any): Promise<any> {
  if (!data.id || !data.childId || !data.eventType) {
    throw new EventServiceError("Se requieren id, childId y eventType", 400)
  }

  const accessContext = await resolveChildAccess(db, actor, data.childId, "canEditEvents")

  const updatedEvent: any = {
    _id: data.id,
    childId: data.childId,
    eventType: data.eventType,
    emotionalState: data.emotionalState || "neutral",
    startTime: data.startTime,
    endTime: data.endTime || null,
    notes: data.noteText || data.notes || "",
    createdAt: data.createdAt || new Date().toISOString(),
  }

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

  if (data.eventType === "medication") {
    updatedEvent.medicationName = data.medicationName || ""
    updatedEvent.medicationDose = data.medicationDose || ""
    updatedEvent.medicationTime = data.medicationTime || data.startTime
    updatedEvent.medicationNotes = data.medicationNotes || ""
  }

  if (data.eventType === "extra_activities") {
    updatedEvent.activityDescription = data.activityDescription || data.description || ""
    updatedEvent.activityDuration = data.activityDuration || null
    updatedEvent.activityImpact = data.activityImpact || "neutral"
    updatedEvent.activityNotes = data.activityNotes || ""
  }

  if (["sleep", "nap", "night_waking"].includes(data.eventType)) {
    updatedEvent.sleepDelay = data.sleepDelay || null
    updatedEvent.awakeDelay = data.awakeDelay || null
    updatedEvent.didNotSleep = data.didNotSleep || false
    if (data.startTime && data.endTime) {
      if (["sleep", "nap"].includes(data.eventType)) {
        updatedEvent.duration = calculateSleepDuration(data.startTime, data.endTime, data.sleepDelay)
      } else if (data.eventType === "night_waking") {
        updatedEvent.duration = calculateAwakeDuration(data.startTime, data.endTime, data.awakeDelay)
      }
      updatedEvent.durationReadable = formatDurationReadable(updatedEvent.duration)
    }
  }

  const eventsCol = db.collection("events")
  let eventObjectId: any
  try {
    eventObjectId = new ObjectId(data.id)
  } catch {
    eventObjectId = data.id
  }

  const { _id: _ignoreId, ...updateFields } = updatedEvent

  const result = await eventsCol.updateOne(
    { _id: eventObjectId, childId: new ObjectId(data.childId) },
    { $set: { ...updateFields, updatedAt: new Date().toISOString() } }
  )

  if (result.matchedCount === 0) {
    const legacyResult = await eventsCol.updateOne(
      { _id: data.id as any, childId: new ObjectId(data.childId) },
      { $set: { ...updateFields, updatedAt: new Date().toISOString() } }
    )
    if (legacyResult.matchedCount === 0) {
      throw new EventServiceError("Evento no encontrado", 404)
    }
  }

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
  } catch (syncError) {
    logger.warn(`No se pudo sincronizar evento ${data.id} a analytics:`, syncError)
    Sentry.captureException(syncError)
  }

  return updatedEvent
}

// ---------- PATCH (actualizacion parcial, ej: agregar endTime) ----------

export async function patchEvent(db: Db, actor: EventActor, data: any): Promise<void> {
  if (!data.eventId || !data.childId) {
    throw new EventServiceError("Se requieren eventId y childId", 400)
  }

  const accessContext = await resolveChildAccess(db, actor, data.childId, "canEditEvents")

  if (data.sleepDelay !== undefined && data.sleepDelay !== null) {
    if (data.sleepDelay < 0 || data.sleepDelay > 180) {
      throw new EventServiceError("sleepDelay debe estar entre 0 y 180 minutos", 400)
    }
  }
  if (data.awakeDelay !== undefined && data.awakeDelay !== null) {
    if (data.awakeDelay < 0 || data.awakeDelay > 180) {
      throw new EventServiceError("awakeDelay debe estar entre 0 y 180 minutos", 400)
    }
  }

  const eventsCol = db.collection("events")
  let eventObjectId: any
  try {
    eventObjectId = new ObjectId(data.eventId)
  } catch {
    eventObjectId = data.eventId
  }

  let existingEvent: any = null
  try {
    existingEvent = await eventsCol.findOne({ _id: eventObjectId })
  } catch {
    existingEvent = await eventsCol.findOne({ _id: data.eventId as any })
  }

  if (!existingEvent) {
    throw new EventServiceError("Evento no encontrado", 404)
  }

  const updateFields: any = {}
  if (data.endTime) updateFields.endTime = data.endTime
  if (data.duration !== undefined) updateFields.duration = data.duration
  if (data.notes !== undefined) updateFields.notes = data.notes
  if (data.emotionalState) updateFields.emotionalState = data.emotionalState
  if (data.sleepDelay !== undefined) updateFields.sleepDelay = data.sleepDelay
  if (data.awakeDelay !== undefined) updateFields.awakeDelay = data.awakeDelay
  if (data.didNotSleep !== undefined) updateFields.didNotSleep = data.didNotSleep
  if (data.feedingType) updateFields.feedingType = data.feedingType
  if (data.feedingAmount !== undefined) updateFields.feedingAmount = data.feedingAmount
  if (data.feedingDuration !== undefined) updateFields.feedingDuration = data.feedingDuration
  if (data.babyState) updateFields.babyState = data.babyState
  if (data.feedingNotes !== undefined) updateFields.feedingNotes = data.feedingNotes
  if (data.isNightFeeding !== undefined) updateFields.isNightFeeding = data.isNightFeeding
  if (data.feedingContext) updateFields.feedingContext = data.feedingContext

  if (data.endTime && data.duration === undefined && existingEvent.startTime) {
    if (["sleep", "nap"].includes(existingEvent.eventType)) {
      const sleepDelay = data.sleepDelay !== undefined ? data.sleepDelay : existingEvent.sleepDelay
      const calculatedDuration = calculateSleepDuration(existingEvent.startTime, data.endTime, sleepDelay)
      updateFields.duration = calculatedDuration
      updateFields.durationReadable = formatDurationReadable(calculatedDuration)
    } else if (existingEvent.eventType === "night_waking") {
      const awakeDelay = data.awakeDelay !== undefined ? data.awakeDelay : existingEvent.awakeDelay
      const calculatedDuration = calculateAwakeDuration(existingEvent.startTime, data.endTime, awakeDelay)
      updateFields.duration = calculatedDuration
      updateFields.durationReadable = formatDurationReadable(calculatedDuration)
    }
  } else if (data.duration !== undefined) {
    updateFields.durationReadable = formatDurationReadable(data.duration)
  }

  updateFields.updatedAt = new Date().toISOString()

  const result = await eventsCol.updateOne({ _id: eventObjectId }, { $set: updateFields })
  if (result.matchedCount === 0) {
    const legacyResult = await eventsCol.updateOne({ _id: data.eventId as any }, { $set: updateFields })
    if (legacyResult.matchedCount === 0) {
      throw new EventServiceError("Evento no encontrado", 404)
    }
  }

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
  } catch (syncError) {
    logger.warn(`No se pudo sincronizar evento ${data.eventId} a analytics:`, syncError)
    Sentry.captureException(syncError)
  }
}

// ---------- DELETE ----------

export async function deleteEvent(
  db: Db,
  actor: EventActor,
  eventId: string,
  childId: string
): Promise<void> {
  if (!eventId) throw new EventServiceError("Se requiere el ID del evento", 400)
  if (!childId) throw new EventServiceError("Se requiere el ID del niño", 400)

  await resolveChildAccess(db, actor, childId, "canEditEvents")

  let deletedFromEvents = 0
  try {
    const eventsCol = db.collection("events")
    let deleteResult = await eventsCol.deleteOne({ _id: new ObjectId(eventId) })
    deletedFromEvents = deleteResult.deletedCount || 0
    if (deletedFromEvents === 0) {
      deleteResult = await eventsCol.deleteOne({ _id: eventId as any })
      deletedFromEvents = deleteResult.deletedCount || 0
    }
  } catch (e) {
    logger.warn("Error eliminando de colección events:", e)
    Sentry.captureException(e)
  }

  if (deletedFromEvents === 0) {
    throw new EventServiceError("No se pudo eliminar el evento o no existe", 404)
  }

  try {
    await removeEventFromAnalyticsCollection(eventId)
  } catch (syncError) {
    logger.warn(`No se pudo eliminar evento ${eventId} de analytics:`, syncError)
    Sentry.captureException(syncError)
  }
}
