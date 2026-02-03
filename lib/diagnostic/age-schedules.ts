// Constantes de horarios por edad para validacion G1 (Horario)
// Basado en la Tabla Resumen de Validacion G1 del SPEC-SPRINT.md
// Fuente: Reglas clinicas de Happy Dreamers

import { AgeScheduleRule } from "./types"

/**
 * Reglas de horario indexadas por rango de edad.
 * Cada regla define:
 * - Cantidad de siestas esperadas
 * - Duracion maxima de cada siesta
 * - Ventanas de vigilia entre sueno/siesta
 * - Hora minima para primera siesta
 * - Horas minimas antes de bedtime sin siesta
 * - Duracion de noche esperada
 * - Requisitos de leche y solidos
 */
export const AGE_SCHEDULE_RULES: AgeScheduleRule[] = [
  // 0-3 meses: Variable, no hay promedios estables
  {
    ageRange: "0-3m",
    ageMinMonths: 0,
    ageMaxMonths: 3,
    napCount: -1, // -1 indica variable/sin limite
    napMaxDuration: -1, // Sin limite
    windows: [0.75, 1.5], // 45-90 min
    noNapBefore: "00:00", // Sin restriccion
    noNapHoursBeforeBedtime: 0, // Sin restriccion
    nightDurationHours: 11, // Rango normal 14-17 hrs total
    milkMinCount: -1, // Variable
    milkIntervalHours: -1, // Variable
    solidMinCount: 0,
  },
  // 4-6 meses: Sueno irregular, 12-15 hrs total
  {
    ageRange: "4-6m",
    ageMinMonths: 4,
    ageMaxMonths: 6,
    napCount: -1, // Variable
    napMaxDuration: -1, // Sin limite
    windows: [1, 2], // 1-2 hrs
    noNapBefore: "00:00", // Sin restriccion
    noNapHoursBeforeBedtime: 0, // Sin restriccion
    nightDurationHours: 11,
    milkMinCount: -1, // "cada 3 hrs"
    milkIntervalHours: 3,
    solidMinCount: 0,
  },
  // 6 meses: 3 siestas, 5 leches, 2 solidos
  {
    ageRange: "6m",
    ageMinMonths: 6,
    ageMaxMonths: 6,
    napCount: 3,
    napMaxDuration: 90, // 1.5 hrs max
    windows: [1.5, 2, 2.5, 3], // Ventanas progresivas
    noNapBefore: "08:00",
    noNapHoursBeforeBedtime: 2.5,
    nightDurationHours: 11,
    milkMinCount: 5,
    milkIntervalHours: 3,
    solidMinCount: 2,
  },
  // 7 meses: 3 siestas, 4 leches, 3 solidos
  {
    ageRange: "7m",
    ageMinMonths: 7,
    ageMaxMonths: 7,
    napCount: 3,
    napMaxDuration: 90,
    windows: [2, 2, 2.5, 3], // 1.5-2, 2, 2.5, 2.5-3 hrs
    noNapBefore: "08:00",
    noNapHoursBeforeBedtime: 2.5,
    nightDurationHours: 11,
    milkMinCount: 4,
    milkIntervalHours: 4,
    solidMinCount: 3,
  },
  // 8-9 meses: Transicion a 2 siestas
  {
    ageRange: "8-9m",
    ageMinMonths: 8,
    ageMaxMonths: 9,
    napCount: 2,
    napMaxDuration: 90,
    windows: [3, 3, 3], // 3 hrs entre siestas
    noNapBefore: "09:00",
    noNapHoursBeforeBedtime: 3.5,
    nightDurationHours: 11,
    milkMinCount: 3,
    milkIntervalHours: 4,
    solidMinCount: 4, // 3-4 solidos
  },
  // 9-11 meses: 2 siestas estables
  {
    ageRange: "9-11m",
    ageMinMonths: 9,
    ageMaxMonths: 11,
    napCount: 2,
    napMaxDuration: 90,
    windows: [3, 3, 3],
    noNapBefore: "09:00",
    noNapHoursBeforeBedtime: 3.5,
    nightDurationHours: 11,
    milkMinCount: 3,
    milkIntervalHours: 5,
    solidMinCount: 4,
  },
  // 11-12 meses: Se recorta siesta 1
  {
    ageRange: "11-12m",
    ageMinMonths: 11,
    ageMaxMonths: 12,
    napCount: 2,
    napMaxDuration: 60, // S1 max 1 hr, S2 max 1.5 hrs (promediamos)
    windows: [3, 3.5, 3],
    noNapBefore: "09:00",
    noNapHoursBeforeBedtime: 3.5,
    nightDurationHours: 11,
    milkMinCount: 2,
    milkIntervalHours: -1, // Sin intervalo especifico
    solidMinCount: 5,
  },
  // 12 meses: Primero desayuno, luego leche
  {
    ageRange: "12m",
    ageMinMonths: 12,
    ageMaxMonths: 14,
    napCount: 2,
    napMaxDuration: 60,
    windows: [3, 3.5, 3],
    noNapBefore: "09:00",
    noNapHoursBeforeBedtime: 3.5,
    nightDurationHours: 11,
    milkMinCount: 2, // Opcionales
    milkIntervalHours: -1,
    solidMinCount: 5,
  },
  // 15-18 meses: Transicion a 1 siesta
  {
    ageRange: "15-18m",
    ageMinMonths: 15,
    ageMaxMonths: 18,
    napCount: 1,
    napMaxDuration: 180, // Max 3 hrs
    windows: [6, 4.5], // 6 hrs antes, 4-4.5 hrs despues
    noNapBefore: "12:00",
    noNapHoursBeforeBedtime: 4,
    nightDurationHours: 11,
    milkMinCount: 0, // Max 16 oz (bandera roja si mas)
    milkIntervalHours: -1,
    solidMinCount: 5,
  },
  // 18 meses - 2 anos: Igual que 15-18m
  {
    ageRange: "18m-2a",
    ageMinMonths: 18,
    ageMaxMonths: 24,
    napCount: 1,
    napMaxDuration: 180,
    windows: [6, 4.5],
    noNapBefore: "12:00",
    noNapHoursBeforeBedtime: 4,
    nightDurationHours: 11,
    milkMinCount: 0,
    milkIntervalHours: -1,
    solidMinCount: 5,
  },
  // 2-2.5 anos
  {
    ageRange: "2-2.5a",
    ageMinMonths: 24,
    ageMaxMonths: 30,
    napCount: 1,
    napMaxDuration: 150, // Max 2.5 hrs
    windows: [6, 5],
    noNapBefore: "12:00",
    noNapHoursBeforeBedtime: 4,
    nightDurationHours: 11,
    milkMinCount: 0,
    milkIntervalHours: -1,
    solidMinCount: 5,
  },
  // 2.5 anos
  {
    ageRange: "2.5a",
    ageMinMonths: 30,
    ageMaxMonths: 33,
    napCount: 1,
    napMaxDuration: 120, // Max 2 hrs
    windows: [6, 5.5],
    noNapBefore: "12:00",
    noNapHoursBeforeBedtime: 4,
    nightDurationHours: 11,
    milkMinCount: 0,
    milkIntervalHours: -1,
    solidMinCount: 5,
  },
  // 2.9-3.3 anos: Noche se recorta a 10-10.5 hrs
  {
    ageRange: "2.9-3.3a",
    ageMinMonths: 33,
    ageMaxMonths: 40,
    napCount: 1,
    napMaxDuration: 90, // Max 1.5 hrs
    windows: [6, 6],
    noNapBefore: "12:00",
    noNapHoursBeforeBedtime: 4,
    nightDurationHours: 10.5, // 10-10.5 hrs
    milkMinCount: 0,
    milkIntervalHours: -1,
    solidMinCount: 5,
  },
  // 3-3.5 anos: Se elimina siesta, noche 11.5-12 hrs
  {
    ageRange: "3-3.5a",
    ageMinMonths: 36,
    ageMaxMonths: 42,
    napCount: 0,
    napMaxDuration: 0, // Sin siestas
    windows: [12.5], // 12-12.5 hrs despierto
    noNapBefore: "00:00", // N/A
    noNapHoursBeforeBedtime: 0, // N/A
    nightDurationHours: 11.5, // 11.5-12 hrs
    milkMinCount: 0, // Opcional
    milkIntervalHours: -1,
    solidMinCount: 5,
  },
  // 3.5+ anos: Sin siesta
  {
    ageRange: "3.5a+",
    ageMinMonths: 42,
    ageMaxMonths: 999,
    napCount: 0,
    napMaxDuration: 0,
    windows: [12.5],
    noNapBefore: "00:00",
    noNapHoursBeforeBedtime: 0,
    nightDurationHours: 11, // Reduccion por ano
    milkMinCount: 0,
    milkIntervalHours: -1,
    solidMinCount: 5,
  },
]

