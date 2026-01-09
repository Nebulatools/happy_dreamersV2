"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { format } from "date-fns"
import { Clock, Plus, Minus } from "lucide-react"
import { eventTypes, getEventType } from "@/lib/event-types"
import { useUser } from "@/context/UserContext"
import { buildLocalDate, dateToTimestamp, DEFAULT_TIMEZONE } from "@/lib/datetime"

// Eventos disponibles en el modal manual (excluyendo wake y night_feeding)
const manualEventTypes = eventTypes.filter(type => 
  !["wake", "night_feeding"].includes(type.id)
)

interface ManualEventModalProps {
  open: boolean
  onClose: () => void
  childId: string
  childName: string
  onEventRegistered?: () => void
  // Opcionales: forzar tipo de evento inicial y/o bloquear selector
  defaultEventType?: string
  lockEventType?: boolean
  // Props para modo edición
  mode?: "create" | "edit"
  initialData?: {
    _id?: string
    type: string
    startTime: string
    endTime?: string
    notes?: string
    emotionalState?: string
    sleepDelay?: number
    awakeDelay?: number
    feedingType?: string
    feedingAmount?: number
    feedingDuration?: number
    babyState?: string
    medicationName?: string
    medicationDose?: string
    activityDescription?: string
    activityDuration?: number
    activityImpact?: string
  }
}

/**
 * Modal simple para registro manual de eventos con fecha/hora específica
 * Basado en registroeventos.md - solo los eventos principales
 */
