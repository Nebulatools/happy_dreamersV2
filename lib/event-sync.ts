// Sistema de sincronización entre children.events[] y collection("events")
// Mantiene ambos sistemas en sync para operaciones y análisis

import { connectToDatabase } from './mongodb'
import { ObjectId } from 'mongodb'
import { createLogger } from './logger'

const logger = createLogger('event-sync')

export interface EventSyncData {
  _id: string
  childId: string
  parentId: string
  eventType: string
  emotionalState?: string
  startTime?: string
  endTime?: string
  duration?: number
  notes?: string
  sleepDelay?: number
  awakeDelay?: number
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
 * Sincroniza un evento desde children.events[] hacia collection("events")
 * Se llama automáticamente cuando se crea/actualiza un evento
 */
export async function syncEventToAnalyticsCollection(eventData: EventSyncData): Promise<void> {
  try {
    const { db } = await connectToDatabase()
    
    // Verificar si ya existe el evento en la colección analytics
    const existingEvent = await db.collection("events").findOne({ _id: eventData._id })
    
    if (existingEvent) {
      // Actualizar evento existente
      await db.collection("events").updateOne(
        { _id: eventData._id },
        { 
          $set: {
            ...eventData,
            updatedAt: new Date().toISOString()
          }
        }
      )
      logger.info(`Evento ${eventData._id} actualizado en colección analytics`)
    } else {
      // Crear nuevo evento
      await db.collection("events").insertOne({
        ...eventData,
        createdAt: eventData.createdAt || new Date().toISOString()
      })
      logger.info(`Evento ${eventData._id} sincronizado a colección analytics`)
    }
    
  } catch (error) {
    logger.error(`Error sincronizando evento ${eventData._id}:`, error)
    // No lanzar error para no afectar la operación principal
  }
}

/**
 * Elimina un evento de la colección analytics
 * Se llama cuando se elimina un evento de children.events[]
 */
export async function removeEventFromAnalyticsCollection(eventId: string): Promise<void> {
  try {
    const { db } = await connectToDatabase()
    
    await db.collection("events").deleteOne({ _id: eventId })
    logger.info(`Evento ${eventId} eliminado de colección analytics`)
    
  } catch (error) {
    logger.error(`Error eliminando evento ${eventId} de analytics:`, error)
  }
}

/**
 * Sincroniza todos los eventos de un niño desde children.events[] hacia collection("events")
 * Útil para migración inicial o reparación de datos
 */
export async function syncChildEventsToAnalytics(childId: string): Promise<void> {
  try {
    const { db } = await connectToDatabase()
    
    // Obtener el niño con todos sus eventos
    const child = await db.collection("children").findOne({ 
      _id: new ObjectId(childId) 
    })
    
    if (!child || !child.events) {
      logger.warn(`No se encontraron eventos para el niño ${childId}`)
      return
    }
    
    // Sincronizar cada evento
    for (const event of child.events) {
      const eventSyncData: EventSyncData = {
        _id: event._id,
        childId: child._id.toString(),
        parentId: child.parentId,
        eventType: event.eventType,
        emotionalState: event.emotionalState,
        startTime: event.startTime,
        endTime: event.endTime,
        duration: event.duration,
        notes: event.notes,
        sleepDelay: event.sleepDelay,
        awakeDelay: event.awakeDelay,
        feedingType: event.feedingType,
        feedingSubtype: event.feedingSubtype,
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
        createdAt: event.createdAt || new Date().toISOString()
      }
      
      await syncEventToAnalyticsCollection(eventSyncData)
    }
    
    logger.info(`Sincronizados ${child.events.length} eventos del niño ${childId}`)
    
  } catch (error) {
    logger.error(`Error sincronizando eventos del niño ${childId}:`, error)
    throw error
  }
}

/**
 * Utlidad para obtener todos los niños y sincronizar sus eventos
 * Útil para migración masiva
 */
export async function syncAllChildrenEvents(): Promise<void> {
  try {
    const { db } = await connectToDatabase()
    
    const children = await db.collection("children").find({}).toArray()
    logger.info(`Iniciando sincronización masiva para ${children.length} niños`)
    
    for (const child of children) {
      await syncChildEventsToAnalytics(child._id.toString())
    }
    
    logger.info('Sincronización masiva completada')
    
  } catch (error) {
    logger.error('Error en sincronización masiva:', error)
    throw error
  }
}
