// Hook para obtener datos del niño y eventos para SmartDefaultsEngine
// Usado en modo dual para generar defaults inteligentes

import { useState, useEffect, useCallback } from 'react'
import { EventData } from '@/components/events/types'
import type { Child } from '@/types/models'

interface ChildEventData {
  childData: {
    id: string
    firstName: string
    lastName: string
    birthDate: string
  } | null
  eventHistory: EventData[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook personalizado para obtener datos del niño y su historial de eventos
 * Optimizado para uso con SmartDefaultsEngine en modo dual
 */
export function useChildEventData(childId: string): ChildEventData {
  const [childData, setChildData] = useState<ChildEventData['childData']>(null)
  const [eventHistory, setEventHistory] = useState<EventData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!childId) {
      setError('childId es requerido')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Obtener datos del niño y eventos en paralelo para mejor performance
      const [childResponse, eventsResponse] = await Promise.all([
        fetch(`/api/children/${childId}`),
        fetch(`/api/children/events?childId=${childId}&limit=50`) // Últimos 50 eventos para SmartDefaults
      ])

      // Verificar respuestas
      if (!childResponse.ok) {
        throw new Error(`Error obteniendo datos del niño: ${childResponse.status}`)
      }
      if (!eventsResponse.ok) {
        throw new Error(`Error obteniendo eventos: ${eventsResponse.status}`)
      }

      // Procesar datos del niño
      const childResult = await childResponse.json()
      let child: Child | null = null
      
      if (childResult.success && childResult.child) {
        child = childResult.child
      } else if (childResult.data?.child) {
        child = childResult.data.child
      } else if (childResult._id) {
        // Respuesta directa
        child = childResult as Child
      }

      if (!child) {
        throw new Error('No se pudo obtener información del niño')
      }

      // Extraer datos relevantes para SmartDefaultsEngine
      setChildData({
        id: child._id?.toString() || childId,
        firstName: child.firstName,
        lastName: child.lastName,
        birthDate: child.birthDate
      })

      // Procesar eventos
      const eventsResult = await eventsResponse.json()
      let events: EventData[] = []

      if (eventsResult.success && eventsResult.events) {
        events = eventsResult.events
      } else if (eventsResult.data?.events) {
        events = eventsResult.data.events
      } else if (Array.isArray(eventsResult)) {
        events = eventsResult
      }

      // Filtrar y ordenar eventos relevantes para SmartDefaults
      const relevantEvents = events
        .filter(event => ['sleep', 'nap', 'feeding', 'wake'].includes(event.eventType))
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
        .slice(0, 30) // Máximo 30 eventos más recientes

      setEventHistory(relevantEvents)

    } catch (error) {
      console.error('Error in useChildEventData:', error)
      setError(error instanceof Error ? error.message : 'Error desconocido')
      setChildData(null)
      setEventHistory([])
    } finally {
      setIsLoading(false)
    }
  }, [childId])

  // Función de refetch expuesta
  const refetch = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  // Cargar datos al montar o cambiar childId
  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    childData,
    eventHistory,
    isLoading,
    error,
    refetch
  }
}

/**
 * Hook simplificado que solo retorna si hay datos suficientes para SmartDefaults
 */
export function useSmartDefaultsReady(childId: string): boolean {
  const { childData, isLoading, error } = useChildEventData(childId)
  
  return !isLoading && !error && childData !== null && !!childData.birthDate
}