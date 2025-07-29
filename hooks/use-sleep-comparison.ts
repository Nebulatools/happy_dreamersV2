import { useState, useEffect } from "react"
import { differenceInMinutes, parseISO, subDays, getDay } from "date-fns"
import { SleepData } from "./use-sleep-data"

export interface ComparisonData {
  sleepDuration: {
    current: number
    previous: number
    change: number
  }
  wakeups: {
    current: number
    previous: number
    change: number
  }
  consistency: {
    current: number
    previous: number
    change: number
  }
  totalSleep: {
    current: number
    previous: number
    change: number
  }
}

export function useSleepComparison(childId: string | null, dateRange: string = "7-days") {
  const [data, setData] = useState<ComparisonData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchComparisonData() {
      if (!childId) {
        setData(null)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const response = await fetch(`/api/children/events?childId=${childId}`)
        
        if (!response.ok) {
          throw new Error('Error al cargar datos de comparación')
        }
        
        const result = await response.json()
        const allEvents = result.events || []
        
        // Definir rangos de fechas según el dateRange
        const now = new Date()
        let currentStart: Date, currentEnd: Date, previousStart: Date, previousEnd: Date
        let days: number
        
        switch (dateRange) {
          case '7-days':
            days = 7
            break
          case '30-days':
            days = 30
            break
          case '90-days':
            days = 90
            break
          default:
            days = 7
        }
        
        currentStart = subDays(now, days)
        currentEnd = now
        previousStart = subDays(now, days * 2)
        previousEnd = subDays(now, days)
        
        // Filtrar TODOS los eventos necesarios (igual que SleepMetricsGrid)
        const sleepEvents = allEvents.filter((e: any) => 
          ['sleep', 'nap', 'wake', 'dormir', 'bedtime'].includes(e.eventType)
        )
        
        const currentEvents = sleepEvents.filter((e: any) => {
          const date = parseISO(e.startTime)
          return date >= currentStart && date <= currentEnd
        })
        
        const previousEvents = sleepEvents.filter((e: any) => {
          const date = parseISO(e.startTime)
          return date >= previousStart && date <= previousEnd
        })
        
        // Calcular métricas para ambos períodos
        const currentData = processSleepData(currentEvents)
        const previousData = processSleepData(previousEvents)
        
        // Crear datos de comparación
        const comparisonData: ComparisonData = {
          sleepDuration: {
            current: currentData.avgSleepDuration,
            previous: previousData.avgSleepDuration,
            change: currentData.avgSleepDuration - previousData.avgSleepDuration
          },
          wakeups: {
            current: currentData.avgWakeupsPerNight,
            previous: previousData.avgWakeupsPerNight,
            change: currentData.avgWakeupsPerNight - previousData.avgWakeupsPerNight
          },
          consistency: {
            current: currentData.bedtimeVariation,
            previous: previousData.bedtimeVariation,
            change: currentData.bedtimeVariation - previousData.bedtimeVariation
          },
          totalSleep: {
            current: currentData.totalSleepHours,
            previous: previousData.totalSleepHours,
            change: currentData.totalSleepHours - previousData.totalSleepHours
          }
        }
        
        setData(comparisonData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }

    fetchComparisonData()
  }, [childId, dateRange])

  return { data, loading, error }
}

function processSleepData(events: any[]): SleepData {
  if (events.length === 0) {
    return {
      avgSleepDuration: 0,
      avgNapDuration: 0,
      avgBedtime: "--:--",
      avgWakeTime: "--:--",
      bedtimeVariation: 0,
      totalWakeups: 0,
      avgWakeupsPerNight: 0,
      totalSleepHours: 0,
      events: []
    }
  }

  // USAR LA MISMA LÓGICA QUE SleepMetricsGrid.tsx
  // 1. Inferir duración de sueño usando calculateInferredSleepDuration
  const sleepDurations = calculateInferredSleepDuration(events)
  const avgSleepDuration = sleepDurations.length > 0 
    ? sleepDurations.reduce((sum, duration) => sum + duration, 0) / sleepDurations.length
    : 0

  // 2. Separar siestas (nap events)
  const naps = events.filter(e => e.eventType === 'nap')
  const avgNapDuration = naps.length > 0
    ? naps.reduce((sum, event) => {
        if (event.endTime) {
          return sum + differenceInMinutes(parseISO(event.endTime), parseISO(event.startTime)) / 60
        }
        return sum
      }, 0) / naps.length
    : 0

  // 3. Calcular bedtime usando eventos sleep/bedtime
  const sleepEvents = events.filter(e => ['sleep', 'bedtime', 'dormir'].includes(e.eventType))
  const avgBedtime = sleepEvents.length > 0
    ? calculateAverageTime(sleepEvents.map(e => parseISO(e.startTime)))
    : "--:--"

  // 4. Calcular wake time usando calculateInferredWakeTime
  const wakeTimes = calculateInferredWakeTime(events)
  const avgWakeTime = wakeTimes.length > 0
    ? calculateAverageTime(wakeTimes)
    : "--:--"

  // 5. Variación de bedtime
  const bedtimeVariation = sleepEvents.length > 1
    ? calculateTimeVariation(sleepEvents.map(e => parseISO(e.startTime)))
    : 0

  // 6. Calcular despertares nocturnos usando la MISMA LÓGICA que calculateAverageWakeups
  const totalWakeups = calculateNightWakeups(events)
  const nightsCount = sleepEvents.length
  const avgWakeupsPerNight = nightsCount > 0 ? totalWakeups / nightsCount : 0

  // 7. Total de horas (solo sueño nocturno, sin siestas según especificación)
  const totalSleepHours = avgSleepDuration

  return {
    avgSleepDuration,
    avgNapDuration,
    avgBedtime,
    avgWakeTime,
    bedtimeVariation,
    totalWakeups,
    avgWakeupsPerNight,
    totalSleepHours,
    events
  }
}

