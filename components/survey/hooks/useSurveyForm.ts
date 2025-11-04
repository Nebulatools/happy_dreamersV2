// Hook principal para manejar el estado del formulario
// Centraliza toda la lógica de estado y actualizaciones

import { useState, useCallback } from 'react'
import type { SurveyData } from '@/types/models'
import type { ValidationErrors } from '../types/survey.types'
import { validateStep } from '../validation/validators'
import { stepValidations } from '../validation/schemas'

const defaultFormData: Partial<SurveyData> = {
  informacionFamiliar: {
    papa: {
      nombre: "",
      ocupacion: "",
      direccion: "",
      email: "",
      trabajaFueraCasa: false,
      tieneAlergias: false
    },
    mama: {
      nombre: "",
      ocupacion: "",
      mismaDireccionPapa: true,
      direccion: "",
      email: "",
      trabajaFueraCasa: false,
      tieneAlergias: false
    }
  },
  dinamicaFamiliar: {},
  historial: {},
  desarrollo: {},
  actividadFisica: {},
  rutinaHabitos: {}
}

function normalizeSurveyData(data?: Partial<SurveyData>): Partial<SurveyData> {
  if (!data) return {}

  const normalized: Partial<SurveyData> = {
    ...data,
    informacionFamiliar: { ...data.informacionFamiliar },
    dinamicaFamiliar: { ...data.dinamicaFamiliar },
    historial: { ...(data.historial || {}) },
    desarrollo: { ...(data.desarrollo || {}) },
    actividadFisica: { ...(data.actividadFisica || {}) },
    rutinaHabitos: { ...(data.rutinaHabitos || {}) }
  }

  const historialAny = normalized.historial as any
  if (historialAny) {
    if (!historialAny.nombreHijo && historialAny.nombreNino) {
      historialAny.nombreHijo = historialAny.nombreNino
    }
  }

  if (normalized.actividadFisica?.situacionesHijo && !normalized.desarrollo?.situacionesHijo) {
    normalized.desarrollo = {
      ...normalized.desarrollo,
      situacionesHijo: normalized.actividadFisica.situacionesHijo
    }
  }

  return normalized
}

export function useSurveyForm(initialData?: Partial<SurveyData>) {
  const normalizedInitial = initialData ? normalizeSurveyData(initialData) : undefined

  const [formData, setRawFormData] = useState<Partial<SurveyData>>(
    normalizedInitial && Object.keys(normalizedInitial).length > 0
      ? normalizedInitial
      : defaultFormData
  )

  const [errors, setErrors] = useState<Record<number, ValidationErrors>>({})
  const [touchedSteps, setTouchedSteps] = useState<Set<number>>(new Set())

  // Actualizar datos de un paso específico
  const updateStepData = useCallback((step: number, data: any) => {
    setRawFormData(prev => {
      const stepKey = getStepKey(step)
      const updatedData = {
        ...prev,
        [stepKey]: {
          ...(prev[stepKey as keyof SurveyData] || {}),
          ...data
        }
      }
      
      // Si el paso ya fue tocado, validar en tiempo real
      if (touchedSteps.has(step)) {
        const validation = stepValidations[step]
        if (validation) {
          const stepErrors = validateStep(updatedData[stepKey as keyof SurveyData], validation)
          setErrors(prevErrors => ({
            ...prevErrors,
            [step]: stepErrors
          }))
        }
      }
      
      return updatedData
    })
  }, [touchedSteps])

  // Validar un paso específico
  const validateStepData = useCallback((step: number): ValidationErrors => {
    const stepKey = getStepKey(step)
    const stepData = formData[stepKey as keyof SurveyData]
    const validation = stepValidations[step]
    
    if (!validation) return {}
    
    const stepErrors = validateStep(stepData, validation)
    
    setErrors(prev => ({
      ...prev,
      [step]: stepErrors
    }))
    
    return stepErrors
  }, [formData])

  // Marcar paso como tocado
  const markStepAsTouched = useCallback((step: number) => {
    setTouchedSteps(prev => new Set([...prev, step]))
  }, [])

  // Verificar si un paso es válido
  const isStepValid = useCallback((step: number): boolean => {
    const stepErrors = errors[step] || {}
    return Object.keys(stepErrors).length === 0
  }, [errors])

  // Verificar si todos los pasos son válidos
  const isFormComplete = useCallback((): boolean => {
    for (let step = 1; step <= 6; step++) {
      const stepErrors = validateStepData(step)
      if (Object.keys(stepErrors).length > 0) {
        return false
      }
    }
    return true
  }, [validateStepData])

  // Obtener datos del paso actual
  const getStepData = useCallback((step: number) => {
    const stepKey = getStepKey(step)
    return formData[stepKey as keyof SurveyData] || {}
  }, [formData])

  // Función para establecer datos iniciales (útil para pre-llenar con datos del usuario)
  const setInitialData = useCallback((data: Partial<SurveyData>) => {
    const normalized = normalizeSurveyData(data)
    setRawFormData(prevData => ({
      ...normalized,
      ...prevData,
      informacionFamiliar: {
        ...normalized.informacionFamiliar,
        ...prevData.informacionFamiliar
      }
    }))
  }, [])

  const setFormData = useCallback((
    value: Partial<SurveyData> | ((prev: Partial<SurveyData>) => Partial<SurveyData>)
  ) => {
    if (typeof value === 'function') {
      setRawFormData(prev => {
        const normalized = normalizeSurveyData(value(prev))
        return Object.keys(normalized).length > 0 ? normalized : prev
      })
    } else {
      const normalized = normalizeSurveyData(value)
      setRawFormData(Object.keys(normalized).length > 0 ? normalized : defaultFormData)
    }
  }, [])

  return {
    formData,
    errors,
    touchedSteps,
    updateStepData,
    validateStepData,
    markStepAsTouched,
    isStepValid,
    isFormComplete,
    getStepData,
    setFormData,
    setInitialData
  }
}

// Mapeo de número de paso a clave en formData
function getStepKey(step: number): string {
  const stepKeys: Record<number, string> = {
    1: 'informacionFamiliar',
    2: 'dinamicaFamiliar',
    3: 'historial',
    4: 'desarrollo',
    5: 'actividadFisica',
    6: 'rutinaHabitos'
  }
  return stepKeys[step] || ''
}
