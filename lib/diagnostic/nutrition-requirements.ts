// Requisitos nutricionales por edad para validacion G3
// Basado en SPEC-SPRINT.md seccion "Tabla de Requisitos por Edad"

import type { NutritionGroup, NutritionRule } from "./types"

// Grupos nutricionales del sistema
export const ALL_NUTRITION_GROUPS: NutritionGroup[] = [
  "proteina",
  "carbohidrato",
  "grasa",
  "fibra",
]

// Requisitos de grupos por tipo de comida
export const MEAL_REQUIREMENTS = {
  // 6-9 meses: Proteina + Fibra + (Grasa O Carbohidrato)
  EARLY_STAGE: {
    required: ["proteina", "fibra"] as NutritionGroup[],
    oneOf: ["grasa", "carbohidrato"] as NutritionGroup[],
    description: "Proteina + Fibra + (Grasa o Carbohidrato)",
  },
  // 9+ meses: Los 4 grupos completos
  FULL_STAGE: {
    required: ALL_NUTRITION_GROUPS,
    oneOf: [] as NutritionGroup[],
    description: "Los 4 grupos: Proteina + Carbohidrato + Grasa + Fibra",
  },
} as const

// Requisitos de grupos para snacks (9+ meses)
export const SNACK_REQUIREMENTS = {
  required: ["fibra"] as NutritionGroup[],
  oneOf: ["grasa", "carbohidrato"] as NutritionGroup[],
  description: "Fibra + (Grasa o Carbohidrato)",
} as const

// Reglas de nutricion por rango de edad
export const NUTRITION_RULES: NutritionRule[] = [
  // 6 meses
  {
    ageRange: "6m",
    ageMinMonths: 6,
    ageMaxMonths: 6,
    milkMinCount: 5,
    milkMaxOz: 24,
    solidMinCount: 2,
    mealRequiredGroups: MEAL_REQUIREMENTS.EARLY_STAGE.required,
    snackRequiredGroups: [], // Sin snacks formales a los 6m
  },
  // 7 meses
  {
    ageRange: "7m",
    ageMinMonths: 7,
    ageMaxMonths: 7,
    milkMinCount: 4,
    milkMaxOz: 24,
    solidMinCount: 3,
    mealRequiredGroups: MEAL_REQUIREMENTS.EARLY_STAGE.required,
    snackRequiredGroups: [],
  },
  // 8-9 meses
  {
    ageRange: "8-9m",
    ageMinMonths: 8,
    ageMaxMonths: 9,
    milkMinCount: 3,
    milkMaxOz: 24,
    solidMinCount: 4, // 3-4 promedio
    mealRequiredGroups: MEAL_REQUIREMENTS.EARLY_STAGE.required,
    snackRequiredGroups: SNACK_REQUIREMENTS.required, // Inicia snacks
  },
  // 9-11 meses
  {
    ageRange: "9-11m",
    ageMinMonths: 9,
    ageMaxMonths: 11,
    milkMinCount: 3,
    milkMaxOz: 24,
    solidMinCount: 4,
    mealRequiredGroups: MEAL_REQUIREMENTS.FULL_STAGE.required,
    snackRequiredGroups: SNACK_REQUIREMENTS.required,
  },
  // 11-12 meses
  {
    ageRange: "11-12m",
    ageMinMonths: 11,
    ageMaxMonths: 12,
    milkMinCount: 2,
    milkMaxOz: 16,
    solidMinCount: 5,
    mealRequiredGroups: MEAL_REQUIREMENTS.FULL_STAGE.required,
    snackRequiredGroups: SNACK_REQUIREMENTS.required,
  },
  // 12+ meses
  {
    ageRange: "12m+",
    ageMinMonths: 12,
    ageMaxMonths: 999, // Sin limite superior
    milkMinCount: 0, // Opcional desde 12m
    milkMaxOz: 16, // Bandera roja si > 16 oz
    solidMinCount: 5,
    mealRequiredGroups: MEAL_REQUIREMENTS.FULL_STAGE.required,
    snackRequiredGroups: SNACK_REQUIREMENTS.required,
  },
]

// Intervalos de leche por edad (en horas)
export const MILK_INTERVALS: Record<string, number> = {
  "6m": 3,
  "7m": 4,
  "8-9m": 4,
  "9-11m": 5,
  "11-12m": 0, // Sin intervalo requerido
  "12m+": 0,
}

// Banderas rojas
export const RED_FLAGS = {
  // Mas de 16 oz de leche en 24 hrs para mayores de 12 meses
  MAX_MILK_OZ_12_PLUS: 16,
  // Gap maximo sin comer (en horas) antes de alertar
  MAX_FEEDING_GAP_HOURS: 5,
} as const

