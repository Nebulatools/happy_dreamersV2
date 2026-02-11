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
import type { AgeScheduleRule } from "../types"
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
  plan: Record<string, any> | null
  childAgeMonths: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  surveyData?: Record<string, any> // Fallback para horaDormir/horaDespertar si no hay plan
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
  sleepWindows: {
    actual: number[] // Ventanas reales en horas
    expected: number[] // Ventanas esperadas en horas
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
  plan: Record<string, any> | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  surveyData?: Record<string, any>
): CriterionResult {
  // Extraer hora de despertar del plan (puede estar en diferentes campos)
  let expectedWakeTime =
    plan?.schedule?.wakeTime ||
    plan?.wakeTime ||
    plan?.morningWake ||
    plan?.despierta

  // Fallback: usar horaDespertar del survey si no hay plan
  let sourceLabel = "plan"
  if (!expectedWakeTime && surveyData?.horaDespertar) {
    expectedWakeTime = surveyData.horaDespertar
    sourceLabel = "encuesta"
  }

  if (!expectedWakeTime) {
    return {
      id: "g1_wake_deviation",
      name: "Desviacion despertar vs referencia",
      status: "warning",
      value: actualWakeTime,
      expected: null,
      message: "No hay hora de despertar definida en el plan ni en la encuesta",
      sourceType: "plan",
      dataAvailable: false,
    }
  }

  if (!actualWakeTime || actualWakeTime === "--:--") {
    return {
      id: "g1_wake_deviation",
      name: "Desviacion despertar vs referencia",
      status: "warning",
      value: null,
      expected: expectedWakeTime,
      message: "Sin datos de despertar registrados",
      sourceType: "calculated",
      dataAvailable: false,
    }
  }

  const deviationMinutes = getTimeDeviationMinutes(actualWakeTime, expectedWakeTime)
  const status = getStatusFromDeviation(deviationMinutes)
  const refLabel = sourceLabel === "encuesta" ? "encuesta" : "plan"

  return {
    id: "g1_wake_deviation",
    name: "Desviacion despertar vs referencia",
    status,
    value: actualWakeTime,
    expected: expectedWakeTime,
    message:
      deviationMinutes <= WAKE_TOLERANCE_MINUTES
        ? `Despertar dentro de tolerancia (±${WAKE_TOLERANCE_MINUTES} min, ref: ${refLabel})`
        : `Desviacion de ${deviationMinutes} min respecto al ${refLabel} (${expectedWakeTime})`,
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
  plan: Record<string, any> | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  surveyData?: Record<string, any>
): CriterionResult {
  // Extraer hora de bedtime del plan
  let expectedBedtime =
    plan?.schedule?.bedtime || plan?.bedtime || plan?.acostarse

  // Fallback: usar horaDormir del survey si no hay plan
  let sourceLabel = "plan"
  if (!expectedBedtime && surveyData?.horaDormir) {
    expectedBedtime = surveyData.horaDormir
    sourceLabel = "encuesta"
  }

  // Obtener hora promedio de acostarse de los eventos
  const stats = processSleepStatistics(events)
  const actualBedtime = stats.avgBedtime

  if (!expectedBedtime) {
    return {
      id: "g1_bedtime",
      name: "Hora de acostarse vs referencia",
      status: "warning",
      value: actualBedtime,
      expected: null,
      message: "No hay hora de acostarse definida en el plan ni en la encuesta",
      sourceType: "plan",
      dataAvailable: false,
    }
  }

  if (!actualBedtime || actualBedtime === "--:--") {
    return {
      id: "g1_bedtime",
      name: "Hora de acostarse vs referencia",
      status: "warning",
      value: null,
      expected: expectedBedtime,
      message: "Sin datos de hora de acostarse",
      sourceType: "calculated",
      dataAvailable: false,
    }
  }

  const deviationMinutes = getTimeDeviationMinutes(actualBedtime, expectedBedtime)
  const status = getStatusFromDeviation(deviationMinutes, WAKE_TOLERANCE_MINUTES)
  const refLabel = sourceLabel === "encuesta" ? "encuesta" : "plan"

  return {
    id: "g1_bedtime",
    name: "Hora de acostarse vs referencia",
    status,
    value: actualBedtime,
    expected: expectedBedtime,
    message:
      deviationMinutes <= WAKE_TOLERANCE_MINUTES
        ? `Hora de acostarse dentro de tolerancia (ref: ${refLabel})`
        : `Desviacion de ${deviationMinutes} min respecto al ${refLabel} (${expectedBedtime})`,
    sourceType: "calculated",
    dataAvailable: true,
  }
}

// ============================================================================
// VENTANAS DE SUENO (Window Validation) - Tarea 3.2
// ============================================================================

/**
 * Extrae la hora de un timestamp ISO o string de tiempo.
 * Retorna formato HH:MM.
 */
function extractTimeFromEvent(event: SleepEvent): string {
  if (!event.startTime) return "--:--"
  try {
    const date = parseISO(event.startTime)
    return format(date, "HH:mm")
  } catch {
    return "--:--"
  }
}

/**
 * Obtiene eventos de un dia especifico ordenados cronologicamente.
 * Para validar ventanas usamos el dia logico (considerando que madrugada pertenece al dia anterior).
 */
function getDayEvents(events: SleepEvent[], targetDate: Date): SleepEvent[] {
  const dayStart = new Date(targetDate)
  dayStart.setHours(4, 0, 0, 0) // Dia logico empieza a las 4 AM

  const dayEnd = new Date(targetDate)
  dayEnd.setDate(dayEnd.getDate() + 1)
  dayEnd.setHours(3, 59, 59, 999) // Dia logico termina a las 3:59 AM del dia siguiente

  return events
    .filter((e) => {
      if (!e.startTime) return false
      const eventTime = parseISO(e.startTime)
      return eventTime >= dayStart && eventTime <= dayEnd
    })
    .sort((a, b) => {
      const timeA = parseISO(a.startTime!)
      const timeB = parseISO(b.startTime!)
      return timeA.getTime() - timeB.getTime()
    })
}

/**
 * Calcula las ventanas de vigilia de un dia.
 * Retorna array de gaps en horas entre eventos de sueno.
 *
 * Secuencia esperada: WAKE -> (gap1) -> NAP1 -> (gap2) -> NAP2? -> (gap3) -> SLEEP
 */
function calculateDayWindows(dayEvents: SleepEvent[]): number[] {
  const windows: number[] = []

  // Filtrar solo eventos relevantes: wake, nap, sleep
  const sleepEvents = dayEvents.filter((e) =>
    ["wake", "nap", "sleep"].includes(e.eventType)
  )

  if (sleepEvents.length < 2) return windows

  for (let i = 0; i < sleepEvents.length - 1; i++) {
    const current = sleepEvents[i]
    const next = sleepEvents[i + 1]

    // Solo calcular gap si el siguiente evento es siesta o dormir
    // (gap entre despertar y primera siesta, entre siestas, o entre ultima actividad y dormir)
    if (!current.startTime || !next.startTime) continue

    // Si el evento actual es wake o termina una siesta
    // y el siguiente es inicio de siesta o sleep
    const currentEnd = current.endTime
      ? parseISO(current.endTime)
      : parseISO(current.startTime)
    const nextStart = parseISO(next.startTime)

    // Calcular gap en horas
    const gapMinutes = differenceInMinutes(nextStart, currentEnd)
    const gapHours = gapMinutes / 60

    // Solo agregar gaps positivos y razonables (entre 0.5 y 14 horas)
    if (gapHours > 0.5 && gapHours < 14) {
      windows.push(gapHours)
    }
  }

  return windows
}

/**
 * Compara ventanas reales contra las esperadas por edad.
 * Retorna status basado en la desviacion.
 */
function compareWindows(
  actualWindows: number[],
  rule: AgeScheduleRule
): { status: StatusLevel; deviations: number[] } {
  const expectedWindows = rule.windows
  const deviations: number[] = []

  // Si no hay ventanas reales o esperadas, warning
  if (actualWindows.length === 0 || expectedWindows.length === 0) {
    return { status: "warning", deviations: [] }
  }

  // Comparar cada ventana real con la esperada
  // Tomamos el minimo de ambos arrays para comparar
  const compareCount = Math.min(actualWindows.length, expectedWindows.length)

  for (let i = 0; i < compareCount; i++) {
    const actual = actualWindows[i]
    const expected = expectedWindows[i]
    const deviation = Math.abs(actual - expected)
    deviations.push(deviation)
  }

  // Calcular status basado en desviaciones
  // Tolerancia: ±30 min (0.5 hrs) = ok, ±1 hr = warning, >1 hr = alert
  const maxDeviation = Math.max(...deviations)

  if (maxDeviation <= 0.5) return { status: "ok", deviations }
  if (maxDeviation <= 1) return { status: "warning", deviations }
  return { status: "alert", deviations }
}

/**
 * Valida las ventanas de sueno del dia contra las esperadas por edad.
 * Calcula gaps entre wake->nap->sleep y compara con AGE_SCHEDULE_RULES.windows
 */
function validateSleepWindows(
  events: SleepEvent[],
  childAgeMonths: number
): CriterionResult {
  const rule = getScheduleRuleForAge(childAgeMonths)

  // Si no hay regla o las ventanas son variables (bebes muy pequenos)
  if (!rule || rule.windows.length === 0 || rule.windows[0] === 0) {
    return {
      id: "g1_sleep_windows",
      name: "Ventanas de sueno",
      status: "ok",
      value: "Variable",
      expected: "Variable",
      message: "Patron de ventanas variable normal para esta edad",
      sourceType: "calculated",
      dataAvailable: true,
    }
  }

  // Obtener eventos de los ultimos 7 dias
  const now = new Date()
  const allWindows: number[][] = []

  for (let i = 0; i < 7; i++) {
    const targetDate = new Date(now)
    targetDate.setDate(targetDate.getDate() - i)
    const dayEvents = getDayEvents(events, targetDate)
    const dayWindows = calculateDayWindows(dayEvents)

    if (dayWindows.length > 0) {
      allWindows.push(dayWindows)
    }
  }

  // Si no hay datos suficientes
  if (allWindows.length === 0) {
    return {
      id: "g1_sleep_windows",
      name: "Ventanas de sueno",
      status: "warning",
      value: null,
      expected: `${rule.windows.map((w) => w + "h").join(", ")}`,
      message: "Sin datos suficientes para calcular ventanas de sueno",
      sourceType: "calculated",
      dataAvailable: false,
    }
  }

  // Calcular promedio de ventanas por posicion
  const avgWindows: number[] = []
  const maxWindowCount = Math.max(...allWindows.map((w) => w.length))

  for (let pos = 0; pos < maxWindowCount; pos++) {
    const windowsAtPos = allWindows
      .filter((w) => w[pos] !== undefined)
      .map((w) => w[pos])

    if (windowsAtPos.length > 0) {
      const avg = windowsAtPos.reduce((a, b) => a + b, 0) / windowsAtPos.length
      avgWindows.push(Math.round(avg * 10) / 10) // Redondear a 1 decimal
    }
  }

  // Comparar con reglas
  const { status, deviations } = compareWindows(avgWindows, rule)

  // Formatear valores para mostrar
  const actualStr = avgWindows.map((w) => w.toFixed(1) + "h").join(", ")
  const expectedStr = rule.windows.map((w) => w + "h").join(", ")

  let message: string
  if (status === "ok") {
    message = `Ventanas de sueno dentro de lo esperado para ${rule.ageRange}`
  } else if (status === "warning") {
    message = `Ventanas de sueno con ligera desviacion (${actualStr} vs esperado ${expectedStr})`
  } else {
    const maxDev = Math.max(...deviations)
    message = `Ventanas de sueno desviadas ${maxDev.toFixed(1)} hrs del optimo (${actualStr} vs ${expectedStr})`
  }

  return {
    id: "g1_sleep_windows",
    name: "Ventanas de sueno",
    status,
    value: actualStr,
    expected: expectedStr,
    message,
    sourceType: "calculated",
    dataAvailable: true,
  }
}

/**
 * Parsea las ventanas desde el valor del criterio.
 * El valor puede ser "1.5h, 2.0h, 2.5h" o "Variable" o null
 */
function parseWindowsFromValue(
  value: string | number | boolean | null
): number[] {
  if (!value || value === "Variable" || typeof value !== "string") {
    return []
  }

  // Parsear formato "1.5h, 2.0h, 2.5h"
  return value
    .split(",")
    .map((v) => v.trim().replace("h", ""))
    .map((v) => parseFloat(v))
    .filter((v) => !isNaN(v))
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
  const { events, plan, childAgeMonths, surveyData } = input

  // Calcular hora de despertar promedio
  const actualWakeTime = calculateMorningWakeTime(events)

  // Ejecutar todas las validaciones
  const wakeMinimumResult = validateMinimumWakeTime(actualWakeTime)
  const wakeDeviationResult = validateWakeDeviation(actualWakeTime, plan, surveyData)
  const nightDurationResult = validateNightDuration(events, childAgeMonths)
  const napCountResult = validateNapCount(events, childAgeMonths)
  const napDurationResult = validateNapDuration(events, childAgeMonths)
  const bedtimeResult = validateBedtime(events, plan, surveyData)
  const sleepWindowsResult = validateSleepWindows(events, childAgeMonths)

  const criteria: CriterionResult[] = [
    wakeMinimumResult,
    wakeDeviationResult,
    nightDurationResult,
    napCountResult,
    napDurationResult,
    bedtimeResult,
    sleepWindowsResult,
  ]

  const status = getWorstStatus(criteria)
  const dataCompleteness = calculateDataCompleteness(criteria)

  // Extraer valores para el resultado extendido
  const planWakeTime =
    plan?.schedule?.wakeTime ||
    plan?.wakeTime ||
    plan?.morningWake ||
    plan?.despierta ||
    surveyData?.horaDespertar ||
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
    sleepWindows: {
      actual: parseWindowsFromValue(sleepWindowsResult.value),
      expected: rule?.windows ?? [],
      status: sleepWindowsResult.status,
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
