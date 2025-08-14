"use client"

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

interface DevTimeContextType {
  // Hora simulada para desarrollo (null = usar hora real)
  simulatedTime: Date | null
  // Función para actualizar la hora simulada
  setSimulatedTime: (date: Date | null) => void
  // Función para obtener la hora actual (simulada o real)
  getCurrentTime: () => Date
  // Si está en modo desarrollo
  isDevelopment: boolean
}

const DevTimeContext = createContext<DevTimeContextType>({
  simulatedTime: null,
  setSimulatedTime: () => {},
  getCurrentTime: () => new Date(),
  isDevelopment: false
})

export function DevTimeProvider({ children }: { children: React.ReactNode }) {
  const [simulatedTime, setSimulatedTime] = useState<Date | null>(null)
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  // Cargar tiempo simulado de localStorage al inicio
  useEffect(() => {
    if (isDevelopment && typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('devSimulatedTime')
      if (saved) {
        setSimulatedTime(new Date(saved))
      }
    }
  }, [isDevelopment])
  
  const getCurrentTime = useCallback(() => {
    if (isDevelopment && simulatedTime) {
      return simulatedTime
    }
    return new Date()
  }, [isDevelopment, simulatedTime])
  
  const updateSimulatedTime = useCallback((date: Date | null) => {
    setSimulatedTime(date)
    if (date && typeof window !== 'undefined') {
      window.localStorage.setItem('devSimulatedTime', date.toISOString())
    } else if (!date && typeof window !== 'undefined') {
      window.localStorage.removeItem('devSimulatedTime')
    }
  }, [])
  
  return (
    <DevTimeContext.Provider value={{
      simulatedTime,
      setSimulatedTime: updateSimulatedTime,
      getCurrentTime,
      isDevelopment
    }}>
      {children}
    </DevTimeContext.Provider>
  )
}

export function useDevTime() {
  const context = useContext(DevTimeContext)
  if (!context) {
    throw new Error('useDevTime must be used within DevTimeProvider')
  }
  return context
}

// Helper hook para obtener la hora actual (simulada o real)
export function useCurrentTime() {
  const { getCurrentTime } = useDevTime()
  return getCurrentTime()
}