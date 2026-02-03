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
  status: StatusLevel
}

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

// Evaluar si un indicador esta detectado
function evaluateIndicator(
  config: {
    id: string
    name: string
    description: string
    condition: MedicalCondition
    surveyField?: string
    eventCheck?: (events: Record<string, unknown>[]) => boolean
    available: boolean
  },
  surveyData: Record<string, unknown>,
  events: Record<string, unknown>[]
): MedicalIndicator {
  let detected = false

  // Si tiene surveyField, buscar en survey
  if (config.surveyField && config.available) {
    const value = surveyData?.[config.surveyField]
    // Considerar detectado si:
    // - Es true
    // - Es un string no vacio que no sea "no", "ninguno", "none", "nunca"
    // - Es un numero > 0
    if (typeof value === "boolean") {
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

// Evaluar todos los indicadores de una condicion
function evaluateCondition(
  condition: MedicalCondition,
  surveyData: Record<string, unknown>,
  events: Record<string, unknown>[]
): ConditionEvaluation {
  const configs = getIndicatorsForCondition(condition)
  const indicators: MedicalIndicator[] = []
  let detectedCount = 0
  let pendingCount = 0
  let availableCount = 0

  for (const config of configs) {
    const indicator = evaluateIndicator(config, surveyData, events)
    indicators.push(indicator)

    if (indicator.available) {
      availableCount++
      if (indicator.detected) {
        detectedCount++
      }
    } else {
      pendingCount++
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
  const pending: string[] = []

  for (const evaluation of evaluations) {
    for (const indicator of evaluation.indicators) {
      total++
      if (indicator.available) {
        available++
      } else {
        pending.push(indicator.name)
      }
    }
  }

  return { available, total, pending }
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

// Obtener conteo de indicadores por condicion (para UI)
export function getMedicalIndicatorCounts(): {
  reflujo: { available: number; total: number }
  apnea: { available: number; total: number }
  restless_leg: { available: number; total: number }
} {
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
