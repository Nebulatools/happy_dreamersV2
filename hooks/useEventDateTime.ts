// Hook personalizado para manejo de fechas y horas en eventos
import { useState, useCallback } from "react"

/**
 * Hook para manejar la lógica de fechas y horas en eventos
 */
export const useEventDateTime = () => {
  // Función auxiliar para formatear la fecha actual en formato ISO para input datetime-local
  const getCurrentDateTimeISO = useCallback(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const day = String(now.getDate()).padStart(2, "0")
    const hours = String(now.getHours()).padStart(2, "0")
    const minutes = String(Math.round(now.getMinutes() / 10) * 10).padStart(2, "0")
    
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }, [])

  // Función auxiliar para formatear una fecha específica en formato ISO
  const getDateTimeISO = useCallback((date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const hours = String(date.getHours()).padStart(2, "0")
    const minutes = String(Math.round(date.getMinutes() / 10) * 10).padStart(2, "0")
    
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }, [])

  // Función para determinar el tipo de evento basado en la hora
  const getEventTypeByTime = useCallback((date: Date) => {
    const hour = date.getHours()
    
    if (hour >= 19 || hour < 5) {
      return "sleep" // Dormir
    } else if (hour >= 5 && hour < 10) {
      return "wake" // Despertar matutino
    } else if (hour >= 12 && hour < 17) {
      return "nap" // Siesta  
    } else if (hour >= 23 || hour < 5) {
      return "night_waking" // Despertar nocturno
    } else {
      return "sleep" // Por defecto, dormir
    }
  }, [])

  // Función para calcular la duración entre dos fechas
  const calculateDuration = useCallback((startTime: string, endTime: string) => {
    if (!startTime || !endTime) return 0
    
    const start = new Date(startTime)
    const end = new Date(endTime)
    const diffMs = end.getTime() - start.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)
    
    return Math.max(0, Math.round(diffHours * 2) / 2) // Redondear a 0.5 horas
  }, [])

  // Función para obtener la hora de fin predeterminada (1 hora después de inicio)
  const getDefaultEndTime = useCallback((startTime: string) => {
    const start = new Date(startTime)
    const end = new Date(start.getTime() + 60 * 60 * 1000) // +1 hora
    
    return getDateTimeISO(end)
  }, [getDateTimeISO])

  return {
    getCurrentDateTimeISO,
    getDateTimeISO,
    getEventTypeByTime,
    calculateDuration,
    getDefaultEndTime
  }
}