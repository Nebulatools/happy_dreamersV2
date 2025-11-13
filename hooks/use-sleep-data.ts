import { useState, useEffect } from "react"
import { differenceInMinutes, parseISO, subDays } from "date-fns"
import { processSleepStatistics } from "@/lib/sleep-calculations"
import { createLogger } from "@/lib/logger"

const logger = createLogger('useSleepData')

export interface SleepEvent {
  _id: string
  eventType: string
  startTime: string
  endTime?: string
  notes?: string
  sleepDelay?: number
}

export interface AwakePeriod {
  startTime: string // ISO string
  endTime: string // ISO string
  duration: number // en minutos
  durationFormatted: string // "2h 30min"
  period: string // "mañana", "mediodía", "tarde", "noche"
}

export interface SleepData {
  avgSleepDuration: number // en horas
  avgNapDuration: number // en horas
  avgBedtime: string // HH:MM (hora de acostarse - bedtime events)
  avgSleepTime: string // HH:MM (hora de dormir - sleep events)
  avgWakeTime: string // HH:MM
  bedtimeVariation: number // en minutos
  bedtimeToSleepDifference: string // Diferencia entre acostarse y dormir
  totalWakeups: number
  avgWakeupsPerNight: number
  totalSleepHours: number // por día
  nightSleepHours: number // horas de sueño nocturno
  napHours: number // horas de siestas
  awakePeriods: AwakePeriod[] // períodos despierto
  events: SleepEvent[]
  recentEvents: any[] // todos los eventos (no solo sleep) dentro del rango
}

