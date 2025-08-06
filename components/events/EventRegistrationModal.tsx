"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Loader2, Clock, Moon, Sun } from "lucide-react"
import { isToday } from "date-fns"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { CompactEventTypeSelector } from "./CompactEventTypeSelector"
import { CompactEmotionalStateSelector } from "./CompactEmotionalStateSelector"
import { TimeSelector } from "./TimeSelector"
import { eventTypeHasEndTime, getEventType } from "@/lib/event-types"
import { SleepDelayInput } from "./SleepDelayInput"
import { NightWakingDelayInput } from "./NightWakingDelayInput"
import { ExtraActivitiesInput } from "./ExtraActivitiesInput"
import { NightFeedingStateSelector } from "./NightFeedingStateSelector"

import { createLogger } from "@/lib/logger"

const logger = createLogger("EventRegistrationModal")


// Función auxiliar para formatear la fecha actual en formato ISO para input datetime-local
const getCurrentDateTimeISO = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  const hours = String(now.getHours()).padStart(2, "0")
  const minutes = String(Math.round(now.getMinutes() / 10) * 10).padStart(2, "0")
  
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

// Función auxiliar para formatear una fecha específica en formato ISO para input datetime-local
const getDateTimeISO = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(Math.round(date.getMinutes() / 10) * 10).padStart(2, "0")
  
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

// Función para determinar el tipo de evento basado en la hora
const getEventTypeByTime = (date: Date) => {
  const hour = date.getHours()
  
  if (hour >= 19 || hour < 5) {
    return "sleep" // Dormir
  } else if (hour >= 5 && hour < 10) {
    return "wake" // Despertar matutino
  } else if (hour >= 12 && hour < 17) {
    return "nap" // Siesta  
  } else if (hour >= 23 || hour < 5) {
    return "night_waking" // Despertar nocturno
  } else {
    return "sleep" // Por defecto, dormir
  }
}

// Función para calcular la duración entre dos fechas
const calculateDuration = (startTime: string, endTime: string) => {
  if (!startTime || !endTime) return 0
  
  const start = new Date(startTime)
  const end = new Date(endTime)
  const diffMs = end.getTime() - start.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  
  return Math.max(0, Math.round(diffHours * 2) / 2) // Redondear a 0.5 horas
}

// Función para obtener la hora de fin predeterminada (1 hora después de inicio)
const getDefaultEndTime = (startTime: string) => {
  const start = new Date(startTime)
  const end = new Date(start.getTime() + 60 * 60 * 1000) // +1 hora
  
  const year = end.getFullYear()
  const month = String(end.getMonth() + 1).padStart(2, "0")
  const day = String(end.getDate()).padStart(2, "0")
  const hours = String(end.getHours()).padStart(2, "0")
  const minutes = String(Math.round(end.getMinutes() / 10) * 10).padStart(2, "0")
  
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

// Esquema con validación correcta para fechas
const eventFormSchema = z.object({
  eventType: z.string({
    required_error: "Por favor selecciona un tipo de evento",
  }),
  emotionalState: z.string({
    required_error: "Por favor selecciona un estado emocional",
  }),
  startTime: z.string().optional().refine((val) => {
    if (!val) return true;
    return new Date(val) <= new Date()
  }, {
    message: "La fecha de inicio no puede ser en el futuro",
  }),
  endTime: z.string().optional(),
  duration: z.number().min(0).max(24).optional(),
  sleepDelay: z.number().min(0).max(120).optional(),
  notes: z.string().optional(),
  description: z.string().optional(),
  showStartTime: z.boolean().optional(),
  nightFeedingState: z.string().optional(),
}).refine((data) => {
  // Validar que la hora de fin sea después de la hora de inicio
  if (data.endTime && data.startTime) {
    return new Date(data.endTime) > new Date(data.startTime)
  }
  return true
}, {
  message: "La hora de fin debe ser después de la hora de inicio",
  path: ["endTime"], // El error aparecerá en el campo endTime
}).refine((data) => {
  // Para actividades extra, la descripción es requerida
  if (data.eventType === "extra_activities" && (!data.description || data.description.length < 10)) {
    return false
  }
  return true
}, {
  message: "Por favor describe las actividades del día (mínimo 10 caracteres)",
  path: ["description"],
}).refine((data) => {
  // Para eventos que no son extra_activities, startTime es requerido
  if (data.eventType !== "extra_activities" && !data.startTime) {
    return false
  }
  // Para extra_activities con showStartTime activado, startTime es requerido
  if (data.eventType === "extra_activities" && data.showStartTime && !data.startTime) {
    return false
  }
  return true
}, {
  message: "Por favor ingresa la hora de inicio",
  path: ["startTime"],
}).refine((data) => {
  // Para tomas nocturnas, el estado es requerido
  if (data.eventType === "night_feeding" && !data.nightFeedingState) {
    return false
  }
  return true
}, {
  message: "Por favor selecciona si el niño estaba dormido o despierto",
  path: ["nightFeedingState"],
})

type EventFormValues = z.infer<typeof eventFormSchema>

interface Child {
  _id: string;
  firstName: string;
  lastName: string;
}

interface EventRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  childId?: string;
  children?: Child[];
  onEventCreated?: () => void;
  selectedDate?: Date;
}

