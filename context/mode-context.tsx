"use client"

import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  useCallback, 
  useMemo,
  ReactNode 
} from 'react'
import { 
  EventMode, 
  ModeContextType, 
  UserModePreferences, 
  ModeProviderProps 
} from '@/types/mode-system'

// Defaults seguros para las preferencias de usuario
const DEFAULT_PREFERENCES: UserModePreferences = {
  defaultMode: 'advanced', // Modo seguro por defecto
  persistMode: true,
  autoAdvanceComplexEvents: false,
  showModeTips: true,
  smartDefaults: {
    sleepDelay: 5,
    feedingType: 'bottle',
    feedingAmount: 120,
    feedingDuration: 15,
    emotionalState: 'tranquilo'
  }
}

// Crear el contexto
const ModeContext = createContext<ModeContextType | null>(null)

/**
 * Provider del sistema de modo dual
 * Gestiona el estado global entre modo simple y avanzado
 * Incluye persistencia y sincronización
 */
export function ModeProvider({ 
  children, 
  defaultMode = 'advanced',
  persistenceKey = 'happy-dreamers-mode-preferences'
}: ModeProviderProps) {
  const [mode, setModeState] = useState<EventMode>(defaultMode)
  const [preferences, setPreferences] = useState<UserModePreferences>(DEFAULT_PREFERENCES)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Cargar preferencias al montar el componente
  useEffect(() => {
    loadUserPreferences()
  }, [])

  // Función para cargar preferencias desde localStorage
  const loadUserPreferences = useCallback(async () => {
    try {
      // 1. Cargar desde localStorage (inmediato)
      const stored = localStorage.getItem(persistenceKey)
      if (stored) {
        const parsedPrefs = JSON.parse(stored) as UserModePreferences
        setPreferences(prev => ({ ...prev, ...parsedPrefs }))
        
        // Aplicar modo por defecto si está persistido
        if (parsedPrefs.persistMode && parsedPrefs.defaultMode) {
          setModeState(parsedPrefs.defaultMode)
        }
      }

      // TODO: En el futuro, sincronizar con backend aquí
      // const serverPrefs = await loadFromServer(userId)
      // const merged = { ...parsedPrefs, ...serverPrefs }
      
    } catch (error) {
      console.error('Error loading mode preferences:', error)
      // Fallback a defaults seguros
      setPreferences(DEFAULT_PREFERENCES)
      setModeState('advanced')
    }
  }, [persistenceKey])

  // Función para guardar preferencias
  const saveUserPreferences = useCallback(async (newPrefs: UserModePreferences) => {
    try {
      // 1. Guardar inmediatamente en localStorage
      localStorage.setItem(persistenceKey, JSON.stringify(newPrefs))
      
      // 2. Actualizar estado local
      setPreferences(newPrefs)

      // TODO: En el futuro, queue para sincronización con backend
      // await queueServerSync(userId, newPrefs)
      
    } catch (error) {
      console.error('Error saving mode preferences:', error)
    }
  }, [persistenceKey])

  // Función para alternar entre modos
  const toggleMode = useCallback(async () => {
    if (isTransitioning) return // Prevenir doble-click
    
    setIsTransitioning(true)
    
    try {
      const newMode: EventMode = mode === 'simple' ? 'advanced' : 'simple'
      
      // Actualizar modo inmediatamente
      setModeState(newMode)
      
      // Si persistir está habilitado, guardar nueva preferencia
      if (preferences.persistMode) {
        const updatedPrefs = {
          ...preferences,
          defaultMode: newMode
        }
        await saveUserPreferences(updatedPrefs)
      }

      // Analytics tracking
      if (typeof window !== 'undefined' && (window as any).analytics) {
        (window as any).analytics.track('mode_toggle', {
          from: mode,
          to: newMode,
          timestamp: Date.now()
        })
      }
      
    } catch (error) {
      console.error('Error toggling mode:', error)
      // Revertir cambio en caso de error
      setModeState(mode)
    } finally {
      // Delay para UX smooth
      setTimeout(() => setIsTransitioning(false), 150)
    }
  }, [mode, preferences, isTransitioning, saveUserPreferences])

  // Función para establecer modo específico
  const setMode = useCallback(async (newMode: EventMode) => {
    if (mode === newMode || isTransitioning) return
    
    setIsTransitioning(true)
    
    try {
      setModeState(newMode)
      
      // Persistir si está habilitado
      if (preferences.persistMode) {
        const updatedPrefs = {
          ...preferences,
          defaultMode: newMode
        }
        await saveUserPreferences(updatedPrefs)
      }

      // Analytics
      if (typeof window !== 'undefined' && (window as any).analytics) {
        (window as any).analytics.track('mode_set', {
          mode: newMode,
          timestamp: Date.now()
        })
      }
      
    } catch (error) {
      console.error('Error setting mode:', error)
    } finally {
      setTimeout(() => setIsTransitioning(false), 150)
    }
  }, [mode, preferences, isTransitioning, saveUserPreferences])

  // Función para actualizar preferencias
  const updatePreferences = useCallback(async (newPrefs: Partial<UserModePreferences>) => {
    const updatedPrefs = { ...preferences, ...newPrefs }
    await saveUserPreferences(updatedPrefs)
  }, [preferences, saveUserPreferences])

  // Memoizar el valor del contexto para evitar re-renders innecesarios
  const contextValue = useMemo<ModeContextType>(() => ({
    mode,
    preferences,
    toggleMode,
    setMode,
    isTransitioning
  }), [mode, preferences, toggleMode, setMode, isTransitioning])

  return (
    <ModeContext.Provider value={contextValue}>
      {children}
    </ModeContext.Provider>
  )
}

