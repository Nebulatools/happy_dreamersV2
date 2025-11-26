// Hook para manejar el estado de sueño sincronizado con la base de datos
// Incluye soporte para pending events de localStorage (usados por SleepButton)

import { useState, useEffect, useCallback } from 'react'
import useSWR from 'swr'
import { useChildPlan } from './use-child-plan'
import { nowInTimeZone } from '@/lib/timezone'

export type SleepStatus = 'awake' | 'sleeping' | 'napping' | 'night_waking'

interface SleepPending {
  type: 'sleep' | 'nap'
  start: string
  sleepDelay?: number
  emotionalState?: string
  notes?: string
}

interface NightWakePending {
  type: 'night_waking'
  start: string
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
  const [sleepPending, setSleepPending] = useState<SleepPending | null>(null)
  const [nightWakePending, setNightWakePending] = useState<NightWakePending | null>(null)

  // Cargar pending events de localStorage (solo en cliente)
  useEffect(() => {
    if (typeof window === 'undefined' || !childId) return
    const sleepStorageKey = `pending_sleep_event_${childId}`
    const nightWakeStorageKey = `pending_night_wake_${childId}`

    try {
      const storedSleep = window.localStorage.getItem(sleepStorageKey)
      if (storedSleep) {
        const parsed = JSON.parse(storedSleep) as SleepPending
        if (parsed?.type && parsed?.start) {
          setSleepPending(parsed)
        }
      } else {
        setSleepPending(null)
      }
    } catch (e) {
      console.warn('[useSleepState] No se pudo parsear sleep pending', e)
    }

    try {
      const storedNightWake = window.localStorage.getItem(nightWakeStorageKey)
      if (storedNightWake) {
        const parsed = JSON.parse(storedNightWake) as NightWakePending
        if (parsed?.type && parsed?.start) {
          setNightWakePending(parsed)
        }
      } else {
        setNightWakePending(null)
      }
    } catch (e) {
      console.warn('[useSleepState] No se pudo parsear night wake pending', e)
    }
  }, [childId])

  // Escuchar cambios en localStorage (para sincronizar con SleepButton)
  useEffect(() => {
    if (typeof window === 'undefined' || !childId) return
    const sleepStorageKey = `pending_sleep_event_${childId}`
    const nightWakeStorageKey = `pending_night_wake_${childId}`

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === sleepStorageKey) {
        if (e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue) as SleepPending
            if (parsed?.type && parsed?.start) {
              setSleepPending(parsed)
            }
          } catch {
            setSleepPending(null)
          }
        } else {
          setSleepPending(null)
        }
      }
      if (e.key === nightWakeStorageKey) {
        if (e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue) as NightWakePending
            if (parsed?.type && parsed?.start) {
              setNightWakePending(parsed)
            }
          } catch {
            setNightWakePending(null)
          }
        } else {
          setNightWakePending(null)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [childId])

  // Polling de localStorage para detectar cambios en la misma pestana
  useEffect(() => {
    if (typeof window === 'undefined' || !childId) return
    const sleepStorageKey = `pending_sleep_event_${childId}`
    const nightWakeStorageKey = `pending_night_wake_${childId}`

    const checkLocalStorage = () => {
      // Check sleep pending
      try {
        const storedSleep = window.localStorage.getItem(sleepStorageKey)
        if (storedSleep) {
          const parsed = JSON.parse(storedSleep) as SleepPending
          if (parsed?.type && parsed?.start) {
            setSleepPending(prev => {
              if (JSON.stringify(prev) !== storedSleep) {
                return parsed
              }
              return prev
            })
          }
        } else {
          setSleepPending(null)
        }
      } catch {
        // Ignorar errores
      }

      // Check night wake pending
      try {
        const storedNightWake = window.localStorage.getItem(nightWakeStorageKey)
        if (storedNightWake) {
          const parsed = JSON.parse(storedNightWake) as NightWakePending
          if (parsed?.type && parsed?.start) {
            setNightWakePending(prev => {
              if (JSON.stringify(prev) !== storedNightWake) {
                return parsed
              }
              return prev
            })
          }
        } else {
          setNightWakePending(null)
        }
      } catch {
        // Ignorar errores
      }
    }

    const interval = setInterval(checkLocalStorage, 500)
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
  // nightWakePending tiene prioridad (estamos en medio de un despertar nocturno)
  const derivedStatusFromPending: SleepStatus | null = nightWakePending
    ? 'night_waking'
    : sleepPending
      ? sleepPending.type === 'nap'
        ? 'napping'
        : 'sleeping'
      : null

  // Estado efectivo: pending event tiene prioridad sobre API
  const effectiveStatus = derivedStatusFromPending ?? data?.status ?? 'awake'

  // Convertir la respuesta del API al formato interno (usando estado efectivo)
  // Para lastEventTime: usar sleepPending.start (hora original de inicio del sueno)
  const sleepState: SleepState = {
    status: effectiveStatus,
    lastEventTime: sleepPending?.start
      ? new Date(sleepPending.start)
      : (data?.lastEventTime ? new Date(data.lastEventTime) : null),
    lastEventType: nightWakePending?.type ?? sleepPending?.type ?? data?.lastEventType ?? null,
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
