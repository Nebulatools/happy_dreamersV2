// Constantes y reglas para validacion ambiental (G4)
// Fuente: SPEC-SPRINT.md seccion "Grupo 4: Ambiental / Emocional"

// ============================================================================
// REGLAS DE PANTALLAS
// ============================================================================

/**
 * Reglas de exposicion a pantallas
 * - maxDailyMinutes: Maximo minutos de pantalla en el dia
 * - noScreenBeforeBedtimeHours: Horas antes de bedtime sin pantallas
 * - surveyField: Campo del survey donde se captura esta info
 */
export const SCREEN_RULES = {
  maxDailyMinutes: 60, // Mas de 1 hora es alerta
  noScreenBeforeBedtimeHours: 2, // 2 horas antes de bedtime
  surveyField: "screenTime", // Linea 87 CSV
} as const

// ============================================================================
// RANGO DE TEMPERATURA
// ============================================================================

/**
 * Rango optimo de temperatura del cuarto (en Celsius)
 * Fuera del rango dispara alerta
 */
export const TEMP_RANGE = {
  min: 22, // °C
  max: 25, // °C
  unit: "°C" as const,
  surveyField: "roomTemperature", // Linea 102 CSV
} as const

// ============================================================================
// RANGO DE HUMEDAD
// ============================================================================

/**
 * Rango optimo de humedad del cuarto (en porcentaje)
 * Fuera del rango dispara sugerencia (no alerta critica)
 * NOTA: Este campo aun no existe en el survey (pendiente Sprint 4B)
 */
export const HUMIDITY_RANGE = {
  min: 40, // %
  max: 60, // %
  unit: "%" as const,
  surveyField: "roomHumidity", // Pendiente Sprint 4B
  available: false, // Campo no disponible aun
} as const

// ============================================================================
// KEYWORDS PARA DETECCION DE CAMBIOS
// ============================================================================

/**
 * Keywords para detectar cambios importantes en texto libre
 * Se buscan en:
 * - Campo `notes` de eventos recientes (ultimos 14 dias)
 * - Mensajes de chat recientes
 *
 * Busqueda: case-insensitive, substring match
 */
export const CHANGE_KEYWORDS = {
  // Kinder / Guarderia
  school: [
    "kinder",
    "kínder",
    "kindergarten",
    "guarderia",
    "guardería",
    "escuela",
    "preescolar",
    "daycare",
    "colegio",
    "maternal",
  ],

  // Hermanitos
  sibling: [
    "hermano",
    "hermanito",
    "hermana",
    "hermanita",
    "bebé nuevo",
    "bebe nuevo",
    "nacimiento",
    "embarazo",
    "embarazada",
    "nuevo bebé",
    "nuevo bebe",
  ],

  // Mudanza
  moving: [
    "mudanza",
    "mudarnos",
    "mudamos",
    "cambio de casa",
    "nueva casa",
    "nuevo departamento",
    "nuevo depto",
    "nueva ciudad",
    "nos movemos",
    "nos mudamos",
  ],

  // Cambios familiares
  family: [
    "separación",
    "separacion",
    "divorcio",
    "divorciando",
    "papá se fue",
    "papa se fue",
    "mamá se fue",
    "mama se fue",
    "abuelos",
    "viaje largo",
  ],

  // Viajes / Vacaciones
  travel: [
    "viaje",
    "viajamos",
    "vacaciones",
    "vuelo",
    "avión",
    "avion",
    "jet lag",
    "cambio de horario",
    "regresamos de",
  ],

  // Salud
  health: [
    "enfermedad",
    "enfermo",
    "enfermita",
    "enfermito",
    "hospital",
    "doctor",
    "pediatra",
    "fiebre",
    "gripa",
    "gripe",
    "catarro",
    "resfriado",
    "infección",
    "infeccion",
    "antibiótico",
    "antibiotico",
    "vacuna",
    "dientes",
    "dentición",
    "denticion",
  ],
} as const

// Tipo para categorias de cambio
export type ChangeCategory = keyof typeof CHANGE_KEYWORDS

// Array plano de todas las keywords para busqueda rapida
export const ALL_CHANGE_KEYWORDS: string[] = Object.values(CHANGE_KEYWORDS).flat()

// ============================================================================
// FACTORES AMBIENTALES
// ============================================================================

/**
 * Configuracion de factores ambientales evaluados en G4
 * Cada factor tiene su campo del survey y tipo de alerta
 */
