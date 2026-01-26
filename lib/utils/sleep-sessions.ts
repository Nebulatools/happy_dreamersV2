// Utilidad para procesar eventos de sueño y agruparlos en sesiones continuas
// Maneja sesiones que cruzan días y despertares nocturnos

import { startOfDay, endOfDay } from "date-fns"

export interface Event {
  _id: string
  childId: string
  eventType: string
  emotionalState: string
  startTime: string
  endTime?: string
  notes?: string
  duration?: number
}

export interface SleepSession {
  type: "sleep-session"
  startTime: string
  endTime?: string
  originalStartTime: string // Tiempo original del evento completo
  originalEndTime?: string // Tiempo original del evento completo
  nightWakings: Event[]
  overlayEvents: Event[] // Eventos que ocurren durante el sueno (feeding, medication, etc.)
  originalEvent: Event
  isContinuationFromPrevious: boolean
  continuesNextDay: boolean
}

export interface ProcessedSleepEvents {
  sessions: SleepSession[]
  otherEvents: Event[]
}

/**
 * Procesa eventos de sueño para crear sesiones continuas
 * Agrupa eventos sleep/wake en sesiones y maneja eventos que cruzan días
 */
export function processSleepSessions(
  dayEvents: Event[], 
  currentDay?: Date
): ProcessedSleepEvents {
  const sessions: SleepSession[] = []
  const processedEventIds = new Set<string>()
  
  // Si tenemos el día actual, podemos determinar qué parte del evento mostrar
  const dayStart = currentDay ? startOfDay(currentDay) : null
  const dayEnd = currentDay ? endOfDay(currentDay) : null
  
  // Buscar eventos sleep
  dayEvents.forEach(event => {
    if (event.eventType === "sleep" && !processedEventIds.has(event._id)) {
      processedEventIds.add(event._id)
      
      // Determinar los tiempos de inicio y fin para esta sesión
      let sessionStartTime = event.startTime
      let sessionEndTime = event.endTime
      let isContinuationFromPrevious = false
      let continuesNextDay = false
      
      if (dayStart && dayEnd) {
        const eventStart = new Date(event.startTime)
        const eventEnd = event.endTime ? new Date(event.endTime) : null
        
        // Si el evento empieza antes del día actual, ajustar inicio
        if (eventStart < dayStart) {
          sessionStartTime = dayStart.toISOString()
          isContinuationFromPrevious = true
        }
        
        // Si el evento termina después del día actual, ajustar fin
        if (eventEnd && eventEnd > dayEnd) {
          sessionEndTime = dayEnd.toISOString()
          continuesNextDay = true
        }
        
        // Si el evento no tiene fin y empezó antes, es una sesión en progreso
        if (!eventEnd && eventStart < dayStart) {
          isContinuationFromPrevious = true
        }
      }
      
      // Buscar despertares nocturnos dentro del rango de sueño
      const nightWakings = dayEvents.filter(e =>
        e.eventType === "night_waking" &&
        e.startTime > event.startTime &&
        (!event.endTime || e.startTime < event.endTime)
      )

      // Marcar night_wakings como procesados
      nightWakings.forEach(nw => processedEventIds.add(nw._id))

      // Buscar eventos overlay (feeding, medication, etc.) dentro del rango de sueno
      // Excluir: sleep, wake, night_waking (ya manejados), nap (es una sesion separada)
      const excludedTypes = new Set(["sleep", "wake", "night_waking", "nap"])
      const overlayEvents = dayEvents.filter(e => {
        // No incluir tipos excluidos
        if (excludedTypes.has(e.eventType)) return false
        // No incluir el evento de sueno actual
        if (e._id === event._id) return false
        // Ya procesado
        if (processedEventIds.has(e._id)) return false
        // El evento debe empezar despues del inicio del sueno
        if (e.startTime <= event.startTime) return false
        // Si hay endTime, el evento debe empezar antes del fin del sueno
        if (event.endTime && e.startTime >= event.endTime) return false
        return true
      })

      // Marcar overlayEvents como procesados para que no aparezcan en otherEvents
      overlayEvents.forEach(oe => processedEventIds.add(oe._id))
      
      // Si hay endTime, buscar evento wake correspondiente y marcarlo como procesado
      if (event.endTime) {
        const wakeEvent = dayEvents.find(e => 
          e.eventType === "wake" && 
          Math.abs(new Date(e.startTime).getTime() - new Date(event.endTime!).getTime()) < 60000 // Dentro de 1 minuto
        )
        if (wakeEvent) {
          processedEventIds.add(wakeEvent._id)
        }
      }
      
      // Crear sesión de sueño con metadata sobre continuación
      sessions.push({
        type: "sleep-session",
        startTime: sessionStartTime,
        endTime: sessionEndTime,
        originalStartTime: event.startTime, // Tiempo original completo
        originalEndTime: event.endTime, // Tiempo original completo
        nightWakings: nightWakings,
        overlayEvents: overlayEvents, // Eventos durante sueno (feeding, medication, etc.)
        originalEvent: event,
        isContinuationFromPrevious,
        continuesNextDay,
      })
    }
  })
  
  // Agregar eventos no procesados (que no son sleep/wake/night_waking o que no fueron emparejados)
  // NOTA: Incluir eventos wake que no fueron emparejados con sleep
  const otherEvents = dayEvents.filter(e => !processedEventIds.has(e._id))

  return { sessions, otherEvents }
}