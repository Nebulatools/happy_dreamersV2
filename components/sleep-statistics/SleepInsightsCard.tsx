"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar } from "lucide-react"
import { useSleepInsights, SleepInsight } from "@/hooks/use-sleep-insights"
import { cn } from "@/lib/utils"

interface SleepInsightsCardProps {
  childId: string
  dateRange: string
}

export default function SleepInsightsCard({ childId, dateRange }: SleepInsightsCardProps) {
  const { insights, loading, error, metadata } = useSleepInsights(childId, dateRange)
  const [showAll, setShowAll] = React.useState(false)

  // Limitar insights mostrados inicialmente a 4
  const displayedInsights = showAll ? insights : insights.slice(0, 4)

  // Función para obtener el color según la prioridad (más sutil)
  const getPriorityColor = (priority: SleepInsight['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-50 border-red-100'
      case 'medium':
        return 'bg-yellow-50 border-yellow-100'
      case 'low':
        return 'bg-green-50 border-green-100'
      default:
        return 'bg-gray-50 border-gray-100'
    }
  }

  // Función para obtener el estilo de la métrica
  const getMetricStyle = (type: SleepInsight['type']) => {
    switch (type) {
      case 'achievement':
        return 'bg-green-100 text-green-700'
      case 'deviation':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-blue-100 text-blue-700'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análisis y recomendaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análisis y recomendaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (insights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análisis y recomendaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No hay suficientes datos para generar análisis</p>
            <p className="text-sm mt-2">Registra más eventos de sueño para obtener insights personalizados</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Análisis y recomendaciones</CardTitle>
            {metadata?.hasPlan && (
              <p className="text-sm text-muted-foreground mt-1">
                Comparando con Plan {metadata.planNumber}
              </p>
            )}
          </div>
          {insights.length > 4 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="border-[#628BE6] text-[#628BE6] hover:bg-[#628BE6] hover:text-white"
            >
              {showAll ? 'Ver menos' : `Ver todas (${insights.length})`}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2">
          {displayedInsights.map((insight) => (
            <div
              key={insight.id}
              className={cn(
                "relative p-3 rounded-lg border transition-all duration-200 hover:shadow-sm",
                getPriorityColor(insight.priority)
              )}
            >
              {/* Header del insight */}
              <div className="flex items-start gap-2">
                <span className="text-xl">{insight.icon}</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm mb-1 line-clamp-1">{insight.title}</h4>
                  <p className="text-xs text-gray-600 line-clamp-1">
                    {insight.description}
                  </p>
                </div>
              </div>

              {/* Métricas si existen y son válidas */}
              {insight.metric && insight.metric.actual !== '--:--' && (
                <div className="mt-2">
                  {insight.metric.percentage !== undefined && (
                    <div className="mb-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600">Adherencia</span>
                        <span className="font-medium">{insight.metric.percentage}%</span>
                      </div>
                      <Progress 
                        value={insight.metric.percentage} 
                        className="h-1.5"
                      />
                    </div>
                  )}
                  
                  {insight.metric.expected && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="font-medium text-gray-900">{insight.metric.actual}</span>
                      <span>vs</span>
                      <span>{insight.metric.expected}</span>
                    </div>
                  )}
                </div>
              )}

            </div>
          ))}
        </div>

      </CardContent>
    </Card>
  )
}