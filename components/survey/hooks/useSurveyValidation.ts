// Hook para manejar validación en tiempo real y feedback visual
// Proporciona funciones útiles para mostrar errores y validar campos

import { useState, useCallback, useEffect } from 'react'
import type { ValidationErrors } from '../types/survey.types'
import { getFirstErrorField, hasStepErrors } from '../validation/validators'

interface ValidationState {
  showErrors: boolean
  focusedField: string | null
}

export function useSurveyValidation() {
  const [validationState, setValidationState] = useState<ValidationState>({
    showErrors: false,
    focusedField: null
  })

  // Mostrar errores de validación
  const showValidationErrors = useCallback(() => {
    setValidationState(prev => ({ ...prev, showErrors: true }))
  }, [])

  // Ocultar errores de validación
  const hideValidationErrors = useCallback(() => {
    setValidationState(prev => ({ ...prev, showErrors: false }))
  }, [])

  // Enfocar campo con error
  const focusErrorField = useCallback((errors: ValidationErrors) => {
    const firstErrorField = getFirstErrorField(errors)
    if (firstErrorField) {
      setValidationState(prev => ({ ...prev, focusedField: firstErrorField }))
      
      // Hacer scroll al campo con error
      setTimeout(() => {
        const element = document.getElementById(firstErrorField)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          element.focus()
        }
      }, 100)
    }
  }, [])

  // Obtener clase CSS para campo con error
  const getFieldClassName = useCallback((fieldName: string, hasError: boolean, baseClass = '') => {
    const classes = [baseClass]
    
    if (validationState.showErrors && hasError) {
      classes.push('border-red-500 focus:border-red-500')
    }
    
    if (validationState.focusedField === fieldName) {
      classes.push('ring-2 ring-red-500')
    }
    
    return classes.filter(Boolean).join(' ')
  }, [validationState])

  // Verificar si debe mostrar error para un campo
  const shouldShowError = useCallback((fieldName: string, hasError: boolean): boolean => {
    return validationState.showErrors && hasError
  }, [validationState.showErrors])

  return {
    validationState,
    showValidationErrors,
    hideValidationErrors,
    focusErrorField,
    getFieldClassName,
    shouldShowError
  }
}