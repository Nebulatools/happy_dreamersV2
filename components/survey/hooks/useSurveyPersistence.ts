// Hook para manejar la persistencia automática de la encuesta
// Guarda automáticamente en localStorage y proporciona métodos de recuperación

import { useEffect, useCallback, useRef } from 'react'
import { useToast } from '@/hooks/use-toast'
import type { SurveyData } from '@/types/models'
import { createLogger } from '@/lib/logger'

const logger = createLogger('survey-persistence')

interface UseSurveyPersistenceProps {
  childId: string
  formData: Partial<SurveyData>
  currentStep: number
  enabled?: boolean
}

export function useSurveyPersistence({
  childId,
  formData,
  currentStep,
  enabled = true
}: UseSurveyPersistenceProps) {
  const { toast } = useToast()
  const lastSavedRef = useRef<string>('')
  const saveTimeoutRef = useRef<NodeJS.Timeout>()
  const lastSaveTimeRef = useRef<Date>(new Date())

  // Guardar en localStorage
  const saveToLocalStorage = useCallback(() => {
    if (!enabled || !childId) return

    try {
      const dataToSave = {
        formData,
        currentStep,
        lastSaved: new Date().toISOString()
      }
      
      const serialized = JSON.stringify(dataToSave)
      
      // Solo guardar si los datos han cambiado
      if (serialized !== lastSavedRef.current) {
        localStorage.setItem(`survey_${childId}`, serialized)
        localStorage.setItem(`survey_step_${childId}`, currentStep.toString())
        lastSavedRef.current = serialized
        lastSaveTimeRef.current = new Date()
        
        logger.info('Encuesta guardada automáticamente', { childId, currentStep })
        
        // Mostrar notificación discreta solo si han pasado más de 30 segundos desde el último guardado
        const timeSinceLastSave = new Date().getTime() - lastSaveTimeRef.current.getTime()
        if (timeSinceLastSave > 30000) {
          toast({
            title: "Guardado automático",
            description: "Tu progreso se ha guardado",
            duration: 2000
          })
        }
      }
    } catch (error) {
      logger.error('Error al guardar en localStorage', error)
    }
  }, [childId, formData, currentStep, enabled, toast])

  // Cargar desde localStorage
  const loadFromLocalStorage = useCallback(() => {
    if (!childId) return null

    try {
      const saved = localStorage.getItem(`survey_${childId}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        logger.info('Encuesta cargada desde localStorage', { childId })
        return parsed
      }
    } catch (error) {
      logger.error('Error al cargar desde localStorage', error)
    }

    return null
  }, [childId])

  // Limpiar localStorage
  const clearLocalStorage = useCallback(() => {
    if (!childId) return

    try {
      localStorage.removeItem(`survey_${childId}`)
      localStorage.removeItem(`survey_step_${childId}`)
      logger.info('Datos de encuesta limpiados de localStorage', { childId })
    } catch (error) {
      logger.error('Error al limpiar localStorage', error)
    }
  }, [childId])

  // Guardar al servidor (con reintentos)
  const saveToServer = useCallback(async (isPartialSave: boolean = true) => {
    if (!childId) return { success: false, error: 'No childId' }

    try {
      const response = await fetch('/api/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId,
          surveyData: formData,
          isPartialSave,
          currentStep
        })
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.success) {
        logger.info('Encuesta guardada en servidor', { 
          childId, 
          isPartialSave, 
          currentStep 
        })
        
        // Si es guardado final exitoso, limpiar localStorage
        if (!isPartialSave) {
          clearLocalStorage()
        }
      }

      return result
    } catch (error) {
      logger.error('Error al guardar en servidor', error)
      
      // Asegurar que se guarde en localStorage si falla el servidor
      saveToLocalStorage()
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      }
    }
  }, [childId, formData, currentStep, saveToLocalStorage, clearLocalStorage])

  // Efecto para guardado automático con debounce
  useEffect(() => {
    if (!enabled) return

    // Limpiar timeout anterior
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Guardar después de 3 segundos de inactividad
    saveTimeoutRef.current = setTimeout(() => {
      saveToLocalStorage()
    }, 3000)

    // Cleanup
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [formData, currentStep, saveToLocalStorage, enabled])

  // Guardar al cambiar de paso
  useEffect(() => {
    if (!enabled) return
    
    saveToLocalStorage()
  }, [currentStep, saveToLocalStorage, enabled])

  // Guardar antes de que el usuario cierre la página
  useEffect(() => {
    if (!enabled) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      saveToLocalStorage()
      
      // Si hay cambios no guardados, mostrar advertencia
      if (lastSavedRef.current) {
        e.preventDefault()
        e.returnValue = '¿Estás seguro de que quieres salir? Tu progreso se guardará automáticamente.'
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [saveToLocalStorage, enabled])

  return {
    saveToLocalStorage,
    loadFromLocalStorage,
    clearLocalStorage,
    saveToServer,
    lastSaveTime: lastSaveTimeRef.current
  }
}