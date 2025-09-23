import { useState, useEffect } from "react"
import { differenceInMinutes, parseISO, subDays } from "date-fns"
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
        
        logger.debug('Eventos procesados', { total: allEvents.length, filtrados: sleepEvents.length })
        
        // Calcular métricas
        const processedData = processSleepData(sleepEvents, allEvents, dateRange)
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

function processSleepData(events: any[], allEvents: any[], dateRange: string = "7-days"): SleepData {
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
      events: []
    }
  }

  // Separar diferentes tipos de eventos
  const nightSleep = events.filter(e => (e.eventType === 'sleep' || e.eventType === 'bedtime') && e.startTime)
  const naps = events.filter(e => e.eventType === 'nap' && e.startTime)
  // Para compatibilidad, tratar bedtime como sleep
  const bedtimeEvents = events.filter(e => (e.eventType === 'bedtime' || e.eventType === 'sleep') && e.startTime)
  const sleepEvents = events.filter(e => (e.eventType === 'sleep' || e.eventType === 'bedtime') && e.startTime)

  // Duración promedio del sueño nocturno usando inferencia
  const avgSleepDuration = calculateInferredSleepDuration(events)

  // Duración promedio de siestas
  const avgNapDuration = naps.length > 0
    ? naps.reduce((sum, event) => {
        if (event.endTime && event.startTime) {
          return sum + differenceInMinutes(parseISO(event.endTime), parseISO(event.startTime)) / 60
        }
        return sum
      }, 0) / naps.length
    : 0

  // Hora promedio de acostarse (eventos bedtime y sleep nocturnos)
  logger.debug('Eventos bedtime/sleep', bedtimeEvents.map(e => ({
    eventType: e.eventType,
    startTime: e.startTime,
    hour: new Date(e.startTime).getHours(),
    sleepDelay: e.sleepDelay
  })))
  
  // FILTRAR eventos que sean NOCTURNOS (18:00-06:00)
  const nocturnalBedtimeEvents = bedtimeEvents.filter(e => {
    const hour = parseISO(e.startTime).getHours()
    return hour >= 18 || hour <= 6 // Horario nocturno
  })
  
  logger.debug('Eventos nocturnos', { count: nocturnalBedtimeEvents.length })
  
  const avgBedtime = nocturnalBedtimeEvents.length > 0
    ? calculateAverageTime(nocturnalBedtimeEvents.map(e => parseISO(e.startTime)))
    : "--:--"

  // Hora promedio de dormir real (considerando el delay)
  logger.debug('Eventos sleep', sleepEvents.map(e => ({
    eventType: e.eventType,
    startTime: e.startTime,
    hour: new Date(e.startTime).getHours(),
    sleepDelay: e.sleepDelay
  })))
  
  // FILTRAR eventos que sean NOCTURNOS (18:00-06:00)
  const nocturnalSleepEvents = sleepEvents.filter(e => {
    const hour = parseISO(e.startTime).getHours()
    return hour >= 18 || hour <= 6 // Horario nocturno
  })
  
  logger.debug('Eventos sleep nocturnos', { count: nocturnalSleepEvents.length })
  
  const avgSleepTime = nocturnalSleepEvents.length > 0
    ? calculateAverageSleepTime(nocturnalSleepEvents)
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

  // Calcular diferencia promedio entre acostarse y dormirse
  const bedtimeToSleepDifference = calculateAverageSleepDelay(nocturnalSleepEvents)

  // Total de horas de sueño por día
  const totalSleepHours = (avgSleepDuration + avgNapDuration)
  
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
  
  const times = dates.map(date => {
    let minutes = date.getHours() * 60 + date.getMinutes()
    
    // AJUSTAR horas de madrugada (00:00-06:00) para cálculo nocturno
    if (date.getHours() >= 0 && date.getHours() <= 6) {
      minutes += 24 * 60 // Sumar 24 horas para que quede al final del día anterior
    }
    
    return minutes
  })
  
  const avg = times.reduce((a, b) => a + b, 0) / times.length
  const variance = times.reduce((sum, time) => sum + Math.pow(time - avg, 2), 0) / times.length
  
  return Math.sqrt(variance)
}

function calculateInferredSleepDuration(events: any[]): number {
  if (events.length === 0) return 0
  
  // Filtrar eventos relevantes (excluir night_waking para cálculos de duración)
  const relevantEvents = events
    .filter(e => e.startTime && e.eventType !== 'night_waking')
    .sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )
  
  if (relevantEvents.length === 0) return 0
  
  logger.debug('Procesando eventos para duración', { count: relevantEvents.length })
  
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
    let wakeEvent = null
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
        logger.debug('Par sleep-wake encontrado', { 
          sleep: bedTime.toLocaleString(),
          wake: wakeTime.toLocaleString(),
          duracion: (duration/60).toFixed(1) + 'h',
          sleepDelay: sleepDelay + 'min'
        })
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
          logger.debug('Sueño sin wake (asumiendo 8h)', { 
            sleep: bedTime.toLocaleString(),
            duracionAsumida: (assumedDuration/60).toFixed(1) + 'h'
          })
        }
      }
    }
  }
  
  if (sleepDurations.length === 0) return 0
  
  // Calcular promedio en horas
  const averageMinutes = sleepDurations.reduce((sum, duration) => sum + duration, 0) / sleepDurations.length
  logger.debug('Promedio de sueño calculado', { 
    noches: sleepDurations.length,
    promedioHoras: (averageMinutes/60).toFixed(1) 
  })
  
  return averageMinutes / 60
}

