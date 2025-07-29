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
  avgBedtime: string // HH:MM (hora de acostarse - bedtime events)
  avgSleepTime: string // HH:MM (hora de dormir - sleep events)
  avgWakeTime: string // HH:MM
  bedtimeVariation: number // en minutos
  bedtimeToSleepDifference: string // Diferencia entre acostarse y dormir
  totalWakeups: number
  avgWakeupsPerNight: number
  totalSleepHours: number // por día
  events: SleepEvent[]
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
        
        console.log(`DEBUG - Filtrando eventos desde: ${filterDate.toLocaleDateString()} (${daysToSubtract} días)`)
        
        const sleepEvents = allEvents.filter((e: any) => {
          const date = parseISO(e.startTime)
          return ['sleep', 'nap', 'bedtime', 'wake'].includes(e.eventType) && date >= filterDate
        })
        
        console.log(`DEBUG - Eventos encontrados: ${allEvents.length} total, ${sleepEvents.length} filtrados`)
        
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
  }, [childId, dateRange])

  return { data, loading, error }
}

function processSleepData(events: any[]): SleepData {
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
      events: []
    }
  }

  // Separar diferentes tipos de eventos
  const nightSleep = events.filter(e => e.eventType === 'sleep')
  const naps = events.filter(e => e.eventType === 'nap')
  const bedtimeEvents = events.filter(e => e.eventType === 'bedtime') // SOLO bedtime
  const sleepEvents = events.filter(e => e.eventType === 'sleep') // SOLO sleep

  // Duración promedio del sueño nocturno usando inferencia
  const avgSleepDuration = calculateInferredSleepDuration(events)

  // Duración promedio de siestas
  const avgNapDuration = naps.length > 0
    ? naps.reduce((sum, event) => {
        if (event.endTime) {
          return sum + differenceInMinutes(parseISO(event.endTime), parseISO(event.startTime)) / 60
        }
        return sum
      }, 0) / naps.length
    : 0

  // Hora promedio de acostarse (SOLO eventos bedtime NOCTURNOS)
  console.log('DEBUG - Eventos bedtime encontrados:', bedtimeEvents.map(e => ({
    eventType: e.eventType,
    startTime: e.startTime,
    hour: new Date(e.startTime).getHours()
  })))
  
  // FILTRAR eventos bedtime que sean NOCTURNOS (18:00-06:00)
  const nocturnalBedtimeEvents = bedtimeEvents.filter(e => {
    const hour = parseISO(e.startTime).getHours()
    return hour >= 18 || hour <= 6 // Horario nocturno
  })
  
  console.log('DEBUG - Eventos bedtime nocturnos:', nocturnalBedtimeEvents.length)
  
  const avgBedtime = nocturnalBedtimeEvents.length > 0
    ? calculateAverageTime(nocturnalBedtimeEvents.map(e => parseISO(e.startTime)))
    : "--:--"

  // Hora promedio de dormir (SOLO eventos sleep) 
  console.log('DEBUG - Eventos sleep encontrados:', sleepEvents.map(e => ({
    eventType: e.eventType,
    startTime: e.startTime,
    hour: new Date(e.startTime).getHours()
  })))
  
  // FILTRAR eventos sleep que sean NOCTURNOS (18:00-06:00)
  const nocturnalSleepEvents = sleepEvents.filter(e => {
    const hour = parseISO(e.startTime).getHours()
    return hour >= 18 || hour <= 6 // Horario nocturno
  })
  
  console.log('DEBUG - Eventos sleep nocturnos:', nocturnalSleepEvents.length)
  
  const avgSleepTime = nocturnalSleepEvents.length > 0
    ? calculateAverageTime(nocturnalSleepEvents.map(e => parseISO(e.startTime)))
    : "--:--"

  // Hora promedio de levantarse usando inferencia
  const avgWakeTime = calculateInferredWakeTime(events)

  // Variación de hora de acostarse (SOLO eventos bedtime NOCTURNOS)
  const bedtimeVariation = nocturnalBedtimeEvents.length > 1
    ? calculateTimeVariation(nocturnalBedtimeEvents.map(e => parseISO(e.startTime)))
    : 0

  // Despertares nocturnos (usando la misma lógica compleja que SleepMetricsGrid)
  const totalWakeups = calculateNightWakeups(events)
  const avgWakeupsPerNight = nightSleep.length > 0 ? totalWakeups / nightSleep.length : 0

  // Calcular diferencia entre bedtime y sleep time
  const bedtimeToSleepDifference = calculateTimeDifference(avgBedtime, avgSleepTime)

  // Total de horas de sueño por día
  const totalSleepHours = (avgSleepDuration + avgNapDuration)

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
    events
  }
}

