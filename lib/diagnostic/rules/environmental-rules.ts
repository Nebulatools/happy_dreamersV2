// Motor de Validacion G4: Factores Ambientales y Emocionales
// Evalua pantallas, temperatura, depresion, colecho, cambios importantes
// Basado en survey, notas de eventos y mensajes de chat

import {
  EnvironmentalGroupValidation,
  CriterionResult,
  StatusLevel,
  DataCompleteness,
} from "../types"

import {
  SCREEN_RULES,
  TEMP_RANGE,
  HUMIDITY_RANGE,
  ENVIRONMENTAL_FACTORS,
  detectChangeKeywords,
  isTemperatureInRange,
  exceedsScreenLimit,
  ChangeCategory,
} from "../environmental-rules"

// ─────────────────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────────────────

interface EnvironmentalValidationInput {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  surveyData: Record<string, any>
  recentEventNotes: string[] // Notas de eventos de ultimos 14 dias
  chatMessages: string[] // Mensajes de chat de ultimos 14 dias
}

interface FactorEvaluation {
  factorId: string
  criterion: CriterionResult
  detected: boolean
}

interface KeywordMatch {
  keyword: string
  category: ChangeCategory
  foundIn: string
}

// ─────────────────────────────────────────────────────────
// HELPERS PRIVADOS
// ─────────────────────────────────────────────────────────

// Evaluar tiempo de pantalla
function evaluateScreenTime(
  surveyData: Record<string, unknown>
): CriterionResult {
  const factor = ENVIRONMENTAL_FACTORS.screenTime
  const value = surveyData?.[factor.surveyField] as number | undefined

  // Si no hay dato, no disponible
  if (value === undefined || value === null) {
    return {
      id: "g4_screen_time",
      name: factor.name,
      status: "warning",
      value: null,
      expected: `≤ ${SCREEN_RULES.maxDailyMinutes} min/día`,
      message: "Dato de tiempo de pantalla no disponible",
      sourceType: "survey",
      sourceField: factor.surveyField,
      dataAvailable: false,
    }
  }

  const exceeds = exceedsScreenLimit(value)

  return {
    id: "g4_screen_time",
    name: factor.name,
    status: exceeds ? "alert" : "ok",
    value: `${value} min/día`,
    expected: `≤ ${SCREEN_RULES.maxDailyMinutes} min/día`,
    message: exceeds
      ? `Excede el límite recomendado de ${SCREEN_RULES.maxDailyMinutes} min/día`
      : "Dentro del rango recomendado",
    sourceType: "survey",
    sourceField: factor.surveyField,
    dataAvailable: true,
  }
}

// Evaluar temperatura del cuarto
function evaluateTemperature(
  surveyData: Record<string, unknown>
): CriterionResult {
  const factor = ENVIRONMENTAL_FACTORS.temperature
  const value = surveyData?.[factor.surveyField] as number | undefined

  if (value === undefined || value === null) {
    return {
      id: "g4_temperature",
      name: factor.name,
      status: "warning",
      value: null,
      expected: `${TEMP_RANGE.min}-${TEMP_RANGE.max}${TEMP_RANGE.unit}`,
      message: "Dato de temperatura no disponible",
      sourceType: "survey",
      sourceField: factor.surveyField,
      dataAvailable: false,
    }
  }

  const inRange = isTemperatureInRange(value)

  return {
    id: "g4_temperature",
    name: factor.name,
    status: inRange ? "ok" : "alert",
    value: `${value}${TEMP_RANGE.unit}`,
    expected: `${TEMP_RANGE.min}-${TEMP_RANGE.max}${TEMP_RANGE.unit}`,
    message: inRange
      ? "Temperatura dentro del rango óptimo"
      : `Temperatura fuera del rango óptimo (${TEMP_RANGE.min}-${TEMP_RANGE.max}${TEMP_RANGE.unit})`,
    sourceType: "survey",
    sourceField: factor.surveyField,
    dataAvailable: true,
  }
}

