// Hook personalizado para obtener insights de sueño con comparación de plan
import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"

export interface SleepInsight {
  id: string
  type: 'adherence' | 'deviation' | 'pattern' | 'achievement' | 'recommendation'
  category: 'schedule' | 'quality' | 'consistency' | 'health'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  metric?: {
    actual: string | number
    expected: string | number
    difference?: string | number
    percentage?: number
  }
  icon: string
  actionable?: boolean
  action?: {
    label: string
    link?: string
  }
}

interface UseSleepInsightsResult {
  insights: SleepInsight[]
  loading: boolean
  error: string | null
  metadata: {
    childId: string
    dateRange: string
    totalEvents: number
    hasPlan: boolean
    planNumber?: number
  } | null
  refetch: () => Promise<void>
}

export function useSleepInsights(
  childId: string | null,
  dateRange: string = "7-days"
): UseSleepInsightsResult {
  const [insights, setInsights] = useState<SleepInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metadata, setMetadata] = useState<UseSleepInsightsResult['metadata']>(null)
  const { toast } = useToast()

  const fetchInsights = async () => {
    if (!childId) {
      setInsights([])
      setLoading(false)
      setError("No se ha seleccionado un niño")
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(
        `/api/sleep-analysis/insights?childId=${childId}&dateRange=${dateRange}`
      )

      if (!response.ok) {
        throw new Error('Error al cargar los insights de sueño')
      }

      const data = await response.json()

      if (data.success) {
        setInsights(data.insights || [])
        setMetadata(data.metadata || null)
      } else {
        throw new Error(data.error || 'Error desconocido')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      setInsights([])
      
      // Mostrar toast de error solo si es un error real (no "no hay datos")
      if (!errorMessage.includes("No hay suficientes datos")) {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInsights()
  }, [childId, dateRange])

  return {
    insights,
    loading,
    error,
    metadata,
    refetch: fetchInsights
  }
}