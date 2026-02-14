// Motor de Validacion G2: Indicadores Medicos
// Evalua reflujo, apnea, restless leg basado en survey y eventos
// Con 1 solo indicador detectado se dispara alerta

import {
  MedicalGroupValidation,
  MedicalIndicator,
  MedicalCondition,
  CriterionResult,
  StatusLevel,
  DataCompleteness,
} from "../types"

import {
  REFLUX_INDICATORS,
  APNEA_INDICATORS,
  RESTLESS_LEG_INDICATORS,
  MEDICAL_ALERT_THRESHOLD,
  getIndicatorsForCondition,
} from "../medical-indicators"

// ─────────────────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────────────────

interface MedicalValidationInput {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  surveyData: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  events: Record<string, any>[]
}

interface ConditionEvaluation {
  condition: MedicalCondition
  indicators: MedicalIndicator[]
  detectedCount: number
  pendingCount: number
  availableCount: number
  missingDataNames: string[]
  status: StatusLevel
}

interface IndicatorConfig {
  id: string
  name: string
  description: string
  condition: MedicalCondition
  surveyField?: string
  eventCheck?: (events: Record<string, unknown>[]) => boolean
  evaluator?: (value: unknown) => boolean
  available: boolean
}

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

// Acceso con dot-notation para campos anidados (ej: "reflujoDetails.vomitaFrecuente")
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

// Evaluar si un indicador esta detectado
function evaluateIndicator(
  config: IndicatorConfig,
  surveyData: Record<string, unknown>,
  events: Record<string, unknown>[]
): MedicalIndicator {
  let detected = false

  // Si tiene surveyField, buscar en survey
  if (config.surveyField && config.available) {
    // Soporte dot-notation para campos anidados (ej: reflujoDetails.vomitaFrecuente)
    const value = config.surveyField.includes(".")
      ? getNestedValue(surveyData, config.surveyField)
      : surveyData?.[config.surveyField]

    // Si hay evaluator custom (ej: ferritina < 50), usarlo primero
    if (config.evaluator && value !== undefined && value !== null) {
      detected = config.evaluator(value)
    } else if (typeof value === "boolean") {
      detected = value
    } else if (typeof value === "string") {
      const normalized = value.toLowerCase().trim()
      detected =
        normalized.length > 0 &&
        !["no", "ninguno", "none", "nunca", "false", "0"].includes(normalized)
    } else if (typeof value === "number") {
      detected = value > 0
    }
  }

  // Si tiene eventCheck, evaluar eventos
  if (config.eventCheck && config.available) {
    try {
      detected = config.eventCheck(events) || detected
    } catch {
      // Si falla el check, mantener el valor anterior
    }
  }

  return {
    id: config.id,
    name: config.name,
    description: config.description,
    surveyField: config.surveyField,
    condition: config.condition,
    available: config.available,
    detected,
  }
}

function hasSurveyValue(
  config: IndicatorConfig,
  surveyData: Record<string, unknown>
): boolean {
  if (!config.surveyField) return false

  const value = config.surveyField.includes(".")
    ? getNestedValue(surveyData, config.surveyField)
    : surveyData?.[config.surveyField]

  if (value === undefined || value === null) return false
  if (typeof value === "string") return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  return true
}

function hasDataForIndicator(
  config: IndicatorConfig,
  surveyData: Record<string, unknown>,
  events: Record<string, unknown>[]
): boolean {
  if (!config.available) return false

  const surveyAvailable = hasSurveyValue(config, surveyData)
  const eventAvailable = !!config.eventCheck && events.length > 0

  if (config.surveyField && config.eventCheck) {
    return surveyAvailable || eventAvailable
  }
  if (config.surveyField) return surveyAvailable
  if (config.eventCheck) return eventAvailable
  return false
}

// Evaluar todos los indicadores de una condicion
function evaluateCondition(
  condition: MedicalCondition,
  surveyData: Record<string, unknown>,
  events: Record<string, unknown>[]
): ConditionEvaluation {
  if (condition === "reflujo") {
    const reflujoFlag = surveyData?.reflujoColicos
    const reflujoExplicitNo = reflujoFlag === false ||
      (typeof reflujoFlag === "string" && ["no", "ninguno", "false", "0"].includes(reflujoFlag.toLowerCase().trim()))
    const reflujoDetails = surveyData?.reflujoDetails
    const hasReflujoDetails = typeof reflujoDetails === "object" && reflujoDetails !== null &&
      Object.values(reflujoDetails as Record<string, unknown>).some((value) => value === true)

    if (reflujoExplicitNo && !hasReflujoDetails) {
      return {
        condition,
        indicators: [],
        detectedCount: 0,
        pendingCount: 0,
        availableCount: 0,
        missingDataNames: [],
        status: "ok",
      }
    }
  }

  const configs = getIndicatorsForCondition(condition)
  const indicators: MedicalIndicator[] = []
  let detectedCount = 0
  let pendingCount = 0
  let availableCount = 0
  const missingDataNames: string[] = []

  for (const config of configs) {
    const indicator = evaluateIndicator(config, surveyData, events)
    indicators.push(indicator)

    if (!indicator.available) {
      pendingCount++
      continue
    }

    const hasData = hasDataForIndicator(config, surveyData, events)
    if (!hasData) {
      pendingCount++
      missingDataNames.push(indicator.name)
      continue
    }

    availableCount++
    if (indicator.detected) {
      detectedCount++
    }
  }

  // Determinar status basado en indicadores detectados
  let status: StatusLevel = "ok"
  if (detectedCount >= MEDICAL_ALERT_THRESHOLD) {
    status = "alert"
  } else if (pendingCount > 0 && availableCount < configs.length / 2) {
    // Si hay muchos datos pendientes, warning
    status = "warning"
  }

  return {
    condition,
    indicators,
    detectedCount,
    pendingCount,
    availableCount,
    missingDataNames,
    status,
  }
}

