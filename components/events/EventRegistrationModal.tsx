"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Loader2, Clock, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { CompactEventTypeSelector } from "./CompactEventTypeSelector"
import { CompactEmotionalStateSelector } from "./CompactEmotionalStateSelector"
import { TimeSelector } from "./TimeSelector"

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

// Función para determinar el tipo de evento basado en la hora
const getEventTypeByTime = (date: Date) => {
  const hour = date.getHours()
  
  if (hour >= 20 || hour < 6) {
    return "sleep" // Noche completa
  } else if (hour >= 12 && hour < 17) {
    return "nap" // Siesta
  } else {
    return "wake" // Despertar
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

// Esquema con validación para fechas que no sean futuras
const eventFormSchema = z.object({
  eventType: z.string({
    required_error: "Por favor selecciona un tipo de evento",
  }),
  emotionalState: z.string({
    required_error: "Por favor selecciona un estado emocional",
  }),
  startTime: z.string({
    required_error: "Por favor ingresa la hora de inicio",
  }).refine(val => {
    return new Date(val) <= new Date()
  }, {
    message: "La fecha de inicio no puede ser en el futuro",
  }),
  endTime: z.string().optional().refine(val => {
    return !val || new Date(val) <= new Date()
  }, {
    message: "La fecha de finalización no puede ser en el futuro",
  }),
  duration: z.number().min(0).max(24).optional(),
  notes: z.string().optional(),
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
}

export function EventRegistrationModal({
  isOpen,
  onClose,
  childId,
  children = [],
  onEventCreated,
}: EventRegistrationModalProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTimeISO())

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      notes: "",
      emotionalState: "calm",
      startTime: getCurrentDateTimeISO(),
      eventType: getEventTypeByTime(new Date()),
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
      const now = new Date()
      const currentTime = getCurrentDateTimeISO()
      const defaultEndTime = getDefaultEndTime(currentTime)
      
      form.reset({
        notes: "",
        emotionalState: "calm",
        startTime: currentTime,
        eventType: getEventTypeByTime(now),
        endTime: defaultEndTime,
      })
    }
  }, [isOpen, form])
  
  // Calcular duración automáticamente cuando cambian las fechas
  const startTime = form.watch("startTime")
  const endTime = form.watch("endTime")
  
  useEffect(() => {
    if (startTime && endTime) {
      const duration = calculateDuration(startTime, endTime)
      form.setValue("duration", duration)
    }
  }, [startTime, endTime, form])

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
      const response = await fetch("/api/children/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          childId,
          duration: data.endTime ? calculateDuration(data.startTime, data.endTime) : data.duration || 0,
        }),
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
      logger.error("Error:", error)
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
              
              {/* Estado Emocional */}
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
            </div>

            {/* Selector de tiempo */}
            <div className="space-y-3">
              {/* Hora de inicio */}
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <TimeSelector
                        value={field.value}
                        onChange={field.onChange}
                        label="Hora de Inicio"
                        color="blue"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Hora de fin */}
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
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Mostrar duración calculada */}
              {startTime && endTime && (
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
            </div>

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
                      placeholder="Añade detalles adicionales sobre este evento..."
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