// COPIAR EXACTAMENTE LAS FUNCIONES DE SleepMetricsGrid.tsx
function calculateInferredSleepDuration(events: any[]): number[] {
  const durations: number[] = []
  const sortedEvents = events.sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )

  for (let i = 0; i < sortedEvents.length; i++) {
    const event = sortedEvents[i]
    
    // Solo procesar eventos de sueño nocturno
    if (['sleep', 'bedtime', 'dormir'].includes(event.eventType)) {
      const startTime = new Date(event.startTime)
      let duration = 0

      if (event.endTime) {
        // Si tiene endTime, usar esa duración
        duration = differenceInMinutes(parseISO(event.endTime), startTime) / 60
      } else {
        // Inferir duración buscando el siguiente evento wake
        for (let j = i + 1; j < sortedEvents.length; j++) {
          const nextEvent = sortedEvents[j]
          const nextTime = new Date(nextEvent.startTime)
          
          if (nextEvent.eventType === 'wake') {
            duration = differenceInMinutes(nextTime, startTime) / 60
            break
          }
          
          // Si encontramos otro evento de sueño, asumir 8 horas
          if (['sleep', 'bedtime', 'dormir'].includes(nextEvent.eventType)) {
            duration = 8
            break
          }
        }
        
        // Si no encontramos wake, asumir duración estándar
        if (duration === 0) {
          duration = 8
        }
      }

      // Filtrar duraciones razonables (2-12 horas)
      if (duration >= 2 && duration <= 12) {
        durations.push(duration)
      }
    }
  }
  
  return durations
}

function calculateInferredWakeTime(events: any[]): Date[] {
  const wakeTimes: Date[] = []
  const sortedEvents = events.sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )

  for (let i = 0; i < sortedEvents.length; i++) {
    const event = sortedEvents[i]
    
    if (['sleep', 'bedtime', 'dormir'].includes(event.eventType)) {
      if (event.endTime) {
        wakeTimes.push(parseISO(event.endTime))
      } else {
        // Buscar el siguiente wake event
        for (let j = i + 1; j < sortedEvents.length; j++) {
          const nextEvent = sortedEvents[j]
          if (nextEvent.eventType === 'wake') {
            wakeTimes.push(new Date(nextEvent.startTime))
            break
          }
        }
      }
    }
  }
  
  return wakeTimes
}

function calculateNightWakeups(events: any[]): number {
  const sortedEvents = events.sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )
  
  let totalWakeups = 0
  
  for (let i = 0; i < sortedEvents.length; i++) {
    const currentEvent = sortedEvents[i]
    
    // Si es evento de dormir
    if (['bedtime', 'sleep', 'dormir'].includes(currentEvent.eventType)) {
      const sleepStartTime = new Date(currentEvent.startTime)
      
      // Buscar eventos wake después de este sleep
      for (let j = i + 1; j < sortedEvents.length; j++) {
        const nextEvent = sortedEvents[j]
        const nextEventTime = new Date(nextEvent.startTime)
        
        // Si es el siguiente día y es otro evento de dormir, terminar sesión
        if (['bedtime', 'sleep', 'dormir'].includes(nextEvent.eventType) && 
            nextEventTime.getDate() !== sleepStartTime.getDate()) {
          break
        }
        
        // Contar eventos wake como despertares nocturnos
        if (nextEvent.eventType === 'wake') {
          const wakeHour = nextEventTime.getHours()
          const wakeDuration = Math.abs(nextEventTime.getTime() - sleepStartTime.getTime()) / (1000 * 60 * 60)
          
          // Misma lógica que SleepMetricsGrid
          const isNighttime = (wakeHour >= 0 && wakeHour <= 6) || wakeHour >= 23
          const isValidDuration = wakeDuration > 0.5 && wakeDuration < 8
          
          if (isNighttime && isValidDuration) {
            totalWakeups += 1
          }
        }
      }
    }
  }
  
  return totalWakeups
}

function calculateAverageTime(dates: Date[]): string {
  if (dates.length === 0) return "--:--"
  
  const totalMinutes = dates.reduce((sum, date) => {
    return sum + date.getHours() * 60 + date.getMinutes()
  }, 0)
  
  const avgMinutes = totalMinutes / dates.length
  const hours = Math.floor(avgMinutes / 60) % 24
  const minutes = Math.round(avgMinutes % 60)
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

function calculateTimeVariation(dates: Date[]): number {
  if (dates.length <= 1) return 0
  
  const times = dates.map(date => date.getHours() * 60 + date.getMinutes())
  const avg = times.reduce((a, b) => a + b, 0) / times.length
  const variance = times.reduce((sum, time) => sum + Math.pow(time - avg, 2), 0) / times.length
  
  return Math.sqrt(variance)
}