export const ENVIRONMENTAL_FACTORS = {
  screenTime: {
    id: "screenTime",
    name: "Tiempo de pantalla",
    description: "Exposicion a pantallas durante el dia",
    surveyField: "screenTime", // Linea 87 CSV
    alertType: "alert" as const,
    available: true,
  },
  temperature: {
    id: "temperature",
    name: "Temperatura del cuarto",
    description: "Temperatura ambiental donde duerme",
    surveyField: "roomTemperature", // Linea 102 CSV
    alertType: "alert" as const,
    available: true,
  },
  humidity: {
    id: "humidity",
    name: "Humedad del cuarto",
    description: "Humedad relativa donde duerme",
    surveyField: "roomHumidity", // Pendiente Sprint 4B
    alertType: "warning" as const, // Sugerencia, no alerta critica
    available: false, // Campo no disponible aun
  },
  postpartumDepression: {
    id: "postpartumDepression",
    name: "Depresión post-parto",
    description: "Indicadores de depresion post-parto en los padres",
    surveyField: "postpartumDepression", // Lineas 24-26 CSV
    alertType: "alert" as const, // Siempre referir
    available: true,
  },
  cosleeping: {
    id: "cosleeping",
    name: "Colecho",
    description: "El nino duerme en la misma cama que los padres",
    surveyField: "sleepingArrangement", // Linea 106 CSV
    alertType: "warning" as const, // Informativo (SIDS)
    available: true,
  },
  roomSharing: {
    id: "roomSharing",
    name: "Comparte cuarto",
    description: "El nino comparte cuarto con alguien mas",
    surveyField: "sharesRoom", // Linea 107 CSV
    alertType: "warning" as const, // Informativo
    available: true,
  },
  recentChanges: {
    id: "recentChanges",
    name: "Cambios importantes recientes",
    description: "Eventos significativos que pueden afectar el sueno",
    surveyField: "recentChanges", // Linea 126 CSV
    alertType: "alert" as const,
    available: true,
  },
} as const

// Tipo para IDs de factores ambientales
export type EnvironmentalFactorId = keyof typeof ENVIRONMENTAL_FACTORS

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Valida si la temperatura esta dentro del rango optimo
 * @param tempCelsius Temperatura en Celsius
 * @returns true si esta dentro del rango, false si no
 */
export function isTemperatureInRange(tempCelsius: number): boolean {
  return tempCelsius >= TEMP_RANGE.min && tempCelsius <= TEMP_RANGE.max
}

/**
 * Valida si la humedad esta dentro del rango optimo
 * @param humidityPercent Humedad en porcentaje
 * @returns true si esta dentro del rango, false si no
 */
export function isHumidityInRange(humidityPercent: number): boolean {
  return humidityPercent >= HUMIDITY_RANGE.min && humidityPercent <= HUMIDITY_RANGE.max
}

/**
 * Valida si el tiempo de pantalla excede el limite diario
 * @param screenMinutes Minutos de pantalla en el dia
 * @returns true si excede el limite, false si no
 */
export function exceedsScreenLimit(screenMinutes: number): boolean {
  return screenMinutes > SCREEN_RULES.maxDailyMinutes
}

/**
 * Busca keywords de cambios en un array de textos
 * @param texts Array de strings donde buscar (notas de eventos, mensajes de chat)
 * @returns Array de keywords encontradas con su categoria
 */
export function detectChangeKeywords(texts: string[]): Array<{
  keyword: string
  category: ChangeCategory
  foundIn: string
}> {
  const results: Array<{
    keyword: string
    category: ChangeCategory
    foundIn: string
  }> = []

  // Unir todos los textos y convertir a minusculas
  for (const text of texts) {
    if (!text || typeof text !== "string") continue

    const lowerText = text.toLowerCase()

    // Buscar en cada categoria
    for (const [category, keywords] of Object.entries(CHANGE_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          // Evitar duplicados del mismo keyword
          const alreadyFound = results.some(
            (r) => r.keyword === keyword && r.category === category
          )
          if (!alreadyFound) {
            results.push({
              keyword,
              category: category as ChangeCategory,
              foundIn: text.substring(0, 100), // Primeros 100 chars para contexto
            })
          }
        }
      }
    }
  }

  return results
}

/**
 * Obtiene los factores ambientales disponibles (con datos en el survey)
 * @returns Array de factores con available: true
 */
export function getAvailableEnvironmentalFactors() {
  return Object.values(ENVIRONMENTAL_FACTORS).filter((f) => f.available)
}

/**
 * Obtiene los factores ambientales pendientes (sin datos en el survey)
 * @returns Array de factores con available: false
 */
export function getPendingEnvironmentalFactors() {
  return Object.values(ENVIRONMENTAL_FACTORS).filter((f) => !f.available)
}

// ============================================================================
// CONSTANTES DE TIEMPO
// ============================================================================

/**
 * Ventana de tiempo para buscar eventos recientes (en dias)
 * Se usa para buscar keywords en notas de eventos
 */
export const RECENT_EVENTS_WINDOW_DAYS = 14

/**
 * Ventana de tiempo para buscar mensajes de chat recientes (en dias)
 * Se usa para buscar keywords en mensajes
 */
export const RECENT_CHAT_WINDOW_DAYS = 14
