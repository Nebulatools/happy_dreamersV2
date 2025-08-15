"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// Tipos de modo según EVENT_REGISTRATION_SYSTEM.md
export type RegistrationMode = 'simple' | 'manual'

interface EventRegistrationModeContextType {
  mode: RegistrationMode
  setMode: (mode: RegistrationMode) => void
  toggleMode: () => void
}

const EventRegistrationModeContext = createContext<EventRegistrationModeContextType | null>(null)

/**
 * Provider para gestionar el modo de registro de eventos
 * Persiste la preferencia del usuario en localStorage
 */
export function EventRegistrationModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<RegistrationMode>('simple')
  
  // Cargar preferencia del usuario
  useEffect(() => {
    const stored = localStorage.getItem('event-registration-mode')
    if (stored === 'manual') {
      setModeState('manual')
    }
  }, [])
  
  const setMode = (newMode: RegistrationMode) => {
    setModeState(newMode)
    localStorage.setItem('event-registration-mode', newMode)
  }
  
  const toggleMode = () => {
    const newMode = mode === 'simple' ? 'manual' : 'simple'
    setMode(newMode)
  }
  
  return (
    <EventRegistrationModeContext.Provider value={{ mode, setMode, toggleMode }}>
      {children}
    </EventRegistrationModeContext.Provider>
  )
}

export function useEventRegistrationMode() {
  const context = useContext(EventRegistrationModeContext)
  if (!context) {
    throw new Error('useEventRegistrationMode debe usarse dentro de EventRegistrationModeProvider')
  }
  return context
}