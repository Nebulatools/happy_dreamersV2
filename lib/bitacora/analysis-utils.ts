/**
 * Utilidades de analisis para la vista de Bitacora
 *
 * Funciones puras de procesamiento de datos para transformar eventos crudos
 * en resumen diario estructurado (DayAnalysis). Sin React.
 *
 * Usa getTimePartsInTimezone / formatForDisplay de lib/datetime para
 * manejo correcto de timezone (nunca new Date(isoString) directo).
 */

import {
  getTimePartsInTimezone,
  getDateKey,
  formatForDisplay,
  parseTimestamp,
  DEFAULT_TIMEZONE,
} from "@/lib/datetime"
import {
  addDays,
  eachDayOfInterval,
  format,
  differenceInMinutes,
} from "date-fns"

// ============================================================================
// Interfaces
// ============================================================================

export interface DayAnalysis {
  date: Date
  dateKey: string // "YYYY-MM-DD"
  wakeTime: string | null // "07:15"
  bedtime: string | null // "20:00"
  bedtimeSleepDelay: number | null
  naps: NapSummary[]
  wakeWindows: WakeWindow[]
  feedings: FeedingSummary[]
  medications: MedicationSummary[]
  activities: ActivitySummary[]
  dreamFeeds: FeedingSummary[]
  nightWakings: NightWakingSummary[]
  totalNapMinutes: number
}

export interface NapSummary {
  startTime: string // "08:59"
  endTime: string // "09:36"
  durationMinutes: number
  sleepDelay?: number
  emotionalState?: string
}

export interface WakeWindow {
  fromLabel: string // "Despertar" or "Siesta 1"
  toLabel: string // "Siesta 1" or "Dormir"
  durationMinutes: number
  durationFormatted: string // "1h 30min"
}

export interface FeedingSummary {
  time: string
  feedingType: string
  amount?: number
  unit?: string
  duration?: number
  isNightFeeding: boolean
  notes?: string
}

export interface MedicationSummary {
  time: string
  name: string
  dose: string
}

export interface ActivitySummary {
  time: string
  description: string
  duration?: number
}

export interface NightWakingSummary {
  time: string
  awakeDelay?: number
  emotionalState?: string
}

// Tipo interno para eventos del cache de BitacoraTab
interface RawEvent {
  _id: string
  childId: string
  eventType: string
  startTime: string
  endTime?: string
  emotionalState?: string
  notes?: string
  duration?: number
  sleepDelay?: number
  didNotSleep?: boolean
  awakeDelay?: number
  feedingType?: string
  feedingAmount?: number
  feedingDuration?: number
  babyState?: string
  feedingNotes?: string
  isNightFeeding?: boolean
  feedingContext?: string
  medicationName?: string
  medicationDose?: string
  activityDescription?: string
  activityDuration?: number
  [key: string]: unknown
}

// ============================================================================
// Funciones principales
// ============================================================================

/**
 * Agrupa eventos por dia usando la timezone del usuario.
 * Retorna un Map<dateKey, RawEvent[]> donde dateKey es "YYYY-MM-DD".
 *
 * Logica especial para eventos que cruzan medianoche:
 * - sleep que empieza dia 1 y termina dia 2: bedtime en dia 1, wakeTime en dia 2
 * - nap que cruza medianoche: se asigna al dia de inicio
 */
export function groupEventsByDay(
  events: RawEvent[],
  fromDate: Date,
  toDate: Date,
  timezone: string = DEFAULT_TIMEZONE
): Map<string, RawEvent[]> {
  const grouped = new Map<string, RawEvent[]>()

  // Inicializar todos los dias del rango
  const days = eachDayOfInterval({ start: fromDate, end: toDate })
  for (const day of days) {
    const key = format(day, "yyyy-MM-dd")
    grouped.set(key, [])
  }

  for (const event of events) {
    if (!event.startTime) continue

    const dateKey = getDateKey(event.startTime, timezone)

    // Si el evento pertenece a un dia del rango, agregarlo
    if (grouped.has(dateKey)) {
      grouped.get(dateKey)!.push(event)
    }

    // Para sleep/nap con endTime que cruza medianoche, duplicar en dia de fin
    if (
      event.endTime &&
      (event.eventType === "sleep" || event.eventType === "nap")
    ) {
      const endDateKey = getDateKey(event.endTime, timezone)
      if (endDateKey !== dateKey && grouped.has(endDateKey)) {
        // Marcar que este es un evento "continuado" para el dia del despertar
        grouped.get(endDateKey)!.push({
          ...event,
          _crossedFromPrevDay: true,
        } as RawEvent & { _crossedFromPrevDay: boolean })
      }
    }
  }

  return grouped
}

