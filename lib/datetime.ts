/**
 * Modulo centralizado para manejo de fechas y timezones en Happy Dreamers
 *
 * ESTANDAR DE FECHAS:
 * - Almacenamiento: ISO 8601 con offset (ej: "2025-11-27T14:30:00.000-06:00")
 * - Timezone por defecto: "America/Monterrey"
 * - Horario nocturno: 19:00 (7pm) a 06:00 (6am)
 *
 * USO:
 * - getCurrentTimestamp(timezone): Para registrar eventos
 * - parseTimestamp(isoString): Para leer eventos de BD
 * - formatForDisplay(isoString, timezone, format): Para mostrar al usuario
 * - isNightTime(date, timezone): Para determinar tipo de sueno
 */

import { format as dateFnsFormat, parseISO } from "date-fns"
import { es } from "date-fns/locale"

// ============================================================================
// CONSTANTES
// ============================================================================

/** Timezone por defecto para Mexico */
export const DEFAULT_TIMEZONE = "America/Monterrey"

/** Hora de inicio del horario nocturno (7pm = 19:00) */
export const NIGHT_START_HOUR = 19

/** Hora de fin del horario nocturno (6am = 06:00) */
export const NIGHT_END_HOUR = 6

/** Lista de timezones soportadas para Mexico */
export const SUPPORTED_TIMEZONES = [
  "America/Monterrey",
  "America/Mexico_City",
  "America/Tijuana",
  "America/Cancun",
  "America/Chihuahua",
  "America/Mazatlan",
  "America/Hermosillo",
] as const

export type SupportedTimezone = typeof SUPPORTED_TIMEZONES[number]

// ============================================================================
// INTERFACES
// ============================================================================

export interface TimeParts {
  year: number
  month: number
  day: number
  hours: number
  minutes: number
  seconds: number
  milliseconds: number
}

// ============================================================================
// FUNCIONES DE DETECCION
// ============================================================================

/**
 * Detecta la timezone del navegador del usuario
 * @returns Timezone IANA del navegador o default si no es soportada
 */
export function detectBrowserTimezone(): string {
  try {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
    // Si es una timezone de Mexico soportada, usarla
    if (SUPPORTED_TIMEZONES.includes(detected as SupportedTimezone)) {
      return detected
    }
    // Si no, usar default
    return DEFAULT_TIMEZONE
  } catch {
    return DEFAULT_TIMEZONE
  }
}

/**
 * Valida si una timezone es soportada
 * @param timezone - Timezone a validar
 * @returns true si es valida
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    // Intentar crear un formatter con esa timezone
    Intl.DateTimeFormat("en-US", { timeZone: timezone })
    return true
  } catch {
    return false
  }
}

// ============================================================================
// FUNCIONES DE CONSTRUCCION DE FECHAS LOCALES (INPUTS DE FORMULARIO)
// ============================================================================

/**
 * Construye una fecha en zona horaria local desde inputs de formulario.
 * USAR SIEMPRE que se combine dateString (YYYY-MM-DD) + timeString (HH:mm)
 *
 * IMPORTANTE: NO usar new Date("YYYY-MM-DD") ni new Date(`${date}T${time}`)
 * porque JavaScript interpreta esos formatos como UTC, causando desfase de dias.
 *
 * @param dateString - Fecha en formato YYYY-MM-DD (de input type="date")
 * @param timeString - Hora en formato HH:mm (de input type="time")
 * @returns Date object en timezone local del navegador
 *
 * @example
 * // Correcto - usa constructor de componentes (local)
 * const date = buildLocalDate("2026-01-07", "19:30")
 *
 * // INCORRECTO - interpreta como UTC!
 * const buggy = new Date("2026-01-07T19:30")
 * // En Mexico (UTC-6), esto crea 2026-01-06T13:30 local
 */
export function buildLocalDate(dateString: string, timeString: string): Date {
  const [year, month, day] = dateString.split("-")
  const [hours, minutes] = timeString.split(":")
  return new Date(
    parseInt(year),
    parseInt(month) - 1, // Meses en JS son 0-indexed
    parseInt(day),
    parseInt(hours),
    parseInt(minutes),
    0,
    0
  )
}

// ============================================================================
// FUNCIONES DE OBTENCION DE TIEMPO
// ============================================================================