export function ManualEventModal({
  open,
  onClose,
  childId,
  childName,
  onEventRegistered,
  defaultEventType,
  lockEventType,
  mode = "create",
  initialData,
}: ManualEventModalProps) {
  const { toast } = useToast()
  const { userData } = useUser()
  const timezone = userData.timezone || DEFAULT_TIMEZONE
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Función para obtener hora en punto (redondear hacia abajo)
  const getCurrentHourRounded = () => {
    const now = new Date()
    now.setMinutes(0, 0, 0) // Poner minutos, segundos y milisegundos a 0
    return format(now, "HH:mm")
  }

  // Estado del formulario - completo y mejorado
  const getDefaultStartTimeForType = (typeId: string) => {
    const eventTypeConfig = getEventType(typeId)
    return eventTypeConfig?.defaultStartTime || getCurrentHourRounded()
  }

  const initialEventType = defaultEventType || "sleep"
  const [eventType, setEventType] = useState<string>(initialEventType)
  // Sincronizar tipo por defecto cuando se abre el modal
  useEffect(() => {
    if (open && defaultEventType) {
      setEventType(defaultEventType)
      setStartTime(getDefaultStartTimeForType(defaultEventType))
    }
  }, [open, defaultEventType])

  // Cargar datos en modo edición
  useEffect(() => {
    if (open && mode === "edit" && initialData) {
      // Campos generales
      setEventType(initialData.type)
      setStartDate(format(new Date(initialData.startTime), "yyyy-MM-dd"))
      setStartTime(format(new Date(initialData.startTime), "HH:mm"))

      if (initialData.endTime) {
        setEndDate(format(new Date(initialData.endTime), "yyyy-MM-dd"))
        setEndTime(format(new Date(initialData.endTime), "HH:mm"))
        setIncludeEndTime(true)
      }

      setNotes(initialData.notes || "")

      // Campos específicos de sueño
      if (initialData.sleepDelay != null) {
        setSleepDelayValue(initialData.sleepDelay.toString())
      }
      if (initialData.awakeDelay != null) {
        setAwakeDelay(initialData.awakeDelay)
      }
      if (initialData.emotionalState) {
        setEmotionalState(initialData.emotionalState as "tranquilo" | "inquieto" | "alterado")
      }

      // Campos específicos de alimentación
      if (initialData.feedingType) {
        setFeedingType(initialData.feedingType as "breast" | "bottle" | "solids")
      }
      if (initialData.feedingAmount !== undefined) {
        setFeedingAmount(initialData.feedingAmount)
      }
      if (initialData.feedingDuration !== undefined) {
        setFeedingDuration(initialData.feedingDuration)
      }
      if (initialData.babyState) {
        setBabyState(initialData.babyState as "awake" | "asleep")
      }

      // Campos específicos de medicamentos
      if (initialData.medicationName) {
        setMedicationName(initialData.medicationName)
      }
      if (initialData.medicationDose) {
        setMedicationDose(initialData.medicationDose)
      }

      // Campos específicos de actividades
      if (initialData.activityDescription) {
        setActivityDescription(initialData.activityDescription)
      }
      if (initialData.activityDuration !== undefined) {
        setActivityDuration(initialData.activityDuration)
      }
      if (initialData.activityImpact) {
        setActivityImpact(initialData.activityImpact as "positive" | "neutral" | "negative")
      }
    }
  }, [open, mode, initialData])

  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [startTime, setStartTime] = useState(getDefaultStartTimeForType(initialEventType))
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [endTime, setEndTime] = useState(getCurrentHourRounded())
  const [includeEndTime, setIncludeEndTime] = useState<boolean>(initialEventType === "sleep") // Hora fin opcional
  const [notes, setNotes] = useState("")
  
  // Campos específicos de sueño (sleep, nap, night_waking)
  // sleepDelayValue se guarda como string para poder manejar la opción especial "no se pudo dormir" en siestas
  // y luego convertirla a minutos numéricos al construir el payload.
  const [sleepDelayValue, setSleepDelayValue] = useState<string>("0")
  const [awakeDelay, setAwakeDelay] = useState(0)
  const [emotionalState, setEmotionalState] = useState<"tranquilo" | "inquieto" | "alterado">("tranquilo")
  
  // Campos específicos de alimentación
  const [feedingType, setFeedingType] = useState<"breast" | "bottle" | "solids">("bottle")
  const [feedingAmount, setFeedingAmount] = useState(4) // onzas (oz)
  const [feedingDuration, setFeedingDuration] = useState(15)
  const [babyState, setBabyState] = useState<"awake" | "asleep">("awake")
  const [feedingNotes, setFeedingNotes] = useState("")
  
  // Campos específicos de medicamentos
  const [medicationName, setMedicationName] = useState("")
  const [medicationDose, setMedicationDose] = useState("")
  const [medicationNotes, setMedicationNotes] = useState("")
  
  // Campos específicos de actividades
  const [activityDescription, setActivityDescription] = useState("")
  const [activityDuration, setActivityDuration] = useState(30)
  const [activityImpact, setActivityImpact] = useState<"positive" | "neutral" | "negative">("neutral")
  const [activityNotes, setActivityNotes] = useState("")
  
  // Determinar si el evento actual tiene hora de fin
  const currentEventType = getEventType(eventType)
  const hasEndTime = currentEventType?.hasEndTime ?? false
  const isNapNoSleep = eventType === "nap" && sleepDelayValue === "no-sleep"
  
  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    try {
      // Validaciones básicas
      // Validación de fin obligatorio para "Dormir"
      if ((eventType === "sleep") || (hasEndTime && includeEndTime)) {
        const startDateTimeVal = buildLocalDate(startDate, startTime)
        const endDateTimeVal = buildLocalDate(endDate, endTime)
        if (endDateTimeVal <= startDateTimeVal) {
          toast({
            title: "Error de validación",
            description: "La hora de fin debe ser posterior a la hora de inicio",
            variant: "destructive",
          })
          return
        }
      }
      
      // Validaciones específicas por tipo de evento
      if (eventType === "medication") {
        if (!medicationName.trim() || !medicationDose.trim()) {
          toast({
            title: "Error de validación", 
            description: "El nombre y dosis del medicamento son requeridos",
            variant: "destructive",
          })
          return
        }
      }
      
      if (eventType === "extra_activities") {
        if (!activityDescription.trim()) {
          toast({
            title: "Error de validación",
            description: "La descripción de la actividad es requerida", 
            variant: "destructive",
          })
          return
        }
      }
      
      // Construir fecha/hora de inicio (usando buildLocalDate para evitar bug UTC)
      const startDateTime = buildLocalDate(startDate, startTime)
      
      // Calcular endTime automáticamente para alimentación y actividades extra
      let calculatedEndTime: Date | null = null
      if (eventType === "feeding") {
        // Alimentación: usar duración (máximo 60 minutos)
        const durationMinutes = Math.min(feedingDuration, 60)
        calculatedEndTime = new Date(startDateTime.getTime() + (durationMinutes * 60 * 1000))
      } else if (eventType === "extra_activities") {
        // Actividad extra: usar duración (sin límite)
        calculatedEndTime = new Date(startDateTime.getTime() + (activityDuration * 60 * 1000))
      }
      
      // Construir datos del evento base
      // IMPORTANTE: Usar dateToTimestamp para incluir offset de timezone
      const eventData: any = {
        childId,
        eventType,
        startTime: dateToTimestamp(startDateTime, timezone),
        notes: notes || undefined,
      }

      // Agregar endTime si corresponde (obligatorio para "Dormir")
      if ((eventType === "sleep") || (hasEndTime && includeEndTime)) {
        const endDateTime = buildLocalDate(endDate, endTime)
        eventData.endTime = dateToTimestamp(endDateTime, timezone)
      } else if (!hasEndTime && calculatedEndTime) {
        // Usar endTime calculado automaticamente para alimentacion y actividades extra
        eventData.endTime = dateToTimestamp(calculatedEndTime, timezone)
      }
      
      // Campos específicos según tipo de evento
      if (eventType === "sleep" || eventType === "nap") {
        const parsedDelay = parseInt(sleepDelayValue || "0", 10)
        const safeDelay = Number.isNaN(parsedDelay) ? 0 : parsedDelay

        eventData.sleepDelay = isNapNoSleep ? 0 : safeDelay
        eventData.emotionalState = emotionalState

        // Marcar explícitamente cuando la siesta fue un intento sin que se durmiera
        if (isNapNoSleep) {
          eventData.didNotSleep = true
        }
      }
      
      if (eventType === "night_waking") {
        eventData.emotionalState = emotionalState
      }
      
      if (eventType === "feeding") {
        eventData.feedingType = feedingType
        // Convertir oz → ml para biberón
        eventData.feedingAmount = feedingType === "bottle" ? Math.round((feedingAmount || 0) * 29.5735) : feedingAmount
        eventData.feedingDuration = feedingDuration
        eventData.babyState = babyState
        eventData.feedingNotes = feedingNotes
      }
      
      if (eventType === "medication") {
        eventData.medicationName = medicationName
        eventData.medicationDose = medicationDose
        eventData.medicationTime = dateToTimestamp(startDateTime, timezone)
        eventData.medicationNotes = medicationNotes
      }
      
      if (eventType === "extra_activities") {
        eventData.activityDescription = activityDescription
        eventData.activityDuration = activityDuration
        eventData.activityImpact = activityImpact
        eventData.activityNotes = activityNotes
      }
      
      // Enviar al backend
      const isEditing = mode === "edit" && initialData?._id
      const endpoint = isEditing
        ? `/api/children/events/${initialData._id}`
        : "/api/children/events"
      const method = isEditing ? "PUT" : "POST"

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || errorData.details || `Error al ${isEditing ? "actualizar" : "registrar"} evento`)
      }

      toast({
        title: isEditing ? "Evento actualizado" : "Evento registrado",
        description: `${currentEventType?.label || "Evento"} ${isEditing ? "actualizado" : "registrado"} exitosamente para ${childName}`,
      })
      
      // Limpiar y cerrar
      resetForm()
      onClose()
      onEventRegistered?.()
      
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo registrar el evento",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const resetForm = () => {
    setEventType("sleep")
    setStartDate(format(new Date(), "yyyy-MM-dd"))
    setStartTime(getDefaultStartTimeForType("sleep"))
    setEndDate(format(new Date(), "yyyy-MM-dd"))
    setEndTime(getCurrentHourRounded())
    setIncludeEndTime(true)
    setNotes("")
    
    // Reset campos de sueño
    setSleepDelayValue("0")
    setAwakeDelay(0)
    setEmotionalState("tranquilo")
    
    // Reset campos de alimentación
    setFeedingType("bottle")
    setFeedingAmount(120)
    setFeedingDuration(15)
    setBabyState("awake")
    setFeedingNotes("")
    
    // Reset campos de medicamento
    setMedicationName("")
    setMedicationDose("")
    setMedicationNotes("")
    
    // Reset campos de actividad
    setActivityDescription("")
    setActivityDuration(30)
    setActivityImpact("neutral")
    setActivityNotes("")
  }
  
  useEffect(() => {
    if (!open) return
    setStartTime(getDefaultStartTimeForType(eventType))
    // Cuando cambiamos de tipo de evento, resetear el selector de delay
    setSleepDelayValue("0")
  }, [eventType, open])

  // Ajustar disponibilidad de hora de fin por tipo de evento
  useEffect(() => {
    if (eventType === "sleep") {
      setIncludeEndTime(true)
      return
    }

    setIncludeEndTime(false)
  }, [eventType])

  // Effect para ajustar endTime cuando cambia el tipo de evento
  useEffect(() => {
    if (hasEndTime && includeEndTime && startTime) {
      // Para eventos con fin, establecer hora de fin predeterminada
      const startDateTime = buildLocalDate(startDate, startTime)
      let defaultDuration = 60 // 1 hora por defecto
      
      if (eventType === "nap") defaultDuration = 90 // 1.5 horas para siesta
      if (eventType === "sleep") defaultDuration = 600 // 10 horas para sueño nocturno
      if (eventType === "night_waking") defaultDuration = 60 // 1 hora para despertar nocturno (redondeado)
      
      const endDateTime = new Date(startDateTime.getTime() + defaultDuration * 60000)
      // Redondear la hora de fin al próximo punto en hora
      endDateTime.setMinutes(0, 0, 0)
      
      const endDateStr = format(endDateTime, "yyyy-MM-dd")
      const endTimeStr = format(endDateTime, "HH:mm")
      
      setEndDate(endDateStr)
      setEndTime(endTimeStr)
    }
  }, [eventType, hasEndTime, includeEndTime, startDate, startTime])
  
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Registro Manual de Evento
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Tipo de evento (ocultable) */}
          {!lockEventType ? (
            <div>
              <Label>Tipo de evento</Label>
              <Select value={eventType} onValueChange={(val: any) => setEventType(val)}>
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {manualEventTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          
          {/* Fecha y hora de inicio */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Fecha de inicio</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={format(new Date(), "yyyy-MM-dd")}
              />
            </div>
            <div>
              <Label>Hora de inicio</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
          </div>
          
          {/* Fecha y hora de fin - obligatorio para "Dormir" y "Despertar nocturno", opcional para otros tipos con duración */}
          {hasEndTime && (
            <div className="space-y-2">
              {eventType !== "sleep" && eventType !== "night_waking" ? (
                <div className="flex items-center gap-2">
                  <input
                    id="toggle-end-time"
                    type="checkbox"
                    checked={includeEndTime}
                    onChange={(e) => setIncludeEndTime(e.target.checked)}
                  />
                  <Label htmlFor="toggle-end-time">Agregar hora de fin (opcional)</Label>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Hora de fin requerida para {eventType === "sleep" ? '"Dormir"' : '"Despertar nocturno"'}
                </div>
              )}

              {(includeEndTime || eventType === "sleep" || eventType === "night_waking") && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Fecha de fin</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      max={format(new Date(), "yyyy-MM-dd")}
                      min={startDate}
                    />
                  </div>
                  <div>
                    <Label>Hora de fin</Label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Campos específicos de sueño */}
          {(eventType === "sleep" || eventType === "nap") && (
            <>
              <div>
                <Label>¿Cuánto tardó en dormirse?</Label>
                <Select
                  value={sleepDelayValue}
                  onValueChange={(val) => setSleepDelayValue(val)}
                >
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Inmediatamente</SelectItem>
                    <SelectItem value="5">5 minutos</SelectItem>
                    <SelectItem value="10">10 minutos</SelectItem>
                    <SelectItem value="15">15 minutos</SelectItem>
                    <SelectItem value="20">20 minutos</SelectItem>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="45">45 minutos</SelectItem>
                    <SelectItem value="60">Más de 1 hora</SelectItem>
                    {eventType === "nap" && (
                      <SelectItem value="no-sleep">No se pudo dormir</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Estado emocional</Label>
                <RadioGroup value={emotionalState} onValueChange={(val: any) => setEmotionalState(val)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="tranquilo" id="m-tranquilo" />
                    <Label htmlFor="m-tranquilo">Tranquilo</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="inquieto" id="m-inquieto" />
                    <Label htmlFor="m-inquieto">Inquieto</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="alterado" id="m-alterado" />
                    <Label htmlFor="m-alterado">Alterado</Label>
                  </div>
                </RadioGroup>
              </div>
            </>
          )}
          
          {/* Campos específicos de despertar nocturno */}
          {eventType === "night_waking" && (
            <>
              <div>
                <Label>Estado emocional al despertar</Label>
                <RadioGroup value={emotionalState} onValueChange={(val: any) => setEmotionalState(val)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="tranquilo" id="nw-tranquilo" />
                    <Label htmlFor="nw-tranquilo">Tranquilo</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="inquieto" id="nw-inquieto" />
                    <Label htmlFor="nw-inquieto">Inquieto</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="alterado" id="nw-alterado" />
                    <Label htmlFor="nw-alterado">Alterado</Label>
                  </div>
                </RadioGroup>
              </div>
            </>
          )}
          
          {/* Campos específicos de alimentación */}
          {eventType === "feeding" && (
            <>
              <div>
                <Label>Tipo de alimentación</Label>
                <RadioGroup value={feedingType} onValueChange={(val: any) => setFeedingType(val)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="breast" id="feed-breast" />
                    <Label htmlFor="feed-breast">Pecho</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="bottle" id="feed-bottle" />
                    <Label htmlFor="feed-bottle">Biberón</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="solids" id="feed-solids" />
                    <Label htmlFor="feed-solids">Sólidos</Label>
                  </div>
                </RadioGroup>
              </div>
              
              {feedingType === "bottle" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Cantidad (oz)</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setFeedingAmount(Math.max(0, feedingAmount - 1))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        value={feedingAmount}
                        onChange={(e) => setFeedingAmount(parseInt(e.target.value) || 0)}
                        className="text-center"
                        min="0"
                        max="16"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setFeedingAmount(Math.min(16, feedingAmount + 1))}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label>Duración (min)</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setFeedingDuration(Math.max(1, feedingDuration - 5))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        value={feedingDuration}
                        onChange={(e) => setFeedingDuration(parseInt(e.target.value) || 1)}
                        className="text-center"
                        min="1"
                        max="120"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setFeedingDuration(Math.min(120, feedingDuration + 5))}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Controles para Pecho y Sólidos: Duración y (para sólidos) Cantidad en gramos */}
              {(feedingType === "breast" || feedingType === "solids") && (
                <div className="grid grid-cols-2 gap-2">
                  {/* Cantidad en gramos solo para sólidos */}
                  {feedingType === "solids" ? (
                    <div>
                      <Label>Cantidad (gr)</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setFeedingAmount(Math.max(1, (feedingAmount || 0) - 10))}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={feedingAmount}
                          onChange={(e) => setFeedingAmount(parseInt(e.target.value) || 0)}
                          className="text-center"
                          min="1"
                          max="500"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setFeedingAmount(Math.min(500, (feedingAmount || 0) + 10))}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="hidden sm:block" />
                  )}
                  <div>
                    <Label>Duración (min)</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setFeedingDuration(Math.max(1, feedingDuration - 5))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        value={feedingDuration}
                        onChange={(e) => setFeedingDuration(parseInt(e.target.value) || 1)}
                        className="text-center"
                        min="1"
                        max="120"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setFeedingDuration(Math.min(120, feedingDuration + 5))}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <Label>Estado del bebé</Label>
                <RadioGroup value={babyState} onValueChange={(val: any) => setBabyState(val)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="awake" id="feed-awake" />
                    <Label htmlFor="feed-awake">Despierto</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="asleep" id="feed-asleep" />
                    <Label htmlFor="feed-asleep">Dormido (toma nocturna)</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div>
                <Label>Notas adicionales (opcional)</Label>
                <Textarea
                  value={feedingNotes}
                  onChange={(e) => setFeedingNotes(e.target.value)}
                  placeholder="Ej: Se tomó todo el biberón, eructó bien..."
                  rows={2}
                  maxLength={200}
                />
              </div>
            </>
          )}
          
          {/* Campos específicos de medicamentos */}
          {eventType === "medication" && (
            <>
              <div>
                <Label>Nombre del medicamento *</Label>
                <Input
                  type="text"
                  value={medicationName}
                  onChange={(e) => setMedicationName(e.target.value)}
                  placeholder="Ej: Ibuprofeno, Paracetamol..."
                  maxLength={100}
                />
              </div>
              
              <div>
                <Label>Dosis *</Label>
                <Input
                  type="text"
                  value={medicationDose}
                  onChange={(e) => setMedicationDose(e.target.value)}
                  placeholder="Ej: 5ml, 2 gotas, 1 tableta..."
                  maxLength={50}
                />
              </div>
              
              <div>
                <Label>Notas adicionales (opcional)</Label>
                <Textarea
                  value={medicationNotes}
                  onChange={(e) => setMedicationNotes(e.target.value)}
                  placeholder="Ej: Para la fiebre, antes de dormir..."
                  rows={2}
                  maxLength={200}
                />
              </div>
            </>
          )}
          
          {/* Campos específicos de actividades extra */}
          {eventType === "extra_activities" && (
            <>
              <div>
                <Label>Descripción de la actividad *</Label>
                <Input
                  type="text"
                  value={activityDescription}
                  onChange={(e) => setActivityDescription(e.target.value)}
                  placeholder="Ej: Fiesta de cumpleaños, visita con tu coach del sueño, paseo..."
                  maxLength={100}
                />
              </div>
              
              <div>
                <Label>Duración estimada (minutos)</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setActivityDuration(Math.max(5, activityDuration - 15))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    value={activityDuration}
                    onChange={(e) => setActivityDuration(parseInt(e.target.value) || 5)}
                    className="text-center"
                    min="5"
                    max="480"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setActivityDuration(Math.min(480, activityDuration + 15))}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div>
                <Label>Impacto esperado en el sueño</Label>
                <RadioGroup value={activityImpact} onValueChange={(val: any) => setActivityImpact(val)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="positive" id="act-positive" />
                    <Label htmlFor="act-positive">Positivo - Puede ayudar a dormir mejor</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="neutral" id="act-neutral" />
                    <Label htmlFor="act-neutral">Neutral - Sin impacto esperado</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="negative" id="act-negative" />
                    <Label htmlFor="act-negative">Negativo - Puede dificultar el sueño</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div>
                <Label>Notas adicionales (opcional)</Label>
                <Textarea
                  value={activityNotes}
                  onChange={(e) => setActivityNotes(e.target.value)}
                  placeholder="Ej: Se mostró muy emocionado, comió muchos dulces..."
                  rows={2}
                  maxLength={200}
                />
              </div>
            </>
          )}
          
          {/* Notas generales - solo para eventos sin notas específicas */}
          {!["feeding", "medication", "extra_activities"].includes(eventType) && (
            <div>
              <Label>Notas (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  (eventType === "sleep" || eventType === "nap")
                    ? "¿Cómo se durmió? ¿Lo arrullaron, tomó pecho, lo dejaron en la cuna despierto?"
                    : eventType === "night_waking"
                      ? "¿Qué causó el despertar? ¿Cómo se volvió a dormir?"
                      : eventType === "wake"
                        ? "¿Cómo despertó? ¿De buen humor, llorando?"
                        : "Agregar observaciones..."
                }
                rows={2}
                maxLength={200}
              />
            </div>
          )}
          
          {/* Botones */}
          <div className="flex gap-2">
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? "Guardando..." : "Guardar"}
            </Button>
            <Button 
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
