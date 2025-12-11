// Lógica compartida de cálculos de sueño
// Extraída de useSleepData.ts para consistencia entre dashboard y API consultas

import { differenceInMinutes, parseISO, subDays } from "date-fns"
import { NIGHT_START_HOUR, NIGHT_END_HOUR } from "./datetime"

/**
 * Helper: Determina si una hora está en el rango nocturno
 * Rango estandarizado: 7pm (19:00) a 6am (06:00)
 */
function isNightHour(hour: number): boolean {
  return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR
}

export interface SleepEvent {
  _id?: string
  eventType: string
  startTime: string
  endTime?: string
  notes?: string
  emotionalState?: string
  sleepDelay?: number // Tiempo en minutos para dormirse
   didNotSleep?: boolean // Marca intentos donde no se logró dormir (ej. siesta fallida)
}

export interface ProcessedSleepStats {
  avgSleepDuration: number // en horas
  avgNapDuration: number // en horas
  avgBedtime: string // HH:MM (hora de acostarse - bedtime events)
  avgSleepTime: string // HH:MM (hora de dormir - sleep events)
  avgWakeTime: string // HH:MM
  bedtimeVariation: number // en minutos
  bedtimeToSleepDifference: string // Diferencia entre acostarse y dormir
  avgNapSleepDelay: string // Tiempo promedio para dormirse en siestas
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

// Estadísticas agregadas por día (para coherencia entre UI)
export interface DailyAggregatedSleepStats {
  daysInPeriod: number
  daysWithData: number
  nightsCount: number
  napsCount: number
  totalNightMinutes: number
  totalNapMinutes: number
  avgNightHoursPerDay: number
  avgNapHoursPerDay: number
  avgTotalHoursPerDay: number
  nightPercentage: number
  napPercentage: number
  dailyTotals: {
    dateKey: string
    nightMinutes: number
    napMinutes: number
    totalMinutes: number
  }[]
}

/**
 * Agrega sueño por día: asigna cada sueño nocturno completo al día del despertar
 * y las siestas al día de su inicio. Devuelve promedios diarios consistentes.
 * El denominador por defecto son los días con datos para evitar sesgos por días vacíos.
 */
export function aggregateDailySleep(
  events: SleepEvent[],
  dateRange: string = "7-days",
  options?: { denominator?: "period" | "dataDays" }
): DailyAggregatedSleepStats {
  const denominator = options?.denominator ?? "dataDays"
  if (!events || events.length === 0) {
    return {
      daysInPeriod: rangeToDays(dateRange),
      daysWithData: 0,
      nightsCount: 0,
      napsCount: 0,
      totalNightMinutes: 0,
      totalNapMinutes: 0,
      avgNightHoursPerDay: 0,
      avgNapHoursPerDay: 0,
      avgTotalHoursPerDay: 0,
      nightPercentage: 0,
      napPercentage: 0,
      dailyTotals: [],
    }
  }

  const daysInPeriod = rangeToDays(dateRange)
  const now = new Date()
  const fromDate = subDays(now, daysInPeriod)

  // Filtrar por rango seleccionado
  const relevant = events
    .filter(e => e?.startTime)
    .filter(e => {
      const d = parseISO(e.startTime)
      return d >= fromDate && d <= now
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

  // Mapa por fecha (YYYY-MM-DD) → minutos
  const fmt = (d: Date) => {
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${d.getFullYear()}-${month}-${day}`
  }
  const dayTotals = new Map<string, { night: number; nap: number }>()
  const ensure = (key: string) => {
    if (!dayTotals.has(key)) dayTotals.set(key, { night: 0, nap: 0 })
    return dayTotals.get(key)!
  }

  // 1) Reconstruir noches: bedtime/sleep → wake; asignar a día del wake
  let nightsCount = 0
  const processedSleepIndices = new Set<number>()
  for (let i = 0; i < relevant.length - 1; i++) {
    const cur = relevant[i]
    const nxt = relevant[i + 1]
    if (!["bedtime", "sleep"].includes(cur.eventType)) continue

    // Solo noches (19:00–06:00) - usando rango estandarizado
    const curDate = parseISO(cur.startTime)
    const curHour = curDate.getHours()
    if (!isNightHour(curHour)) continue

    if (nxt.eventType === "wake" && nxt.startTime) {
      const wakeTime = parseISO(nxt.startTime)
      const rawDelay = cur.sleepDelay || 0
      const delay = Math.min(rawDelay, 180)
      const actualSleep = new Date(curDate.getTime() + delay * 60 * 1000)
      let minutes = differenceInMinutes(wakeTime, actualSleep)
      if (minutes < 0) minutes += 24 * 60 // cruce de medianoche
      if (minutes >= 120 && minutes <= 960) {
        const key = fmt(wakeTime)
        ensure(key).night += minutes
        nightsCount++
        processedSleepIndices.add(i)
      }
    }
  }

  // 1b) Formato antiguo: eventos 'sleep' con endTime válido, asignar al día del endTime
  relevant.forEach((e, idx) => {
    if (e.eventType !== "sleep" || !e.endTime) return
    if (processedSleepIndices.has(idx)) return
    const start = parseISO(e.startTime)
    const end = parseISO(e.endTime)
    const startHour = start.getHours()
    const minutes = differenceInMinutes(end, start)
    if (isNightHour(startHour) && minutes >= 120 && minutes <= 960) {
      const key = fmt(end)
      ensure(key).night += minutes
      nightsCount++
    }
  })

  // 2) Siestas: start→end en el día del start
  const napEvents = relevant.filter(e => e.eventType === "nap" && e.endTime && !e.didNotSleep)
  let napsCount = 0
  napEvents.forEach(e => {
    const start = parseISO(e.startTime)
    const end = parseISO(e.endTime!)
    const minutes = differenceInMinutes(end, start)
    if (minutes > 0 && minutes < 300) {
      const key = fmt(start)
      ensure(key).nap += minutes
      napsCount++
    }
  })

  // 3) Totales y promedios
  let totalNightMinutes = 0
  let totalNapMinutes = 0
  let daysWithData = 0
  dayTotals.forEach(v => {
    const total = v.night + v.nap
    if (total > 0) daysWithData++
    totalNightMinutes += v.night
    totalNapMinutes += v.nap
  })

  const den = denominator === "period" ? daysInPeriod : Math.max(daysWithData, 1)
  const avgNightHoursPerDay = (totalNightMinutes / 60) / den
  const avgNapHoursPerDay = (totalNapMinutes / 60) / den
  const avgTotalHoursPerDay = avgNightHoursPerDay + avgNapHoursPerDay
  const nightPercentage = avgTotalHoursPerDay > 0 ? (avgNightHoursPerDay / avgTotalHoursPerDay) * 100 : 0
  const napPercentage = avgTotalHoursPerDay > 0 ? (avgNapHoursPerDay / avgTotalHoursPerDay) * 100 : 0

  const dailyTotals = Array.from(dayTotals.entries())
    .map(([dateKey, value]) => ({
      dateKey,
      nightMinutes: value.night,
      napMinutes: value.nap,
      totalMinutes: value.night + value.nap,
    }))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))

  return {
    daysInPeriod,
    daysWithData,
    nightsCount,
    napsCount,
    totalNightMinutes,
    totalNapMinutes,
    avgNightHoursPerDay,
    avgNapHoursPerDay,
    avgTotalHoursPerDay,
    nightPercentage,
    napPercentage,
    dailyTotals,
  }
}

// Utilidad: traducir range a días
function rangeToDays(range: string): number {
  if (range === "30-days") return 30
  if (range === "90-days") return 90
  return 7
}

/**
 * Variante explícita para despertar matutino (04:00–11:00)
 */
export function calculateMorningWakeTime(events: SleepEvent[]): string {
  if (!events || events.length === 0) return "--:--"
  const sorted = [...events]
    .filter(e => e?.startTime)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

  const wakes: Date[] = []
  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i]
    if (!["sleep","bedtime"].includes(e.eventType)) continue
    const start = parseISO(e.startTime)
    const hour = start.getHours()
    const nocturnal = isNightHour(hour)
    if (!nocturnal) continue
    if ((sorted[i] as any).endTime) {
      wakes.push(parseISO((sorted[i] as any).endTime))
      continue
    }
    for (let j = i + 1; j < sorted.length; j++) {
      const n = sorted[j]
      if (n.eventType === "wake" && n.startTime) {
        wakes.push(parseISO(n.startTime))
        break
      }
      if (["sleep","bedtime"].includes(n.eventType)) break
    }
  }
  let morning = wakes.filter(d => {
    const h = d.getHours()
    return h >= 4 && h <= 11
  })
  // Fallback: permitir wakes de mañana standalone cuando el sleep previo está fuera de rango
  if (!morning.length) {
    const standaloneMorningWakes = sorted
      .filter(e => e.eventType === "wake" && e.startTime)
      .map(e => parseISO(e.startTime))
      .filter(d => {
        const h = d.getHours()
        return h >= 4 && h <= 11
      })
    if (standaloneMorningWakes.length) {
      morning = standaloneMorningWakes
    }
  }
  if (!morning.length) return "--:--"
  const total = morning.reduce((sum, d) => sum + d.getHours() * 60 + d.getMinutes(), 0)
  const avg = Math.round(total / morning.length)
  const hh = String(Math.floor(avg / 60)).padStart(2,"0")
  const mm = String(avg % 60).padStart(2,"0")
  return `${hh}:${mm}`
}

/**
 * Calcula duración promedio del sueño mediante inferencia de patrones
 * bedtime/sleep -> wake con emparejamiento mejorado día por día
 */
function calculateInferredSleepDuration(events: SleepEvent[]): number {
  if (events.length === 0) return 0
  
  // Filtrar eventos relevantes (excluir night_waking para cálculos de duración)
  const relevantEvents = events
    .filter(e => e.startTime && e.eventType !== "night_waking")
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
    if (!["bedtime", "sleep"].includes(currentEvent.eventType) || processedSleepEvents.has(i)) {
      continue
    }
    
    const bedTime = parseISO(currentEvent.startTime)
    const bedTimeHour = bedTime.getHours()

    // Solo procesar eventos nocturnos (19:00–06:00) - usando rango estandarizado
    if (!isNightHour(bedTimeHour)) {
      continue
    }
    
    // Buscar el evento wake más cercano dentro de las próximas 18 horas (máximo razonable para sueño nocturno)
    let wakeEvent: SleepEvent | null = null
    
    for (let j = i + 1; j < relevantEvents.length; j++) {
      const nextEvent = relevantEvents[j]
      const nextEventTime = parseISO(nextEvent.startTime)
      const timeDiff = nextEventTime.getTime() - bedTime.getTime()
      
      // Si han pasado más de 18 horas, dejar de buscar (sueño nocturno máximo razonable)
      if (timeDiff > 18 * 60 * 60 * 1000) {
        break
      }
      
      // Si encontramos un evento wake, es nuestro candidato
      if (nextEvent.eventType === "wake") {
        wakeEvent = nextEvent
        break
      }
      
      // Si encontramos otro evento sleep/bedtime nocturno, significa que no hay wake para el evento actual
      if (["bedtime", "sleep"].includes(nextEvent.eventType)) {
        const nextEventHour = nextEventTime.getHours()
        // Solo romper si es otro evento nocturno (no una siesta)
        if (isNightHour(nextEventHour)) {
          break
        }
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
      // Formato antiguo: evento 'sleep' con endTime válido
      if (currentEvent.endTime) {
        const end = parseISO(currentEvent.endTime)
        const rawSleepDelay = currentEvent.sleepDelay || 0
        const sleepDelay = Math.min(rawSleepDelay, 180)
        const actualSleepTime = new Date(bedTime.getTime() + sleepDelay * 60 * 1000)
        let duration = differenceInMinutes(end, actualSleepTime)
        if (duration < 0) duration += 24 * 60
        if (duration >= 120 && duration <= 960) {
          sleepDurations.push(duration)
          processedSleepEvents.add(i)
          continue
        }
      }
      // Si no hay wake ni endTime válido pero es reciente, asumir duración típica
      const now = new Date()
      const daysSinceSleep = (now.getTime() - bedTime.getTime()) / (24 * 60 * 60 * 1000)
      
      if (daysSinceSleep <= 2) { // Solo para eventos de los últimos 2 días
        // Para niños, asumir 10-11 horas de sueño nocturno típico
        // NO restar el sleepDelay porque ya se aplicó al calcular actualSleepTime
        const assumedDuration = 10 * 60 // 10 horas es típico para niños
        
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
 * CORRECCIÓN: El despertar es el endTime del evento sleep, NO un evento "wake" separado
 */
function calculateInferredWakeTime(events: SleepEvent[]): string {
  if (events.length === 0) return "--:--"

  const wakeTimes: Date[] = []

  // Filtrar eventos de sueño nocturno (sleep) que tengan endTime
  const nocturnalSleepEvents = events.filter(e => {
    if (e.eventType !== "sleep") return false
    if (!e.endTime) return false

    // Filtrar solo sueño nocturno (19:00–06:00) - usando rango estandarizado
    const hour = parseISO(e.startTime).getHours()
    return isNightHour(hour)
  })

  // Recopilar los endTime (hora de despertar) de cada evento sleep
  for (const sleepEvent of nocturnalSleepEvents) {
    if (sleepEvent.endTime) {
      wakeTimes.push(parseISO(sleepEvent.endTime))
    }
  }

  if (wakeTimes.length === 0) return "--:--"

  return calculateAverageTime(wakeTimes)
}

/**
 * Calcula promedio de horas considerando el ciclo nocturno (19:00-06:00)
 */
function calculateAverageTime(dates: Date[]): string {
  if (dates.length === 0) return "--:--"

  try {
    const totalMinutes = dates.reduce((sum, date) => {
      let minutes = date.getHours() * 60 + date.getMinutes()

      // AJUSTAR horas de madrugada (00:00-06:00) para cálculo nocturno
      if (date.getHours() >= 0 && date.getHours() < NIGHT_END_HOUR) {
        minutes += 24 * 60 // Sumar 24 horas para que quede al final del día anterior
      }

      return sum + minutes
    }, 0)
    
    const avgMinutes = totalMinutes / dates.length
    
    // Convertir de vuelta a formato 24h normal
    const finalHours = Math.floor(avgMinutes / 60) % 24
    const finalMinutes = Math.round(avgMinutes % 60)
    
    return `${finalHours.toString().padStart(2, "0")}:${finalMinutes.toString().padStart(2, "0")}`
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
    // Ignorar eventos marcados explícitamente como "no se pudo dormir"
    if (event.didNotSleep) {
      return
    }

    // Si tiene sleepDelay (nuevo formato), usarlo directamente
    if (event.sleepDelay !== undefined && event.sleepDelay >= 0) {
      delays.push(event.sleepDelay)
    }
    // Si es un evento bedtime antiguo, asumir 0 minutos
    else if (event.eventType === "bedtime") {
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
  const nightWakingEvents = events.filter(event => event.eventType === "night_waking")
  let totalWakeups = nightWakingEvents.length
  
  // También buscar menciones en notas de eventos de sueño como respaldo
  const sleepEvents = events.filter(e => ["bedtime", "sleep"].includes(e.eventType))
  
  sleepEvents.forEach(event => {
    const notes = event.notes?.toLowerCase() || ""
    const wakeupKeywords = [
      "despertó", "despierta", "se despertó", "lloró", "pesadilla",
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
    event.eventType === "night_waking" && event.endTime
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
    const [hours, minutes] = timeString.split(":").map(Number)
    return hours * 60 + minutes
  } catch {
    return 0
  }
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
      avgNapSleepDelay: "--",
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
      emotionalStates: {},
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
  const nightSleep = relevantEvents.filter(e => e.eventType === "sleep" && e.startTime)
  const naps = relevantEvents.filter(e => e.eventType === "nap" && e.startTime)
  // Para compatibilidad con datos antiguos, incluir bedtime como sleep
  const bedtimeEvents = relevantEvents.filter(e => (e.eventType === "bedtime" || e.eventType === "sleep") && e.startTime)
  const sleepEvents = relevantEvents.filter(e => (e.eventType === "sleep" || e.eventType === "bedtime") && e.startTime)

  // Duración promedio del sueño nocturno usando inferencia
  const avgSleepDuration = calculateInferredSleepDuration(relevantEvents)

  // Duración promedio de siestas
  const napsWithDuration = naps.filter(e => e.endTime && !e.didNotSleep)
  const avgNapDuration = napsWithDuration.length > 0
    ? napsWithDuration.reduce((sum, event) => {
      if (event.endTime) {
        return sum + differenceInMinutes(parseISO(event.endTime), parseISO(event.startTime)) / 60
      }
      return sum
    }, 0) / napsWithDuration.length
    : 0

  // Hora promedio de acostarse (eventos bedtime y sleep nocturnos)
  const nocturnalBedtimeEvents = bedtimeEvents.filter(e => {
    const hour = parseISO(e.startTime).getHours()
    return isNightHour(hour) // Horario nocturno (19:00-06:00)
  })

  const avgBedtime = nocturnalBedtimeEvents.length > 0
    ? calculateAverageTime(nocturnalBedtimeEvents.map(e => parseISO(e.startTime)))
    : "--:--"

  // Hora promedio de dormir real (considerando el delay)
  const nocturnalSleepEvents = sleepEvents.filter(e => {
    const hour = parseISO(e.startTime).getHours()
    return isNightHour(hour) // Horario nocturno (19:00-06:00)
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

  // Tiempo promedio para dormirse en siestas (solo siestas con sleepDelay válido)
  const napSleepEvents = naps.filter(e =>
    !e.didNotSleep &&
    e.sleepDelay !== undefined &&
    e.sleepDelay >= 0
  )
  const avgNapSleepDelay = napSleepEvents.length > 0
    ? calculateAverageSleepDelay(napSleepEvents)
    : "--"

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
    emotionalStates,
    avgNapSleepDelay,
  }
}
