// Motor de Validacion G1: Horario (Schedule)
// Valida horarios de sueno, despertar y siestas contra el plan y reglas por edad
// Fuente: Eventos de sueno/siesta/wake + Plan activo + Reglas clinicas

import { parseISO, differenceInMinutes, format } from "date-fns"
import {
  GroupValidation,
  CriterionResult,
  StatusLevel,
  DataCompleteness,
} from "../types"
import {
  getScheduleRuleForAge,
  getNightDurationForAge,
  WAKE_TOLERANCE_MINUTES,
  MINIMUM_WAKE_TIME,
} from "../age-schedules"
import {
  processSleepStatistics,
  aggregateDailySleep,
  calculateMorningWakeTime,
  SleepEvent,
} from "@/lib/sleep-calculations"

// Input para el validador G1
export interface ScheduleValidationInput {
  events: SleepEvent[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plan: Record<string, any>
  childAgeMonths: number
}

// Resultado de validacion G1
export interface ScheduleValidationResult extends GroupValidation {
  groupId: "G1"
  wakeTime: {
    actual: string
    expected: string
    deviationMinutes: number
    status: StatusLevel
  }
  nightDuration: {
    actual: number
    expected: number
    deviationHours: number
    status: StatusLevel
  }
  napCount: {
    actual: number
    expected: number
    status: StatusLevel
  }
}

/**
 * Convierte una hora en formato "HH:MM" a minutos desde medianoche.
 */
function timeToMinutes(time: string): number {
  if (!time || time === "--:--") return -1
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

/**
 * Calcula la diferencia en minutos entre dos horas (formato HH:MM).
 * Retorna valor absoluto.
 */
function getTimeDeviationMinutes(actual: string, expected: string): number {
  const actualMinutes = timeToMinutes(actual)
  const expectedMinutes = timeToMinutes(expected)

  if (actualMinutes < 0 || expectedMinutes < 0) return -1

  let deviation = Math.abs(actualMinutes - expectedMinutes)
  // Manejar caso de medianoche
  if (deviation > 12 * 60) {
    deviation = 24 * 60 - deviation
  }

  return deviation
}

/**
 * Determina el status basado en la desviacion de minutos.
 */
function getStatusFromDeviation(
  deviationMinutes: number,
  toleranceMinutes: number = WAKE_TOLERANCE_MINUTES
): StatusLevel {
  if (deviationMinutes < 0) return "warning" // Datos no disponibles
  if (deviationMinutes <= toleranceMinutes) return "ok"
  if (deviationMinutes <= toleranceMinutes * 2) return "warning"
  return "alert"
}

/**
 * Valida que la hora de despertar no sea antes de las 6AM.
 */
function validateMinimumWakeTime(wakeTime: string): CriterionResult {
  const wakeMinutes = timeToMinutes(wakeTime)
  const minimumMinutes = timeToMinutes(MINIMUM_WAKE_TIME)

  // Si no hay datos
  if (wakeMinutes < 0) {
    return {
      id: "g1_wake_minimum",
      name: "Despertar minimo 6AM",
      status: "warning",
      value: null,
      expected: MINIMUM_WAKE_TIME,
      message: "Sin datos de despertar registrados",
      sourceType: "calculated",
      dataAvailable: false,
    }
  }

  // Despertar antes de las 6AM es alerta (excepto si es despues de medianoche pero antes de 4AM - puede ser despertar nocturno)
  // Consideramos que despertar valido es entre 4AM y 11AM
  const isBeforeMinimum = wakeMinutes < minimumMinutes && wakeMinutes >= 4 * 60

  return {
    id: "g1_wake_minimum",
    name: "Despertar minimo 6AM",
    status: isBeforeMinimum ? "alert" : "ok",
    value: wakeTime,
    expected: MINIMUM_WAKE_TIME,
    message: isBeforeMinimum
      ? `Despertar a las ${wakeTime} es antes del minimo recomendado (${MINIMUM_WAKE_TIME})`
      : `Despertar a las ${wakeTime} cumple con el minimo`,
    sourceType: "calculated",
    dataAvailable: true,
  }
}

/**
 * Valida la desviacion del despertar respecto al plan.
 */
function validateWakeDeviation(
  actualWakeTime: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plan: Record<string, any>
): CriterionResult {
  // Extraer hora de despertar del plan (puede estar en diferentes campos)
  const planWakeTime =
    plan?.schedule?.wakeTime ||
    plan?.wakeTime ||
    plan?.morningWake ||
    plan?.despierta

  if (!planWakeTime) {
    return {
      id: "g1_wake_deviation",
      name: "Desviacion despertar vs plan",
      status: "warning",
      value: actualWakeTime,
      expected: null,
      message: "No hay hora de despertar definida en el plan",
      sourceType: "plan",
      dataAvailable: false,
    }
  }

  if (!actualWakeTime || actualWakeTime === "--:--") {
    return {
      id: "g1_wake_deviation",
      name: "Desviacion despertar vs plan",
      status: "warning",
      value: null,
      expected: planWakeTime,
      message: "Sin datos de despertar registrados",
      sourceType: "calculated",
      dataAvailable: false,
    }
  }

  const deviationMinutes = getTimeDeviationMinutes(actualWakeTime, planWakeTime)
  const status = getStatusFromDeviation(deviationMinutes)

  return {
    id: "g1_wake_deviation",
    name: "Desviacion despertar vs plan",
    status,
    value: actualWakeTime,
    expected: planWakeTime,
    message:
      deviationMinutes <= WAKE_TOLERANCE_MINUTES
        ? `Despertar dentro de tolerancia (±${WAKE_TOLERANCE_MINUTES} min)`
        : `Desviacion de ${deviationMinutes} min respecto al plan (${planWakeTime})`,
    sourceType: "calculated",
    dataAvailable: true,
  }
}

/**
 * Valida la duracion de la noche contra lo esperado por edad.
 */
function validateNightDuration(
  events: SleepEvent[],
  childAgeMonths: number
): CriterionResult {
  const expectedHours = getNightDurationForAge(childAgeMonths)

  // Calcular duracion real usando agregacion
  const dailyStats = aggregateDailySleep(events, "7-days")
  const actualHours = dailyStats.avgNightHoursPerDay

  if (actualHours === 0) {
    return {
      id: "g1_night_duration",
      name: "Duracion de noche",
      status: "warning",
      value: null,
      expected: `${expectedHours} hrs`,
      message: "Sin datos suficientes para calcular duracion de noche",
      sourceType: "calculated",
      dataAvailable: false,
    }
  }

  // Tolerancia: ±1 hora para ok, ±2 horas para warning
  const deviation = Math.abs(actualHours - expectedHours)
  let status: StatusLevel = "ok"
  if (deviation > 2) status = "alert"
  else if (deviation > 1) status = "warning"

  return {
    id: "g1_night_duration",
    name: "Duracion de noche",
    status,
    value: `${actualHours.toFixed(1)} hrs`,
    expected: `${expectedHours} hrs`,
    message:
      deviation <= 1
        ? `Duracion de noche adecuada (${actualHours.toFixed(1)} hrs)`
        : `Duracion de noche ${actualHours.toFixed(1)} hrs vs ${expectedHours} hrs esperadas`,
    sourceType: "calculated",
    dataAvailable: true,
  }
}

/**
 * Valida la cantidad de siestas contra lo esperado por edad.
 */
function validateNapCount(
  events: SleepEvent[],
  childAgeMonths: number
): CriterionResult {
  const rule = getScheduleRuleForAge(childAgeMonths)

  if (!rule) {
    return {
      id: "g1_nap_count",
      name: "Cantidad de siestas",
      status: "warning",
      value: null,
      expected: null,
      message: "No hay reglas definidas para esta edad",
      sourceType: "calculated",
      dataAvailable: false,
    }
  }

  // Si napCount es -1, es variable (bebes muy pequenos)
  if (rule.napCount === -1) {
    return {
      id: "g1_nap_count",
      name: "Cantidad de siestas",
      status: "ok",
      value: "Variable",
      expected: "Variable",
      message: "Patron de siestas variable normal para esta edad",
      sourceType: "calculated",
      dataAvailable: true,
    }
  }

  // Contar siestas promedio en los ultimos 7 dias
  const dailyStats = aggregateDailySleep(events, "7-days")
  const avgNapsPerDay =
    dailyStats.daysWithData > 0
      ? dailyStats.napsCount / dailyStats.daysWithData
      : 0

  // Redondear al entero mas cercano
  const actualNaps = Math.round(avgNapsPerDay)
  const expectedNaps = rule.napCount

  // Tolerancia: ±1 siesta
  const deviation = Math.abs(actualNaps - expectedNaps)
  let status: StatusLevel = "ok"
  if (deviation > 1) status = "alert"
  else if (deviation === 1) status = "warning"

  return {
    id: "g1_nap_count",
    name: "Cantidad de siestas",
    status,
    value: actualNaps,
    expected: expectedNaps,
    message:
      deviation === 0
        ? `${actualNaps} siestas promedio (esperado: ${expectedNaps})`
        : `${actualNaps} siestas vs ${expectedNaps} esperadas para ${rule.ageRange}`,
    sourceType: "calculated",
    dataAvailable: dailyStats.daysWithData > 0,
  }
}

/**
 * Valida la duracion de las siestas contra el maximo por edad.
 */
function validateNapDuration(
  events: SleepEvent[],
  childAgeMonths: number
): CriterionResult {
  const rule = getScheduleRuleForAge(childAgeMonths)

  if (!rule || rule.napMaxDuration === -1) {
    return {
      id: "g1_nap_duration",
      name: "Duracion de siestas",
      status: "ok",
      value: "Variable",
      expected: "Variable",
      message: "Sin limite de duracion de siesta para esta edad",
      sourceType: "calculated",
      dataAvailable: true,
    }
  }

  // Obtener duracion promedio de siestas
  const stats = processSleepStatistics(events)
  const avgNapHours = stats.avgNapDuration
  const avgNapMinutes = avgNapHours * 60

  if (avgNapMinutes === 0) {
    return {
      id: "g1_nap_duration",
      name: "Duracion de siestas",
      status: "warning",
      value: null,
      expected: `max ${rule.napMaxDuration} min`,
      message: "Sin datos de duracion de siestas",
      sourceType: "calculated",
      dataAvailable: false,
    }
  }

  // Comparar con maximo
  const exceeds = avgNapMinutes > rule.napMaxDuration
  const status: StatusLevel = exceeds ? "warning" : "ok"

  return {
    id: "g1_nap_duration",
    name: "Duracion de siestas",
    status,
    value: `${Math.round(avgNapMinutes)} min`,
    expected: `max ${rule.napMaxDuration} min`,
    message: exceeds
      ? `Siestas de ${Math.round(avgNapMinutes)} min exceden maximo de ${rule.napMaxDuration} min`
      : `Duracion de siestas dentro del limite`,
    sourceType: "calculated",
    dataAvailable: true,
  }
}

/**
 * Valida la hora de acostarse (bedtime) contra el plan.
 */
function validateBedtime(
  events: SleepEvent[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plan: Record<string, any>
): CriterionResult {
  // Extraer hora de bedtime del plan
  const planBedtime =
    plan?.schedule?.bedtime || plan?.bedtime || plan?.acostarse

  // Obtener hora promedio de acostarse de los eventos
  const stats = processSleepStatistics(events)
  const actualBedtime = stats.avgBedtime

  if (!planBedtime) {
    return {
      id: "g1_bedtime",
      name: "Hora de acostarse",
      status: "warning",
      value: actualBedtime,
      expected: null,
      message: "No hay hora de acostarse definida en el plan",
      sourceType: "plan",
      dataAvailable: false,
    }
  }

  if (!actualBedtime || actualBedtime === "--:--") {
    return {
      id: "g1_bedtime",
      name: "Hora de acostarse",
      status: "warning",
      value: null,
      expected: planBedtime,
      message: "Sin datos de hora de acostarse",
      sourceType: "calculated",
      dataAvailable: false,
    }
  }

  const deviationMinutes = getTimeDeviationMinutes(actualBedtime, planBedtime)
  const status = getStatusFromDeviation(deviationMinutes, WAKE_TOLERANCE_MINUTES)

  return {
    id: "g1_bedtime",
    name: "Hora de acostarse",
    status,
    value: actualBedtime,
    expected: planBedtime,
    message:
      deviationMinutes <= WAKE_TOLERANCE_MINUTES
        ? `Hora de acostarse dentro de tolerancia`
        : `Desviacion de ${deviationMinutes} min respecto al plan (${planBedtime})`,
    sourceType: "calculated",
    dataAvailable: true,
  }
}

/**
 * Calcula el peor status de un array de criterios.
 */
function getWorstStatus(criteria: CriterionResult[]): StatusLevel {
  if (criteria.some((c) => c.status === "alert")) return "alert"
  if (criteria.some((c) => c.status === "warning")) return "warning"
  return "ok"
}

/**
 * Calcula la completitud de datos para el grupo G1.
 */
function calculateDataCompleteness(
  criteria: CriterionResult[]
): DataCompleteness {
  const total = criteria.length
  const available = criteria.filter((c) => c.dataAvailable).length
  const pending = criteria
    .filter((c) => !c.dataAvailable)
    .map((c) => c.name)

  return {
    available,
    total,
    pending,
  }
}

/**
 * Motor principal de validacion G1 (Horario).
 * Evalua horarios de sueno contra el plan y reglas por edad.
 */
export function validateSchedule(
  input: ScheduleValidationInput
): ScheduleValidationResult {
  const { events, plan, childAgeMonths } = input

  // Calcular hora de despertar promedio
  const actualWakeTime = calculateMorningWakeTime(events)

  // Ejecutar todas las validaciones
  const wakeMinimumResult = validateMinimumWakeTime(actualWakeTime)
  const wakeDeviationResult = validateWakeDeviation(actualWakeTime, plan)
  const nightDurationResult = validateNightDuration(events, childAgeMonths)
  const napCountResult = validateNapCount(events, childAgeMonths)
  const napDurationResult = validateNapDuration(events, childAgeMonths)
  const bedtimeResult = validateBedtime(events, plan)

  const criteria: CriterionResult[] = [
    wakeMinimumResult,
    wakeDeviationResult,
    nightDurationResult,
    napCountResult,
    napDurationResult,
    bedtimeResult,
  ]

  const status = getWorstStatus(criteria)
  const dataCompleteness = calculateDataCompleteness(criteria)

  // Extraer valores para el resultado extendido
  const planWakeTime =
    plan?.schedule?.wakeTime ||
    plan?.wakeTime ||
    plan?.morningWake ||
    plan?.despierta ||
    "--:--"

  const deviationMinutes = getTimeDeviationMinutes(actualWakeTime, planWakeTime)
  const expectedNightHours = getNightDurationForAge(childAgeMonths)
  const dailyStats = aggregateDailySleep(events, "7-days")
  const rule = getScheduleRuleForAge(childAgeMonths)

  return {
    groupId: "G1",
    groupName: "Horario",
    status,
    criteria,
    dataCompleteness,
    summary: generateSummary(status, criteria),
    wakeTime: {
      actual: actualWakeTime,
      expected: planWakeTime,
      deviationMinutes: deviationMinutes >= 0 ? deviationMinutes : 0,
      status: wakeDeviationResult.status,
    },
    nightDuration: {
      actual: dailyStats.avgNightHoursPerDay,
      expected: expectedNightHours,
      deviationHours: Math.abs(
        dailyStats.avgNightHoursPerDay - expectedNightHours
      ),
      status: nightDurationResult.status,
    },
    napCount: {
      actual:
        dailyStats.daysWithData > 0
          ? Math.round(dailyStats.napsCount / dailyStats.daysWithData)
          : 0,
      expected: rule?.napCount ?? -1,
      status: napCountResult.status,
    },
  }
}

/**
 * Genera un resumen legible del resultado de validacion.
 */
function generateSummary(
  status: StatusLevel,
  criteria: CriterionResult[]
): string {
  const alertCount = criteria.filter((c) => c.status === "alert").length
  const warningCount = criteria.filter((c) => c.status === "warning").length
  const okCount = criteria.filter((c) => c.status === "ok").length

  if (status === "ok") {
    return `Horario en orden: ${okCount} criterios cumplen las expectativas.`
  }

  if (status === "alert") {
    return `Horario con ${alertCount} alertas y ${warningCount} advertencias que requieren atencion.`
  }

  return `Horario con ${warningCount} advertencias menores.`
}

export default validateSchedule
