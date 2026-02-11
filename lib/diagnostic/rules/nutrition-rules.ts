// Motor de Validacion G3: Alimentacion
// Valida frecuencia de leche, solidos y grupos nutricionales por edad
// Fuente: Eventos de feeding + Survey + Clasificacion AI

import { parseISO, differenceInHours, startOfDay, endOfDay } from "date-fns"
import {
  NutritionGroupValidation,
  CriterionResult,
  StatusLevel,
  DataCompleteness,
  NutritionGroup,
  NutritionClassification,
} from "../types"
import {
  getNutritionRuleForAge,
  checkMilkLimit,
  validateMealGroups,
  MEAL_REQUIREMENTS,
  RED_FLAGS,
} from "../nutrition-requirements"

// ─────────────────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────────────────

interface FeedingEvent {
  _id?: string
  eventType: string
  feedingType?: "breast" | "bottle" | "solids"
  feedingAmount?: number
  feedingNotes?: string
  isNightFeeding?: boolean
  startTime: string
}

export interface NutritionValidationInput {
  events: FeedingEvent[]
  childAgeMonths: number
  // Clasificaciones AI obtenidas externamente (opcional)
  aiClassifications?: NutritionClassification[]
  // Survey data para baseline nutricional cuando no hay eventos
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  surveyData?: Record<string, any>
}

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

/**
 * Filtra eventos de feeding del dia actual
 */
function getTodayFeedingEvents(events: FeedingEvent[]): FeedingEvent[] {
  const today = new Date()
  const todayStart = startOfDay(today)
  const todayEnd = endOfDay(today)

  return events.filter((event) => {
    if (event.eventType !== "feeding" && event.eventType !== "night_feeding") {
      return false
    }
    try {
      const eventDate = parseISO(event.startTime)
      return eventDate >= todayStart && eventDate <= todayEnd
    } catch {
      return false
    }
  })
}

/**
 * Cuenta eventos de leche (breast o bottle)
 */
function countMilkFeedings(events: FeedingEvent[]): number {
  return events.filter(
    (e) => e.feedingType === "breast" || e.feedingType === "bottle"
  ).length
}

/**
 * Cuenta eventos de solidos
 */
function countSolidFeedings(events: FeedingEvent[]): number {
  return events.filter((e) => e.feedingType === "solids").length
}

/**
 * Calcula onzas totales de leche del dia (solo bottle con feedingAmount)
 */
function calculateTotalMilkOz(events: FeedingEvent[]): number {
  return events
    .filter((e) => e.feedingType === "bottle" && e.feedingAmount)
    .reduce((total, e) => total + (e.feedingAmount || 0), 0)
}

/**
 * Calcula el gap maximo entre comidas en horas
 */