function calculateAverageTime(dates: Date[]): string {
  if (dates.length === 0) return "--:--"
  
  try {
    const totalMinutes = dates.reduce((sum, date) => {
      let minutes = date.getHours() * 60 + date.getMinutes()
      
      // AJUSTAR horas de madrugada (00:00-06:00) para cálculo nocturno
      if (date.getHours() >= 0 && date.getHours() <= 6) {
        minutes += 24 * 60 // Sumar 24 horas para que quede al final del día anterior
      }
      
      return sum + minutes
    }, 0)
    
    const avgMinutes = totalMinutes / dates.length
    
    // Convertir de vuelta a formato 24h normal
    let finalHours = Math.floor(avgMinutes / 60) % 24
    const finalMinutes = Math.round(avgMinutes % 60)
    
    return `${finalHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`
  } catch {
    return "--:--"
  }
}

function calculateTimeVariation(dates: Date[]): number {
  if (dates.length <= 1) return 0
  
  const times = dates.map(date => date.getHours() * 60 + date.getMinutes())
  const avg = times.reduce((a, b) => a + b, 0) / times.length
  const variance = times.reduce((sum, time) => sum + Math.pow(time - avg, 2), 0) / times.length
  
  return Math.sqrt(variance)
}

function calculateInferredSleepDuration(events: any[]): number {
  if (events.length === 0) return 0
  
  // Ordenar eventos por fecha
  const sortedEvents = events.sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )
  
  const sleepDurations: number[] = []
  
  for (let i = 0; i < sortedEvents.length - 1; i++) {
    const currentEvent = sortedEvents[i]
    const nextEvent = sortedEvents[i + 1]
    
    // CASO 1: Par ideal bedtime/sleep → wake
    if (
      ['bedtime', 'sleep'].includes(currentEvent.eventType) &&
      nextEvent.eventType === 'wake'
    ) {
      const bedTime = parseISO(currentEvent.startTime)
      const wakeTime = parseISO(nextEvent.startTime)
      
      let duration = differenceInMinutes(wakeTime, bedTime)
      
      if (duration < 0) {
        duration += 24 * 60
      }
      
      if (duration >= 120 && duration <= 960) {
        sleepDurations.push(duration)
      }
    }
    
    // CASO 2: Si no hay wake, inferir desde sleep nocturno → primer evento del día siguiente
    else if (
      ['bedtime', 'sleep'].includes(currentEvent.eventType) &&
      ['nap', 'activity'].includes(nextEvent.eventType)
    ) {
      const bedTime = parseISO(currentEvent.startTime)
      const nextEventTime = parseISO(nextEvent.startTime)
      
      // Solo si es al día siguiente o más tarde
      if (nextEventTime.getTime() > bedTime.getTime()) {
        // Inferir despertar 1 hora antes del primer evento del día siguiente
        const inferredWakeTime = new Date(nextEventTime.getTime() - 60 * 60 * 1000)
        let duration = differenceInMinutes(inferredWakeTime, bedTime)
        
        if (duration < 0) {
          duration += 24 * 60
        }
        
        if (duration >= 300 && duration <= 900) { // 5-15 horas para sueño inferido
          sleepDurations.push(duration)
        }
      }
    }
  }
  
  if (sleepDurations.length === 0) return 0
  
  // Calcular promedio en horas
  const averageMinutes = sleepDurations.reduce((sum, duration) => sum + duration, 0) / sleepDurations.length
  return averageMinutes / 60
}

