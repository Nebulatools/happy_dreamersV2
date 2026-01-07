// Sistema de sincronización para analytics
// Sincroniza eventos de collection("events") a sistemas de análisis/IA

import { connectToDatabase } from "./mongodb"
import { ObjectId } from "mongodb"
import { createLogger } from "./logger"

const logger = createLogger("event-sync")

export interface EventSyncData {
  _id: string
  childId: string
  parentId: string
  createdBy?: string
  eventType: string
  emotionalState?: string
  startTime?: string
  endTime?: string
  duration?: number
  durationReadable?: string
  notes?: string
  sleepDelay?: number
  awakeDelay?: number
  didNotSleep?: boolean
  // Campos específicos para alimentación
  feedingType?: string
  feedingSubtype?: string
  feedingAmount?: number
  feedingDuration?: number
  babyState?: string
  feedingNotes?: string
  // Campos específicos para medicamentos
  medicationName?: string
  medicationDose?: string
  medicationTime?: string
  medicationNotes?: string
  // Campos específicos para actividades extra
  activityDescription?: string
  activityDuration?: number
  activityImpact?: string
  activityNotes?: string
  createdAt: string
}

/**
 * Sincroniza un evento a la colección de analytics
 * Se llama después de crear/actualizar un evento en collection("events")
 */
export async function syncEventToAnalyticsCollection(eventData: EventSyncData): Promise<void> {
  try {
    const { db } = await connectToDatabase()

    // Verificar si ya existe el evento
    const existingEvent = await db.collection("events").findOne({ _id: new ObjectId(eventData._id) })

    // Convertir IDs a ObjectId para consistencia
    const normalizedData = {
      ...eventData,
      _id: new ObjectId(eventData._id),
      childId: new ObjectId(eventData.childId),
      parentId: new ObjectId(eventData.parentId),
    }

    if (existingEvent) {
      // Actualizar evento existente
      await db.collection("events").updateOne(
        { _id: normalizedData._id },
        {
          $set: {
            ...normalizedData,
            updatedAt: new Date().toISOString(),
          },
        }
      )
      logger.info(`Evento ${eventData._id} actualizado en analytics`)
    } else {
      // Crear nuevo evento
      await db.collection("events").insertOne({
        ...normalizedData,
        createdAt: eventData.createdAt || new Date().toISOString(),
      })
      logger.info(`Evento ${eventData._id} sincronizado a analytics`)
    }

  } catch (error) {
    logger.error(`Error sincronizando evento ${eventData._id}:`, error)
    // No lanzar error para no afectar la operación principal
  }
}

/**
 * Elimina un evento de la colección de analytics
 */
export async function removeEventFromAnalyticsCollection(eventId: string): Promise<void> {
  try {
    const { db } = await connectToDatabase()

    await db.collection("events").deleteOne({ _id: new ObjectId(eventId) })
    logger.info(`Evento ${eventId} eliminado de analytics`)

  } catch (error) {
    logger.error(`Error eliminando evento ${eventId} de analytics:`, error)
  }
}
