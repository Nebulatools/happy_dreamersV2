/**
 * @deprecated Este archivo esta DEPRECADO. Usar `lib/datetime.ts` en su lugar.
 *
 * Las funciones han sido reemplazadas por:
 * - getTimePartsInTimeZone -> getTimePartsInTimezone (lib/datetime.ts)
 * - nowInTimeZone -> getTimePartsInTimezone(new Date(), tz) (lib/datetime.ts)
 * - startOfDayUTCForTZ -> getStartOfDayAsDate (lib/datetime.ts)
 * - toLocalISOString -> dateToTimestamp (lib/datetime.ts)
 *
 * Este archivo se mantiene temporalmente para compatibilidad.
 */

// Utilidades simples para manejar zonas horarias sin dependencias externas
// Usa Intl.DateTimeFormat para obtener componentes en una zona horaria específica.

export interface TimeParts {
  date: Date
  hours: number
  minutes: number
  seconds: number
}

export function getTimePartsInTimeZone(date: Date, timeZone?: string): TimeParts {
  if (!timeZone) {
    return {
      date,
      hours: date.getHours(),
      minutes: date.getMinutes(),
      seconds: date.getSeconds(),
    }
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date).reduce<Record<string, string>>((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value
    return acc
  }, {})

  // Corregir hora "24" a "00" (algunos navegadores retornan 24 para medianoche)
  const hour = parts.hour === "24" ? "00" : parts.hour

  // CORREGIDO: Sin sufijo "Z" para que JavaScript interprete como fecha local
  // El sufijo Z causaba que getUTC* retornara valores incorrectos
  const zonedDate = new Date(
    `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}:${parts.second}`
  )

  return {
    date: zonedDate,
    hours: Number(hour),
    minutes: Number(parts.minute),
    seconds: Number(parts.second),
  }
}

export function nowInTimeZone(timeZone?: string): TimeParts {
  return getTimePartsInTimeZone(new Date(), timeZone)
}

// Devuelve la fecha de inicio de día (00:00) en la zona horaria dada, convertida a Date UTC
export function startOfDayUTCForTZ(baseDate: Date = new Date(), timeZone?: string): Date {
  if (!timeZone) {
    // Sin timezone, usar componentes locales
    const year = baseDate.getFullYear()
    const month = baseDate.getMonth()
    const day = baseDate.getDate()
    return new Date(year, month, day, 0, 0, 0, 0)
  }

  // Con timezone, obtener componentes directamente de Intl.DateTimeFormat
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(baseDate).reduce<Record<string, string>>((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value
    return acc
  }, {})

  // Crear fecha con medianoche en UTC usando los componentes de la timezone
  return new Date(Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1, // Meses son 0-indexed
    Number(parts.day),
    0, 0, 0, 0
  ))
}
