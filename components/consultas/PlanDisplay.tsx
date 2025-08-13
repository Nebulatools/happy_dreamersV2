// Componente para visualizar planes detallados de niños
// Muestra horarios estructurados en formato timeline

"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Clock, 
  Moon, 
  Sun, 
  Utensils, 
  Target, 
  CheckCircle,
  Moon as Nap,
  Calendar,
  Info
} from "lucide-react"
import { ChildPlan } from "@/types/models"

interface PlanDisplayProps {
  plan: ChildPlan
}

export function PlanDisplay({ plan }: PlanDisplayProps) {
  // Validación defensiva
  if (!plan) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No hay datos del plan disponibles
        </CardContent>
      </Card>
    )
  }

  // Función para formatear hora con validación
  const formatTime = (time: string) => {
    if (!time || typeof time !== 'string') return 'N/A'
    
    const parts = time.split(':')
    if (parts.length !== 2) return time
    
    const [hour, minute] = parts
    const hourNum = parseInt(hour)
    if (isNaN(hourNum)) return time
    
    const period = hourNum >= 12 ? 'PM' : 'AM'
    const displayHour = hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum
    return `${displayHour}:${minute} ${period}`
  }


  // Función para obtener ícono según el tipo de comida
  const getMealIcon = (type: string) => {
    return <Utensils className="h-4 w-4" />
  }

  // Crear timeline combinado de todos los eventos del día
  const createTimeline = () => {
    const events: Array<{
      time: string
      type: 'bedtime' | 'wake' | 'meal' | 'activity' | 'nap'
      title: string
      description: string
      duration?: number
      icon: React.ReactNode
    }> = []

    // Agregar hora de despertar
    events.push({
      time: plan.schedule.wakeTime,
      type: 'wake',
      title: 'Despertar',
      description: 'Hora de levantarse',
      icon: <Sun className="h-4 w-4" />
    })

    // Agregar comidas
    plan.schedule.meals.forEach(meal => {
      events.push({
        time: meal.time,
        type: 'meal',
        title: meal.type.charAt(0).toUpperCase() + meal.type.slice(1),
        description: meal.description,
        icon: getMealIcon(meal.type)
      })
    })


    // Agregar siestas
    if (plan.schedule.naps) {
      plan.schedule.naps.forEach(nap => {
        events.push({
          time: nap.time,
          type: 'nap',
          title: 'Siesta',
          description: nap.description || `Siesta de ${nap.duration} minutos`,
          duration: nap.duration,
          icon: <Nap className="h-4 w-4" />
        })
      })
    }

    // Agregar hora de dormir
    events.push({
      time: plan.schedule.bedtime,
      type: 'bedtime',
      title: 'Hora de dormir',
      description: 'Ir a la cama',
      icon: <Moon className="h-4 w-4" />
    })

    // Ordenar por hora
    return events.sort((a, b) => {
      const timeA = a.time.split(':').map(Number)
      const timeB = b.time.split(':').map(Number)
      return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1])
    })
  }

  const timeline = createTimeline()

  return (
    <div className="space-y-6">
      {/* Header del plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {plan.title}
                </CardTitle>
                <Badge variant={plan.planType === "initial" ? "default" : "secondary"}>
                  {plan.planType === "initial" ? "Plan Inicial" : "Actualización"}
                </Badge>
                {plan.status === "active" && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Activo
                  </Badge>
                )}
              </div>
              <CardDescription>
                Creado el {new Date(plan.createdAt).toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
                {plan.basedOn === "transcript_analysis" && (
                  <span className="ml-2">• Basado en análisis de transcript</span>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Timeline principal */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Rutina Diaria
              </CardTitle>
              <CardDescription>
                Horarios estructurados para el día
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timeline.map((event, index) => (
                  <div key={`${event.time}-${event.type}-${index}`} className="flex items-start gap-4">
                    {/* Timeline visual */}
                    <div className="flex flex-col items-center">
                      <div className={`
                        p-2 rounded-full border-2 
                        ${event.type === 'bedtime' ? 'bg-purple-100 border-purple-500 text-purple-600' :
                          event.type === 'wake' ? 'bg-yellow-100 border-yellow-500 text-yellow-600' :
                          event.type === 'meal' ? 'bg-orange-100 border-orange-500 text-orange-600' :
                          event.type === 'activity' ? 'bg-blue-100 border-blue-500 text-blue-600' :
                          'bg-indigo-100 border-indigo-500 text-indigo-600'
                        }
                      `}>
                        {event.icon}
                      </div>
                      {index < timeline.length - 1 && (
                        <div className="w-px h-8 bg-border mt-2" />
                      )}
                    </div>

                    {/* Contenido del evento */}
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-lg">
                          {formatTime(event.time)}
                        </span>
                        <Badge variant="outline">
                          {event.title}
                        </Badge>
                        {event.duration && (
                          <Badge variant="secondary">
                            {event.duration} min
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground">
                        {event.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel lateral con objetivos y recomendaciones */}
        <div className="space-y-6">
          {/* Objetivos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Objetivos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {plan.objectives.map((objective, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm">{objective}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recomendaciones */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Recomendaciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {plan.recommendations.map((recommendation, index) => (
                  <div key={index} className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">{recommendation}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Información adicional para planes basados en transcript */}
          {plan.planType === "transcript_based" && plan.transcriptAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Ajustes Realizados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {plan.transcriptAnalysis.improvements && plan.transcriptAnalysis.improvements.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Mejoras:</h4>
                      <div className="space-y-1">
                        {plan.transcriptAnalysis.improvements.map((improvement, index) => (
                          <p key={index} className="text-xs text-muted-foreground">
                            • {improvement}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {plan.transcriptAnalysis.adjustments && plan.transcriptAnalysis.adjustments.length > 0 && (
                    <div>
                      <Separator className="my-3" />
                      <h4 className="font-medium text-sm mb-2">Ajustes:</h4>
                      <div className="space-y-1">
                        {plan.transcriptAnalysis.adjustments.map((adjustment, index) => (
                          <p key={index} className="text-xs text-muted-foreground">
                            • {adjustment}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metadata del plan */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Información del Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Número de Plan:</span>
                  <span>{plan.planNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tipo:</span>
                  <span>{plan.planType === "initial" ? "Inicial" : "Actualización"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Basado en:</span>
                  <span>
                    {plan.basedOn === "survey_stats_rag" ? "Survey + Stats + RAG" : "Análisis de transcript"}
                  </span>
                </div>
                {plan.sourceData && (
                  <>
                    <Separator className="my-2" />
                    <div className="flex justify-between">
                      <span>Eventos analizados:</span>
                      <span>{plan.sourceData.totalEvents}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fuentes RAG:</span>
                      <span>{plan.sourceData.ragSources.length}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}