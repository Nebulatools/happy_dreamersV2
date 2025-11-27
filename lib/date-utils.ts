// Utilidades para manejo de fechas en Happy Dreamers
// Funciones compartidas para cálculo de edad y formateo de fechas

import { differenceInYears, differenceInMonths } from "date-fns"
import { getTimePartsInTimeZone } from "./timezone"

/**
 * Calcula la edad en años a partir de una fecha de nacimiento
 * @param birthDate - Fecha de nacimiento como string ISO o Date
 * @returns Edad en años
 */
export function calculateAge(birthDate: string | Date): number | string {
  const birth = typeof birthDate === "string" ? new Date(birthDate) : birthDate
  const years = differenceInYears(new Date(), birth)
  
  // Si se llama con un string, devolver el formato "X años"
  if (typeof birthDate === "string") {
    return `${years} año${years !== 1 ? 's' : ''}`
  }
  
  return years
}

/**
 * Calcula la edad en meses a partir de una fecha de nacimiento
 * @param birthDate - Fecha de nacimiento como string ISO o Date
 * @returns Edad en meses
 */
export function calculateAgeInMonths(birthDate: string | Date): number {
  const birth = typeof birthDate === "string" ? new Date(birthDate) : birthDate
  return differenceInMonths(new Date(), birth)
}

/**
 * Calcula la edad en formato legible (años y meses)
 * @param birthDate - Fecha de nacimiento como string ISO o Date
 * @returns String con formato "X años, Y meses" o "X meses" si es menor a un año
 */
export function calculateAgeFormatted(birthDate: string | Date): string {
  const totalMonths = calculateAgeInMonths(birthDate)
  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12
  
  if (years === 0) {
    return `${months} ${months === 1 ? "mes" : "meses"}`
  }
  
  if (months === 0) {
    return `${years} ${years === 1 ? "año" : "años"}`
  }
  
  return `${years} ${years === 1 ? "año" : "años"}, ${months} ${months === 1 ? "mes" : "meses"}`
}

/**
 * Convierte una fecha local a ISO string manteniendo la zona horaria especificada
 * CORREGIDO: Calcula el offset usando la diferencia real entre UTC y la timezone,
 * no usando getTimezoneOffset() que siempre retorna el offset del navegador local.
 * @param date - Fecha a convertir
 * @param timeZone - Zona horaria (ej: "America/Monterrey")
 * @returns String ISO con offset de timezone correcto
 */
export function toLocalISOString(date: Date, timeZone?: string): string {
  if (!timeZone) {
    // Sin timezone especificada, usar formato local simple
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    const milliseconds = String(date.getMilliseconds()).padStart(3, '0')

    // Usar offset del navegador local solo cuando no hay timezone especificada
    const offsetMinutesTotal = -date.getTimezoneOffset()
    const offsetSign = offsetMinutesTotal >= 0 ? '+' : '-'
    const offsetHours = Math.floor(Math.abs(offsetMinutesTotal) / 60)
    const offsetMins = Math.abs(offsetMinutesTotal) % 60
    const offsetString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}${offsetString}`
  }

  // Con timezone especificada, usar Intl.DateTimeFormat para obtener componentes correctos
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  })

  const parts = formatter.formatToParts(date).reduce<Record<string, string>>((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value
    return acc
  }, {})

  // Corregir hora "24" a "00" (algunos navegadores retornan 24 para medianoche)
  const hour = parts.hour === "24" ? "00" : parts.hour

  // Calcular offset usando la diferencia real entre UTC y la timezone
  // Método: comparar la hora en UTC con la hora en la timezone
  const utcStr = date.toISOString() // "2025-11-27T21:24:19.283Z"
  const [utcDatePart] = utcStr.split('T')
  const [utcYear, utcMonth, utcDay] = utcDatePart.split('-')
  const [utcHour, utcMinute, utcSecond] = date.toISOString().split('T')[1].split(':')

  // Diferencia en horas y minutos entre UTC y la timezone
  const tzHours = parseInt(hour, 10)
  const tzMinutes = parseInt(parts.minute, 10)
  const utcHours = parseInt(utcHour.substring(0, 2), 10)
  const utcMinutes = parseInt(utcMinute, 10)

  // Convertir a minutos desde medianoche
  const tzTotalMinutes = tzHours * 60 + tzMinutes
  const utcTotalMinutes = utcHours * 60 + utcMinutes

  // Diferencia (puede ser negativa)
  let offsetMinutes = tzTotalMinutes - utcTotalMinutes

  // Ajustar por cambio de día
  if (offsetMinutes > 12 * 60) {
    offsetMinutes -= 24 * 60
  } else if (offsetMinutes < -12 * 60) {
    offsetMinutes += 24 * 60
  }

  const offsetSign = offsetMinutes >= 0 ? '+' : '-'
  const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60)
  const offsetMins = Math.abs(offsetMinutes) % 60
  const offsetString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`

  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}:${parts.second}.000${offsetString}`
}

/**
 * Valida si una fecha de nacimiento es válida para un niño
 * @param birthDate - Fecha de nacimiento a validar
 * @returns true si la fecha es válida (no futura y no mayor a 18 años)
 */
export function isValidChildBirthDate(birthDate: string | Date): boolean {
  const birth = typeof birthDate === "string" ? new Date(birthDate) : birthDate
  const age = calculateAge(birth)
  const now = new Date()
  
  // La fecha no puede ser futura
  if (birth > now) {
    return false
  }
  
  // La edad no puede ser mayor a 18 años
  if (age > 18) {
    return false
  }
  
  return true
}
