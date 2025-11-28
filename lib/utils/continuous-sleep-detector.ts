// Utilidad para detectar eventos de sueño continuos que cruzan días
// Usado en el dashboard de usuario para mostrar eventos multi-día con degradado visual

import { parseISO, format, differenceInMinutes, startOfDay, isSameDay, addDays } from 'date-fns'

// Interfaz del evento de sueño (del hook use-sleep-data)
export interface SleepEvent {
  _id: string
  eventType: string      // 'sleep', 'nap', 'wake', 'night_waking', 'bedtime'
  startTime: string      // ISO string (ej: "2025-01-25T21:00:00.000Z")
  endTime?: string       // ISO string (opcional)
  notes?: string
  sleepDelay?: number
}

// Interfaz para eventos continuos detectados
export interface ContinuousSleepEvent {
  id: string
  originalEvent: SleepEvent
  startDate: string      // "2025-01-25"
  endDate: string        // "2025-01-26"
  startTime: string      // "21:00"
  endTime: string        // "07:00"
  totalMinutes: number   // 600 (10h)
  spansDays: number      // 2
  nightWakings: number   // contador de despertares nocturnos
  daysSpanned: string[]  // ["2025-01-25", "2025-01-26"]
}

/**
 * Detecta eventos de sueño que cruzan medianoche (multi-día)
 *
 * IMPORTANTE: Solo las dormidas largas cruzan días, nunca las naps ni otros eventos:
 * - Eventos de tipo 'sleep' o 'bedtime' son los únicos que pueden cruzar medianoche
 * - Duración típica: 4+ horas (los bebés duermen bastante)
 * - Las naps ('nap') NUNCA cruzan días, siempre son eventos del mismo día
 *
 * @param events - Array de todos los eventos de sueño
 * @param visibleDays - Días actualmente visibles en el calendario (opcional)
 * @returns Array de eventos continuos detectados
 */
export function detectContinuousSleepEvents(
  events: SleepEvent[],
  visibleDays?: Date[]
): ContinuousSleepEvent[] {
  const continuousEvents: ContinuousSleepEvent[] = []

  if (!events || events.length === 0) {
    return continuousEvents
  }

  // Solo procesar eventos de tipo 'sleep' o 'bedtime' (dormidas largas)
  // NO incluir 'nap' (siestas) ya que estas nunca cruzan días
  const sleepEvents = events.filter(e =>
    (e.eventType === 'sleep' || e.eventType === 'bedtime') &&
    e.startTime &&
    e.endTime
  )

  sleepEvents.forEach(event => {
    try {
      const start = parseISO(event.startTime)
      const end = parseISO(event.endTime!)

      // Validar fechas
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.warn('Invalid date in sleep event:', event._id)
        return
      }

      // Detectar si cruza medianoche (diferentes días)
      if (!isSameDay(start, end)) {
        const startDate = format(start, 'yyyy-MM-dd')
        const endDate = format(end, 'yyyy-MM-dd')
        const totalMinutes = differenceInMinutes(end, start)

        // Generar array de días que abarca el evento
        const daysSpanned: string[] = []
        let current = startOfDay(start)
        const endDay = startOfDay(end)

        while (current <= endDay) {
          daysSpanned.push(format(current, 'yyyy-MM-dd'))
          current = addDays(current, 1)
        }

        // Contar despertares nocturnos dentro del rango del evento
        const nightWakings = events.filter(e =>
          e.eventType === 'night_waking' &&
          e.startTime &&
          (() => {
            try {
              const wakingTime = parseISO(e.startTime)
              return wakingTime >= start && wakingTime <= end
            } catch {
              return false
            }
          })()
        ).length

        continuousEvents.push({
          id: event._id,
          originalEvent: event,
          startDate,
          endDate,
          startTime: format(start, 'HH:mm'),
          endTime: format(end, 'HH:mm'),
          totalMinutes,
          spansDays: daysSpanned.length,
          nightWakings,
          daysSpanned
        })
      }
    } catch (error) {
      console.error('Error processing continuous sleep event:', event._id, error)
    }
  })

  return continuousEvents
}

/**
 * Formatea minutos como "Xh" o "Xh Ym"
 * Utilidad helper para mostrar duración de eventos
 */
export function formatMinutesAsHours(minutes: number): string {
  if (!minutes || minutes <= 0) return "0h"
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hrs === 0) return `${mins}m`
  if (mins === 0) return `${hrs}h`
  return `${hrs}h ${mins}m`
}
