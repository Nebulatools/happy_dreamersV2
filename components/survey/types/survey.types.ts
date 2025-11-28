// Tipos para el sistema de encuestas
// Separación clara de responsabilidades y tipos bien definidos

export interface SurveyStepProps {
  data: any
  onChange: (data: any) => void
  errors?: ValidationErrors
  context?: Record<string, any>
}

export interface ValidationErrors {
  [key: string]: string | ValidationErrors
}

export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: any) => boolean | string
}

export interface FieldValidation {
  [fieldPath: string]: ValidationRule
}

export interface StepValidation {
  fields: FieldValidation
  customValidation?: (data: any) => ValidationErrors
}

export interface SurveyStep {
  id: number
  name: string
  icon: string
  component: React.ComponentType<SurveyStepProps>
  validation: StepValidation
}

// Re-exportar tipos existentes
export type { SurveyData } from "@/types/models"
