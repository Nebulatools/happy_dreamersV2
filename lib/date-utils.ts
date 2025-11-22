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
 * Convierte una fecha local a ISO string manteniendo la zona horaria local
 * Evita el problema de que toISOString() convierte a UTC y puede cambiar el día
 * CRÍTICO: Siempre usa el offset de timezone ACTUAL del sistema, no del Date objeto
 * Esto asegura consistencia cuando se usa con DevTimeContext
 * @param date - Fecha a convertir
 * @returns String ISO en zona horaria local
 */
export function toLocalISOString(date: Date, timeZone?: string): string {
  // Obtener los componentes en la zona horaria indicada (o local por defecto)
  const parts = getTimePartsInTimeZone(date, timeZone)

  const year = parts.date.getUTCFullYear()
  const month = String(parts.date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(parts.date.getUTCDate()).padStart(2, '0')
  const hours = String(parts.hours).padStart(2, '0')
  const minutes = String(parts.minutes).padStart(2, '0')
  const seconds = String(parts.seconds).padStart(2, '0')
  const milliseconds = String(parts.date.getUTCMilliseconds()).padStart(3, '0')

  // Calcular offset real de la zona horaria respecto a UTC usando la fecha zonificada
  const offsetMinutesTotal = -parts.date.getTimezoneOffset()
  const offsetSign = offsetMinutesTotal >= 0 ? '+' : '-'
  const offsetHours = Math.floor(Math.abs(offsetMinutesTotal) / 60)
  const offsetMinutes = Math.abs(offsetMinutesTotal) % 60
  const offsetString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`

  const isoString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}${offsetString}`
  return isoString
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
