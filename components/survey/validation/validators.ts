// Funciones de validación reutilizables
// Sistema centralizado para validar campos y mostrar errores

import type { ValidationErrors, FieldValidation, StepValidation } from '../types/survey.types'

export function validateField(value: any, rules: any): string | null {
  // Validación requerida
  if (rules.required && (!value || value === '')) {
    return 'Este campo es obligatorio'
  }

  // Validación de longitud mínima
  if (rules.minLength && value && value.length < rules.minLength) {
    return `Mínimo ${rules.minLength} caracteres`
  }

  // Validación de longitud máxima
  if (rules.maxLength && value && value.length > rules.maxLength) {
    return `Máximo ${rules.maxLength} caracteres`
  }

  // Validación de patrón (regex)
  if (rules.pattern && value && !rules.pattern.test(value)) {
    if (rules.pattern.toString().includes('@')) {
      return 'Ingresa un email válido'
    }
    return 'Formato inválido'
  }

  // Validación personalizada
  if (rules.custom && value) {
    const result = rules.custom(value)
    if (typeof result === 'string') {
      return result
    }
    if (result === false) {
      return 'Valor inválido'
    }
  }

  return null
}

export function validateStep(data: any, validation: StepValidation): ValidationErrors {
  const errors: ValidationErrors = {}

  // Validar campos individuales
  Object.entries(validation.fields).forEach(([fieldPath, rules]) => {
    const value = getNestedValue(data, fieldPath)
    const error = validateField(value, rules)
    
    if (error) {
      setNestedError(errors, fieldPath, error)
    }
  })

  // Validación personalizada del paso
  if (validation.customValidation) {
    const customErrors = validation.customValidation(data)
    Object.assign(errors, customErrors)
  }

  return errors
}

// Obtener valor anidado usando path (e.g., "papa.nombre")
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}

// Establecer error anidado usando path
function setNestedError(errors: ValidationErrors, path: string, error: string): void {
  const keys = path.split('.')
  let current: any = errors

  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      current[key] = error
    } else {
      if (!current[key]) {
        current[key] = {}
      }
      current = current[key]
    }
  })
}

// Verificar si un paso tiene errores
export function hasStepErrors(errors: ValidationErrors): boolean {
  return Object.keys(errors).length > 0
}

// Obtener lista de campos con errores
export function getErrorFields(errors: ValidationErrors, prefix = ''): string[] {
  const fields: string[] = []

  Object.entries(errors).forEach(([key, value]) => {
    const fieldPath = prefix ? `${prefix}.${key}` : key
    
    if (typeof value === 'string') {
      fields.push(fieldPath)
    } else if (typeof value === 'object' && value !== null) {
      fields.push(...getErrorFields(value as ValidationErrors, fieldPath))
    }
  })

  return fields
}

// Obtener el primer campo con error para hacer scroll
export function getFirstErrorField(errors: ValidationErrors): string | null {
  const errorFields = getErrorFields(errors)
  return errorFields.length > 0 ? errorFields[0] : null
}