// Hook personalizado para manejo del formulario de eventos
import { useState, useCallback, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useToast } from "@/hooks/use-toast"
import { eventFormSchema, EventFormValues, defaultEventFormValues } from "@/lib/validations/event"
import { useEventDateTime } from "./useEventDateTime"
import { eventTypeHasEndTime } from "@/lib/event-types"
import { createLogger } from "@/lib/logger"

const logger = createLogger("useEventForm")

interface UseEventFormProps {
  childId: string
  onSuccess?: () => void
  onError?: (error: Error) => void
}

/**
 * Hook para manejar la lógica del formulario de eventos
 */
export const useEventForm = ({ childId, onSuccess, onError }: UseEventFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const { getCurrentDateTimeISO, getEventTypeByTime, calculateDuration, getDefaultEndTime } = useEventDateTime()

  // Inicializar formulario con react-hook-form y zod
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      ...defaultEventFormValues,
      startTime: getCurrentDateTimeISO(),
    },
  })

  const eventType = form.watch("eventType")
  const startTime = form.watch("startTime")
  const endTime = form.watch("endTime")

  // Auto-sugerir tipo de evento basado en la hora
  useEffect(() => {
    if (startTime && !eventType) {
      const date = new Date(startTime)
      const suggestedType = getEventTypeByTime(date)
      form.setValue("eventType", suggestedType)
    }
  }, [startTime, eventType, form, getEventTypeByTime])

  // Actualizar hora de fin cuando cambia la hora de inicio
  useEffect(() => {
    if (startTime && eventType && eventTypeHasEndTime(eventType)) {
      const defaultEnd = getDefaultEndTime(startTime)
      form.setValue("endTime", defaultEnd)
    }
  }, [startTime, eventType, form, getDefaultEndTime])

  // Calcular duración cuando cambian las horas
  useEffect(() => {
    if (startTime && endTime && eventTypeHasEndTime(eventType)) {
      const duration = calculateDuration(startTime, endTime)
      form.setValue("duration", duration)
    }
  }, [startTime, endTime, eventType, form, calculateDuration])

  // Función para manejar el envío del formulario
  const handleSubmit = useCallback(async (values: EventFormValues) => {
    try {
      setIsSubmitting(true)
      logger.info("Submitting event form", { childId, eventType: values.eventType })

      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          childId,
          ...values,
          startTime: new Date(values.startTime),
          endTime: values.endTime ? new Date(values.endTime) : undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al guardar el evento")
      }

      const data = await response.json()
      logger.info("Event created successfully", { eventId: data._id })

      toast({
        title: "✅ Evento registrado",
        description: "El evento se ha guardado correctamente",
      })

      // Resetear formulario
      form.reset({
        ...defaultEventFormValues,
        startTime: getCurrentDateTimeISO(),
      })

      onSuccess?.()
    } catch (error) {
      logger.error("Error submitting event", error)
      
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al guardar el evento",
        variant: "destructive",
      })

      onError?.(error as Error)
    } finally {
      setIsSubmitting(false)
    }
  }, [childId, form, toast, onSuccess, onError, getCurrentDateTimeISO])

  // Función para resetear el formulario
  const resetForm = useCallback(() => {
    form.reset({
      ...defaultEventFormValues,
      startTime: getCurrentDateTimeISO(),
    })
  }, [form, getCurrentDateTimeISO])

  return {
    form,
    isSubmitting,
    handleSubmit,
    resetForm,
    // Valores observados
    eventType,
    startTime,
    endTime,
  }
}