import { useState, useEffect } from "react"
import { differenceInMinutes, parseISO, subDays } from "date-fns"
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

export function useSleepComparison(childId: string | null, period: 'week' | 'month' | 'quarter') {
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
        
        // Definir rangos de fechas según el período
        const now = new Date()
        let currentStart: Date, currentEnd: Date, previousStart: Date, previousEnd: Date
        
        switch (period) {
          case 'week':
            currentStart = subDays(now, 7)
            currentEnd = now
            previousStart = subDays(now, 14)
            previousEnd = subDays(now, 7)
            break
          case 'month':
            currentStart = subDays(now, 30)
            currentEnd = now
            previousStart = subDays(now, 60)
            previousEnd = subDays(now, 30)
            break
          case 'quarter':
            currentStart = subDays(now, 90)
            currentEnd = now
            previousStart = subDays(now, 180)
            previousEnd = subDays(now, 90)
            break
        }
        
        // Filtrar eventos por período
        const sleepEvents = allEvents.filter((e: any) => 
          e.eventType === 'sleep' || e.eventType === 'nap'
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
  }, [childId, period])

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

  // Separar sueño nocturno de siestas
  const nightSleep = events.filter(e => e.eventType === 'sleep')
  const naps = events.filter(e => e.eventType === 'nap')

  // Duración promedio del sueño nocturno
  const avgSleepDuration = nightSleep.length > 0 
    ? nightSleep.reduce((sum, event) => {
        if (event.endTime) {
          return sum + differenceInMinutes(parseISO(event.endTime), parseISO(event.startTime)) / 60
        }
        return sum
      }, 0) / nightSleep.length
    : 0

  // Duración promedio de siestas
  const avgNapDuration = naps.length > 0
    ? naps.reduce((sum, event) => {
        if (event.endTime) {
          return sum + differenceInMinutes(parseISO(event.endTime), parseISO(event.startTime)) / 60
        }
        return sum
      }, 0) / naps.length
    : 0

  // Hora promedio de acostarse (solo sueño nocturno)
  const avgBedtime = nightSleep.length > 0
    ? calculateAverageTime(nightSleep.map(e => parseISO(e.startTime)))
    : "--:--"

  // Hora promedio de levantarse (solo sueño nocturno)
  const avgWakeTime = nightSleep.filter(e => e.endTime).length > 0
    ? calculateAverageTime(nightSleep.filter(e => e.endTime).map(e => parseISO(e.endTime!)))
    : "--:--"

  // Variación de hora de acostarse
  const bedtimeVariation = nightSleep.length > 1
    ? calculateTimeVariation(nightSleep.map(e => parseISO(e.startTime)))
    : 0

  // Despertares nocturnos (basado en notas)
  const totalWakeups = events.reduce((sum, event) => {
    const notes = event.notes?.toLowerCase() || ''
    if (notes.includes('despertó') || notes.includes('despierta')) {
      const match = notes.match(/(\d+)\s*(veces|vez)/)
      return sum + (match ? parseInt(match[1]) : 1)
    }
    return sum
  }, 0)

  const avgWakeupsPerNight = nightSleep.length > 0 ? totalWakeups / nightSleep.length : 0

  // Total de horas de sueño por día
  const totalSleepHours = (avgSleepDuration + avgNapDuration)

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