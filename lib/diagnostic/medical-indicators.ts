// Indicadores medicos para el Panel de Diagnostico (G2)
// Cada indicador puede venir del survey o calcularse de eventos
// Con 1 solo indicador detectado ya se dispara alerta

import { MedicalIndicatorConfig, MedicalCondition } from "./types"

// Umbral de activacion: 1 solo indicador dispara alerta
export const MEDICAL_ALERT_THRESHOLD = 1

// Caducidad de datos del survey (dias)
export const SURVEY_DATA_EXPIRY_DAYS = 30

// ─────────────────────────────────────────────────────────
// INDICADORES DE REFLUJO
// Campos disponibles en survey actual: 4 de 9
// ─────────────────────────────────────────────────────────

export const REFLUX_INDICATORS: MedicalIndicatorConfig[] = [
  {
    id: "reflux_colicos",
    name: "Reflujo/cólicos",
    description: "El niño presenta reflujo o cólicos frecuentes",
    condition: "reflujo" as MedicalCondition,
    surveyField: "reflujoColicos",
    available: true, // linea 74 CSV
  },
  {
    id: "reflux_percentil_bajo",
    name: "Percentil bajo de peso",
    description: "El niño está por debajo del percentil esperado de peso",
    condition: "reflujo" as MedicalCondition,
    surveyField: "percentilBajo",
    available: true, // linea 39 CSV
  },
  {
    id: "reflux_congestion_nasal",
    name: "Congestión nasal",
    description: "Presenta congestión nasal frecuente",
    condition: "reflujo" as MedicalCondition,
    surveyField: "congestionNasal",
    available: true, // linea 83 CSV
  },
  {
    id: "reflux_dermatitis",
    name: "Dermatitis/eczema",
    description: "Presenta dermatitis o eczema",
    condition: "reflujo" as MedicalCondition,
    surveyField: "dermatitisEczema",
    available: true, // linea 84 CSV
  },
  {
    id: "reflux_posicion_vertical",
    name: "Solo tolera posición vertical",
    description: "Solo tolera estar en posición vertical",
    condition: "reflujo" as MedicalCondition,
    surveyField: "posicionVertical",
    available: false, // Pendiente sprint 4B
  },
  {
    id: "reflux_llora_despertar",
    name: "Llora al despertar",
    description: "Llora al despertar y nada lo calma más que el pecho",
    condition: "reflujo" as MedicalCondition,
    surveyField: "lloraDespertar",
    available: false, // Pendiente sprint 4B
  },
  {
    id: "reflux_vomita_frecuente",
    name: "Vomita frecuentemente",
    description: "Vomita con frecuencia después de comer",
    condition: "reflujo" as MedicalCondition,
    surveyField: "vomitaFrecuente",
    available: false, // Pendiente sprint 4B
  },
  {
    id: "reflux_tomas_frecuentes",
    name: "Tomas muy frecuentes",
    description: "Tomas de pecho muy frecuentes (cada 45-60 min)",
    condition: "reflujo" as MedicalCondition,
    surveyField: "tomasFrecuentes",
    available: false, // Pendiente sprint 4B
  },
  {
    id: "reflux_irritable",
    name: "Irritable frecuentemente",
    description: "El niño se muestra irritable con frecuencia",
    condition: "reflujo" as MedicalCondition,
    surveyField: "irritable",
    available: true, // linea 90 CSV
  },
  {
    id: "reflux_factor_hereditario",
    name: "Factor hereditario",
    description: "Los padres tienen historial de alergias",
    condition: "reflujo" as MedicalCondition,
    surveyField: "alergiasPadres",
    available: true, // lineas 12, 23 CSV
  },
]

// ─────────────────────────────────────────────────────────
// INDICADORES DE APNEA / ALERGIAS
// Campos disponibles en survey actual: 10 de 12
// ─────────────────────────────────────────────────────────

