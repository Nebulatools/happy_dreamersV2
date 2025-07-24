// Utilidades para manejo de fechas en Happy Dreamers
// Funciones compartidas para cálculo de edad y formateo de fechas

import { differenceInYears, differenceInMonths } from "date-fns"

/**
 * Calcula la edad en años a partir de una fecha de nacimiento
 * @param birthDate - Fecha de nacimiento como string ISO o Date
 * @returns Edad en años
 */
export function calculateAge(birthDate: string | Date): number {
  const birth = typeof birthDate === "string" ? new Date(birthDate) : birthDate
  return differenceInYears(new Date(), birth)
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