// Componente para visualizar y editar planes detallados de niños
// Permite editar rutina diaria, objetivos y recomendaciones

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { 
  Clock, 
  Moon, 
  Sun, 
  Utensils, 
  Target, 
  CheckCircle,
  Moon as Nap,
  Calendar,
  Info,
  Edit,
  Save,
  X,
  Plus,
  Trash2
} from "lucide-react"
import { ChildPlan } from "@/types/models"

interface EditablePlanDisplayProps {
  plan: ChildPlan
  onPlanUpdate?: (updatedPlan: ChildPlan) => void
}

export function EditablePlanDisplay({ plan, onPlanUpdate }: EditablePlanDisplayProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editedPlan, setEditedPlan] = useState<ChildPlan>(plan)
  const [hasChanges, setHasChanges] = useState(false)
  const [showNapModal, setShowNapModal] = useState(false)
  const [newNap, setNewNap] = useState({
    time: "14:00",
    duration: 60,
    description: "Siesta de la tarde"
  })

  // Reiniciar cuando cambia el plan
  useEffect(() => {
    setEditedPlan(plan)
    setIsEditing(false)
    setHasChanges(false)
  }, [plan])

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
      index?: number
      mealIndex?: number
      napIndex?: number
    }> = []

    // Agregar hora de despertar
    events.push({
      time: editedPlan.schedule.wakeTime,
      type: 'wake',
      title: 'Despertar',
      description: 'Hora de levantarse',
      icon: <Sun className="h-4 w-4" />
    })

    // Agregar comidas
    editedPlan.schedule.meals.forEach((meal, index) => {
      events.push({
        time: meal.time,
        type: 'meal',
        title: meal.type.charAt(0).toUpperCase() + meal.type.slice(1),
        description: meal.description,
        icon: getMealIcon(meal.type),
        mealIndex: index
      })
    })

    // Agregar siestas
    if (editedPlan.schedule.naps) {
      editedPlan.schedule.naps.forEach((nap, index) => {
        events.push({
          time: nap.time,
          type: 'nap',
          title: 'Siesta',
          description: nap.description || `Siesta de ${nap.duration} minutos`,
          duration: nap.duration,
          icon: <Nap className="h-4 w-4" />,
          napIndex: index
        })
      })
    }

    // Agregar hora de dormir
    events.push({
      time: editedPlan.schedule.bedtime,
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

  // Manejar cambios en la rutina diaria
  const handleScheduleChange = (field: string, value: string) => {
    const updatedPlan = { ...editedPlan }
    
    if (field === 'wakeTime' || field === 'bedtime') {
      updatedPlan.schedule[field] = value
    }
    
    setEditedPlan(updatedPlan)
    setHasChanges(true)
  }

  // Manejar cambios en las comidas
  const handleMealChange = (index: number, field: 'time' | 'description', value: string) => {
    const updatedPlan = { ...editedPlan }
    updatedPlan.schedule.meals[index][field] = value
    setEditedPlan(updatedPlan)
    setHasChanges(true)
  }

  // Manejar cambios en las siestas
  const handleNapChange = (index: number, field: 'time' | 'duration' | 'description', value: string | number) => {
    const updatedPlan = { ...editedPlan }
    if (!updatedPlan.schedule.naps) {
      updatedPlan.schedule.naps = []
    }
    
    if (field === 'duration') {
      updatedPlan.schedule.naps[index][field] = Number(value)
    } else if (field === 'time' || field === 'description') {
      updatedPlan.schedule.naps[index][field] = String(value)
    }
    
    setEditedPlan(updatedPlan)
    setHasChanges(true)
  }

  // Abrir modal para agregar siesta
  const handleAddNapClick = () => {
    setNewNap({
      time: "14:00",
      duration: 60,
      description: "Siesta de la tarde"
    })
    setShowNapModal(true)
  }

  // Confirmar y agregar nueva siesta
  const confirmAddNap = async () => {
    const updatedPlan = { ...editedPlan }
    if (!updatedPlan.schedule.naps) {
      updatedPlan.schedule.naps = []
    }
    updatedPlan.schedule.naps.push({ ...newNap })
    setEditedPlan(updatedPlan)
    setHasChanges(true)
    setShowNapModal(false)
    
    // Guardar automáticamente si estamos en modo edición
    if (isEditing) {
      // Esperar un momento para que se actualice el estado
      setTimeout(() => {
        handleSave()
      }, 100)
    }
  }

  // Eliminar siesta
  const removeNap = (index: number) => {
    const updatedPlan = { ...editedPlan }
    if (updatedPlan.schedule.naps) {
      updatedPlan.schedule.naps.splice(index, 1)
      setEditedPlan(updatedPlan)
      setHasChanges(true)
    }
  }

  // Manejar cambios en objetivos
  const handleObjectiveChange = (index: number, value: string) => {
    const updatedPlan = { ...editedPlan }
    updatedPlan.objectives[index] = value
    setEditedPlan(updatedPlan)
    setHasChanges(true)
  }

  // Agregar nuevo objetivo
  const addObjective = () => {
    const updatedPlan = { ...editedPlan }
    updatedPlan.objectives.push("")
    setEditedPlan(updatedPlan)
    setHasChanges(true)
  }

  // Eliminar objetivo
  const removeObjective = (index: number) => {
    const updatedPlan = { ...editedPlan }
    updatedPlan.objectives.splice(index, 1)
    setEditedPlan(updatedPlan)
    setHasChanges(true)
  }

  // Manejar cambios en recomendaciones
  const handleRecommendationChange = (index: number, value: string) => {
    const updatedPlan = { ...editedPlan }
    updatedPlan.recommendations[index] = value
    setEditedPlan(updatedPlan)
    setHasChanges(true)
  }

  // Agregar nueva recomendación
  const addRecommendation = () => {
    const updatedPlan = { ...editedPlan }
    updatedPlan.recommendations.push("")
    setEditedPlan(updatedPlan)
    setHasChanges(true)
  }

  // Eliminar recomendación
  const removeRecommendation = (index: number) => {
    const updatedPlan = { ...editedPlan }
    updatedPlan.recommendations.splice(index, 1)
    setEditedPlan(updatedPlan)
    setHasChanges(true)
  }

  // Guardar cambios
  const handleSave = async () => {
    setIsSaving(true)
    
    try {
      // Depuración: Verificar que el ID existe
      console.log('Guardando plan con ID:', plan._id)
      console.log('Plan completo:', plan)
      
      if (!plan._id) {
        throw new Error('El plan no tiene un ID válido')
      }
      
      const response = await fetch(`/api/consultas/plans/${plan._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          schedule: editedPlan.schedule,
          objectives: editedPlan.objectives,
          recommendations: editedPlan.recommendations,
          // Enviar información adicional para crear el plan si no existe
          childId: plan.childId,
          userId: plan.userId,
          planNumber: plan.planNumber,
          planVersion: plan.planVersion,
          planType: plan.planType
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al guardar los cambios')
      }

      const updatedPlan = await response.json()
      
      // Actualizar el plan en el componente padre si existe el callback
      if (onPlanUpdate) {
        onPlanUpdate(updatedPlan.plan)
      }
      
      setEditedPlan(updatedPlan.plan)
      setIsEditing(false)
      setHasChanges(false)
      
      toast.success('Plan actualizado correctamente')
    } catch (error: any) {
      console.error('Error guardando cambios:', error)
      toast.error(error.message || 'Error al guardar los cambios')
    } finally {
      setIsSaving(false)
    }
  }

  // Cancelar edición
  const handleCancel = () => {
    setEditedPlan(plan)
    setIsEditing(false)
    setHasChanges(false)
  }

  const timeline = createTimeline()

  return (
    <div className="space-y-6">
      {/* Header del plan con botón de editar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {editedPlan.title}
                </CardTitle>
                <Badge variant={editedPlan.planType === "initial" ? "default" : "secondary"}>
                  {editedPlan.planType === "initial" ? "Plan Inicial" : "Actualización"}
                </Badge>
                {editedPlan.status === "active" && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Activo
                  </Badge>
                )}
              </div>
              <CardDescription>
                Creado el {new Date(editedPlan.createdAt).toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
                {editedPlan.basedOn === "transcript_analysis" && (
                  <span className="ml-2">• Basado en análisis de transcript</span>
                )}
              </CardDescription>
            </div>
            
            {/* Botones de acción */}
            <div className="flex gap-2">
              {!isEditing ? (
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSaving}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  {hasChanges && (
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? 'Guardando...' : 'Guardar cambios'}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Timeline principal - Rutina Diaria */}
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
                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Input
                              type="time"
                              value={
                                event.type === 'wake' ? editedPlan.schedule.wakeTime :
                                event.type === 'bedtime' ? editedPlan.schedule.bedtime :
                                event.type === 'meal' && event.mealIndex !== undefined ? 
                                  editedPlan.schedule.meals[event.mealIndex].time :
                                event.type === 'nap' && event.napIndex !== undefined && editedPlan.schedule.naps ? 
                                  editedPlan.schedule.naps[event.napIndex].time : event.time
                              }
                              onChange={(e) => {
                                if (event.type === 'wake') {
                                  handleScheduleChange('wakeTime', e.target.value)
                                } else if (event.type === 'bedtime') {
                                  handleScheduleChange('bedtime', e.target.value)
                                } else if (event.type === 'meal' && event.mealIndex !== undefined) {
                                  handleMealChange(event.mealIndex, 'time', e.target.value)
                                } else if (event.type === 'nap' && event.napIndex !== undefined) {
                                  handleNapChange(event.napIndex, 'time', e.target.value)
                                }
                              }}
                              className="w-32"
                            />
                            <Badge variant="outline">
                              {event.title}
                            </Badge>
                            {event.type === 'nap' && event.napIndex !== undefined && (
                              <>
                                <Input
                                  type="number"
                                  value={editedPlan.schedule.naps?.[event.napIndex]?.duration || 60}
                                  onChange={(e) => handleNapChange(event.napIndex!, 'duration', e.target.value)}
                                  className="w-20"
                                  min="1"
                                  max="180"
                                />
                                <span className="text-sm text-muted-foreground">min</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeNap(event.napIndex!)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                          {(event.type === 'meal' && event.mealIndex !== undefined) || 
                           (event.type === 'nap' && event.napIndex !== undefined) ? (
                            <Input
                              value={
                                event.type === 'meal' && event.mealIndex !== undefined ? 
                                  editedPlan.schedule.meals[event.mealIndex].description :
                                event.type === 'nap' && event.napIndex !== undefined && editedPlan.schedule.naps ? 
                                  editedPlan.schedule.naps[event.napIndex].description || '' : ''
                              }
                              onChange={(e) => {
                                if (event.type === 'meal' && event.mealIndex !== undefined) {
                                  handleMealChange(event.mealIndex, 'description', e.target.value)
                                } else if (event.type === 'nap' && event.napIndex !== undefined) {
                                  handleNapChange(event.napIndex, 'description', e.target.value)
                                }
                              }}
                              placeholder="Descripción"
                              className="text-sm"
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground">{event.description}</p>
                          )}
                        </div>
                      ) : (
                        <>
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
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {isEditing && (
                  <Button
                    variant="outline"
                    onClick={handleAddNapClick}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Siesta
                  </Button>
                )}
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
                {editedPlan.objectives.map((objective, index) => (
                  <div key={index} className="flex items-start gap-2">
                    {isEditing ? (
                      <>
                        <Textarea
                          value={objective}
                          onChange={(e) => handleObjectiveChange(index, e.target.value)}
                          className="flex-1 min-h-[60px]"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeObjective(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm">{objective}</p>
                      </>
                    )}
                  </div>
                ))}
                {isEditing && (
                  <Button
                    variant="outline"
                    onClick={addObjective}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Objetivo
                  </Button>
                )}
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
                {editedPlan.recommendations.map((recommendation, index) => (
                  <div key={index} className={isEditing ? "flex items-start gap-2" : "p-3 bg-muted rounded-lg"}>
                    {isEditing ? (
                      <>
                        <Textarea
                          value={recommendation}
                          onChange={(e) => handleRecommendationChange(index, e.target.value)}
                          className="flex-1 min-h-[60px]"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRecommendation(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    ) : (
                      <p className="text-sm">{recommendation}</p>
                    )}
                  </div>
                ))}
                {isEditing && (
                  <Button
                    variant="outline"
                    onClick={addRecommendation}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Recomendación
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Información adicional para planes basados en transcript */}
          {editedPlan.planType === "transcript_based" && editedPlan.transcriptAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Ajustes Realizados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {editedPlan.transcriptAnalysis.improvements && editedPlan.transcriptAnalysis.improvements.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Mejoras:</h4>
                      <div className="space-y-1">
                        {editedPlan.transcriptAnalysis.improvements.map((improvement, index) => (
                          <p key={index} className="text-xs text-muted-foreground">
                            • {improvement}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {editedPlan.transcriptAnalysis.adjustments && editedPlan.transcriptAnalysis.adjustments.length > 0 && (
                    <div>
                      <Separator className="my-3" />
                      <h4 className="font-medium text-sm mb-2">Ajustes:</h4>
                      <div className="space-y-1">
                        {editedPlan.transcriptAnalysis.adjustments.map((adjustment, index) => (
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
                  <span>{editedPlan.planNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tipo:</span>
                  <span>{editedPlan.planType === "initial" ? "Inicial" : "Actualización"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Basado en:</span>
                  <span>
                    {editedPlan.basedOn === "survey_stats_rag" ? "Survey + Stats + RAG" : "Análisis de transcript"}
                  </span>
                </div>
                {editedPlan.sourceData && (
                  <>
                    <Separator className="my-2" />
                    <div className="flex justify-between">
                      <span>Eventos analizados:</span>
                      <span>{editedPlan.sourceData.totalEvents}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fuentes RAG:</span>
                      <span>{editedPlan.sourceData.ragSources.length}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal para agregar siesta */}
      <Dialog open={showNapModal} onOpenChange={setShowNapModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Agregar Siesta</DialogTitle>
            <DialogDescription>
              Configure los detalles de la nueva siesta en la rutina diaria.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nap-time" className="text-right">
                Hora
              </Label>
              <Input
                id="nap-time"
                type="time"
                value={newNap.time}
                onChange={(e) => setNewNap({ ...newNap, time: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nap-duration" className="text-right">
                Duración
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input
                  id="nap-duration"
                  type="number"
                  min="15"
                  max="180"
                  step="15"
                  value={newNap.duration}
                  onChange={(e) => setNewNap({ ...newNap, duration: parseInt(e.target.value) || 60 })}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">minutos</span>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nap-description" className="text-right">
                Descripción
              </Label>
              <Input
                id="nap-description"
                value={newNap.description}
                onChange={(e) => setNewNap({ ...newNap, description: e.target.value })}
                placeholder="Ej: Siesta de la tarde"
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNapModal(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmAddNap}>
              Agregar Siesta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}