/**
 * Procesa los eventos de un dia y genera un DayAnalysis completo.
 */
export function analyzeDayEvents(
  dayEvents: RawEvent[],
  date: Date,
  timezone: string = DEFAULT_TIMEZONE
): DayAnalysis {
  const dateKey = format(date, "yyyy-MM-dd")

  // Ordenar eventos por startTime
  const sorted = [...dayEvents].sort(
    (a, b) =>
      parseTimestamp(a.startTime).getTime() -
      parseTimestamp(b.startTime).getTime()
  )

  let wakeTime: string | null = null
  let bedtime: string | null = null
  let bedtimeSleepDelay: number | null = null
  const naps: NapSummary[] = []
  const feedings: FeedingSummary[] = []
  const medications: MedicationSummary[] = []
  const activities: ActivitySummary[] = []
  const dreamFeeds: FeedingSummary[] = []
  const nightWakings: NightWakingSummary[] = []

  for (const event of sorted) {
    const timeStr = formatForDisplay(event.startTime, timezone, "HH:mm")
    const isCrossed = (event as RawEvent & { _crossedFromPrevDay?: boolean })
      ._crossedFromPrevDay

    switch (event.eventType) {
      case "wake": {
        // El primer wake del dia es el despertar matutino
        if (!wakeTime) {
          wakeTime = timeStr
        }
        break
      }

      case "sleep": {
        // Si es un evento cruzado del dia anterior, el endTime es el wakeTime de hoy
        if (isCrossed && event.endTime) {
          const wakeStr = formatForDisplay(event.endTime, timezone, "HH:mm")
          if (!wakeTime) {
            wakeTime = wakeStr
          }
        } else {
          // Sleep que inicia hoy = bedtime
          bedtime = timeStr
          bedtimeSleepDelay =
            event.sleepDelay !== undefined ? event.sleepDelay : null
        }
        break
      }

      case "nap": {
        if (isCrossed) {
          // Siesta cruzada del dia anterior - ignorar (ya se conto en su dia)
          break
        }
        if (event.endTime && !event.didNotSleep) {
          const endStr = formatForDisplay(event.endTime, timezone, "HH:mm")
          const start = parseTimestamp(event.startTime)
          const end = parseTimestamp(event.endTime)
          const dur = differenceInMinutes(end, start)
          naps.push({
            startTime: timeStr,
            endTime: endStr,
            durationMinutes: dur > 0 ? dur : 0,
            sleepDelay: event.sleepDelay,
            emotionalState: event.emotionalState,
          })
        } else if (!event.didNotSleep) {
          // Siesta sin endTime (en progreso)
          naps.push({
            startTime: timeStr,
            endTime: "--:--",
            durationMinutes: 0,
            sleepDelay: event.sleepDelay,
            emotionalState: event.emotionalState,
          })
        }
        break
      }

      case "feeding":
      case "night_feeding": {
        const isDreamFeed =
          event.isNightFeeding === true ||
          event.feedingContext === "during_sleep" ||
          event.feedingContext === "during_nap" ||
          event.eventType === "night_feeding"

        const feedingSummary: FeedingSummary = {
          time: timeStr,
          feedingType: event.feedingType || "breast",
          amount: event.feedingAmount,
          unit: event.feedingType === "solids" ? "gr" : "ml",
          duration: event.feedingDuration,
          isNightFeeding: isDreamFeed,
          notes: event.feedingNotes || event.notes,
        }

        if (isDreamFeed) {
          dreamFeeds.push(feedingSummary)
        } else {
          feedings.push(feedingSummary)
        }
        break
      }

      case "medication": {
        medications.push({
          time: timeStr,
          name: event.medicationName || "Sin nombre",
          dose: event.medicationDose || "Sin dosis",
        })
        break
      }

      case "extra_activities":
      case "activity": {
        activities.push({
          time: timeStr,
          description: event.activityDescription || "Sin descripcion",
          duration: event.activityDuration,
        })
        break
      }

      case "night_waking": {
        nightWakings.push({
          time: timeStr,
          awakeDelay: event.awakeDelay,
          emotionalState: event.emotionalState,
        })
        break
      }
    }
  }

  // Calcular total de minutos de siesta
  const totalNapMinutes = naps.reduce((sum, n) => sum + n.durationMinutes, 0)

  // Calcular ventanas de vigilia
  const wakeWindows = computeWakeWindows(wakeTime, naps, bedtime)

  return {
    date,
    dateKey,
    wakeTime,
    bedtime,
    bedtimeSleepDelay,
    naps,
    wakeWindows,
    feedings,
    medications,
    activities,
    dreamFeeds,
    nightWakings,
    totalNapMinutes,
  }
}

