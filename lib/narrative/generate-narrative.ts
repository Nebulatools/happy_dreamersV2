/**
 * Generador de narrativas para eventos de Happy Dreamers
 *
 * Transforma eventos crudos en oraciones legibles en espanol.
 * Regla principal: Si un dato falta, omitirlo (NO usar placeholders).
 *
 * @example
 * generateNarrative("Matias", feedingEvent)
 * // "Matias tomo 5 oz de biberon"
 *
 * generateNarrative("Sofia", napEvent)
 * // "Sofia durmio una siesta de 45 minutos"
 */

import { formatForDisplay, DEFAULT_TIMEZONE, parseTimestamp } from "@/lib/datetime"
import type { EventType, FeedingType } from "@/components/events/types"

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Interface para eventos que seran transformados a narrativa.
 * Subconjunto de EventData con campos necesarios para narrativa.
 */
export interface NarrativeEvent {
  eventType: EventType
  startTime: string  // ISO 8601
  endTime?: string   // ISO 8601
  duration?: number  // minutos (calculado)

  // Alimentacion
  feedingType?: FeedingType
  feedingAmount?: number  // ml (liquidos) o gr (solidos)
  feedingDuration?: number  // minutos
  isNightFeeding?: boolean

  // Sueno
  sleepDelay?: number  // minutos para dormirse

  // Despertar nocturno
  awakeDelay?: number  // minutos despierto

  // Medicamento
  medicationName?: string
  medicationDose?: string

  // Actividades
  activityDescription?: string
  activityDuration?: number

  // Notas
  noteText?: string
  notes?: string
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Formatea hora para mostrar en narrativa (ej: "8:30 AM")
 */
function formatTimeForNarrative(isoString: string, timezone: string = DEFAULT_TIMEZONE): string {
  return formatForDisplay(isoString, timezone, "h:mm a")
}

/**
 * Calcula duracion en minutos entre dos timestamps
 */
function calculateDurationMinutes(startTime: string, endTime: string): number {
  const start = parseTimestamp(startTime)
  const end = parseTimestamp(endTime)
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60))
}

