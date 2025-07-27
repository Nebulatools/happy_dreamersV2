import { useState, useEffect } from "react"
import { differenceInMinutes, parseISO, subDays } from "date-fns"

export interface SleepEvent {
  _id: string
  eventType: string
  startTime: string
  endTime?: string
  notes?: string
}

export interface SleepData {
  avgSleepDuration: number // en horas
  avgNapDuration: number // en horas
  avgBedtime: string // HH:MM
  avgWakeTime: string // HH:MM
  bedtimeVariation: number // en minutos
  totalWakeups: number
  avgWakeupsPerNight: number
  totalSleepHours: number // por día
  events: SleepEvent[]
}

export function useSleepData(childId: string | null) {
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
        
        // Filtrar eventos de sueño de los últimos 7 días
        const now = new Date()
        const weekAgo = subDays(now, 7)
        
        const sleepEvents = allEvents.filter((e: any) => {
          const date = parseISO(e.startTime)
          return (e.eventType === 'sleep' || e.eventType === 'nap') && date >= weekAgo
        })
        
        // Calcular métricas
        const processedData = processSleepData(sleepEvents)
        setData(processedData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [childId])

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