/**
 * Calcula las ventanas de vigilia (wake windows) entre:
 * - Despertar y primera siesta
 * - Fin de siesta N y inicio de siesta N+1
 * - Fin de ultima siesta y bedtime
 */
export function computeWakeWindows(
  wakeTime: string | null,
  naps: NapSummary[],
  bedtime: string | null
): WakeWindow[] {
  const windows: WakeWindow[] = []

  // Necesitamos al menos un punto de referencia
  if (!wakeTime && naps.length === 0) return windows

  // Convertir HH:mm a minutos desde medianoche para calcular diferencias
  const toMinutes = (timeStr: string): number | null => {
    if (!timeStr || timeStr === "--:--") return null
    const [hh, mm] = timeStr.split(":").map(Number)
    if (isNaN(hh) || isNaN(mm)) return null
    return hh * 60 + mm
  }

  // Puntos de referencia: (etiqueta, minutosInicio, minutosFin)
  type Checkpoint = { label: string; startMin: number; endMin: number }
  const checkpoints: Checkpoint[] = []

  if (wakeTime) {
    const wakeMin = toMinutes(wakeTime)
    if (wakeMin !== null) {
      checkpoints.push({ label: "Despertar", startMin: wakeMin, endMin: wakeMin })
    }
  }

  naps.forEach((nap, idx) => {
    const napStartMin = toMinutes(nap.startTime)
    const napEndMin = toMinutes(nap.endTime)
    if (napStartMin !== null && napEndMin !== null) {
      checkpoints.push({
        label: `Siesta ${idx + 1}`,
        startMin: napStartMin,
        endMin: napEndMin,
      })
    }
  })

  if (bedtime) {
    const bedMin = toMinutes(bedtime)
    if (bedMin !== null) {
      checkpoints.push({ label: "Dormir", startMin: bedMin, endMin: bedMin })
    }
  }

  // Generar ventanas entre checkpoints consecutivos
  for (let i = 0; i < checkpoints.length - 1; i++) {
    const from = checkpoints[i]
    const to = checkpoints[i + 1]

    // Calcular duracion: desde el fin del checkpoint anterior hasta el inicio del siguiente
    let durationMin = to.startMin - from.endMin
    // Si es negativo (cruza medianoche), ajustar
    if (durationMin < 0) durationMin += 24 * 60

    // Solo mostrar ventanas positivas y razonables (< 12h)
    if (durationMin > 0 && durationMin < 720) {
      windows.push({
        fromLabel: from.label,
        toLabel: to.label,
        durationMinutes: durationMin,
        durationFormatted: formatDuration(durationMin),
      })
    }
  }

  return windows
}

// ============================================================================
// Helpers internos
// ============================================================================

/**
 * Formatea una duracion en minutos a "Xh Ymin"
 */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return "0min"
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

/**
 * Traduce feedingType a texto legible
 */
export function feedingTypeLabel(feedingType: string): string {
  const labels: Record<string, string> = {
    breast: "Pecho",
    bottle: "Biberon",
    solids: "Solidos",
  }
  return labels[feedingType] || feedingType
}

/**
 * Traduce emotionalState a texto legible
 */
export function emotionalStateLabel(state: string): string {
  const labels: Record<string, string> = {
    tranquilo: "Tranquilo",
    inquieto: "Inquieto",
    irritable: "Irritable",
    neutral: "Neutral",
  }
  return labels[state] || state
}
