// Hook para manejar el estado de sueño sincronizado con la base de datos
// Incluye soporte para pending events de localStorage (usados por SleepButton)

import { useState, useEffect, useCallback } from 'react'
import useSWR from 'swr'
import { useChildPlan } from './use-child-plan'
import { nowInTimeZone } from '@/lib/timezone'

export type SleepStatus = 'awake' | 'sleeping' | 'napping' | 'night_waking'

interface PendingEvent {
  type: 'sleep' | 'nap' | 'night_waking'
  start: string
  sleepDelay?: number
  emotionalState?: string
  notes?: string
}

interface SleepState {
  status: SleepStatus
  lastEventTime: Date | null
  lastEventType: string | null
  lastEventId: string | null
  duration: number | null
}

interface SleepStateResponse {
  status: SleepStatus
  lastEventTime: string | null
  lastEventType: string | null
  lastEventId: string | null
  duration: number | null
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function useSleepState(childId: string | null, timeZone?: string) {
  const { getTimeContext } = useChildPlan(childId, timeZone)
  const [pendingEvent, setPendingEvent] = useState<PendingEvent | null>(null)

  // Cargar pending event de localStorage (solo en cliente)
  useEffect(() => {
    if (typeof window === 'undefined' || !childId) return
    const storageKey = `pending_sleep_event_${childId}`
    try {
      const stored = window.localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored) as PendingEvent
        if (parsed?.type && parsed?.start) {
          setPendingEvent(parsed)
        }
      } else {
        setPendingEvent(null)
      }
    } catch (e) {
      console.warn('[useSleepState] No se pudo parsear pending event', e)
    }
  }, [childId])

  // Escuchar cambios en localStorage (para sincronizar con SleepButton)
  useEffect(() => {
    if (typeof window === 'undefined' || !childId) return
    const storageKey = `pending_sleep_event_${childId}`

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey) {
        if (e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue) as PendingEvent
            if (parsed?.type && parsed?.start) {
              setPendingEvent(parsed)
            }
          } catch {
            setPendingEvent(null)
          }
        } else {
          setPendingEvent(null)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [childId])

  // Polling de localStorage para detectar cambios en la misma pestaña
  useEffect(() => {
    if (typeof window === 'undefined' || !childId) return
    const storageKey = `pending_sleep_event_${childId}`

    const checkLocalStorage = () => {
      try {
        const stored = window.localStorage.getItem(storageKey)
        if (stored) {
          const parsed = JSON.parse(stored) as PendingEvent
          if (parsed?.type && parsed?.start) {
            setPendingEvent(prev => {
              // Solo actualizar si cambió
              if (JSON.stringify(prev) !== stored) {
                return parsed
              }
              return prev
            })
          }
        } else {
          setPendingEvent(null)
        }
      } catch {
        // Ignorar errores de localStorage
      }
    }

    const interval = setInterval(checkLocalStorage, 500) // Check cada 500ms
    return () => clearInterval(interval)
  }, [childId])

  const { data, error, isLoading, mutate } = useSWR<SleepStateResponse>(
    childId ? `/api/children/${childId}/current-sleep-state` : null,
    fetcher,
    {
      refreshInterval: 30000, // Actualizar cada 30 segundos
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  )

  // Derivar estado del pending event
  const derivedStatusFromPending: SleepStatus | null = pendingEvent
    ? pendingEvent.type === 'night_waking'
      ? 'night_waking'
      : pendingEvent.type === 'nap'
        ? 'napping'
        : 'sleeping'
    : null

  // Estado efectivo: pending event tiene prioridad sobre API
  const effectiveStatus = derivedStatusFromPending ?? data?.status ?? 'awake'

  // Convertir la respuesta del API al formato interno (usando estado efectivo)
  const sleepState: SleepState = {
    status: effectiveStatus,
    lastEventTime: pendingEvent?.start
      ? new Date(pendingEvent.start)
      : (data?.lastEventTime ? new Date(data.lastEventTime) : null),
    lastEventType: pendingEvent?.type ?? data?.lastEventType ?? null,
    lastEventId: data?.lastEventId || null,
    duration: data?.duration || null
  }

  // Función para determinar el siguiente estado basado en el contexto temporal
  const getNextState = useCallback((currentStatus: SleepStatus): SleepStatus => {
    const { date } = nowInTimeZone(timeZone)
    const timeContext = getTimeContext(date)
    
    switch (currentStatus) {
      case 'awake':
        // Si es horario nocturno, ir a dormir
        if (timeContext === 'night') return 'sleeping'
        // Si es horario de siesta, ir a siesta
        if (timeContext === 'nap') return 'napping'
        // Durante el día, por defecto siesta
        return 'napping'
        
      case 'napping':
        // Despertar de la siesta siempre va a despierto
        return 'awake'
        
      case 'sleeping':
        // Durante la noche, despertar va a despertar nocturno
        return 'night_waking'
        
      case 'night_waking':
        // Volver a dormir después de despertar nocturno
        return 'sleeping'
        
      default:
        return 'awake'
    }
  }, [getTimeContext, timeZone])

  // Función para obtener la configuración del botón
  const getButtonConfig = useCallback(() => {
    const currentStatus = sleepState.status
    const nextStatus = getNextState(currentStatus)
    
    switch (currentStatus) {
      case 'awake':
        if (nextStatus === 'sleeping') {
          return {
            text: 'SE ACOSTÓ',
            action: 'start_sleep',
            icon: 'Moon',
            color: 'blue-purple',
            description: 'Registrar hora de acostarse'
          }
        } else {
          return {
            text: 'SIESTA',
            action: 'start_nap',
            icon: 'Sun',
            color: 'yellow-orange',
            description: 'Registrar inicio de siesta'
          }
        }
        
      case 'napping':
        return {
          text: 'SE DESPERTÓ',
          action: 'wake_from_nap',
          icon: 'Sun',
          color: 'yellow-orange',
          description: sleepState.duration 
            ? `Durmiendo ${sleepState.duration} minutos`
            : 'Registrar despertar de siesta'
        }
        
      case 'sleeping':
        return {
          text: 'DESPERTAR NOCTURNO',
          action: 'night_wake',
          icon: 'AlertCircle',
          color: 'red-orange',
          description: sleepState.duration
            ? `Durmiendo ${Math.floor(sleepState.duration / 60)}h ${sleepState.duration % 60}m`
            : 'Registrar despertar nocturno'
        }
        
      case 'night_waking':
        return {
          text: 'VOLVIÓ A DORMIR',
          action: 'back_to_sleep',
          icon: 'Moon',
          color: 'indigo-purple',
          description: 'Registrar que volvió a dormir'
        }
        
      default:
        return {
          text: 'REGISTRAR SUEÑO',
          action: 'start_sleep',
          icon: 'Moon',
          color: 'blue-purple',
          description: 'Iniciar registro'
        }
    }
  }, [sleepState, getNextState])

  return {
    sleepState,
    isLoading,
    error,
    buttonConfig: getButtonConfig(),
    nextState: getNextState(sleepState.status),
    refetch: mutate
  }
}