/**
 * Obtiene los componentes de una fecha en una timezone especifica
 * @param date - Fecha a procesar
 * @param timezone - Timezone IANA (ej: "America/Monterrey")
 * @returns Componentes de fecha en esa timezone
 */
export function getTimePartsInTimezone(date: Date, timezone: string = DEFAULT_TIMEZONE): TimeParts {
  // Usar type assertion para fractionalSecondDigits (es valido en navegadores modernos pero no esta en tipos TS)
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
    hour12: false,
  } as Intl.DateTimeFormatOptions)

  const parts = formatter.formatToParts(date).reduce<Record<string, string>>((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value
    return acc
  }, {})

  // Corregir hora "24" a "0" (algunos navegadores retornan 24 para medianoche)
  const hour = parts.hour === "24" ? 0 : parseInt(parts.hour, 10)

  return {
    year: parseInt(parts.year, 10),
    month: parseInt(parts.month, 10),
    day: parseInt(parts.day, 10),
    hours: hour,
    minutes: parseInt(parts.minute, 10),
    seconds: parseInt(parts.second, 10),
    milliseconds: parseInt(parts.fractionalSecond || "0", 10),
  }
}

/**
 * Calcula el offset de una timezone en minutos respecto a UTC
 * @param date - Fecha de referencia (el offset puede variar por DST)
 * @param timezone - Timezone IANA
 * @returns Offset en minutos (ej: -360 para UTC-6)
 */
export function getTimezoneOffset(date: Date, timezone: string = DEFAULT_TIMEZONE): number {
  const tzParts = getTimePartsInTimezone(date, timezone)
  const utcParts = getTimePartsInTimezone(date, "UTC")

  // Calcular minutos desde medianoche para ambos
  const tzMinutes = tzParts.hours * 60 + tzParts.minutes
  const utcMinutes = utcParts.hours * 60 + utcParts.minutes

  // Diferencia (positiva = adelante de UTC, negativa = atras)
  let offsetMinutes = tzMinutes - utcMinutes

  // Ajustar por cambio de dia
  if (offsetMinutes > 12 * 60) {
    offsetMinutes -= 24 * 60
  } else if (offsetMinutes < -12 * 60) {
    offsetMinutes += 24 * 60
  }

  return offsetMinutes
}

/**
 * Formatea un offset en minutos a string ISO (ej: "-06:00")
 * @param offsetMinutes - Offset en minutos
 * @returns String de offset ISO
 */
export function formatOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? "+" : "-"
  const absMinutes = Math.abs(offsetMinutes)
  const hours = Math.floor(absMinutes / 60)
  const mins = absMinutes % 60
  return `${sign}${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`
}

// ============================================================================
// FUNCIONES DE TIMESTAMP (REGISTRO DE EVENTOS)
// ============================================================================

/**
 * Obtiene el timestamp actual en formato ISO con offset de timezone
 * USA ESTA FUNCION PARA REGISTRAR EVENTOS
 *
 * @param timezone - Timezone del usuario
 * @returns ISO string con offset (ej: "2025-11-27T14:30:00.000-06:00")
 *
 * @example
 * const timestamp = getCurrentTimestamp("America/Monterrey")
 * // "2025-11-27T14:30:00.000-06:00"
 */
export function getCurrentTimestamp(timezone: string = DEFAULT_TIMEZONE): string {
  return dateToTimestamp(new Date(), timezone)
}

/**
 * Convierte un Date object a ISO string con offset de timezone
 *
 * @param date - Fecha a convertir
 * @param timezone - Timezone del usuario
 * @returns ISO string con offset
 */
