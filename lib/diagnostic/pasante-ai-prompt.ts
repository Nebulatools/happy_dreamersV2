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
  // Sprint 4B: Texto libre para analisis extendido
  freeTextData?: {
    eventNotes: string[]     // Notas de eventos de los ultimos 14 dias
    chatMessages: string[]   // Mensajes de chat de los ultimos 14 dias
  }
}

// Etiquetas legibles para campos del survey (espanol)
// Permite que el AI vea nombres descriptivos en lugar de keys programaticos
const SURVEY_FIELD_LABELS: Record<string, string> = {
  // Informacion familiar
  nombrePapa: "Nombre del papa",
  nombreMama: "Nombre de la mama",
  edadPapa: "Edad del papa",
  edadMama: "Edad de la mama",
  ocupacionPapa: "Ocupacion del papa",
  ocupacionMama: "Ocupacion de la mama",
  tieneAlergias: "Tiene alergias",
  detalleAlergias: "Detalle de alergias",
  alergiasPadres: "Alergias en los padres",
  pensamientosNegativos: "Pensamientos negativos (mama)",
  postpartumDepression: "Indicador depresion post-parto",
  puedeDormir: "Mama puede dormir cuando bebe duerme",
  maternalSleep: "Sueno materno",

  // Dinamica familiar
  quienAtiende: "Quien atiende al bebe en la noche",
  nighttimeSupport: "Soporte nocturno",
  otrosResidentes: "Otros residentes en la casa",
  householdMembers: "Miembros del hogar",
  redApoyo: "Red de apoyo",
  quienCuida: "Quien cuida al bebe normalmente",

  // Historial
  problemaSueno: "Problema principal de sueno",
  desdeEdad: "Desde que edad tiene el problema",
  intentosPrevios: "Intentos previos de solucion",
  principalPreocupacion: "Principal preocupacion",
  recentChanges: "Cambios importantes recientes",

  // Desarrollo y salud
  reflujoColicos: "Reflujo o colicos",
  ronquidos: "Ronca al dormir",
  piernasInquietas: "Piernas inquietas",
  congestionNasal: "Congestion nasal frecuente",
  alergias: "Alergias del nino",
  medicamentos: "Medicamentos actuales",
  pesoHijo: "Peso del nino (kg)",
  percentilPeso: "Percentil de peso",
  tallaHijo: "Talla del nino",

  // Alimentacion
  alimentacion: "Tipo de alimentacion (pecho/biberon/mixta)",
  comeSolidos: "Come solidos",
  edadInicioSolidos: "Edad de inicio de solidos",
  comeVerduras: "Come verduras",
  comeFrutas: "Come frutas",
  comeProteinas: "Come proteinas",
  comeCarbohidratos: "Come carbohidratos",

  // Actividad fisica
  actividadFisica: "Nivel de actividad fisica",
  tiempoAireLibre: "Tiempo al aire libre",
  screenTime: "Tiempo de pantalla (min/dia)",

  // Rutina y habitos
  horaDormir: "Hora de dormir habitual",
  horaDespertar: "Hora de despertar habitual",
  rutinaNocturna: "Tiene rutina nocturna",
  detalleRutina: "Detalle de la rutina",
  dondeDuerme: "Donde duerme",
  sleepingArrangement: "Arreglo para dormir",
  comparteHabitacion: "Comparte habitacion",
  sharesRoom: "Comparte cuarto",
  temperaturaCuarto: "Temperatura del cuarto",
  roomTemperature: "Temperatura del cuarto (C)",
  humedadHabitacion: "Humedad de la habitacion",
  usaChupete: "Usa chupete/chupetero",
  objetoTransicional: "Objeto de transicion",
  numSiestas: "Numero de siestas",
  duracionSiesta: "Duracion promedio de siesta",
  despiertaNoche: "Se despierta en la noche",
  vecesDespierta: "Veces que despierta por noche",
  comoSeCalma: "Como se calma para dormir",
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
 * Sprint 4B: Construye el contexto de texto libre para analisis LLM extendido
 * Combina notas de eventos y mensajes de chat para que el LLM extraiga informacion
 */
function buildFreeTextContext(freeTextData?: PasanteContext["freeTextData"]): string {
  if (!freeTextData) return ""

  const sections: string[] = []

  // Notas de eventos (ultimos 14 dias)
  if (freeTextData.eventNotes && freeTextData.eventNotes.length > 0) {
    const filteredNotes = freeTextData.eventNotes
      .filter(note => note && note.trim().length > 0)
      .slice(0, 20) // Limitar a 20 notas mas recientes

    if (filteredNotes.length > 0) {
      sections.push(
        `## NOTAS DE EVENTOS (${filteredNotes.length} notas de los ultimos 14 dias):\n` +
        filteredNotes.map((note, i) => `${i + 1}. "${note}"`).join("\n")
      )
    }
  }

  // Mensajes de chat (ultimos 14 dias)
  if (freeTextData.chatMessages && freeTextData.chatMessages.length > 0) {
    const filteredMessages = freeTextData.chatMessages
      .filter(msg => msg && msg.trim().length > 0)
      .slice(0, 15) // Limitar a 15 mensajes

    if (filteredMessages.length > 0) {
      sections.push(
        `## MENSAJES DE CHAT (${filteredMessages.length} mensajes de los ultimos 14 dias):\n` +
        filteredMessages.map((msg, i) => `${i + 1}. "${msg}"`).join("\n")
      )
    }
  }

  if (sections.length === 0) return ""

  return "\n\nTEXTO LIBRE PARA ANALISIS:\n" + sections.join("\n\n")
}

/**
 * Construye el contexto del survey completo para el prompt del AI
 * Formatea los campos del survey con etiquetas legibles para que el modelo
 * pueda analizar TODA la informacion del cuestionario, no solo alertas.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildSurveyContext(surveyData?: Record<string, any>): string {
  if (!surveyData || Object.keys(surveyData).length === 0) {
    return ""
  }

  const lines: string[] = []

  for (const [key, value] of Object.entries(surveyData)) {
    // Saltar valores nulos, undefined o vacios
    if (value === null || value === undefined || value === "") continue

    // Saltar objetos anidados complejos (ya fueron aplanados por flattenSurveyData)
    if (typeof value === "object" && !Array.isArray(value)) continue

    // Obtener etiqueta legible o usar el key como fallback
    const label = SURVEY_FIELD_LABELS[key] || key

    // Formatear el valor
    let displayValue: string
    if (Array.isArray(value)) {
      displayValue = value.join(", ")
    } else if (typeof value === "boolean") {
      displayValue = value ? "Si" : "No"
    } else {
      displayValue = String(value)
    }

    lines.push(`- ${label}: ${displayValue}`)
  }

  if (lines.length === 0) return ""

  return `\n\nDATOS COMPLETOS DEL CUESTIONARIO (${lines.length} campos):\n` + lines.join("\n")
}

/**
 * Construye un resumen de TODOS los criterios evaluados (ok + warning + alert)
 * para dar al AI la imagen completa, no solo las alertas
 */
function buildAllCriteriaContext(result: DiagnosticResult): string {
  if (!result.groups) return ""

  const sections: string[] = []
  const groupNames: Record<string, string> = {
    G1: "Horario",
    G2: "Medico",
    G3: "Alimentacion",
    G4: "Ambiental",
  }

  for (const [groupId, groupName] of Object.entries(groupNames)) {
    const group = result.groups[groupId as keyof typeof result.groups]
    if (!group?.criteria || group.criteria.length === 0) continue

    const statusIcons: Record<string, string> = {
      ok: "[OK]",
      warning: "[ATENCION]",
      alert: "[ALERTA]",
    }

    const lines = group.criteria.map(c => {
      const icon = statusIcons[c.status] || "[?]"
      const available = c.dataAvailable ? "" : " (sin datos)"
      return `  ${icon} ${c.name}: ${c.value ?? "N/A"}${available}`
    })

    const completeness = group.dataCompleteness
      ? ` - Completitud: ${group.dataCompleteness.available}/${group.dataCompleteness.total}`
      : ""

    sections.push(
      `${groupId} - ${groupName} (${group.status.toUpperCase()})${completeness}:\n${lines.join("\n")}`
    )
  }

  if (sections.length === 0) return ""

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
  const allCriteriaContext = buildAllCriteriaContext(context.diagnosticResult)
  const diagnosticAlerts = buildDiagnosticContext(context.diagnosticResult)
  const surveyContext = buildSurveyContext(context.diagnosticResult.surveyData)
  const freeTextContext = buildFreeTextContext(context.freeTextData)
  const hasFreeText = context.freeTextData &&
    ((context.freeTextData.eventNotes?.length || 0) > 0 ||
     (context.freeTextData.chatMessages?.length || 0) > 0)
  const hasSurvey = !!surveyContext

  // Nivel de datos disponible
  const dataLevel = context.diagnosticResult.dataLevel
  const dataLevelLabel = dataLevel === "full"
    ? "Completo (encuesta + eventos + plan)"
    : dataLevel === "survey_events"
    ? "Parcial (encuesta + eventos, sin plan)"
    : "Minimo (solo encuesta)"

  return `Eres el Pasante AI de Happy Dreamers, un asistente que ayuda a Mariana,
especialista en sueno, a interpretar el diagnostico de sueno de los ninos.

PERFIL DEL PACIENTE:
- Nombre: ${context.childName}
- Edad: ${ageFormatted}
- Plan activo: Version ${context.planVersion} (${context.planStatus})
- Eventos registrados: ${context.recentEventsCount} en los ultimos 7 dias
- Nivel de datos: ${dataLevelLabel}
${context.diagnosticResult.missingDataSources?.length > 0
    ? `- Datos faltantes: ${context.diagnosticResult.missingDataSources.join(", ")}`
    : "- Todos los datos disponibles"}

EVALUACION COMPLETA POR GRUPO (todos los criterios evaluados):
${allCriteriaContext}

${diagnosticAlerts !== "No se detectaron alertas significativas en ninguno de los 4 grupos de validacion."
    ? `\nALERTAS Y ADVERTENCIAS:\n${diagnosticAlerts}`
    : "\nNo se detectaron alertas significativas."}
${surveyContext}
${freeTextContext}

TU MISION:
1. Genera un RESUMEN DESCRIPTIVO que explique QUE esta pasando y POR QUE
2. Cruza informacion entre los 4 grupos Y los datos del cuestionario para encontrar patrones
3. Ofrece RECOMENDACIONES GENERALES de accion
${hasSurvey ? `4. Usa los DATOS DEL CUESTIONARIO para enriquecer tu analisis:
   - Correlaciona respuestas del cuestionario con alertas de los grupos
   - Identifica factores de riesgo que los validadores automaticos no detectan
   - Presta atencion a la dinamica familiar, red de apoyo, e historial del problema` : ""}
${hasFreeText ? `${hasSurvey ? "5" : "4"}. IMPORTANTE: Analiza el TEXTO LIBRE (notas y chat) para detectar:
   - Sintomas medicos mencionados (vomitos, llanto al comer, piernas inquietas, etc.)
   - Cambios recientes en la familia (mudanza, hermanito, guarderia, viaje)
   - Patrones emocionales o de comportamiento
   - Cualquier informacion relevante para los 4 grupos de validacion` : ""}

REGLAS ESTRICTAS:
- NO des recomendaciones medicas directas (ej: "debe tomar X medicamento")
- NO des ajustes especificos del plan (ej: "cambiar bedtime a 7:30 PM")
- NO uses lenguaje tecnico complejo
- SI puedes sugerir que la especialista "considere revisar" o "evalue" algo
- SI puedes explicar correlaciones entre grupos (ej: reflujo afecta sueno nocturno)
- NO infieras condiciones medicas si el cuestionario no las marca o no hay evidencia directa.
  - En particular: si el cuestionario NO marca "Reflujo o colicos", NO menciones reflujo ni lo sugieras.
  - Solo menciona reflujo si esta marcado en cuestionario, hay sintomas de reflujo en detalles,
    o el texto libre lo menciona explicitamente.
- Para despertares, usa terminologia precisa:
  - "Despertares al inicio de la noche" (primeras horas tras acostarse).
  - "Early Rising" (despertar muy temprano en la manana, ej. 5:00 AM).
  - Evita el termino ambiguo "despertares tempranos".
- Si hay conflicto entre criterios calculados por eventos y datos del cuestionario,
  prioriza el cuestionario y explica la falta de registros en eventos.
${hasSurvey ? `- SI puedes mencionar datos relevantes del cuestionario que los validadores no capturan` : ""}
${hasFreeText ? `- SI encontraste algo relevante en el texto libre, mencionalo como "hallazgo del texto"` : ""}
- Maximo 400 palabras

FORMATO DE RESPUESTA:
Escribe en parrafos cortos (2-4 maximo).
Primero describe la situacion general.
${hasSurvey ? `Si hay datos del cuestionario relevantes, integralos en tu analisis.` : ""}
${hasFreeText ? `Si hay hallazgos del texto libre, mencionalos en una seccion aparte: "Hallazgos del texto libre:"` : ""}
Luego ofrece 2-4 recomendaciones generales como lista.

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
 *
 * Sprint 4B: Actualizado a gpt-5
 * - Mejor modelo de OpenAI para analisis medico
 * - "Consistently outperforms all baselines in medical QA"
 * - Contexto de 400k tokens
 * - Costo estimado: ~$0.05/analisis con 8000 tokens
 * - On-demand (solo cuando admin hace click)
 *
 * Nota: GPT-5 usa reasoning tokens internamente, necesita mas tokens
 * para tener espacio tanto para razonamiento como para respuesta
 */
export const PASANTE_AI_CONFIG = {
  model: "gpt-5" as const,
  maxTokens: 8000, // GPT-5 necesita mas tokens (reasoning + respuesta)
}
