"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'

// Tipos de modo de registro
export type RegistrationMode = 'simple' | 'manual'

interface EventRegistrationModeContextType {
  mode: RegistrationMode
  setMode: (mode: RegistrationMode) => void
  toggleMode: () => void
  isSimpleMode: boolean
  isManualMode: boolean
}

const EventRegistrationModeContext = createContext<EventRegistrationModeContextType | undefined>(undefined)

/**
 * Provider para manejar el modo de registro de eventos
 * Permite alternar entre modo simple (recomendado) y modo manual (completo)
 */
export function EventRegistrationModeProvider({ children }: { children: React.ReactNode }) {
  // Por defecto, usar modo simple (recomendado)
  const [mode, setMode] = useState<RegistrationMode>('simple')

  // Cargar preferencia del usuario desde localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('eventRegistrationMode') as RegistrationMode
    if (savedMode && (savedMode === 'simple' || savedMode === 'manual')) {
      setMode(savedMode)
    }
  }, [])

  // Guardar preferencia cuando cambie
  useEffect(() => {
    localStorage.setItem('eventRegistrationMode', mode)
  }, [mode])

  // Función para alternar entre modos
  const toggleMode = () => {
    setMode(prev => prev === 'simple' ? 'manual' : 'simple')
  }

  // Helpers para verificar el modo actual
  const isSimpleMode = mode === 'simple'
  const isManualMode = mode === 'manual'

  return (
    <EventRegistrationModeContext.Provider value={{
      mode,
      setMode,
      toggleMode,
      isSimpleMode,
      isManualMode
    }}>
      {children}
    </EventRegistrationModeContext.Provider>
  )
}

/**
 * Hook para usar el contexto de modo de registro
 */
export function useEventRegistrationMode() {
  const context = useContext(EventRegistrationModeContext)
  if (!context) {
    throw new Error('useEventRegistrationMode debe usarse dentro de EventRegistrationModeProvider')
  }
  return context
}