export function dateToTimestamp(date: Date, timezone: string = DEFAULT_TIMEZONE): string {
  const parts = getTimePartsInTimezone(date, timezone)
  const offset = getTimezoneOffset(date, timezone)
  const offsetStr = formatOffset(offset)

  const year = parts.year
  const month = String(parts.month).padStart(2, "0")
  const day = String(parts.day).padStart(2, "0")
  const hours = String(parts.hours).padStart(2, "0")
  const minutes = String(parts.minutes).padStart(2, "0")
  const seconds = String(parts.seconds).padStart(2, "0")
  const ms = String(parts.milliseconds).padStart(3, "0")

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}${offsetStr}`
}

/**
 * Parsea un timestamp ISO a Date object
 * Entiende tanto formato con offset como UTC (Z)
 *
 * @param isoString - String ISO a parsear
 * @returns Date object
 *
 * @example
 * const date = parseTimestamp("2025-11-27T14:30:00.000-06:00")
 * const date2 = parseTimestamp("2025-11-27T20:30:00.000Z")
 */
export function parseTimestamp(isoString: string): Date {
  // parseISO de date-fns maneja correctamente offsets y Z
  return parseISO(isoString)
}

// ============================================================================
// FUNCIONES DE INICIO/FIN DE DIA
// ============================================================================

/**
 * Obtiene el inicio del dia (00:00:00) en una timezone especifica
 *
 * @param date - Fecha de referencia
 * @param timezone - Timezone del usuario
 * @returns ISO string del inicio del dia con offset
 */
export function getStartOfDay(date: Date | string, timezone: string = DEFAULT_TIMEZONE): string {
  const d = typeof date === "string" ? parseTimestamp(date) : date
  const parts = getTimePartsInTimezone(d, timezone)
  const offset = getTimezoneOffset(d, timezone)
  const offsetStr = formatOffset(offset)

  const year = parts.year
  const month = String(parts.month).padStart(2, "0")
  const day = String(parts.day).padStart(2, "0")

  return `${year}-${month}-${day}T00:00:00.000${offsetStr}`
}

/**
 * Obtiene el fin del dia (23:59:59.999) en una timezone especifica
 *
 * @param date - Fecha de referencia
 * @param timezone - Timezone del usuario
 * @returns ISO string del fin del dia con offset
 */
export function getEndOfDay(date: Date | string, timezone: string = DEFAULT_TIMEZONE): string {
  const d = typeof date === "string" ? parseTimestamp(date) : date
  const parts = getTimePartsInTimezone(d, timezone)
  const offset = getTimezoneOffset(d, timezone)
  const offsetStr = formatOffset(offset)

  const year = parts.year
  const month = String(parts.month).padStart(2, "0")
  const day = String(parts.day).padStart(2, "0")

  return `${year}-${month}-${day}T23:59:59.999${offsetStr}`
}

/**
 * Obtiene el inicio del dia como Date object (para queries de MongoDB)
 *
 * @param date - Fecha de referencia
 * @param timezone - Timezone del usuario
 * @returns Date object representando inicio del dia en UTC
 */
export function getStartOfDayAsDate(date: Date | string, timezone: string = DEFAULT_TIMEZONE): Date {
  return parseTimestamp(getStartOfDay(date, timezone))
}

/**
 * Obtiene el fin del dia como Date object (para queries de MongoDB)
 *
 * @param date - Fecha de referencia
 * @param timezone - Timezone del usuario
 * @returns Date object representando fin del dia en UTC
 */
export function getEndOfDayAsDate(date: Date | string, timezone: string = DEFAULT_TIMEZONE): Date {
  return parseTimestamp(getEndOfDay(date, timezone))
}

// ============================================================================
// FUNCIONES DE FORMATO PARA DISPLAY
// ============================================================================

/**
 * Formatea un timestamp para mostrar al usuario
 *
 * @param isoString - Timestamp ISO de la BD
 * @param timezone - Timezone del usuario
 * @param formatStr - Formato date-fns (ej: "HH:mm", "dd/MM/yyyy")
 * @returns String formateado en la timezone del usuario
 *
 * @example
 * formatForDisplay("2025-11-27T14:30:00-06:00", "America/Monterrey", "HH:mm")
 * // "14:30"
 *
 * formatForDisplay("2025-11-27T14:30:00-06:00", "America/Monterrey", "dd MMM yyyy")
 * // "27 nov 2025"
 */
export function formatForDisplay(
  isoString: string,
  timezone: string = DEFAULT_TIMEZONE,
  formatStr: string = "HH:mm"
): string {
  const date = parseTimestamp(isoString)
  const parts = getTimePartsInTimezone(date, timezone)

  // Crear una fecha "local" con los componentes de la timezone
  // para que date-fns la formatee correctamente
  const localDate = new Date(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hours,
    parts.minutes,
    parts.seconds,
    parts.milliseconds
  )

  return dateFnsFormat(localDate, formatStr, { locale: es })
}

/**
 * Formatea hora simple (HH:mm)
 */
export function formatTime(isoString: string, timezone: string = DEFAULT_TIMEZONE): string {
  return formatForDisplay(isoString, timezone, "HH:mm")
}

/**
 * Formatea fecha simple (dd/MM/yyyy)
 */
export function formatDate(isoString: string, timezone: string = DEFAULT_TIMEZONE): string {
  return formatForDisplay(isoString, timezone, "dd/MM/yyyy")
}

/**
 * Formatea fecha y hora (dd/MM/yyyy HH:mm)
 */
export function formatDateTime(isoString: string, timezone: string = DEFAULT_TIMEZONE): string {
  return formatForDisplay(isoString, timezone, "dd/MM/yyyy HH:mm")
}

/**
 * Formatea fecha legible (ej: "27 de noviembre de 2025")
 */
export function formatDateLong(isoString: string, timezone: string = DEFAULT_TIMEZONE): string {
  return formatForDisplay(isoString, timezone, "d 'de' MMMM 'de' yyyy")
}

// ============================================================================
// FUNCIONES DE DETERMINACION DE HORARIO
// ============================================================================

/**
 * Determina si una hora esta en horario nocturno
 * Horario nocturno: 19:00 (7pm) a 06:00 (6am)
 *
 * @param date - Fecha a evaluar
 * @param timezone - Timezone del usuario
 * @returns true si es horario nocturno
 *
 * @example
 * isNightTime(new Date(), "America/Monterrey") // true si son las 8pm
 */
export function isNightTime(date: Date, timezone: string = DEFAULT_TIMEZONE): boolean {
  const parts = getTimePartsInTimezone(date, timezone)
  // Es noche si: hora >= 19 (7pm) O hora < 6 (6am)
  return parts.hours >= NIGHT_START_HOUR || parts.hours < NIGHT_END_HOUR
}

/**
 * Determina si un timestamp ISO esta en horario nocturno
 *
 * @param isoString - Timestamp ISO
 * @param timezone - Timezone del usuario
 * @returns true si es horario nocturno
 */
export function isNightTimeFromTimestamp(isoString: string, timezone: string = DEFAULT_TIMEZONE): boolean {
  return isNightTime(parseTimestamp(isoString), timezone)
}

/**
 * Obtiene el tipo de sueno basado en la hora
 *
 * @param date - Fecha del evento
 * @param timezone - Timezone del usuario
 * @returns "sleep" para sueno nocturno, "nap" para siesta
 */
export function getSleepType(date: Date, timezone: string = DEFAULT_TIMEZONE): "sleep" | "nap" {
  return isNightTime(date, timezone) ? "sleep" : "nap"
}

// ============================================================================
// FUNCIONES DE COMPARACION
// ============================================================================

/**
 * Compara si dos timestamps son del mismo dia en una timezone
 *
 * @param timestamp1 - Primer timestamp ISO
 * @param timestamp2 - Segundo timestamp ISO
 * @param timezone - Timezone para comparar
 * @returns true si son del mismo dia
 */
export function isSameDay(
  timestamp1: string,
  timestamp2: string,
  timezone: string = DEFAULT_TIMEZONE
): boolean {
  const parts1 = getTimePartsInTimezone(parseTimestamp(timestamp1), timezone)
  const parts2 = getTimePartsInTimezone(parseTimestamp(timestamp2), timezone)

  return parts1.year === parts2.year &&
         parts1.month === parts2.month &&
         parts1.day === parts2.day
}

/**
 * Obtiene la fecha (YYYY-MM-DD) de un timestamp en una timezone
 * Util para agrupar eventos por dia
 *
 * @param isoString - Timestamp ISO
 * @param timezone - Timezone del usuario
 * @returns String YYYY-MM-DD
 */
export function getDateKey(isoString: string, timezone: string = DEFAULT_TIMEZONE): string {
  const parts = getTimePartsInTimezone(parseTimestamp(isoString), timezone)
  const month = String(parts.month).padStart(2, "0")
  const day = String(parts.day).padStart(2, "0")
  return `${parts.year}-${month}-${day}`
}

// ============================================================================
// FUNCIONES DE CONVERSION LEGACY (para compatibilidad)
// ============================================================================

/**
 * @deprecated Usar getCurrentTimestamp() en su lugar
 * Mantener temporalmente para compatibilidad con codigo existente
 */
export function toLocalISOString(date: Date, timezone?: string): string {
  console.warn("toLocalISOString esta deprecado, usar getCurrentTimestamp o dateToTimestamp")
  return dateToTimestamp(date, timezone || DEFAULT_TIMEZONE)
}
