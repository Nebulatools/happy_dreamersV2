// Lógica compartida de cálculos de sueño
// Extraída de useSleepData.ts para consistencia entre dashboard y API consultas

import { differenceInMinutes, parseISO, subDays } from "date-fns"

export interface SleepEvent {
  _id?: string
  eventType: string
  startTime: string
  endTime?: string
  notes?: string
  emotionalState?: string
  sleepDelay?: number // Tiempo en minutos para dormirse
}

export interface ProcessedSleepStats {
  avgSleepDuration: number // en horas
  avgNapDuration: number // en horas
  avgBedtime: string // HH:MM (hora de acostarse - bedtime events)
  avgSleepTime: string // HH:MM (hora de dormir - sleep events)
  avgWakeTime: string // HH:MM
  bedtimeVariation: number // en minutos
  bedtimeToSleepDifference: string // Diferencia entre acostarse y dormir
  totalWakeups: number
  avgWakeupsPerNight: number
  avgNightWakingDuration: number // promedio en minutos de despertares nocturnos
  totalSleepHours: number // por día
  totalEvents: number
  recentEvents: number
  sleepEvents: number
  napEvents: number
  avgSleepDurationMinutes: number // para compatibilidad con API consultas
  avgWakeTimeMinutes: number // para compatibilidad con API consultas
  dominantMood: string // estado emocional dominante
  emotionalStates: Record<string, number>
}

/**
 * Procesa eventos de sueño y calcula estadísticas unificadas
 * Utiliza la misma lógica que el dashboard de sleep-statistics
 */