/**
 * Hook para usar el contexto de modo
 * Incluye validación de que se use dentro del Provider
 */
export function useModeContext(): ModeContextType {
  const context = useContext(ModeContext)
  
  if (!context) {
    throw new Error(
      'useModeContext debe usarse dentro de un ModeProvider. ' +
      'Asegúrate de envolver tu componente con <ModeProvider>.'
    )
  }
  
  return context
}

/**
 * Hook especializado para registro de eventos con modo
 * Proporciona la strategy apropiada según el modo actual
 */
export function useEventRegistration() {
  const { mode, preferences } = useModeContext()
  
  // Función para determinar si mostrar modal
  const shouldShowModal = useCallback((eventType: string) => {
    if (mode === 'simple') return false
    
    // En modo avanzado, siempre mostrar modal
    if (mode === 'advanced') return true
    
    // Lógica futura para autoAdvanceComplexEvents
    return true
  }, [mode])

  // Función para obtener defaults según modo y preferencias
  const getDefaults = useCallback((eventType: string) => {
    if (mode === 'advanced') {
      // En modo avanzado, no usar defaults automáticos
      return {}
    }
    
    // En modo simple, usar defaults inteligentes
    const { smartDefaults } = preferences
    
    if (eventType === 'sleep' || eventType === 'nap') {
      return {
        sleepDelay: smartDefaults.sleepDelay,
        emotionalState: smartDefaults.emotionalState,
        notes: '',
        fromSimpleMode: true
      }
    }
    
    if (eventType === 'feeding') {
      return {
        feedingType: smartDefaults.feedingType,
        feedingAmount: smartDefaults.feedingAmount,
        feedingDuration: smartDefaults.feedingDuration,
        babyState: 'awake', // Default seguro
        feedingNotes: '',
        emotionalState: 'neutral',
        fromSimpleMode: true
      }
    }
    
    return {}
  }, [mode, preferences])

  return {
    mode,
    shouldShowModal,
    getDefaults,
    isSimpleMode: mode === 'simple',
    isAdvancedMode: mode === 'advanced'
  }
}

/**
 * Hook para analytics del sistema de modos
 */
export function useModeAnalytics() {
  const { mode } = useModeContext()
  
  const trackEvent = useCallback((eventType: string, metadata: Record<string, any> = {}) => {
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('mode_system_event', {
        currentMode: mode,
        eventType,
        timestamp: Date.now(),
        ...metadata
      })
    }
  }, [mode])
  
  const trackEventRegistration = useCallback((eventType: string, duration: number) => {
    trackEvent('event_registered', {
      eventType,
      duration,
      mode
    })
  }, [mode, trackEvent])
  
  return {
    trackEvent,
    trackEventRegistration
  }
}