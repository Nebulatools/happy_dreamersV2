/**
 * Prompt del Pasante AI para el Panel de Diagnostico
 *
 * El Pasante AI genera resumenes descriptivos + recomendaciones generales
 * que contextualizan las alertas cruzando datos de los 4 grupos.
 *
 * IMPORTANTE:
 * - NO da recomendaciones medicas directas
 * - NO da ajustes especificos del plan (eso es trabajo de Mariana)
 * - SI explica QUE esta pasando y POR QUE
 * - SI sugiere acciones generales
 */

import type { DiagnosticResult, CriterionResult } from "./types"

/**
 * Contexto estructurado para el Pasante AI
 */
export interface PasanteContext {
  childName: string
  childAgeMonths: number
  planVersion: string
  planStatus: string
  diagnosticResult: DiagnosticResult
  recentEventsCount: number
  surveyDataAvailable: boolean
}

/**
 * Formatea la edad del nino para el prompt
 */
function formatAge(ageMonths: number): string {
  if (ageMonths < 12) {
    return `${ageMonths} meses`
  }
  const years = Math.floor(ageMonths / 12)
  const months = ageMonths % 12
  if (months === 0) {
    return `${years} ${years === 1 ? "ano" : "anos"}`
  }
  return `${years} ${years === 1 ? "ano" : "anos"} y ${months} meses`
}

/**
 * Extrae criterios con alerta o warning de un grupo
 */
function extractAlertCriteria(criteria: CriterionResult[]): CriterionResult[] {
  return criteria.filter(c => c.status === "alert" || c.status === "warning")
}

/**
 * Formatea un criterio para el prompt
 */
function formatCriterion(criterion: CriterionResult): string {
  const statusIcon = criterion.status === "alert" ? "[ALERTA]" : "[ATENCION]"
  const availability = criterion.dataAvailable
    ? ""
    : " (datos no disponibles)"
  return `${statusIcon} ${criterion.name}: ${criterion.value}${availability}`
}

/**
 * Construye el contexto de diagnostico para el prompt
 * Accede a result.groups.G1, G2, G3, G4 segun el tipo DiagnosticResult
 */
function buildDiagnosticContext(result: DiagnosticResult): string {
  const sections: string[] = []

  // Verificar que groups existe
  if (!result.groups) {
    return "No hay datos de diagnostico disponibles."
  }

  // G1 - Horario
  const g1 = result.groups.G1
  if (g1?.criteria) {
    const g1Alerts = extractAlertCriteria(g1.criteria)
    if (g1Alerts.length > 0) {
      sections.push(
        `## G1 - Horario (${g1.status.toUpperCase()}):\n` +
        g1Alerts.map(c => `- ${formatCriterion(c)}`).join("\n")
      )
    }
  }

  // G2 - Medico
  const g2 = result.groups.G2
  if (g2?.criteria) {
    const g2Alerts = extractAlertCriteria(g2.criteria)
    const hasPendingData = g2.dataCompleteness?.pending?.length > 0
    if (g2Alerts.length > 0 || hasPendingData) {
      let g2Section = `## G2 - Medico (${g2.status.toUpperCase()}):\n`
      if (g2Alerts.length > 0) {
        g2Section += g2Alerts.map(c => `- ${formatCriterion(c)}`).join("\n")
      }
      if (hasPendingData) {
        g2Section += `\n- Datos pendientes: ${g2.dataCompleteness.pending.length} indicadores sin recolectar`
      }
      sections.push(g2Section)
    }
  }

  // G3 - Alimentacion
  const g3 = result.groups.G3
  if (g3?.criteria) {
    const g3Alerts = extractAlertCriteria(g3.criteria)
    if (g3Alerts.length > 0) {
      sections.push(
        `## G3 - Alimentacion (${g3.status.toUpperCase()}):\n` +
        g3Alerts.map(c => `- ${formatCriterion(c)}`).join("\n")
      )
    }
  }

  // G4 - Ambiental
  const g4 = result.groups.G4
  if (g4?.criteria) {
    const g4Alerts = extractAlertCriteria(g4.criteria)
    if (g4Alerts.length > 0) {
      let g4Section = `## G4 - Ambiental (${g4.status.toUpperCase()}):\n`
      g4Section += g4Alerts.map(c => `- ${formatCriterion(c)}`).join("\n")
      // detectedKeywords solo existe en EnvironmentalGroupValidation
      const g4WithKeywords = g4 as { detectedKeywords?: string[] }
      if (g4WithKeywords.detectedKeywords && g4WithKeywords.detectedKeywords.length > 0) {
        g4Section += `\n- Cambios recientes detectados: ${g4WithKeywords.detectedKeywords.join(", ")}`
      }
      sections.push(g4Section)
    }
  }

  // Si no hay alertas en ningun grupo
  if (sections.length === 0) {
    return "No se detectaron alertas significativas en ninguno de los 4 grupos de validacion."
  }

  return sections.join("\n\n")
}