export function EventRegistrationModal({
  isOpen,
  onClose,
  childId,
  children = [],
  onEventCreated,
  selectedDate,
}: EventRegistrationModalProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTimeISO())

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      notes: "",
      emotionalState: "calm",
      startTime: undefined, // No establecer valor por defecto
      eventType: getEventTypeByTime(new Date()),
      sleepDelay: 0,
      description: "",
      showStartTime: false,
    },
  })

  // Actualizar la fecha máxima cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime(getCurrentDateTimeISO())
    }, 60000)
    
    return () => clearInterval(interval)
  }, [])

  // Reset form cuando se abre/cierra el modal
  useEffect(() => {
    if (isOpen) {
      // Usar la fecha seleccionada o la fecha actual
      const targetDate = selectedDate || new Date()
      
      // Si es una fecha seleccionada específica, usar la hora actual pero en esa fecha
      // Si es la fecha actual, usar la fecha y hora actual
      let baseDateTime: string
      if (selectedDate && !isToday(selectedDate)) {
        // Para fechas pasadas, usar las 19:00 como hora por defecto (hora típica de dormir)
        const defaultTime = new Date(selectedDate)
        defaultTime.setHours(19, 0, 0, 0)
        baseDateTime = getDateTimeISO(defaultTime)
      } else {
        // Para hoy o sin fecha específica, usar la hora actual
        baseDateTime = getCurrentDateTimeISO()
      }
      
      const defaultEndTime = getDefaultEndTime(baseDateTime)
      const dateForShared = targetDate.toISOString().split('T')[0]
      
      // Actualizar fecha compartida
      setSharedDate(dateForShared)
      
      const defaultEventType = getEventTypeByTime(targetDate)
      
      form.reset({
        notes: "",
        emotionalState: "calm",
        startTime: defaultEventType !== "extra_activities" ? baseDateTime : undefined,
        eventType: defaultEventType,
        endTime: defaultEventType !== "extra_activities" ? defaultEndTime : undefined,
        sleepDelay: 0,
        description: "",
        showStartTime: false,
      })
    }
  }, [isOpen, selectedDate, form])
  
  // Observar cambios en el formulario
  const startTime = form.watch("startTime")
  const endTime = form.watch("endTime")
  const eventType = form.watch("eventType")
  const showStartTime = form.watch("showStartTime")
  
  
  // Determinar si el tipo de evento actual necesita hora de fin
  const shouldShowEndTime = eventType ? eventTypeHasEndTime(eventType) : false
  
  // Determinar si el tipo de evento actual necesita campo de sleep delay
  const eventTypeInfo = eventType ? getEventType(eventType) : null
  const shouldShowSleepDelay = eventTypeInfo?.hasSleepDelay || false
  
  // Determinar si es actividades extra
  const isExtraActivities = eventType === "extra_activities"
  
  // FECHA COMPARTIDA entre ambos TimeSelectors
  const [sharedDate, setSharedDate] = useState<string>(() => {
    const now = new Date()
    return now.toISOString().split('T')[0]
  })
  
  // Cuando cambie la fecha compartida, actualizar ambos campos manteniendo sus horas
  const handleDateChange = (newDate: string) => {
    setSharedDate(newDate)
    
    if (startTime) {
      const startTimeOnly = startTime.split('T')[1]
      form.setValue('startTime', `${newDate}T${startTimeOnly}`, { shouldValidate: false })
    }
    
    if (shouldShowEndTime && endTime) {
      const endTimeOnly = endTime.split('T')[1]
      form.setValue('endTime', `${newDate}T${endTimeOnly}`, { shouldValidate: false })
    }
  }
  
  
  // Limpiar hora de fin cuando el tipo de evento no la necesita
  useEffect(() => {
    if (!shouldShowEndTime) {
      form.setValue("endTime", undefined)
    } else if (shouldShowEndTime && !endTime && startTime) {
      // Establecer hora de fin por defecto si se necesita pero no existe
      form.setValue("endTime", getDefaultEndTime(startTime))
    }
    
    // Para actividades extra, establecer un estado emocional por defecto
    if (eventType === "extra_activities" && !form.getValues("emotionalState")) {
      form.setValue("emotionalState", "calm")
    }
  }, [shouldShowEndTime, eventType, endTime, startTime, form])
  
  // Limpiar startTime cuando se cambia a extra_activities
  useEffect(() => {
    if (eventType === "extra_activities") {
      if (!showStartTime) {
        form.setValue("startTime", undefined)
      } else if (showStartTime && !form.getValues("startTime")) {
        // Cuando se activa el checkbox, establecer hora actual
        form.setValue("startTime", getCurrentDateTimeISO())
      }
    } else if (eventType !== "extra_activities" && !form.getValues("startTime")) {
      // Establecer startTime para otros tipos de evento si no existe
      form.setValue("startTime", getCurrentDateTimeISO())
    }
  }, [eventType, showStartTime, form])
  
  // Calcular duración automáticamente cuando cambian las fechas
  useEffect(() => {
    if (startTime && endTime && shouldShowEndTime) {
      const duration = calculateDuration(startTime, endTime)
      form.setValue("duration", duration)
    }
  }, [startTime, endTime, shouldShowEndTime, form])

  async function onSubmit(data: EventFormValues) {
    if (!childId) {
      toast({
        title: "Error",
        description: "No se ha seleccionado un niño válido.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      // Preparar los datos para enviar
      const eventData: any = {
        ...data,
        childId,
        duration: data.endTime && data.startTime ? calculateDuration(data.startTime, data.endTime) : data.duration || 0,
        sleepDelay: data.sleepDelay || 0,
        description: data.description || "",
        nightFeedingState: data.nightFeedingState || "",
      }
      
      // Si es extra_activities y showStartTime es false, no enviar startTime
      if (data.eventType === "extra_activities" && !data.showStartTime) {
        delete eventData.startTime
      }
      
      const response = await fetch("/api/children/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventData),
      })
      
      const responseData = await response.json()
      
      if (!response.ok) {
        throw new Error(responseData.message || "Error al registrar el evento")
      }

      toast({
        title: "Evento registrado",
        description: "El evento ha sido registrado correctamente.",
      })

      onClose()
      onEventCreated?.()
    } catch (error: any) {
      logger.error("Error al registrar evento:", error?.message || error)
      toast({
        title: "Error",
        description: error?.message || "No se pudo registrar el evento. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const selectedChild = children.find(child => child._id === childId)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Moon className="w-5 h-5 text-blue-500" />
            Registrar Evento de Sueño
          </DialogTitle>
          {selectedChild && (
            <p className="text-sm text-gray-600">
              {selectedChild.firstName} {selectedChild.lastName}
            </p>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Header con tipo de evento y estado emocional */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-4">
              {/* Tipo de Evento */}
              <FormField
                control={form.control}
                name="eventType"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <CompactEventTypeSelector
                        value={field.value}
                        onValueChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Estado Emocional - oculto para actividades extra */}
              {!isExtraActivities && (
                <FormField
                  control={form.control}
                  name="emotionalState"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <CompactEmotionalStateSelector
                          value={field.value}
                          onValueChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            
            {/* Entrada de descripción para actividades extra */}
            {isExtraActivities && (
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium text-gray-700">
                      Descripción de Actividades
                    </FormLabel>
                    <FormControl>
                      <ExtraActivitiesInput
                        value={field.value || ""}
                        onChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Selector de tiempo */}
            <div className="space-y-3">
              {/* Checkbox para mostrar hora en actividades extra */}
              {isExtraActivities && (
                <FormField
                  control={form.control}
                  name="showStartTime"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal cursor-pointer">
                        Especificar hora aproximada
                      </FormLabel>
                    </FormItem>
                  )}
                />
              )}
              
              {/* Hora de inicio - condicional para actividades extra */}
              {(!isExtraActivities || showStartTime) && (
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <TimeSelector
                          value={field.value || ""}
                          onChange={field.onChange}
                          label="Hora de Inicio"
                          color="blue"
                          sharedDate={sharedDate}
                          onDateChange={handleDateChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {/* Hora de fin - solo para siesta y actividad física */}
              {shouldShowEndTime && (
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <TimeSelector
                          value={field.value}
                          onChange={field.onChange}
                          label="Hora de Fin"
                          color="green"
                          sharedDate={sharedDate}
                          onDateChange={handleDateChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {/* Mostrar duración calculada - solo si hay hora de fin */}
              {shouldShowEndTime && startTime && endTime && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-600" />
                    <span className="text-sm text-purple-700 font-medium">Duración total:</span>
                  </div>
                  <span className="font-bold text-purple-800 text-lg">
                    {calculateDuration(startTime, endTime)} horas
                  </span>
                </div>
              )}
              
              {/* Campo de tiempo para dormirse - para eventos sleep y night_waking */}
              {shouldShowSleepDelay && (
                <FormField
                  control={form.control}
                  name="sleepDelay"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        {eventType === "night_waking" ? (
                          <NightWakingDelayInput
                            value={field.value || 0}
                            onChange={field.onChange}
                          />
                        ) : (
                          <SleepDelayInput
                            value={field.value || 0}
                            onChange={field.onChange}
                          />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Selector especial para tomas nocturnas */}
            {eventType === "night_feeding" && (
              <FormField
                control={form.control}
                name="nightFeedingState"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <NightFeedingStateSelector
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Notas */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium text-gray-700">
                    Notas
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={
                        eventType === "night_feeding"
                          ? "Detalles de la toma nocturna: ¿Qué comió/bebió? ¿Cuánto? ¿Cómo fue el proceso? ¿Volvió a dormir fácilmente?"
                          : eventType === "night_waking"
                            ? "Añade cualquier detalle adicional: ¿Por qué se despertó? ¿Lloró mucho? ¿Necesitó consuelo? ¿Qué ayudó a calmarlo?"
                            : shouldShowSleepDelay 
                              ? "Añade cualquier detalle adicional: ¿Se despertó durante la noche? ¿Tuvo alguna dificultad para dormir? ¿Cómo fue la rutina de sueño?"
                              : "Añade detalles adicionales sobre este evento..."
                      }
                      className="bg-gray-50 border-gray-200 resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Footer con botones */}
            <div className="flex justify-between items-center pt-4">
              <div>
                {/* Botón eliminar - solo visible si estamos editando */}
              </div>
              
              <div className="flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose}
                  className="px-4"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="px-4 bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar Evento"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