// Evaluar humedad del cuarto (pendiente Sprint 4B)
function evaluateHumidity(
  surveyData: Record<string, unknown>
): CriterionResult {
  const factor = ENVIRONMENTAL_FACTORS.humidity

  // Campo no disponible aun
  if (!factor.available) {
    return {
      id: "g4_humidity",
      name: factor.name,
      status: "warning",
      value: null,
      expected: `${HUMIDITY_RANGE.min}-${HUMIDITY_RANGE.max}${HUMIDITY_RANGE.unit}`,
      message: "Campo pendiente de implementación (Sprint 4B)",
      sourceType: "survey",
      sourceField: factor.surveyField,
      dataAvailable: false,
    }
  }

  const value = surveyData?.[factor.surveyField] as number | undefined

  if (value === undefined || value === null) {
    return {
      id: "g4_humidity",
      name: factor.name,
      status: "warning",
      value: null,
      expected: `${HUMIDITY_RANGE.min}-${HUMIDITY_RANGE.max}${HUMIDITY_RANGE.unit}`,
      message: "Dato de humedad no disponible",
      sourceType: "survey",
      sourceField: factor.surveyField,
      dataAvailable: false,
    }
  }

  const inRange = value >= HUMIDITY_RANGE.min && value <= HUMIDITY_RANGE.max

  return {
    id: "g4_humidity",
    name: factor.name,
    status: inRange ? "ok" : "warning", // Solo warning, no alert
    value: `${value}${HUMIDITY_RANGE.unit}`,
    expected: `${HUMIDITY_RANGE.min}-${HUMIDITY_RANGE.max}${HUMIDITY_RANGE.unit}`,
    message: inRange
      ? "Humedad dentro del rango óptimo"
      : `Humedad fuera del rango óptimo`,
    sourceType: "survey",
    sourceField: factor.surveyField,
    dataAvailable: true,
  }
}

// Evaluar depresion post-parto
function evaluatePostpartumDepression(
  surveyData: Record<string, unknown>
): CriterionResult {
  const factor = ENVIRONMENTAL_FACTORS.postpartumDepression
  const value = surveyData?.[factor.surveyField]

  if (value === undefined || value === null) {
    return {
      id: "g4_postpartum_depression",
      name: factor.name,
      status: "warning",
      value: null,
      expected: "No",
      message: "Dato de depresión post-parto no disponible",
      sourceType: "survey",
      sourceField: factor.surveyField,
      dataAvailable: false,
    }
  }

  // Detectar si es positivo (true, "si", "yes", etc.)
  let detected = false
  if (typeof value === "boolean") {
    detected = value
  } else if (typeof value === "string") {
    const normalized = value.toLowerCase().trim()
    detected = ["si", "sí", "yes", "true", "1"].includes(normalized)
  } else if (typeof value === "number") {
    detected = value > 0
  }

  return {
    id: "g4_postpartum_depression",
    name: factor.name,
    status: detected ? "alert" : "ok",
    value: detected ? "Detectada" : "No detectada",
    expected: "No",
    message: detected
      ? "Se detectaron indicadores de depresión post-parto. Derivar a profesional."
      : "Sin indicadores detectados",
    sourceType: "survey",
    sourceField: factor.surveyField,
    dataAvailable: true,
  }
}

// Evaluar colecho
function evaluateCosleeping(
  surveyData: Record<string, unknown>
): CriterionResult {
  const factor = ENVIRONMENTAL_FACTORS.cosleeping
  const value = surveyData?.[factor.surveyField] as string | undefined

  if (value === undefined || value === null) {
    return {
      id: "g4_cosleeping",
      name: factor.name,
      status: "warning",
      value: null,
      expected: "Cuna independiente",
      message: "Dato de arreglo de sueño no disponible",
      sourceType: "survey",
      sourceField: factor.surveyField,
      dataAvailable: false,
    }
  }

  // Detectar colecho en diferentes formatos
  const normalized = String(value).toLowerCase().trim()
  const isCosleeping =
    normalized.includes("colecho") ||
    normalized.includes("cama") && normalized.includes("padres") ||
    normalized.includes("misma cama") ||
    normalized.includes("co-sleep") ||
    normalized.includes("cosleep")

  return {
    id: "g4_cosleeping",
    name: factor.name,
    status: isCosleeping ? "warning" : "ok",
    value: value,
    expected: "Cuna independiente",
    message: isCosleeping
      ? "Colecho detectado. Informar sobre seguridad (SIDS)."
      : "Duerme en espacio independiente",
    sourceType: "survey",
    sourceField: factor.surveyField,
    dataAvailable: true,
  }
}