/**
 * Obtiene la regla de nutricion para una edad especifica
 * @param ageMonths Edad del nino en meses
 * @returns NutritionRule correspondiente o la regla de 12m+ como fallback
 */
export function getNutritionRuleForAge(ageMonths: number): NutritionRule {
  // Buscar regla que incluya la edad
  const rule = NUTRITION_RULES.find(
    (r) => ageMonths >= r.ageMinMonths && ageMonths <= r.ageMaxMonths
  )

  // Si no hay regla especifica, usar 12m+ (la ultima)
  if (!rule) {
    return NUTRITION_RULES[NUTRITION_RULES.length - 1]
  }

  return rule
}

/**
 * Obtiene el intervalo de leche para una edad especifica
 * @param ageMonths Edad del nino en meses
 * @returns Horas de intervalo o 0 si no aplica
 */
export function getMilkIntervalForAge(ageMonths: number): number {
  const rule = getNutritionRuleForAge(ageMonths)
  return MILK_INTERVALS[rule.ageRange] || 0
}

/**
 * Verifica si una comida cumple los requisitos de grupos nutricionales
 * @param groups Grupos nutricionales en la comida
 * @param ageMonths Edad del nino
 * @param isSnack Si es snack o comida principal
 * @returns { valid, missing, message }
 */
export function validateMealGroups(
  groups: NutritionGroup[],
  ageMonths: number,
  isSnack: boolean = false
): { valid: boolean; missing: NutritionGroup[]; message: string } {
  // Si es snack y el nino tiene menos de 9 meses, no aplica validacion
  if (isSnack && ageMonths < 9) {
    return { valid: true, missing: [], message: "Sin requisitos de snack para esta edad" }
  }

  // Determinar requisitos segun edad y tipo
  let requiredGroups: NutritionGroup[]
  let oneOfGroups: NutritionGroup[]
  let description: string

  if (isSnack) {
    requiredGroups = SNACK_REQUIREMENTS.required
    oneOfGroups = SNACK_REQUIREMENTS.oneOf
    description = SNACK_REQUIREMENTS.description
  } else if (ageMonths < 9) {
    requiredGroups = MEAL_REQUIREMENTS.EARLY_STAGE.required
    oneOfGroups = MEAL_REQUIREMENTS.EARLY_STAGE.oneOf
    description = MEAL_REQUIREMENTS.EARLY_STAGE.description
  } else {
    requiredGroups = MEAL_REQUIREMENTS.FULL_STAGE.required
    oneOfGroups = MEAL_REQUIREMENTS.FULL_STAGE.oneOf
    description = MEAL_REQUIREMENTS.FULL_STAGE.description
  }

  // Verificar grupos requeridos
  const missing = requiredGroups.filter((g) => !groups.includes(g))

  // Verificar oneOf (al menos uno del grupo)
  const hasOneOf =
    oneOfGroups.length === 0 || oneOfGroups.some((g) => groups.includes(g))

  if (missing.length > 0) {
    return {
      valid: false,
      missing,
      message: `Faltan grupos: ${missing.join(", ")}. Requerido: ${description}`,
    }
  }

  if (!hasOneOf) {
    return {
      valid: false,
      missing: oneOfGroups,
      message: `Debe incluir al menos: ${oneOfGroups.join(" o ")}. Requerido: ${description}`,
    }
  }

  return { valid: true, missing: [], message: "Cumple requisitos nutricionales" }
}

/**
 * Verifica si la cantidad de leche excede el maximo por edad
 * @param totalOz Onzas totales del dia
 * @param ageMonths Edad del nino
 * @returns { exceeded, maxOz, message }
 */
export function checkMilkLimit(
  totalOz: number,
  ageMonths: number
): { exceeded: boolean; maxOz: number | null; message: string } {
  const rule = getNutritionRuleForAge(ageMonths)

  if (rule.milkMaxOz === null) {
    return { exceeded: false, maxOz: null, message: "Sin limite de onzas" }
  }

  if (totalOz > rule.milkMaxOz) {
    return {
      exceeded: true,
      maxOz: rule.milkMaxOz,
      message: `Excede el maximo de ${rule.milkMaxOz} oz para ${rule.ageRange}`,
    }
  }

  return {
    exceeded: false,
    maxOz: rule.milkMaxOz,
    message: `Dentro del limite (${totalOz}/${rule.milkMaxOz} oz)`,
  }
}