export function processSleepStatistics(
  events: SleepEvent[], 
  statsFromDate?: Date
): ProcessedSleepStats {
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
      avgNightWakingDuration: 0,
      totalSleepHours: 0,
      totalEvents: 0,
      recentEvents: 0,
      sleepEvents: 0,
      napEvents: 0,
      avgSleepDurationMinutes: 0,
      avgWakeTimeMinutes: 0,
      dominantMood: "unknown",
      emotionalStates: {}
    }
  }

  // Filtrar eventos por fecha si se especifica
  let relevantEvents = events
  if (statsFromDate) {
    relevantEvents = events.filter(event => {
      if (!event.startTime) return false
      const eventDate = parseISO(event.startTime)
      return eventDate >= statsFromDate
    })
  }

  // Filtrar eventos de la última semana para "recientes"
  const now = new Date()
  const weekAgo = subDays(now, 7)
  const recentEvents = events.filter(event => {
    if (!event.startTime) return false
    const eventDate = parseISO(event.startTime)
    return eventDate >= weekAgo
  })

  // Separar diferentes tipos de eventos (y filtrar solo los que tienen startTime)
  const nightSleep = relevantEvents.filter(e => e.eventType === 'sleep' && e.startTime)
  const naps = relevantEvents.filter(e => e.eventType === 'nap' && e.startTime)
  // Para compatibilidad con datos antiguos, incluir bedtime como sleep
  const bedtimeEvents = relevantEvents.filter(e => (e.eventType === 'bedtime' || e.eventType === 'sleep') && e.startTime)
  const sleepEvents = relevantEvents.filter(e => (e.eventType === 'sleep' || e.eventType === 'bedtime') && e.startTime)

  // Duración promedio del sueño nocturno usando inferencia
  const avgSleepDuration = calculateInferredSleepDuration(relevantEvents)

  // Duración promedio de siestas
  const avgNapDuration = naps.length > 0
    ? naps.reduce((sum, event) => {
        if (event.endTime) {
          return sum + differenceInMinutes(parseISO(event.endTime), parseISO(event.startTime)) / 60
        }
        return sum
      }, 0) / naps.length
    : 0

  // Hora promedio de acostarse (eventos bedtime y sleep nocturnos)
  const nocturnalBedtimeEvents = bedtimeEvents.filter(e => {
    const hour = parseISO(e.startTime).getHours()
    return hour >= 18 || hour <= 6 // Horario nocturno
  })
  
  const avgBedtime = nocturnalBedtimeEvents.length > 0
    ? calculateAverageTime(nocturnalBedtimeEvents.map(e => parseISO(e.startTime)))
    : "--:--"

  // Hora promedio de dormir real (considerando el delay)
  const nocturnalSleepEvents = sleepEvents.filter(e => {
    const hour = parseISO(e.startTime).getHours()
    return hour >= 18 || hour <= 6 // Horario nocturno
  })
  
  const avgSleepTime = nocturnalSleepEvents.length > 0
    ? calculateAverageSleepTime(nocturnalSleepEvents)
    : "--:--"

  // Hora promedio de levantarse usando inferencia
  const avgWakeTime = calculateInferredWakeTime(relevantEvents)

  // Variación de hora de acostarse (SOLO eventos bedtime NOCTURNOS)
  const bedtimeVariation = nocturnalBedtimeEvents.length > 1
    ? calculateTimeVariation(nocturnalBedtimeEvents.map(e => parseISO(e.startTime)))
    : 0

  // Despertares nocturnos
  const totalWakeups = calculateNightWakeups(relevantEvents)
  const avgWakeupsPerNight = nightSleep.length > 0 ? totalWakeups / nightSleep.length : 0
  const avgNightWakingDuration = calculateAverageNightWakingDuration(relevantEvents)

  // Calcular diferencia promedio entre acostarse y dormirse
  const bedtimeToSleepDifference = calculateAverageSleepDelay(nocturnalSleepEvents)

  // Total de horas de sueño por día
  const totalSleepHours = (avgSleepDuration + avgNapDuration)

  // Calcular estados emocionales
  const emotionalStates = relevantEvents.reduce((acc, event) => {
    if (event.emotionalState) {
      acc[event.emotionalState] = (acc[event.emotionalState] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  // Estado emocional dominante
  const dominantMood = Object.entries(emotionalStates)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || "unknown"

  // Conversiones para compatibilidad con API consultas
  const avgSleepDurationMinutes = Math.round(avgSleepDuration * 60)
  const avgWakeTimeMinutes = timeStringToMinutes(avgWakeTime)

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
    avgNightWakingDuration,
    totalSleepHours,
    totalEvents: events.length,
    recentEvents: recentEvents.length,
    sleepEvents: sleepEvents.length,
    napEvents: naps.length,
    avgSleepDurationMinutes,
    avgWakeTimeMinutes,
    dominantMood,
    emotionalStates
  }
}

/**
 * Calcula duración promedio del sueño mediante inferencia de patrones
 * bedtime/sleep -> wake con emparejamiento mejorado día por día
 */
function calculateInferredSleepDuration(events: SleepEvent[]): number {
  if (events.length === 0) return 0
  
  // Filtrar eventos relevantes (excluir night_waking para cálculos de duración)
  const relevantEvents = events
    .filter(e => e.startTime && e.eventType !== 'night_waking')
    .sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )
  
  if (relevantEvents.length === 0) return 0
  
  // Agrupar eventos por día para evitar emparejamientos incorrectos
  const sleepDurations: number[] = []
  const processedSleepEvents = new Set<number>() // Para evitar procesar el mismo evento dos veces
  
  for (let i = 0; i < relevantEvents.length; i++) {
    const currentEvent = relevantEvents[i]
    
    // Solo procesar eventos de tipo sleep/bedtime que no hayan sido procesados
    if (!['bedtime', 'sleep'].includes(currentEvent.eventType) || processedSleepEvents.has(i)) {
      continue
    }
    
    const bedTime = parseISO(currentEvent.startTime)
    const bedTimeHour = bedTime.getHours()
    
    // Solo procesar eventos nocturnos (después de 18:00 o antes de 6:00)
    if (bedTimeHour < 18 && bedTimeHour >= 6) {
      continue
    }
    
    // Buscar el evento wake más cercano dentro de las próximas 24 horas
    let wakeEvent: SleepEvent | null = null
    let wakeEventIndex = -1
    
    for (let j = i + 1; j < relevantEvents.length; j++) {
      const nextEvent = relevantEvents[j]
      const nextEventTime = parseISO(nextEvent.startTime)
      const timeDiff = nextEventTime.getTime() - bedTime.getTime()
      
      // Si han pasado más de 24 horas, dejar de buscar
      if (timeDiff > 24 * 60 * 60 * 1000) {
        break
      }
      
      // Si encontramos un evento wake, es nuestro candidato
      if (nextEvent.eventType === 'wake') {
        wakeEvent = nextEvent
        wakeEventIndex = j
        break
      }
      
      // Si encontramos otro evento sleep/bedtime, significa que no hay wake para el evento actual
      if (['bedtime', 'sleep'].includes(nextEvent.eventType)) {
        break
      }
    }
    
    // Calcular duración del sueño
    if (wakeEvent) {
      const wakeTime = parseISO(wakeEvent.startTime)
      
      // Aplicar sleepDelay si existe
      const rawSleepDelay = currentEvent.sleepDelay || 0
      const sleepDelay = Math.min(rawSleepDelay, 180) // Máximo 3 horas
      const actualSleepTime = new Date(bedTime.getTime() + sleepDelay * 60 * 1000)
      
      let duration = differenceInMinutes(wakeTime, actualSleepTime)
      
      // Si la duración es negativa (wake antes que sleep), probablemente wake es del día siguiente
      if (duration < 0) {
        duration += 24 * 60
      }
      
      // Validar que la duración sea razonable (2-16 horas)
      if (duration >= 120 && duration <= 960) {
        sleepDurations.push(duration)
        processedSleepEvents.add(i)
      }
    } else {
      // Si no hay wake pero es un evento nocturno reciente, asumir 8 horas
      const now = new Date()
      const daysSinceSleep = (now.getTime() - bedTime.getTime()) / (24 * 60 * 60 * 1000)
      
      if (daysSinceSleep <= 2) { // Solo para eventos de los últimos 2 días
        const rawSleepDelay = currentEvent.sleepDelay || 0
        const sleepDelay = Math.min(rawSleepDelay, 180)
        const assumedDuration = (8 * 60) - sleepDelay // 8 horas menos el delay
        
        if (assumedDuration >= 120) {
          sleepDurations.push(assumedDuration)
          processedSleepEvents.add(i)
        }
      }
    }
  }
  
  if (sleepDurations.length === 0) return 0
  
  // Calcular promedio en horas
  const averageMinutes = sleepDurations.reduce((sum, duration) => sum + duration, 0) / sleepDurations.length
  return averageMinutes / 60
}

/**
 * Calcula hora promedio de despertar mediante inferencia
 */
function calculateInferredWakeTime(events: SleepEvent[]): string {
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

/**
 * Calcula promedio de horas considerando el ciclo nocturno (18:00-06:00)
 */
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

/**
 * Calcula variación temporal en minutos
 */
function calculateTimeVariation(dates: Date[]): number {
  if (dates.length <= 1) return 0
  
  const times = dates.map(date => date.getHours() * 60 + date.getMinutes())
  const avg = times.reduce((a, b) => a + b, 0) / times.length
  const variance = times.reduce((sum, time) => sum + Math.pow(time - avg, 2), 0) / times.length
  
  return Math.sqrt(variance)
}

/**
 * Calcula el promedio de tiempo para dormirse basado en sleepDelay o diferencia bedtime-sleep
 */
function calculateAverageSleepDelay(sleepEvents: SleepEvent[]): string {
  if (sleepEvents.length === 0) return "--"
  
  const delays: number[] = []
  
  sleepEvents.forEach(event => {
    // Si tiene sleepDelay (nuevo formato), usarlo directamente
    if (event.sleepDelay !== undefined && event.sleepDelay >= 0) {
      delays.push(event.sleepDelay)
    }
    // Si es un evento bedtime antiguo, asumir 0 minutos
    else if (event.eventType === 'bedtime') {
      delays.push(0)
    }
  })
  
  if (delays.length === 0) return "--"
  
  const avgDelay = Math.round(delays.reduce((sum, d) => sum + d, 0) / delays.length)
  
  if (avgDelay === 0) {
    return "0 min"
  } else if (avgDelay < 60) {
    return `${avgDelay} min`
  } else {
    const hours = Math.floor(avgDelay / 60)
    const minutes = avgDelay % 60
    return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`
  }
}

/**
 * Calcula la hora promedio de dormir real (considerando el delay)
 */
function calculateAverageSleepTime(sleepEvents: SleepEvent[]): string {
  if (sleepEvents.length === 0) return "--:--"
  
  const sleepTimes: Date[] = []
  
  sleepEvents.forEach(event => {
    const startTime = parseISO(event.startTime)
    const delay = event.sleepDelay || 0
    
    // Calcular hora real de sueño sumando el delay
    const actualSleepTime = new Date(startTime.getTime() + delay * 60 * 1000)
    sleepTimes.push(actualSleepTime)
  })
  
  return calculateAverageTime(sleepTimes)
}

/**
 * Calcula despertares nocturnos contando eventos night_waking
 */
function calculateNightWakeups(events: SleepEvent[]): number {
  if (events.length === 0) return 0
  
  // Contar directamente los eventos de tipo 'night_waking'
  const nightWakingEvents = events.filter(event => event.eventType === 'night_waking')
  let totalWakeups = nightWakingEvents.length
  
  // También buscar menciones en notas de eventos de sueño como respaldo
  const sleepEvents = events.filter(e => ['bedtime', 'sleep'].includes(e.eventType))
  
  sleepEvents.forEach(event => {
    const notes = event.notes?.toLowerCase() || ''
    const wakeupKeywords = [
      'despertó', 'despierta', 'se despertó', 'lloró', 'pesadilla'
    ]
    
    if (wakeupKeywords.some(keyword => notes.includes(keyword))) {
      const numberMatch = notes.match(/(\d+)\s*(veces|vez)/)
      if (numberMatch) {
        totalWakeups += parseInt(numberMatch[1])
      } else {
        totalWakeups += 1 // Si hay mención, contar 1 adicional
      }
    }
  })
  
  // Retornar el TOTAL de despertares nocturnos en el período
  return totalWakeups
}

/**
 * Calcula la duración promedio de los despertares nocturnos
 */
function calculateAverageNightWakingDuration(events: SleepEvent[]): number {
  const nightWakingEvents = events.filter(event => 
    event.eventType === 'night_waking' && event.endTime
  )
  
  if (nightWakingEvents.length === 0) return 0
  
  const totalDuration = nightWakingEvents.reduce((sum, event) => {
    const duration = differenceInMinutes(
      parseISO(event.endTime!), 
      parseISO(event.startTime)
    )
    return sum + duration
  }, 0)
  
  return Math.round(totalDuration / nightWakingEvents.length)
}

/**
 * Convierte string de hora HH:MM a minutos desde medianoche
 */
function timeStringToMinutes(timeString: string): number {
  if (timeString === "--:--") return 0
  
  try {
    const [hours, minutes] = timeString.split(':').map(Number)
    return hours * 60 + minutes
  } catch {
    return 0
  }
}