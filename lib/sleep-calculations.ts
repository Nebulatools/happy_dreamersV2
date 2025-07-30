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
      const eventDate = parseISO(event.startTime)
      return eventDate >= statsFromDate
    })
  }

  // Filtrar eventos de la última semana para "recientes"
  const now = new Date()
  const weekAgo = subDays(now, 7)
  const recentEvents = events.filter(event => {
    const eventDate = parseISO(event.startTime)
    return eventDate >= weekAgo
  })

  // Separar diferentes tipos de eventos
  const nightSleep = relevantEvents.filter(e => e.eventType === 'sleep')
  const naps = relevantEvents.filter(e => e.eventType === 'nap')
  // Para compatibilidad con datos antiguos, incluir bedtime como sleep
  const bedtimeEvents = relevantEvents.filter(e => e.eventType === 'bedtime' || e.eventType === 'sleep')
  const sleepEvents = relevantEvents.filter(e => e.eventType === 'sleep' || e.eventType === 'bedtime')

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
 * bedtime/sleep -> wake
 */
function calculateInferredSleepDuration(events: SleepEvent[]): number {
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
      
      // Si es evento sleep con delay, ajustar el tiempo de inicio real
      const sleepDelay = currentEvent.sleepDelay || 0
      const actualSleepTime = new Date(bedTime.getTime() + sleepDelay * 60 * 1000)
      
      let duration = differenceInMinutes(wakeTime, actualSleepTime)
      
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
      
      // Si es evento sleep con delay, ajustar el tiempo de inicio real
      const sleepDelay = currentEvent.sleepDelay || 0
      const actualSleepTime = new Date(bedTime.getTime() + sleepDelay * 60 * 1000)
      
      // Solo si es al día siguiente o más tarde
      if (nextEventTime.getTime() > actualSleepTime.getTime()) {
        // Inferir despertar 1 hora antes del primer evento del día siguiente
        const inferredWakeTime = new Date(nextEventTime.getTime() - 60 * 60 * 1000)
        let duration = differenceInMinutes(inferredWakeTime, actualSleepTime)
        
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
 * Calcula despertares nocturnos analizando secuencias sleep->wake
 */
function calculateNightWakeups(events: SleepEvent[]): number {
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