// Evaluar si comparte cuarto
function evaluateRoomSharing(
  surveyData: Record<string, unknown>
): CriterionResult {
  const factor = ENVIRONMENTAL_FACTORS.roomSharing
  const value = surveyData?.[factor.surveyField]

  if (value === undefined || value === null) {
    return {
      id: "g4_room_sharing",
      name: factor.name,
      status: "warning",
      value: null,
      expected: "Información registrada",
      message: "Dato de compartir cuarto no disponible",
      sourceType: "survey",
      sourceField: factor.surveyField,
      dataAvailable: false,
    }
  }

  // Detectar si comparte cuarto
  let sharesRoom = false
  if (typeof value === "boolean") {
    sharesRoom = value
  } else if (typeof value === "string") {
    const normalized = value.toLowerCase().trim()
    sharesRoom =
      normalized.includes("sí") ||
      normalized.includes("si") ||
      normalized === "yes" ||
      normalized === "true"
  }

  return {
    id: "g4_room_sharing",
    name: factor.name,
    status: sharesRoom ? "warning" : "ok",
    value: sharesRoom ? "Comparte cuarto" : "Cuarto individual",
    expected: "Información registrada",
    message: sharesRoom
      ? "El niño comparte cuarto con alguien más"
      : "El niño tiene cuarto individual",
    sourceType: "survey",
    sourceField: factor.surveyField,
    dataAvailable: true,
  }
}

// Evaluar cambios importantes recientes
function evaluateRecentChanges(
  surveyData: Record<string, unknown>,
  recentEventNotes: string[],
  chatMessages: string[]
): CriterionResult {
  const factor = ENVIRONMENTAL_FACTORS.recentChanges

  // Combinar todas las fuentes de texto
  const allTexts: string[] = []

  // Texto del survey
  const surveyValue = surveyData?.[factor.surveyField]
  if (surveyValue && typeof surveyValue === "string") {
    allTexts.push(surveyValue)
  }

  // Notas de eventos
  allTexts.push(...recentEventNotes.filter((n) => n && typeof n === "string"))

  // Mensajes de chat
  allTexts.push(...chatMessages.filter((m) => m && typeof m === "string"))

  // Buscar keywords
  const detectedKeywords = detectChangeKeywords(allTexts)

  if (detectedKeywords.length === 0) {
    return {
      id: "g4_recent_changes",
      name: factor.name,
      status: "ok",
      value: "Sin cambios detectados",
      expected: "Monitorear cambios",
      message: "No se detectaron cambios importantes recientes",
      sourceType: "calculated",
      dataAvailable: true,
    }
  }

  // Agrupar por categoria
  const categories = [...new Set(detectedKeywords.map((k) => k.category))]
  const keywordList = detectedKeywords.map((k) => k.keyword)

  return {
    id: "g4_recent_changes",
    name: factor.name,
    status: "alert",
    value: keywordList.join(", "),
    expected: "Monitorear cambios",
    message: `Cambios detectados en: ${categories.join(", ")}`,
    sourceType: "calculated",
    dataAvailable: true,
  }
}

// Calcular completitud de datos
function calculateEnvironmentalDataCompleteness(
  factors: Record<string, CriterionResult>
): DataCompleteness {
  const values = Object.values(factors)
  const available = values.filter((f) => f.dataAvailable).length
  const total = values.length
  const pending = values
    .filter((f) => !f.dataAvailable)
    .map((f) => f.name)

  return { available, total, pending }
}