function calculateMaxFeedingGap(events: FeedingEvent[]): number {
  if (events.length < 2) return 0

  const sortedEvents = [...events].sort(
    (a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime()
  )

  let maxGap = 0
  for (let i = 1; i < sortedEvents.length; i++) {
    const gap = differenceInHours(
      parseISO(sortedEvents[i].startTime),
      parseISO(sortedEvents[i - 1].startTime)
    )
    if (gap > maxGap) maxGap = gap
  }

  return maxGap
}

/**
 * Determina status basado en conteo vs requerido
 */
function getCountStatus(actual: number, required: number): StatusLevel {
  if (required === 0) return "ok" // Sin requisito
  if (actual >= required) return "ok"
  if (actual >= required - 1) return "warning"
  return "alert"
}

/**
 * Extrae grupos nutricionales de clasificaciones AI
 */
function extractCoveredGroups(
  aiClassifications: NutritionClassification[]
): NutritionGroup[] {
  const groups = new Set<NutritionGroup>()
  for (const classification of aiClassifications) {
    for (const group of classification.nutritionGroups) {
      groups.add(group)
    }
  }
  return Array.from(groups)
}

// ─────────────────────────────────────────────────────────
// CRITERIOS DE VALIDACION
// ─────────────────────────────────────────────────────────

/**
 * Valida conteo de tomas de leche
 */
function validateMilkCount(
  events: FeedingEvent[],
  childAgeMonths: number
): CriterionResult {
  const rule = getNutritionRuleForAge(childAgeMonths)
  const actual = countMilkFeedings(events)
  const required = rule.milkMinCount

  const status = getCountStatus(actual, required)

  return {
    id: "g3_milk_count",
    name: "Tomas de leche",
    status,
    value: actual,
    expected: required,
    message:
      status === "ok"
        ? `${actual} tomas de leche (minimo ${required})`
        : `Solo ${actual} de ${required} tomas requeridas`,
    sourceType: "event",
    dataAvailable: true,
  }
}

/**
 * Valida limite de onzas de leche (solo para 12+ meses)
 */
function validateMilkLimit(
  events: FeedingEvent[],
  childAgeMonths: number
): CriterionResult {
  const totalOz = calculateTotalMilkOz(events)
  const check = checkMilkLimit(totalOz, childAgeMonths)

  // Si el nino tiene menos de 12 meses, no aplicar limite
  if (childAgeMonths < 12) {
    return {
      id: "g3_milk_limit",
      name: "Limite de leche",
      status: "ok",
      value: totalOz,
      expected: null,
      message: "Sin limite de onzas para esta edad",
      sourceType: "calculated",
      dataAvailable: true,
    }
  }

  return {
    id: "g3_milk_limit",
    name: "Limite de leche",
    status: check.exceeded ? "alert" : "ok",
    value: totalOz,
    expected: check.maxOz,
    message: check.message,
    sourceType: "calculated",
    dataAvailable: true,
  }
}

/**
 * Valida conteo de comidas solidas
 */
function validateSolidCount(
  events: FeedingEvent[],
  childAgeMonths: number
): CriterionResult {
  const rule = getNutritionRuleForAge(childAgeMonths)
  const actual = countSolidFeedings(events)
  const required = rule.solidMinCount

  // Para menores de 6 meses, no hay requisito de solidos
  if (childAgeMonths < 6) {
    return {
      id: "g3_solid_count",
      name: "Comidas solidas",
      status: "ok",
      value: 0,
      expected: 0,
      message: "Solidos no requeridos antes de 6 meses",
      sourceType: "event",
      dataAvailable: true,
    }
  }

  const status = getCountStatus(actual, required)

  return {
    id: "g3_solid_count",
    name: "Comidas solidas",
    status,
    value: actual,
    expected: required,
    message:
      status === "ok"
        ? `${actual} comidas solidas (minimo ${required})`
        : `Solo ${actual} de ${required} comidas requeridas`,
    sourceType: "event",
    dataAvailable: true,
  }
}

/**
 * Valida gap maximo entre comidas
 */
function validateFeedingGap(events: FeedingEvent[]): CriterionResult {
  const maxGap = calculateMaxFeedingGap(events)

  if (events.length < 2) {
    return {
      id: "g3_feeding_gap",
      name: "Intervalo entre comidas",
      status: "warning",
      value: null,
      expected: RED_FLAGS.MAX_FEEDING_GAP_HOURS,
      message: "Datos insuficientes para calcular intervalos",
      sourceType: "calculated",
      dataAvailable: false,
    }
  }

  const status: StatusLevel =
    maxGap > RED_FLAGS.MAX_FEEDING_GAP_HOURS ? "alert" : "ok"

  return {
    id: "g3_feeding_gap",
    name: "Intervalo entre comidas",
    status,
    value: Math.round(maxGap * 10) / 10,
    expected: RED_FLAGS.MAX_FEEDING_GAP_HOURS,
    message:
      status === "ok"
        ? `Maximo ${maxGap.toFixed(1)}h entre comidas`
        : `Intervalo de ${maxGap.toFixed(1)}h excede el maximo de ${RED_FLAGS.MAX_FEEDING_GAP_HOURS}h`,
    sourceType: "calculated",
    dataAvailable: true,
  }
}

/**
 * Valida grupos nutricionales cubiertos (requiere clasificacion AI)
 */
function validateNutritionGroups(
  childAgeMonths: number,
  coveredGroups: NutritionGroup[]
): CriterionResult {
  // Determinar requisitos segun edad
  const isFullStage = childAgeMonths >= 9
  const requirements = isFullStage
    ? MEAL_REQUIREMENTS.FULL_STAGE
    : MEAL_REQUIREMENTS.EARLY_STAGE

  const requiredGroups = requirements.required as NutritionGroup[]
  const oneOfGroups = requirements.oneOf as NutritionGroup[]

  // Verificar grupos requeridos
  const missingRequired = requiredGroups.filter(
    (g) => !coveredGroups.includes(g)
  )

  // Verificar oneOf (al menos uno)
  const hasOneOf =
    oneOfGroups.length === 0 || oneOfGroups.some((g) => coveredGroups.includes(g))

  // Calcular status
  let status: StatusLevel = "ok"
  let message = ""

  if (missingRequired.length > 0 || !hasOneOf) {
    status = missingRequired.length >= 2 ? "alert" : "warning"
    const allMissing = [...missingRequired]
    if (!hasOneOf && oneOfGroups.length > 0) {
      allMissing.push(...oneOfGroups.filter((g) => !coveredGroups.includes(g)))
    }
    message = `Faltan grupos: ${allMissing.join(", ")}`
  } else {
    message = `Grupos cubiertos: ${coveredGroups.join(", ")}`
  }

  return {
    id: "g3_nutrition_groups",
    name: "Grupos nutricionales",
    status,
    value: coveredGroups.length,
    expected: requiredGroups.length + (oneOfGroups.length > 0 ? 1 : 0),
    message,
    sourceType: "calculated",
    dataAvailable: coveredGroups.length > 0,
  }
}

// ─────────────────────────────────────────────────────────
// CRITERIOS DE SURVEY (Baseline nutricional)
// ─────────────────────────────────────────────────────────

/**
 * Evalua tipo de alimentacion desde el survey (leche materna, formula, mixta)
 */
function validateFeedingType(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  surveyData: Record<string, any>
): CriterionResult {
  const alimentacion = surveyData?.alimentacion

  if (!alimentacion) {
    return {
      id: "g3_feeding_type",
      name: "Tipo de alimentacion",
      status: "warning",
      value: null,
      expected: "Registrado en encuesta",
      message: "Sin dato de tipo de alimentacion en la encuesta",
      sourceType: "survey",
      sourceField: "alimentacion",
      dataAvailable: false,
    }
  }

  return {
    id: "g3_feeding_type",
    name: "Tipo de alimentacion",
    status: "ok",
    value: alimentacion,
    expected: "Registrado en encuesta",
    message: `Alimentacion: ${alimentacion}`,
    sourceType: "survey",
    sourceField: "alimentacion",
    dataAvailable: true,
  }
}

/**
 * Evalua si el nino come solidos segun el survey
 */
function validateSolidsFromSurvey(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  surveyData: Record<string, any>,
  childAgeMonths: number
): CriterionResult {
  const comeSolidos = surveyData?.comeSolidos

  // Menores de 6 meses no requieren solidos
  if (childAgeMonths < 6) {
    return {
      id: "g3_solids_survey",
      name: "Solidos (encuesta)",
      status: "ok",
      value: "No aplica",
      expected: "No aplica antes de 6 meses",
      message: "Solidos no requeridos antes de 6 meses",
      sourceType: "survey",
      sourceField: "comeSolidos",
      dataAvailable: true,
    }
  }

  if (comeSolidos === undefined || comeSolidos === null) {
    return {
      id: "g3_solids_survey",
      name: "Solidos (encuesta)",
      status: "warning",
      value: null,
      expected: "Si (a partir de 6 meses)",
      message: "Sin dato de solidos en la encuesta",
      sourceType: "survey",
      sourceField: "comeSolidos",
      dataAvailable: false,
    }
  }

  const eatssolids = comeSolidos === true || comeSolidos === "si" || comeSolidos === "Si"
  const shouldEatSolids = childAgeMonths >= 6

  return {
    id: "g3_solids_survey",
    name: "Solidos (encuesta)",
    status: shouldEatSolids && !eatssolids ? "alert" : "ok",
    value: eatssolids ? "Si" : "No",
    expected: shouldEatSolids ? "Si" : "No aplica",
    message: shouldEatSolids && !eatssolids
      ? `El nino tiene ${childAgeMonths} meses y no come solidos segun la encuesta`
      : eatssolids
        ? "Come solidos segun la encuesta"
        : "No come solidos (normal para su edad)",
    sourceType: "survey",
    sourceField: "comeSolidos",
    dataAvailable: true,
  }
}

/**
 * Evalua peso y percentil del nino como indicador nutricional
 */
function validateWeightStatus(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  surveyData: Record<string, any>
): CriterionResult {
  const peso = surveyData?.pesoHijo
  const percentil = surveyData?.percentilPeso

  if (!peso && !percentil) {
    return {
      id: "g3_weight_status",
      name: "Estado nutricional (peso)",
      status: "warning",
      value: null,
      expected: "Peso registrado",
      message: "Sin datos de peso en la encuesta",
      sourceType: "survey",
      sourceField: "pesoHijo",
      dataAvailable: false,
    }
  }

  // Si hay percentil, evaluar
  let status: StatusLevel = "ok"
  let message = ""

  if (percentil !== undefined && percentil !== null) {
    const p = typeof percentil === "string" ? parseFloat(percentil) : percentil
    if (!isNaN(p)) {
      if (p < 3) {
        status = "alert"
        message = `Percentil de peso ${p} (bajo peso severo)`
      } else if (p < 10) {
        status = "warning"
        message = `Percentil de peso ${p} (bajo peso)`
      } else if (p > 97) {
        status = "warning"
        message = `Percentil de peso ${p} (sobrepeso)`
      } else {
        message = `Percentil de peso ${p} (normal)`
      }
    }
  }

  if (!message && peso) {
    message = `Peso registrado: ${peso} kg`
  }

  return {
    id: "g3_weight_status",
    name: "Estado nutricional (peso)",
    status,
    value: percentil ? `P${percentil}` : `${peso} kg`,
    expected: "P10-P90",
    message: message || "Peso registrado sin percentil calculado",
    sourceType: "survey",
    sourceField: "pesoHijo",
    dataAvailable: true,
  }
}

// ─────────────────────────────────────────────────────────
// VALIDADOR PRINCIPAL
// ─────────────────────────────────────────────────────────

/**
 * Valida alimentacion completa para un nino
 * @param input Datos de eventos y edad
 * @returns NutritionGroupValidation con todos los criterios evaluados
 */
export function validateNutrition(
  input: NutritionValidationInput
): NutritionGroupValidation {
  const { events, childAgeMonths, aiClassifications = [], surveyData } = input
  const rule = getNutritionRuleForAge(childAgeMonths)

  // Filtrar eventos de feeding del dia
  const todayFeedings = getTodayFeedingEvents(events)

  // Conteos
  const milkCount = countMilkFeedings(todayFeedings)
  const solidCount = countSolidFeedings(todayFeedings)

  // Grupos nutricionales cubiertos (de clasificaciones AI)
  const coveredGroups = extractCoveredGroups(aiClassifications)

  // Evaluar criterios de eventos
  const criteria: CriterionResult[] = [
    validateMilkCount(todayFeedings, childAgeMonths),
    validateMilkLimit(todayFeedings, childAgeMonths),
    validateSolidCount(todayFeedings, childAgeMonths),
    validateFeedingGap(todayFeedings),
    validateNutritionGroups(childAgeMonths, coveredGroups),
  ]

  // Agregar criterios de survey si hay datos disponibles
  if (surveyData && Object.keys(surveyData).length > 0) {
    criteria.push(validateFeedingType(surveyData))
    criteria.push(validateSolidsFromSurvey(surveyData, childAgeMonths))
    criteria.push(validateWeightStatus(surveyData))
  }

  // Determinar status general (el peor de los criterios)
  let overallStatus: StatusLevel = "ok"
  for (const criterion of criteria) {
    if (criterion.status === "alert") {
      overallStatus = "alert"
      break
    }
    if (criterion.status === "warning" && overallStatus !== "alert") {
      overallStatus = "warning"
    }
  }

  // Calcular data completeness
  const availableCriteria = criteria.filter((c) => c.dataAvailable).length
  const pendingCriteria = criteria
    .filter((c) => !c.dataAvailable)
    .map((c) => c.name)

  const dataCompleteness: DataCompleteness = {
    available: availableCriteria,
    total: criteria.length,
    pending: pendingCriteria,
  }

  // Construir resumen
  const alertCount = criteria.filter((c) => c.status === "alert").length
  const warningCount = criteria.filter((c) => c.status === "warning").length
  let summary = ""

  if (alertCount > 0) {
    summary = `${alertCount} alertas de alimentacion`
  } else if (warningCount > 0) {
    summary = `${warningCount} advertencias de alimentacion`
  } else {
    summary = "Alimentacion dentro de parametros"
  }

  // Status de leche y solidos
  const milkStatus = getCountStatus(milkCount, rule.milkMinCount)
  const solidStatus = getCountStatus(solidCount, rule.solidMinCount)

  return {
    groupId: "G3",
    groupName: "Alimentacion",
    status: overallStatus,
    criteria,
    dataCompleteness,
    summary,
    milkFeedings: {
      count: milkCount,
      required: rule.milkMinCount,
      status: milkStatus,
    },
    solidFeedings: {
      count: solidCount,
      required: rule.solidMinCount,
      status: solidStatus,
    },
    nutritionGroupsCovered: coveredGroups,
    nutritionGroupsRequired: rule.mealRequiredGroups,
    aiClassifications,
  }
}

// ─────────────────────────────────────────────────────────
// HELPERS PUBLICOS
// ─────────────────────────────────────────────────────────

/**
 * Obtiene un resumen de conteos de alimentacion
 */
export function getNutritionSummary(
  events: FeedingEvent[],
  childAgeMonths: number
): {
  milkCount: number
  solidCount: number
  totalOz: number
  maxGapHours: number
  rule: ReturnType<typeof getNutritionRuleForAge>
} {
  const todayFeedings = getTodayFeedingEvents(events)
  const rule = getNutritionRuleForAge(childAgeMonths)

  return {
    milkCount: countMilkFeedings(todayFeedings),
    solidCount: countSolidFeedings(todayFeedings),
    totalOz: calculateTotalMilkOz(todayFeedings),
    maxGapHours: calculateMaxFeedingGap(todayFeedings),
    rule,
  }
}

/**
 * Valida si una comida individual cumple los requisitos
 */
export function validateSingleMeal(
  groups: NutritionGroup[],
  childAgeMonths: number,
  isSnack: boolean = false
): ReturnType<typeof validateMealGroups> {
  return validateMealGroups(groups, childAgeMonths, isSnack)
}
