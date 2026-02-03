// Tipos e interfaces para el Panel de Diagnostico
// Motor de validacion que cruza bitacora con survey y reglas clinicas

// Niveles de status (semaforo)
export type StatusLevel = "ok" | "warning" | "alert"

// Fuente del dato para deep linking
export type SourceType = "survey" | "event" | "chat" | "plan" | "calculated"

// Condiciones medicas evaluadas en G2
export type MedicalCondition = "reflujo" | "apnea" | "restless_leg"

// Grupos nutricionales para clasificacion AI
export type NutritionGroup = "proteina" | "carbohidrato" | "grasa" | "fibra"

// Resultado de un criterio individual
export interface CriterionResult {
  id: string
  name: string
  status: StatusLevel
  value: string | number | boolean | null
  expected: string | number | boolean | null
  message: string
  sourceType: SourceType
  sourceId?: string // ID del evento o campo del survey
  sourceField?: string // Campo especifico del survey
  dataAvailable: boolean // Si el dato existe o esta pendiente
}

// Completitud de datos para un grupo
export interface DataCompleteness {
  available: number
  total: number
  pending: string[] // Lista de campos pendientes
}

// Resultado de un grupo de validacion (G1, G2, G3, G4)
export interface GroupValidation {
  groupId: "G1" | "G2" | "G3" | "G4"
  groupName: string
  status: StatusLevel
  criteria: CriterionResult[]
  dataCompleteness: DataCompleteness
  summary: string
}

// Alerta individual para mostrar en UI
export interface Alert {
  id: string
  groupId: "G1" | "G2" | "G3" | "G4"
  criterionId: string
  message: string
  severity: StatusLevel
  sourceType: SourceType
  sourceId?: string
  sourceField?: string
  timestamp: string
}

// Clasificacion AI de alimentos
export interface NutritionClassification {
  nutritionGroups: NutritionGroup[]
  aiClassified: boolean
  confidence?: number
  rawText?: string
}

// Indicador medico (G2)
export interface MedicalIndicator {
  id: string
  name: string
  description: string
  surveyField?: string
  eventType?: string
  condition: MedicalCondition
  available: boolean
  detected: boolean
}

// Resultado del grupo medico (G2) con indicadores agrupados
export interface MedicalGroupValidation extends GroupValidation {
  indicators: {
    reflujo: MedicalIndicator[]
    apnea: MedicalIndicator[]
    restless_leg: MedicalIndicator[]
  }
  detectedCount: {
    reflujo: number
    apnea: number
    restless_leg: number
  }
  pendingCount: {
    reflujo: number
    apnea: number
    restless_leg: number
  }
}

// Resultado del grupo nutricional (G3) con clasificacion AI
export interface NutritionGroupValidation extends GroupValidation {
  milkFeedings: {
    count: number
    required: number
    status: StatusLevel
  }
  solidFeedings: {
    count: number
    required: number
    status: StatusLevel
  }
  nutritionGroupsCovered: NutritionGroup[]
  nutritionGroupsRequired: NutritionGroup[]
  aiClassifications: NutritionClassification[]
}

// Resultado del grupo ambiental (G4) con keywords detectadas
export interface EnvironmentalGroupValidation extends GroupValidation {
  detectedKeywords: string[]
  factors: {
    screenTime: CriterionResult
    temperature: CriterionResult
    humidity: CriterionResult
    postpartumDepression: CriterionResult
    cosleeping: CriterionResult
    roomSharing: CriterionResult
    recentChanges: CriterionResult
  }
}

// Resultado completo del diagnostico
export interface DiagnosticResult {
  childId: string
  childName: string
  childAgeMonths: number
  childBirthDate?: string // ISO date string para calcular edad en UI
  planId: string
  planVersion: string
  evaluatedAt: string
  groups: {
    G1: GroupValidation
    G2: MedicalGroupValidation
    G3: NutritionGroupValidation
    G4: EnvironmentalGroupValidation
  }
  alerts: Alert[]
  overallStatus: StatusLevel
  summary?: string // Resumen del Pasante AI (on-demand)
}

// Input para validadores
export interface ValidationInput {
  childId: string
  childAgeMonths: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  surveyData: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  events: Record<string, any>[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plan: Record<string, any>
  chatMessages?: string[]
}

// Reglas de horario por edad
export interface AgeScheduleRule {
  ageRange: string
  ageMinMonths: number
  ageMaxMonths: number
  napCount: number
  napMaxDuration: number // minutos
  windows: number[] // duracion de ventanas en horas
  noNapBefore: string // hora "HH:MM"
  noNapHoursBeforeBedtime: number
  nightDurationHours: number
  milkMinCount: number
  milkIntervalHours: number
  solidMinCount: number
}

// Reglas de nutricion por edad
export interface NutritionRule {
  ageRange: string
  ageMinMonths: number
  ageMaxMonths: number
  milkMinCount: number
  milkMaxOz: number | null // null = sin limite
  solidMinCount: number
  mealRequiredGroups: NutritionGroup[]
  snackRequiredGroups: NutritionGroup[]
}

// Indicador medico configurable
export interface MedicalIndicatorConfig {
  id: string
  name: string
  description: string
  condition: MedicalCondition
  surveyField?: string
  eventCheck?: (events: Record<string, unknown>[]) => boolean
  available: boolean // Si el campo existe en el survey actual
}