function calculateInferredWakeTime(events: any[]): string {
  if (events.length === 0) return "--:--"
  
  // Ordenar eventos por fecha
  const sortedEvents = events.sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )
  
  const wakeTimes: Date[] = []
  
  for (let i = 0; i < sortedEvents.length - 1; i++) {
    const currentEvent = sortedEvents[i]
    const nextEvent = sortedEvents[i + 1]
    
    // CASO 1: Par ideal bedtime/sleep → wake
    if (
      ['bedtime', 'sleep'].includes(currentEvent.eventType) &&
      nextEvent.eventType === 'wake'
    ) {
      wakeTimes.push(parseISO(nextEvent.startTime))
    }
    
    // CASO 2: Inferir despertar desde sleep → nap/activity
    else if (
      ['bedtime', 'sleep'].includes(currentEvent.eventType) &&
      ['nap', 'activity'].includes(nextEvent.eventType)
    ) {
      const bedTime = parseISO(currentEvent.startTime)
      const nextEventTime = parseISO(nextEvent.startTime)
      
      if (nextEventTime.getTime() > bedTime.getTime()) {
        // Inferir despertar 1 hora antes del primer evento
        const inferredWakeTime = new Date(nextEventTime.getTime() - 60 * 60 * 1000)
        wakeTimes.push(inferredWakeTime)
      }
    }
  }
  
  if (wakeTimes.length === 0) return "--:--"
  
  return calculateAverageTime(wakeTimes)
}

// Función para calcular la diferencia entre dos horas en formato HH:MM
function calculateTimeDifference(bedtime: string, sleepTime: string): string {
  if (bedtime === "--:--" || sleepTime === "--:--") {
    return "--"
  }

  try {
    const [bedHour, bedMin] = bedtime.split(':').map(Number)
    const [sleepHour, sleepMin] = sleepTime.split(':').map(Number)
    
    const bedMinutes = bedHour * 60 + bedMin
    const sleepMinutes = sleepHour * 60 + sleepMin
    
    let diffMinutes = sleepMinutes - bedMinutes
    
    // Si la diferencia es negativa, significa que cruzó medianoche
    if (diffMinutes < 0) {
      diffMinutes += 24 * 60 // Agregar 24 horas
    }
    
    // Si la diferencia es muy grande (>8 horas), probablemente es error
    if (diffMinutes > 8 * 60) {
      return "???"
    }
    
    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60
    
    if (hours === 0) {
      return `${minutes} min`
    } else if (minutes === 0) {
      return `${hours}h`
    } else {
      return `${hours}h ${minutes}m`
    }
  } catch {
    return "???"
  }
}

// Función para calcular despertares nocturnos (COPIADA EXACTAMENTE de SleepMetricsGrid)
function calculateNightWakeups(events: any[]): number {
  if (events.length === 0) return 0
  
  // Ordenar eventos por fecha
  const sortedEvents = events.sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )
  
  let totalWakeups = 0
  
  // Analizar secuencias de sueño nocturno
  for (let i = 0; i < sortedEvents.length; i++) {
    const currentEvent = sortedEvents[i]
    
    // Si es evento de dormir (bedtime, sleep o dormir)
    if (['bedtime', 'sleep', 'dormir'].includes(currentEvent.eventType)) {
      const sleepStartTime = new Date(currentEvent.startTime)
      let sessionWakeups = 0
      
      // Buscar eventos wake después de este sleep hasta el próximo sleep del día siguiente
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
          
          // Solo contar como despertar nocturno si:
          // 1. Ocurre en horario de madrugada (23:00-06:00)
          // 2. Al menos 30 min después de dormir
          // 3. No es el despertar final de la mañana (menos de 8 horas)
          const isNighttime = (wakeHour >= 0 && wakeHour <= 6) || wakeHour >= 23
          const isValidDuration = wakeDuration > 0.5 && wakeDuration < 8
          
          if (isNighttime && isValidDuration) {
            sessionWakeups++
          }
        }
      }
      
      // También buscar menciones en notas como respaldo
      const notes = currentEvent.notes?.toLowerCase() || ''
      const wakeupKeywords = [
        'despertó', 'despierta', 'se despertó', 'lloró', 'pesadilla'
      ]
      
      if (wakeupKeywords.some(keyword => notes.includes(keyword))) {
        const numberMatch = notes.match(/(\d+)\s*(veces|vez)/)
        if (numberMatch) {
          sessionWakeups += parseInt(numberMatch[1])
        } else if (sessionWakeups === 0) {
          sessionWakeups = 1 // Si hay mención pero no eventos, contar 1
        }
      }
      
      totalWakeups += sessionWakeups
    }
  }
  
  // Retornar el TOTAL de despertares nocturnos en el período
  return totalWakeups
}