export function useSleepData(childId: string | null, dateRange: string = "7-days") {
  const [data, setData] = useState<SleepData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      if (!childId) {
        setData(null)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const response = await fetch(`/api/children/events?childId=${childId}`)
        
        if (!response.ok) {
          throw new Error('Error al cargar datos de sueño')
        }
        
        const result = await response.json()
        const allEvents = result.events || []
        
        // Calcular días a filtrar basado en dateRange
        const now = new Date()
        let daysToSubtract = 7 // default
        
        if (dateRange === "30-days") {
          daysToSubtract = 30
        } else if (dateRange === "90-days") {
          daysToSubtract = 90
        } else if (dateRange === "7-days") {
          daysToSubtract = 7
        }
        
        const filterDate = subDays(now, daysToSubtract)
        
        logger.debug('Filtrando eventos', { desde: filterDate.toLocaleDateString(), dias: daysToSubtract })
        
        const sleepEvents = allEvents.filter((e: any) => {
          // Solo procesar eventos que tengan startTime definido
          if (!e.startTime) return false
          
          const date = parseISO(e.startTime)
          // Incluir bedtime para compatibilidad con datos antiguos y night_waking para despertares nocturnos
          return ['sleep', 'nap', 'bedtime', 'wake', 'night_waking'].includes(e.eventType) && date >= filterDate
        })
        
        const recentEvents = allEvents.filter((e: any) => {
          if (!e.startTime) return false
          const date = parseISO(e.startTime)
          return date >= filterDate
        })
        
        logger.debug('Eventos procesados', { total: allEvents.length, filtrados: sleepEvents.length })
        
        // Calcular métricas
        const processedData = processSleepData(sleepEvents, allEvents, recentEvents, dateRange)
        setData(processedData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [childId, dateRange])

  return { data, loading, error }
}

function processSleepData(events: any[], allEvents: any[], recentEvents: any[], dateRange: string = "7-days"): SleepData {
  if (events.length === 0) {
    return {
      avgSleepDuration: 0,
      avgNapDuration: 0,
      avgBedtime: "--:--",
      avgSleepTime: "--:--",
      avgWakeTime: "--:--",
      bedtimeVariation: 0,
      bedtimeToSleepDifference: "--",
      totalWakeups: 0,
      avgWakeupsPerNight: 0,
      totalSleepHours: 0,
      nightSleepHours: 0,
      napHours: 0,
      awakePeriods: [],
      events: [],
      recentEvents: recentEvents
    }
  }

  // One source of truth: usar processSleepStatistics() (lib) para todas las métricas
  const stats = processSleepStatistics(events)

  const avgSleepDuration = stats.avgSleepDuration
  const avgNapDuration = stats.avgNapDuration
  const avgBedtime = stats.avgBedtime
  const avgSleepTime = stats.avgSleepTime
  const avgWakeTime = stats.avgWakeTime
  const bedtimeVariation = stats.bedtimeVariation
  const totalWakeups = stats.totalWakeups
  const avgWakeupsPerNight = stats.avgWakeupsPerNight
  const bedtimeToSleepDifference = stats.bedtimeToSleepDifference
  const totalSleepHours = stats.totalSleepHours
  
  // Calcular períodos despierto
  const awakePeriods = calculateAwakePeriods(allEvents, dateRange)

  return {
    avgSleepDuration,
    avgNapDuration,
    avgBedtime,
    avgSleepTime,
    avgWakeTime,
    bedtimeVariation,
    bedtimeToSleepDifference,
    totalWakeups,
    avgWakeupsPerNight,
    totalSleepHours,
    nightSleepHours: avgSleepDuration,
    napHours: avgNapDuration,
    awakePeriods,
    events,
    recentEvents
  }
}

// Limpieza: todas las métricas de sueño provienen de processSleepStatistics() en lib.
// En este archivo solo mantenemos el cálculo de "awake periods" para la UI diaria.

// Función para calcular los períodos despierto entre sueños
function calculateAwakePeriods(events: any[], dateRange: string = "7-days"): AwakePeriod[] {
  if (events.length === 0) return []
  
  // Filtrar y ordenar eventos relevantes por fecha
  const relevantEvents = events
    .filter(e => e.startTime && ['sleep', 'nap', 'bedtime', 'wake'].includes(e.eventType))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  
  if (relevantEvents.length < 2) return []
  
  const awakePeriods: AwakePeriod[] = []
  
  // Determinar rango de fechas a procesar
  const now = new Date()
  let daysToProcess = 7
  
  if (dateRange === "30-days") {
    daysToProcess = 30
  } else if (dateRange === "90-days") {
    daysToProcess = 90
  }
  
  const filterDate = subDays(now, daysToProcess)
  
  // Procesar eventos en el rango de fechas
  const rangeEvents = relevantEvents.filter(e => {
    const eventDate = new Date(e.startTime)
    return eventDate >= filterDate && eventDate <= now
  })
  
  logger.debug('Eventos en el rango para períodos despierto', { count: rangeEvents.length, days: daysToProcess })
  
  // Agrupar eventos por día para procesamiento más preciso
  const eventsByDay = new Map<string, any[]>()
  
  rangeEvents.forEach(event => {
    const date = new Date(event.startTime).toDateString()
    if (!eventsByDay.has(date)) {
      eventsByDay.set(date, [])
    }
    eventsByDay.get(date)!.push(event)
  })
  
  // Procesar cada día individualmente
  eventsByDay.forEach((dayEvents, date) => {
    const sortedDayEvents = dayEvents.sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )
    
    // Buscar pares de eventos en el mismo día
    for (let i = 0; i < sortedDayEvents.length - 1; i++) {
      const currentEvent = sortedDayEvents[i]
      const nextEvent = sortedDayEvents[i + 1]
      
      // Si encontramos un despertar seguido de un sueño/siesta
      if (currentEvent.eventType === 'wake' && 
          ['sleep', 'nap', 'bedtime'].includes(nextEvent.eventType)) {
        
        const wakeTime = parseISO(currentEvent.startTime)
        const sleepTime = parseISO(nextEvent.startTime)
        const durationMinutes = differenceInMinutes(sleepTime, wakeTime)
        
        // Solo incluir períodos válidos (entre 30 minutos y 8 horas)
        if (durationMinutes >= 30 && durationMinutes <= 480) {
          const period = getPeriodOfDay(wakeTime)
          
          awakePeriods.push({
            startTime: currentEvent.startTime,
            endTime: nextEvent.startTime,
            duration: durationMinutes,
            durationFormatted: formatDuration(durationMinutes),
            period
          })
        }
      }
      // Si es un sleep/nap seguido de otro sleep/nap, inferir despertar
      else if (['sleep', 'nap', 'bedtime'].includes(currentEvent.eventType) && 
               ['sleep', 'nap', 'bedtime'].includes(nextEvent.eventType)) {
        
        // Verificar que no sea un evento nocturno seguido de siesta del día siguiente
        const currentDate = new Date(currentEvent.startTime).toDateString()
        const nextDate = new Date(nextEvent.startTime).toDateString()
        
        if (currentDate === nextDate) {
          // Asumir que el niño se despertó al final del primer sueño
          const assumedWakeTime = currentEvent.endTime || 
            new Date(new Date(currentEvent.startTime).getTime() + 2 * 60 * 60 * 1000).toISOString() // Asumir 2 horas si no hay endTime
          const nextSleepTime = parseISO(nextEvent.startTime)
          const wakeTimeDate = parseISO(assumedWakeTime)
          const durationMinutes = differenceInMinutes(nextSleepTime, wakeTimeDate)
          
          // Solo incluir períodos válidos
          if (durationMinutes >= 30 && durationMinutes <= 480) {
            const period = getPeriodOfDay(wakeTimeDate)
            
            awakePeriods.push({
              startTime: assumedWakeTime,
              endTime: nextEvent.startTime,
              duration: durationMinutes,
              durationFormatted: formatDuration(durationMinutes),
              period
            })
          }
        }
      }
    }
    
    // Si solo hay un evento de siesta/sueño en el día, inferir período matutino
    if (sortedDayEvents.length === 1 && ['nap', 'sleep', 'bedtime'].includes(sortedDayEvents[0].eventType)) {
      const firstSleepEvent = sortedDayEvents[0]
      const firstSleepTime = parseISO(firstSleepEvent.startTime)
      const assumedWakeTime = new Date(firstSleepTime)
      assumedWakeTime.setHours(7, 0, 0, 0) // Asumir despertar a las 7 AM
      
      const durationMinutes = differenceInMinutes(firstSleepTime, assumedWakeTime)
      
      if (durationMinutes >= 30 && durationMinutes <= 480) {
        awakePeriods.push({
          startTime: assumedWakeTime.toISOString(),
          endTime: firstSleepEvent.startTime,
          duration: durationMinutes,
          durationFormatted: formatDuration(durationMinutes),
          period: 'mañana'
        })
      }
    }
  })
  
  
  // Ordenar períodos por fecha y hora
  awakePeriods.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  
  // Si tenemos múltiples días, calcular promedios por período del día
  if (daysToProcess > 1 && awakePeriods.length > 0) {
    const periodGroups = new Map<string, number[]>()
    
    // Agrupar duraciones por período del día
    awakePeriods.forEach(period => {
      if (!periodGroups.has(period.period)) {
        periodGroups.set(period.period, [])
      }
      periodGroups.get(period.period)!.push(period.duration)
    })
    
    // Calcular promedios y crear períodos promedio
    const averagePeriods: AwakePeriod[] = []
    const periodOrder = ['mañana', 'mediodía', 'tarde', 'noche']
    
    periodOrder.forEach(periodName => {
      const durations = periodGroups.get(periodName)
      if (durations && durations.length > 0) {
        const avgDuration = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        const minDuration = Math.min(...durations)
        const maxDuration = Math.max(...durations)
        
        averagePeriods.push({
          startTime: new Date().toISOString(), // Placeholder
          endTime: new Date().toISOString(), // Placeholder
          duration: avgDuration,
          durationFormatted: `${formatDuration(avgDuration)} (promedio de ${durations.length} días)`,
          period: periodName
        })
      }
    })
    
    // Retornar promedios si tenemos datos de múltiples días
    return averagePeriods.length > 0 ? averagePeriods : awakePeriods
  }
  
  return awakePeriods
}

// Función auxiliar para determinar el período del día
function getPeriodOfDay(date: Date): string {
  const hour = date.getHours()
  
  if (hour >= 6 && hour < 12) {
    return 'mañana'
  } else if (hour >= 12 && hour < 15) {
    return 'mediodía'
  } else if (hour >= 15 && hour < 19) {
    return 'tarde'
  } else {
    return 'noche'
  }
}

// Función auxiliar para formatear duración
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  }
  
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  if (mins === 0) {
    return `${hours}h`
  }
  
  return `${hours}h ${mins}min`
}