// Determinar status general del grupo
function calculateOverallEnvironmentalStatus(
  factors: Record<string, CriterionResult>
): StatusLevel {
  const values = Object.values(factors)

  if (values.some((f) => f.status === "alert")) return "alert"
  if (values.some((f) => f.status === "warning")) return "warning"
  return "ok"
}

// Generar resumen del grupo
function generateEnvironmentalSummary(
  factors: Record<string, CriterionResult>,
  detectedKeywords: KeywordMatch[]
): string {
  const values = Object.values(factors)
  const alertCount = values.filter((f) => f.status === "alert").length
  const warningCount = values.filter((f) => f.status === "warning").length

  if (alertCount === 0 && warningCount === 0) {
    return "Entorno adecuado para el sueño."
  }

  const parts: string[] = []

  if (alertCount > 0) {
    parts.push(`${alertCount} factor(es) con alerta`)
  }
  if (warningCount > 0) {
    parts.push(`${warningCount} factor(es) con advertencia`)
  }
  if (detectedKeywords.length > 0) {
    parts.push(`${detectedKeywords.length} cambio(s) reciente(s) detectado(s)`)
  }

  return parts.join(". ") + "."
}

// ─────────────────────────────────────────────────────────
// FUNCION PRINCIPAL
// ─────────────────────────────────────────────────────────

export function validateEnvironmentalFactors(
  input: EnvironmentalValidationInput
): EnvironmentalGroupValidation {
  const { surveyData, recentEventNotes, chatMessages } = input

  // Evaluar cada factor
  const screenTime = evaluateScreenTime(surveyData)
  const temperature = evaluateTemperature(surveyData)
  const humidity = evaluateHumidity(surveyData)
  const postpartumDepression = evaluatePostpartumDepression(surveyData)
  const cosleeping = evaluateCosleeping(surveyData)
  const roomSharing = evaluateRoomSharing(surveyData)
  const recentChanges = evaluateRecentChanges(
    surveyData,
    recentEventNotes,
    chatMessages
  )

  // Agrupar factores
  const factors = {
    screenTime,
    temperature,
    humidity,
    postpartumDepression,
    cosleeping,
    roomSharing,
    recentChanges,
  }

  // Construir array de criterios
  const criteria: CriterionResult[] = Object.values(factors)

  // Calcular completitud
  const dataCompleteness = calculateEnvironmentalDataCompleteness(factors)

  // Status general
  const status = calculateOverallEnvironmentalStatus(factors)

  // Keywords detectadas
  const allTexts = [
    ...(surveyData?.[ENVIRONMENTAL_FACTORS.recentChanges.surveyField]
      ? [String(surveyData[ENVIRONMENTAL_FACTORS.recentChanges.surveyField])]
      : []),
    ...recentEventNotes,
    ...chatMessages,
  ]
  const keywordMatches = detectChangeKeywords(allTexts)
  const detectedKeywords = keywordMatches.map((k) => k.keyword)

  // Resumen
  const summary = generateEnvironmentalSummary(factors, keywordMatches)

  return {
    groupId: "G4",
    groupName: "Factores Ambientales",
    status,
    criteria,
    dataCompleteness,
    summary,
    detectedKeywords,
    factors,
  }
}

// ─────────────────────────────────────────────────────────
// HELPERS PUBLICOS
// ─────────────────────────────────────────────────────────

// Detectar keywords en textos (re-exportar)
export { detectChangeKeywords }

// Obtener factores disponibles/pendientes
export function getEnvironmentalFactorCounts(): {
  available: number
  total: number
  pending: string[]
} {
  const allFactors = Object.values(ENVIRONMENTAL_FACTORS)
  const available = allFactors.filter((f) => f.available).length
  const total = allFactors.length
  const pending = allFactors
    .filter((f) => !f.available)
    .map((f) => f.name)

  return { available, total, pending }
}
