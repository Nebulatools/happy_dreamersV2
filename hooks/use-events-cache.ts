// Hook para manejar caché y invalidación de eventos
"use client"

import { useState, useCallback, useRef } from 'react'

// Tipo para los listeners de invalidación
type InvalidationListener = () => void

// Singleton para manejar invalidación global
class EventsCacheManager {
  private listeners: Set<InvalidationListener> = new Set()
  
  subscribe(listener: InvalidationListener) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
  
  invalidate() {
    this.listeners.forEach(listener => listener())
  }
}

// Instancia global del manager
const eventsCacheManager = new EventsCacheManager()

// Hook para usar en componentes que muestran eventos
export function useEventsCache(childId: string | null) {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  
  // Función para forzar refresco
  const refresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1)
  }, [])
  
  // Suscribirse a invalidaciones globales
  const subscribe = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
    }
    
    unsubscribeRef.current = eventsCacheManager.subscribe(refresh)
    
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [refresh])
  
  // Función para invalidar todos los caches de eventos
  const invalidateAll = useCallback(() => {
    eventsCacheManager.invalidate()
  }, [])
  
  return {
    refreshTrigger, // Para usar en useEffect dependencies
    subscribe,      // Para suscribirse a invalidaciones
    invalidateAll,  // Para invalidar todos los caches
    refresh         // Para refrescar solo este componente
  }
}

// Hook simplificado solo para invalidar
export function useEventsInvalidation() {
  return useCallback(() => {
    eventsCacheManager.invalidate()
  }, [])
}