function calculateInferredWakeTime(events: any[]): string {
  if (events.length === 0) return "--:--"
  
  // Filtrar y ordenar eventos por fecha (excluir night_waking para cálculos de tiempo)
  const sortedEvents = events
    .filter(e => e.startTime && e.eventType !== 'night_waking')
    .sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )
  
  const wakeTimes: Date[] = []
  
  for (let i = 0; i < sortedEvents.length - 1; i++) {
    const currentEvent = sortedEvents[i]
    const nextEvent = sortedEvents[i + 1]

    // Solo considerar sueño NOCTURNO (18:00–06:00) como origen para despertar matutino
    if (!['bedtime', 'sleep'].includes(currentEvent.eventType)) continue
    const bedTime = parseISO(currentEvent.startTime)
    const bedHour = bedTime.getHours()
    const isNocturnal = (bedHour >= 18 || bedHour <= 6)
    if (!isNocturnal) continue

    // Caso ideal: siguiente evento es wake → despertar matutino
    if (nextEvent.eventType === 'wake' && nextEvent.startTime) {
      wakeTimes.push(parseISO(nextEvent.startTime))
      continue
    }

    // Formato antiguo: el propio evento sleep tiene endTime → úsalo como despertar
    if (currentEvent.endTime) {
      wakeTimes.push(parseISO(currentEvent.endTime))
      continue
    }

    // NO inferimos desde siestas/actividades para evitar sesgo (se elimina caso anterior)
  }
  
  // Filtrar candidatos a ventana matutina razonable (04:00–11:00)
  const morningWakes = wakeTimes.filter(d => {
    const h = d.getHours()
    return h >= 4 && h <= 11
  })

  if (morningWakes.length === 0) {
    // Fallback adicional: tomar todos los endTime de eventos 'sleep' nocturnos en ventana 04:00–11:00
    const altWakes: Date[] = events
      .filter((e: any) => e.eventType === 'sleep' && e.startTime && e.endTime)
      .map((e: any) => ({ start: parseISO(e.startTime), end: parseISO(e.endTime) }))
      .filter(({ start, end }) => {
        const sh = start.getHours()
        const eh = end.getHours()
        const nocturnal = (sh >= 18 || sh <= 6)
        const morning = (eh >= 4 && eh <= 11)
        return nocturnal && morning
      })
      .map(({ end }) => end)

    if (altWakes.length === 0) return "--:--"
    const avgAlt = calculateAverageTime(altWakes)
    try {
      const [hStr] = avgAlt.split(':')
      const h = parseInt(hStr, 10)
      if (isNaN(h) || h < 4 || h > 11) return "--:--"
    } catch {}
    return avgAlt
  }
  const avg = calculateAverageTime(morningWakes)
  try {
    const [hStr] = avg.split(':')
    const h = parseInt(hStr, 10)
    if (isNaN(h) || h < 4 || h > 11) return "--:--"
  } catch {}
  return avg
}

// Función para calcular el promedio de tiempo para dormirse
function calculateAverageSleepDelay(sleepEvents: any[]): string {
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

// Función para calcular la hora promedio de dormir real (considerando el delay)
function calculateAverageSleepTime(sleepEvents: any[]): string {
  if (sleepEvents.length === 0) return "--:--"
  
  const sleepTimes: Date[] = []
  
  sleepEvents.forEach(event => {
    if (!event.startTime) return
    
    const startTime = parseISO(event.startTime)
    const delay = event.sleepDelay || 0
    
    // Calcular hora real de sueño sumando el delay
    const actualSleepTime = new Date(startTime.getTime() + delay * 60 * 1000)
    sleepTimes.push(actualSleepTime)
  })
  
  return calculateAverageTime(sleepTimes)
}

// Función para calcular despertares nocturnos
function calculateNightWakeups(events: any[]): number {
  if (events.length === 0) return 0
  
  // Filtrar y ordenar eventos por fecha
  const sortedEvents = events
    .filter(e => e.startTime)
    .sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )
  
  let totalWakeups = 0
  
  // MÉTODO 1: Contar eventos night_waking directamente
  const nightWakingEvents = sortedEvents.filter(e => e.eventType === 'night_waking')
  totalWakeups += nightWakingEvents.length
  
  logger.debug('Eventos night_waking', { count: nightWakingEvents.length })
  
  // MÉTODO 2: Analizar secuencias de sueño nocturno para eventos wake
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
  
  logger.debug('Total despertares nocturnos', { count: totalWakeups })
  
  // Retornar el TOTAL de despertares nocturnos en el período
  return totalWakeups
}

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