/**
 * Obtiene las reglas de horario para una edad especifica en meses.
 * Busca el rango que contenga la edad dada.
 */
export function getScheduleRuleForAge(ageMonths: number): AgeScheduleRule | null {
  // Buscar regla que contenga la edad
  for (const rule of AGE_SCHEDULE_RULES) {
    if (ageMonths >= rule.ageMinMonths && ageMonths <= rule.ageMaxMonths) {
      return rule
    }
  }

  // Si la edad excede todas las reglas, usar la ultima
  if (ageMonths > 42) {
    return AGE_SCHEDULE_RULES[AGE_SCHEDULE_RULES.length - 1]
  }

  return null
}

/**
 * Duracion de noche esperada por edad en anos.
 * Reduccion de 30 min por ano a partir de los 3 anos.
 */
export const NIGHT_DURATION_BY_AGE: Record<string, number> = {
  "0-2.5": 11, // Hasta 2.5 anos
  "3": 11.75, // 11.5-12 hrs (promedio)
  "4": 11.25, // 11-11.5 hrs
  "5": 10.75, // 10.5-11 hrs
  "6": 10.25, // 10-10.5 hrs
}

/**
 * Obtiene la duracion de noche esperada en horas para una edad en meses.
 */
export function getNightDurationForAge(ageMonths: number): number {
  const ageYears = Math.floor(ageMonths / 12)

  if (ageYears < 3) return 11
  if (ageYears === 3) return 11.75
  if (ageYears === 4) return 11.25
  if (ageYears === 5) return 10.75
  if (ageYears >= 6) return 10.25

  return 11 // Default
}

// Constantes fijas
export const WAKE_TOLERANCE_MINUTES = 15 // Tolerancia de desvio ±15 min
export const MINIMUM_WAKE_TIME = "06:00" // Despertar minimo 6 AM
export const NAP_MAX_DURATION_SPECIAL_CASE = 120 // 2 hrs si siesta anterior fue <=45 min
export const MILK_MAX_OZ_12_PLUS = 16 // Bandera roja si > 16 oz despues de 12 meses