export const APNEA_INDICATORS: MedicalIndicatorConfig[] = [
  {
    id: "apnea_congestion_nasal",
    name: "Congestión nasal",
    description: "Presenta congestión nasal frecuente",
    condition: "apnea" as MedicalCondition,
    surveyField: "congestionNasal",
    available: true, // linea 83 CSV
  },
  {
    id: "apnea_infecciones_oido",
    name: "Infecciones de oído",
    description: "Sufre de infecciones de oído frecuentes",
    condition: "apnea" as MedicalCondition,
    surveyField: "infeccionesOido",
    available: true, // linea 80 CSV
  },
  {
    id: "apnea_ronca",
    name: "Ronca",
    description: "El niño ronca durante el sueño",
    condition: "apnea" as MedicalCondition,
    surveyField: "ronca",
    available: true, // linea 68 CSV
  },
  {
    id: "apnea_dermatitis",
    name: "Dermatitis/eczema",
    description: "Presenta dermatitis o eczema",
    condition: "apnea" as MedicalCondition,
    surveyField: "dermatitisEczema",
    available: true, // linea 84 CSV
  },
  {
    id: "apnea_respira_boca",
    name: "Respira por la boca",
    description: "Respira por la boca en lugar de la nariz",
    condition: "apnea" as MedicalCondition,
    surveyField: "respiraBoca",
    available: true, // linea 69 CSV
  },
  {
    id: "apnea_inquieto_segunda_parte",
    name: "Inquieto segunda parte noche",
    description: "Está inquieto durante la segunda parte de la noche",
    condition: "apnea" as MedicalCondition,
    surveyField: "inquietoSegundaParte",
    available: true, // linea 72 CSV
  },
  {
    id: "apnea_sudoracion",
    name: "Sudoración nocturna",
    description: "Presenta sudoración excesiva durante la noche",
    condition: "apnea" as MedicalCondition,
    surveyField: "sudoracionNocturna",
    available: true, // linea 73 CSV
  },
  {
    id: "apnea_mucha_pipi",
    name: "Mucha pipí en la noche",
    description: "Orina frecuentemente durante la noche",
    condition: "apnea" as MedicalCondition,
    surveyField: "muchaPipiNoche",
    available: true, // linea 66 CSV
  },
  {
    id: "apnea_insomnio",
    name: "Insomnio",
    description: "Presenta dificultad para conciliar o mantener el sueño",
    condition: "apnea" as MedicalCondition,
    // Este se detecta de eventos de la bitácora
    eventCheck: (events: Record<string, unknown>[]) => {
      // Detectar insomnio: despertar y no volver a dormir por mas de 30 min
      const nightWakings = events.filter(
        (e) => e.eventType === "night_waking"
      )
      // Si hay multiples despertares nocturnos con awakeDelay > 30
      return nightWakings.some(
        (e) => typeof e.awakeDelay === "number" && e.awakeDelay > 30
      )
    },
    available: true, // Calculado de eventos
  },
  {
    id: "apnea_despertares_segunda_parte",
    name: "Despertares aumentan en segunda parte",
    description: "Los despertares aumentan en frecuencia en la segunda parte de la noche",
    condition: "apnea" as MedicalCondition,
    // Este se detecta de eventos de la bitácora
    eventCheck: (events: Record<string, unknown>[]) => {
      // Detectar si hay mas despertares despues de las 3AM que antes
      const nightWakings = events.filter(
        (e) => e.eventType === "night_waking" && e.startTime
      )
      if (nightWakings.length < 2) return false

      const before3am = nightWakings.filter((e) => {
        const hour = new Date(e.startTime as string).getHours()
        return hour < 3
      })
      const after3am = nightWakings.filter((e) => {
        const hour = new Date(e.startTime as string).getHours()
        return hour >= 3 && hour < 7
      })

      return after3am.length > before3am.length
    },
    available: true, // Calculado de eventos
  },
  {
    id: "apnea_despierta_asustado",
    name: "Despierta asustado",
    description: "Se despierta asustado durante la noche",
    condition: "apnea" as MedicalCondition,
    surveyField: "despiertaAsustado",
    available: false, // Pendiente sprint 4B
  },
  {
    id: "apnea_pesadillas",
    name: "Pesadillas al final de la noche",
    description: "Tiene pesadillas hacia el final de la noche",
    condition: "apnea" as MedicalCondition,
    surveyField: "pesadillasFinNoche",
    available: true, // linea 76 CSV
  },
]

// ─────────────────────────────────────────────────────────
// INDICADORES DE RESTLESS LEG SYNDROME
// Campos disponibles en survey actual: 3 de 6
// ─────────────────────────────────────────────────────────