// Convertir evaluacion a criterios
function conditionToCriteria(evaluation: ConditionEvaluation): CriterionResult {
  const conditionLabels: Record<MedicalCondition, string> = {
    reflujo: "Indicadores de Reflujo",
    apnea: "Indicadores de Apnea/Alergias",
    restless_leg: "Indicadores de Piernas Inquietas",
  }

  const detectedNames = evaluation.indicators
    .filter((i) => i.detected)
    .map((i) => i.name)

  let message = ""
  if (evaluation.detectedCount === 0) {
    message = "Sin indicadores detectados"
    if (evaluation.pendingCount > 0) {
      message += ` (${evaluation.pendingCount} datos pendientes)`
    }
  } else {
    message = `${evaluation.detectedCount} indicador(es) detectado(s): ${detectedNames.join(", ")}`
  }

  return {
    id: `g2_${evaluation.condition}`,
    name: conditionLabels[evaluation.condition],
    status: evaluation.status,
    value: evaluation.detectedCount,
    expected: 0,
    message,
    sourceType: "survey",
    dataAvailable: evaluation.availableCount > 0,
  }
}

// Calcular completitud de datos
function calculateMedicalDataCompleteness(
  evaluations: ConditionEvaluation[]
): DataCompleteness {
  let available = 0
  let total = 0
  const pending = new Set<string>()

  for (const evaluation of evaluations) {
    for (const indicator of evaluation.indicators) {
      total++
      if (!indicator.available) pending.add(indicator.name)
    }
    available += evaluation.availableCount
    for (const missingDataName of evaluation.missingDataNames) {
      pending.add(missingDataName)
    }
  }

  return { available, total, pending: Array.from(pending) }
}

// Determinar status general del grupo
function calculateOverallMedicalStatus(
  evaluations: ConditionEvaluation[]
): StatusLevel {
  const hasAlert = evaluations.some((e) => e.status === "alert")
  const hasWarning = evaluations.some((e) => e.status === "warning")

  if (hasAlert) return "alert"
  if (hasWarning) return "warning"
  return "ok"
}

// Generar resumen del grupo
function generateMedicalSummary(
  evaluations: ConditionEvaluation[],
  dataCompleteness: DataCompleteness
): string {
  const totalDetected = evaluations.reduce((sum, e) => sum + e.detectedCount, 0)
  const conditions = evaluations
    .filter((e) => e.detectedCount > 0)
    .map((e) => {
      const labels: Record<MedicalCondition, string> = {
        reflujo: "reflujo",
        apnea: "apnea",
        restless_leg: "piernas inquietas",
      }
      return labels[e.condition]
    })

  if (totalDetected === 0) {
    if (dataCompleteness.pending.length > 0) {
      return `Sin indicadores detectados. ${dataCompleteness.pending.length} datos pendientes de recolectar.`
    }
    return "Sin indicadores médicos detectados."
  }

  return `${totalDetected} indicador(es) detectado(s) para: ${conditions.join(", ")}.`
}

// ─────────────────────────────────────────────────────────
// FUNCION PRINCIPAL
// ─────────────────────────────────────────────────────────

export function validateMedicalIndicators(
  input: MedicalValidationInput
): MedicalGroupValidation {
  const { surveyData, events } = input

  // Evaluar cada condicion
  const reflujoEval = evaluateCondition("reflujo", surveyData, events)
  const apneaEval = evaluateCondition("apnea", surveyData, events)
  const restlessEval = evaluateCondition("restless_leg", surveyData, events)

  const evaluations = [reflujoEval, apneaEval, restlessEval]

  // Construir criterios
  const criteria: CriterionResult[] = evaluations.map(conditionToCriteria)

  // Calcular completitud
  const dataCompleteness = calculateMedicalDataCompleteness(evaluations)

  // Status general
  const status = calculateOverallMedicalStatus(evaluations)

  // Resumen
  const summary = generateMedicalSummary(evaluations, dataCompleteness)

  return {
    groupId: "G2",
    groupName: "Indicadores Médicos",
    status,
    criteria,
    dataCompleteness,
    summary,
    indicators: {
      reflujo: reflujoEval.indicators,
      apnea: apneaEval.indicators,
      restless_leg: restlessEval.indicators,
    },
    detectedCount: {
      reflujo: reflujoEval.detectedCount,
      apnea: apneaEval.detectedCount,
      restless_leg: restlessEval.detectedCount,
    },
    pendingCount: {
      reflujo: reflujoEval.pendingCount,
      apnea: apneaEval.pendingCount,
      restless_leg: restlessEval.pendingCount,
    },
  }
}

// ─────────────────────────────────────────────────────────
// HELPERS PUBLICOS
// ─────────────────────────────────────────────────────────

type MedicalIndicatorCounts = {
  reflujo: { available: number; total: number }
  apnea: { available: number; total: number }
  restless_leg: { available: number; total: number }
}

// Obtener conteo de indicadores por condicion (para UI)
export function getMedicalIndicatorCounts(): MedicalIndicatorCounts {
  return {
    reflujo: {
      available: REFLUX_INDICATORS.filter((i) => i.available).length,
      total: REFLUX_INDICATORS.length,
    },
    apnea: {
      available: APNEA_INDICATORS.filter((i) => i.available).length,
      total: APNEA_INDICATORS.length,
    },
    restless_leg: {
      available: RESTLESS_LEG_INDICATORS.filter((i) => i.available).length,
      total: RESTLESS_LEG_INDICATORS.length,
    },
  }
}