/**
 * Genera el system prompt para el Pasante AI
 *
 * @param context - Contexto estructurado del nino y su diagnostico
 * @returns System prompt para OpenAI
 */
export function getPasanteSystemPrompt(context: PasanteContext): string {
  const ageFormatted = formatAge(context.childAgeMonths)
  const diagnosticContext = buildDiagnosticContext(context.diagnosticResult)

  return `Eres el Pasante AI de Happy Dreamers, un asistente que ayuda a la Dra. Mariana
a interpretar el diagnostico de sueno de los ninos.

PERFIL DEL PACIENTE:
- Nombre: ${context.childName}
- Edad: ${ageFormatted}
- Plan activo: Version ${context.planVersion} (${context.planStatus})
- Eventos registrados: ${context.recentEventsCount} en los ultimos 7 dias
- Datos de cuestionario: ${context.surveyDataAvailable ? "Disponibles" : "No disponibles"}

DIAGNOSTICO ACTUAL:
${diagnosticContext}

TU MISION:
1. Genera un RESUMEN DESCRIPTIVO que explique QUE esta pasando y POR QUE
2. Cruza informacion entre los 4 grupos para encontrar patrones
3. Ofrece RECOMENDACIONES GENERALES de accion

REGLAS ESTRICTAS:
- NO des recomendaciones medicas directas (ej: "debe tomar X medicamento")
- NO des ajustes especificos del plan (ej: "cambiar bedtime a 7:30 PM")
- NO uses lenguaje tecnico complejo
- SI puedes sugerir que la doctora "considere revisar" o "evalue" algo
- SI puedes explicar correlaciones entre grupos (ej: reflujo afecta sueno nocturno)
- Maximo 200 palabras

FORMATO DE RESPUESTA:
Escribe en parrafos cortos (2-3 maximo).
Primero describe la situacion.
Luego ofrece 2-3 recomendaciones generales como lista.

EJEMPLO DE BUENA RESPUESTA:
"El nino presenta un patron de siestas cortas (<45 min) combinado con despertares
frecuentes en la segunda parte de la noche. Se detectaron indicadores de reflujo
(vomito frecuente, congestion nasal) que podrian estar afectando la calidad del sueno.

Recomendaciones generales:
- Considera revisar las ventanas de vigilia, actualmente podrian ser cortas para su edad
- El reflujo podria estar relacionado con los despertares nocturnos
- Evalua si el patron de alimentacion nocturna esta conectado con los sintomas de reflujo"

Responde en espanol. Se conciso y util.`
}

/**
 * Genera el user prompt basado en lo que queremos que analice
 */
export function getPasanteUserPrompt(
  additionalContext?: string
): string {
  const base = "Analiza el diagnostico del nino y genera un resumen ejecutivo con recomendaciones generales."

  if (additionalContext) {
    return `${base}\n\nContexto adicional: ${additionalContext}`
  }

  return base
}

/**
 * Configuracion recomendada para la llamada a OpenAI
 * Usa gpt-4o-mini que es el mismo modelo del sistema RAG que funciona correctamente
 */
export const PASANTE_AI_CONFIG = {
  model: "gpt-4o-mini" as const,
  maxTokens: 400,
  temperature: 0.7,
  presencePenalty: 0.1,
  frequencyPenalty: 0.1,
}
