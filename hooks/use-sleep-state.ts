// Hook para manejar el estado de sueño sincronizado con la base de datos
// Reemplaza el uso de localStorage con datos en tiempo real

import { useState, useEffect, useCallback } from 'react'
import useSWR from 'swr'
import { useChildPlan } from './use-child-plan'

export type SleepStatus = 'awake' | 'sleeping' | 'napping' | 'night_waking'

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

export function useSleepState(childId: string | null) {
  const { getTimeContext } = useChildPlan(childId)
  
  const { data, error, isLoading, mutate } = useSWR<SleepStateResponse>(
    childId ? `/api/children/${childId}/current-sleep-state` : null,
    fetcher,
    {
      refreshInterval: 30000, // Actualizar cada 30 segundos
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  )

  // Convertir la respuesta del API al formato interno
  const sleepState: SleepState = {
    status: data?.status || 'awake',
    lastEventTime: data?.lastEventTime ? new Date(data.lastEventTime) : null,
    lastEventType: data?.lastEventType || null,
    lastEventId: data?.lastEventId || null,
    duration: data?.duration || null
  }

  // Función para determinar el siguiente estado basado en el contexto temporal
  const getNextState = useCallback((currentStatus: SleepStatus): SleepStatus => {
    const timeContext = getTimeContext()
    
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
  }, [getTimeContext])

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