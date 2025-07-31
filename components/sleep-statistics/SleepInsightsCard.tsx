"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  TrendingUp, 
  TrendingDown, 
  Info,
  ChevronRight,
  Target,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Calendar
} from "lucide-react"
import { useSleepInsights, SleepInsight } from "@/hooks/use-sleep-insights"
import { cn } from "@/lib/utils"

interface SleepInsightsCardProps {
  childId: string
  dateRange: string
}

export default function SleepInsightsCard({ childId, dateRange }: SleepInsightsCardProps) {
  const { insights, loading, error, metadata } = useSleepInsights(childId, dateRange)
  const [showAll, setShowAll] = React.useState(false)

  // Limitar insights mostrados inicialmente
  const displayedInsights = showAll ? insights : insights.slice(0, 6)

  // Función para obtener el ícono según el tipo
  const getTypeIcon = (type: SleepInsight['type']) => {
    switch (type) {
      case 'achievement':
        return <CheckCircle className="h-4 w-4" />
      case 'deviation':
        return <AlertTriangle className="h-4 w-4" />
      case 'pattern':
        return <TrendingUp className="h-4 w-4" />
      case 'recommendation':
        return <Lightbulb className="h-4 w-4" />
      case 'adherence':
        return <Target className="h-4 w-4" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  // Función para obtener el color según la prioridad
  const getPriorityColor = (priority: SleepInsight['priority']) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
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
          {insights.length > 6 && (
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayedInsights.map((insight) => (
            <div
              key={insight.id}
              className={cn(
                "relative p-4 rounded-lg border transition-all duration-200 hover:shadow-md",
                getPriorityColor(insight.priority)
              )}
            >
              {/* Header del insight */}
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0">
                  <span className="text-2xl">{insight.icon}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getTypeIcon(insight.type)}
                    <h4 className="font-semibold text-sm">{insight.title}</h4>
                  </div>
                  <p className="text-sm opacity-90">
                    {insight.description}
                  </p>
                </div>
              </div>

              {/* Métricas si existen */}
              {insight.metric && (
                <div className="mt-3 space-y-2">
                  {insight.metric.percentage !== undefined && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Adherencia</span>
                        <span className="font-medium">{insight.metric.percentage}%</span>
                      </div>
                      <Progress 
                        value={insight.metric.percentage} 
                        className="h-2"
                      />
                    </div>
                  )}
                  
                  <div className={cn(
                    "flex items-center justify-between text-xs p-2 rounded",
                    getMetricStyle(insight.type)
                  )}>
                    <div className="flex items-center gap-2">
                      <span>Real:</span>
                      <span className="font-medium">{insight.metric.actual}</span>
                    </div>
                    {insight.metric.expected && (
                      <>
                        <ChevronRight className="h-3 w-3" />
                        <div className="flex items-center gap-2">
                          <span>Plan:</span>
                          <span className="font-medium">{insight.metric.expected}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Acción si existe */}
              {insight.actionable && insight.action && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 w-full justify-start text-xs"
                  onClick={() => {
                    // Aquí puedes implementar la navegación o acción específica
                    console.log('Action clicked:', insight.action)
                  }}
                >
                  {insight.action.label}
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              )}

              {/* Badge de categoría */}
              <Badge 
                variant="outline" 
                className="absolute top-2 right-2 text-xs"
              >
                {insight.category}
              </Badge>
            </div>
          ))}
        </div>

        {/* Mensaje cuando hay plan activo */}
        {metadata?.hasPlan && insights.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 text-blue-700">
              <Info className="h-4 w-4" />
              <p className="text-sm">
                Los insights están basados en la comparación con el Plan {metadata.planNumber} activo
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}