/**
 * Formatea duracion en texto legible
 */
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minutos`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) {
    return hours === 1 ? "1 hora" : `${hours} horas`
  }
  return hours === 1
    ? `1 hora y ${mins} minutos`
    : `${hours} horas y ${mins} minutos`
}

// ============================================================================
// GENERADORES POR TIPO DE EVENTO
// ============================================================================

/**
 * Genera narrativa para alimentacion
 */
function generateFeedingNarrative(childName: string, event: NarrativeEvent): string {
  const { feedingType, feedingAmount, feedingDuration } = event

  if (feedingType === "breast") {
    // "[nombre] tomo pecho por [X] minutos"
    if (feedingDuration) {
      return `${childName} tomo pecho por ${feedingDuration} minutos`
    }
    return `${childName} tomo pecho`
  }

  if (feedingType === "bottle") {
    // "[nombre] tomo [X] ml de biberon"
    if (feedingAmount) {
      return `${childName} tomo ${feedingAmount} ml de biberon`
    }
    if (feedingDuration) {
      return `${childName} tomo biberon por ${feedingDuration} minutos`
    }
    return `${childName} tomo biberon`
  }

  if (feedingType === "solids") {
    // "[nombre] comio [descripcion]" o "[nombre] comio solidos"
    if (feedingAmount) {
      return `${childName} comio ${feedingAmount} gr de solidos`
    }
    return `${childName} comio solidos`
  }

  // Fallback generico
  return `${childName} se alimento`
}

/**
 * Genera narrativa para sueno nocturno
 */
function generateSleepNarrative(
  childName: string,
  event: NarrativeEvent,
  timezone: string = DEFAULT_TIMEZONE
): string {
  const { startTime, endTime, duration } = event

  // "[nombre] durmio de [hora] a [hora]"
  if (startTime && endTime) {
    const startFormatted = formatTimeForNarrative(startTime, timezone)
    const endFormatted = formatTimeForNarrative(endTime, timezone)
    return `${childName} durmio de ${startFormatted} a ${endFormatted}`
  }

  // Si solo hay duracion
  if (duration) {
    return `${childName} durmio ${formatDuration(duration)}`
  }

  // Sueno en progreso (solo startTime)
  if (startTime && !endTime) {
    const startFormatted = formatTimeForNarrative(startTime, timezone)
    return `${childName} se durmio a las ${startFormatted}`
  }

  return `${childName} durmio`
}

/**
 * Genera narrativa para siesta
 */
function generateNapNarrative(
  childName: string,
  event: NarrativeEvent,
  timezone: string = DEFAULT_TIMEZONE
): string {
  const { startTime, endTime, duration } = event

  // Calcular duracion si hay inicio y fin
  let napDuration = duration
  if (!napDuration && startTime && endTime) {
    napDuration = calculateDurationMinutes(startTime, endTime)
  }

  // "[nombre] durmio una siesta de [X] min"
  if (napDuration) {
    return `${childName} durmio una siesta de ${formatDuration(napDuration)}`
  }

  // Siesta en progreso
  if (startTime && !endTime) {
    const startFormatted = formatTimeForNarrative(startTime, timezone)
    return `${childName} inicio siesta a las ${startFormatted}`
  }

  return `${childName} tomo una siesta`
}

/**
 * Genera narrativa para despertar matutino
 */
function generateWakeNarrative(
  childName: string,
  event: NarrativeEvent,
  timezone: string = DEFAULT_TIMEZONE
): string {
  const { startTime } = event

  // "[nombre] desperto a las [hora]"
  if (startTime) {
    const timeFormatted = formatTimeForNarrative(startTime, timezone)
    return `${childName} desperto a las ${timeFormatted}`
  }

  return `${childName} desperto`
}

/**
 * Genera narrativa para despertar nocturno
 */
function generateNightWakingNarrative(
  childName: string,
  event: NarrativeEvent,
  timezone: string = DEFAULT_TIMEZONE
): string {
  const { startTime, awakeDelay } = event

  // "[nombre] desperto a las [hora]" + duracion si existe
  let narrative = ""

  if (startTime) {
    const timeFormatted = formatTimeForNarrative(startTime, timezone)
    narrative = `${childName} desperto a las ${timeFormatted}`

    if (awakeDelay) {
      narrative += ` y estuvo despierto ${awakeDelay} minutos`
    }

    return narrative
  }

  if (awakeDelay) {
    return `${childName} desperto durante la noche por ${awakeDelay} minutos`
  }

  return `${childName} desperto durante la noche`
}

/**
 * Genera narrativa para medicamento
 */
function generateMedicationNarrative(childName: string, event: NarrativeEvent): string {
  const { medicationName, medicationDose } = event

  // "[nombre] tomo [medicamento]"
  if (medicationName) {
    if (medicationDose) {
      return `${childName} tomo ${medicationName} (${medicationDose})`
    }
    return `${childName} tomo ${medicationName}`
  }

  return `${childName} tomo medicamento`
}

/**
 * Genera narrativa para actividades extra
 */
function generateActivityNarrative(childName: string, event: NarrativeEvent): string {
  const { activityDescription, activityDuration } = event

  if (activityDescription && activityDuration) {
    return `${childName} hizo ${activityDescription} por ${activityDuration} minutos`
  }

  if (activityDescription) {
    return `${childName} hizo ${activityDescription}`
  }

  if (activityDuration) {
    return `${childName} realizo una actividad de ${activityDuration} minutos`
  }

  return `${childName} realizo una actividad`
}

/**
 * Genera narrativa para notas
 */
function generateNoteNarrative(childName: string, event: NarrativeEvent): string {
  const { noteText, notes } = event
  const text = noteText || notes

  if (text) {
    // Truncar si es muy largo
    const truncated = text.length > 100 ? text.substring(0, 97) + "..." : text
    return `Nota: ${truncated}`
  }

  return `Nota sobre ${childName}`
}

// ============================================================================
// FUNCION PRINCIPAL
// ============================================================================

/**
 * Genera una oracion narrativa en espanol para un evento.
 *
 * @param childName - Nombre del nino (ej: "Matias")
 * @param event - Datos del evento
 * @param timezone - Timezone del usuario (default: America/Monterrey)
 * @returns Oracion en espanol (ej: "Matias tomo pecho por 15 minutos")
 *
 * Regla: Si un dato falta, la narrativa lo omite (NO usa placeholders).
 */
export function generateNarrative(
  childName: string,
  event: NarrativeEvent,
  timezone: string = DEFAULT_TIMEZONE
): string {
  const { eventType } = event

  // Elegir generador segun tipo de evento
  if (eventType === "feeding" || eventType === "night_feeding") {
    return generateFeedingNarrative(childName, event)
  }

  if (eventType === "sleep") {
    return generateSleepNarrative(childName, event, timezone)
  }

  if (eventType === "nap") {
    return generateNapNarrative(childName, event, timezone)
  }

  if (eventType === "wake") {
    return generateWakeNarrative(childName, event, timezone)
  }

  if (eventType === "night_waking") {
    return generateNightWakingNarrative(childName, event, timezone)
  }

  if (eventType === "medication") {
    return generateMedicationNarrative(childName, event)
  }

  if (eventType === "extra_activities") {
    return generateActivityNarrative(childName, event)
  }

  if (eventType === "note") {
    return generateNoteNarrative(childName, event)
  }

  // Fallback para tipos desconocidos
  return `Evento registrado para ${childName}`
}

/**
 * Genera metadatos de tiempo para mostrar debajo de la narrativa.
 *
 * @param event - Datos del evento
 * @param timezone - Timezone del usuario
 * @returns String con hora o rango de horas (ej: "8:30 AM" o "8:30 PM - 7:15 AM")
 */
export function generateTimeMetadata(
  event: NarrativeEvent,
  timezone: string = DEFAULT_TIMEZONE
): string {
  const { startTime, endTime, eventType } = event

  if (!startTime) {
    return ""
  }

  // Eventos con duracion muestran rango
  const eventsWithRange = ["sleep", "nap", "feeding", "extra_activities"]
  if (eventsWithRange.includes(eventType) && endTime) {
    const startFormatted = formatTimeForNarrative(startTime, timezone)
    const endFormatted = formatTimeForNarrative(endTime, timezone)
    return `${startFormatted} - ${endFormatted}`
  }

  // Resto muestra solo hora de inicio
  return formatTimeForNarrative(startTime, timezone)
}