export const RESTLESS_LEG_INDICATORS: MedicalIndicatorConfig[] = [
  {
    id: "restless_siestas_desorganizadas",
    name: "Siestas desorganizadas",
    description: "Siestas cortas o sin horario predecible",
    condition: "restless_leg" as MedicalCondition,
    // Calcular de eventos: siestas menores a 30 min o variacion > 2h en horario
    eventCheck: (events: Record<string, unknown>[]) => {
      const naps = events.filter((e) => e.eventType === "nap")
      if (naps.length < 3) return false

      // Detectar siestas cortas (< 30 min)
      const shortNaps = naps.filter(
        (n) => typeof n.duration === "number" && n.duration < 30
      )
      if (shortNaps.length >= 2) return true

      // Detectar variacion grande en horarios
      const napHours = naps
        .filter((n) => n.startTime)
        .map((n) => new Date(n.startTime as string).getHours())
      if (napHours.length < 3) return false

      const minHour = Math.min(...napHours)
      const maxHour = Math.max(...napHours)
      return maxHour - minHour > 2 // Variacion > 2 horas
    },
    available: true, // Calculado de eventos
  },
  {
    id: "restless_inquieto_primera_parte",
    name: "Inquieto primera parte noche",
    description: "Está inquieto durante la primera parte de la noche",
    condition: "restless_leg" as MedicalCondition,
    surveyField: "inquietoPrimeraParte",
    available: true, // linea 71 CSV
  },
  {
    id: "restless_terrores_nocturnos",
    name: "Terrores nocturnos",
    description: "Presenta terrores nocturnos al principio de la noche",
    condition: "restless_leg" as MedicalCondition,
    surveyField: "terroresNocturnos",
    available: true, // linea 76 CSV
  },
  {
    id: "restless_tarda_dormirse",
    name: "Tarda más de 30 min en dormirse",
    description: "Le toma más de 30 minutos conciliar el sueño",
    condition: "restless_leg" as MedicalCondition,
    surveyField: "tardaDormirse",
    available: true, // linea 109 CSV
  },
  {
    id: "restless_patalea",
    name: "Patalea al dormirse",
    description: "Patalea mientras intenta dormirse",
    condition: "restless_leg" as MedicalCondition,
    surveyField: "pataleaDormirse",
    available: false, // Pendiente sprint 4B
  },
  {
    id: "restless_actividad_bedtime",
    name: "Busca actividad física en bedtime",
    description: "Busca caminar, gatear o pararse en bedtime",
    condition: "restless_leg" as MedicalCondition,
    surveyField: "actividadBedtime",
    available: false, // Pendiente sprint 4B
  },
]

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

// Obtener todos los indicadores de una condicion
export function getIndicatorsForCondition(
  condition: MedicalCondition
): MedicalIndicatorConfig[] {
  switch (condition) {
  case "reflujo":
    return REFLUX_INDICATORS
  case "apnea":
    return APNEA_INDICATORS
  case "restless_leg":
    return RESTLESS_LEG_INDICATORS
  default:
    return []
  }
}

// Obtener indicadores disponibles (con datos en survey actual)
export function getAvailableIndicators(
  condition: MedicalCondition
): MedicalIndicatorConfig[] {
  return getIndicatorsForCondition(condition).filter((i) => i.available)
}

// Obtener indicadores pendientes (sin datos en survey actual)
export function getPendingIndicators(
  condition: MedicalCondition
): MedicalIndicatorConfig[] {
  return getIndicatorsForCondition(condition).filter((i) => !i.available)
}

// Obtener todos los indicadores agrupados
export function getAllMedicalIndicators(): {
reflujo: MedicalIndicatorConfig[]
apnea: MedicalIndicatorConfig[]
restless_leg: MedicalIndicatorConfig[]
} {
  return {
    reflujo: REFLUX_INDICATORS,
    apnea: APNEA_INDICATORS,
    restless_leg: RESTLESS_LEG_INDICATORS,
  }
}

// Verificar si los datos del survey estan expirados
export function isSurveyDataExpired(surveyUpdatedAt: Date | string): boolean {
  const updatedAt =
    typeof surveyUpdatedAt === "string"
      ? new Date(surveyUpdatedAt)
      : surveyUpdatedAt
  const now = new Date()
  const diffDays =
    (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays > SURVEY_DATA_EXPIRY_DAYS
}
