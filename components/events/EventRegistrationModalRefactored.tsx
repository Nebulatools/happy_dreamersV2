"use client"

import { useEffect } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { CompactEventTypeSelector } from "./CompactEventTypeSelector"
import { CompactEmotionalStateSelector } from "./CompactEmotionalStateSelector"
import { TimeSelector } from "./TimeSelector"
import { SleepDelayInput } from "./SleepDelayInput"
import { NightWakingDelayInput } from "./NightWakingDelayInput"
import { ExtraActivitiesInput } from "./ExtraActivitiesInput"
import { eventTypeHasEndTime, getEventType } from "@/lib/event-types"
import { useEventForm } from "@/hooks/useEventForm"
import { EventFormSection } from "./EventFormSection"

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

/**
 * Modal refactorizado para registro de eventos
 * Complejidad reducida mediante extracción de lógica a hooks y componentes
 */
export function EventRegistrationModalRefactored({
  isOpen,
  onClose,
  childId,
  children = [],
  onEventCreated,
  selectedDate,
}: EventRegistrationModalProps) {
  
  // Todo el manejo del formulario está encapsulado en el hook
  const { 
    form, 
    isSubmitting, 
    handleSubmit, 
    resetForm,
    eventType 
  } = useEventForm({
    childId: childId || "",
    onSuccess: () => {
      onEventCreated?.()
      onClose()
    }
  })

  // Reset form cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      resetForm()
    }
  }, [isOpen, resetForm])

  // Si hay fecha seleccionada, actualizarla
  useEffect(() => {
    if (selectedDate && isOpen) {
      const hours = selectedDate.getHours()
      const minutes = Math.round(selectedDate.getMinutes() / 10) * 10
      selectedDate.setHours(hours)
      selectedDate.setMinutes(minutes)
      
      const year = selectedDate.getFullYear()
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0")
      const day = String(selectedDate.getDate()).padStart(2, "0")
      const hoursStr = String(hours).padStart(2, "0")
      const minutesStr = String(minutes).padStart(2, "0")
      
      form.setValue("startTime", `${year}-${month}-${day}T${hoursStr}:${minutesStr}`)
    }
  }, [selectedDate, isOpen, form])

  const selectedChild = children.find(child => child._id === childId)
  const hasEndTime = eventTypeHasEndTime(eventType)
  const eventTypeInfo = getEventType(eventType)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Registrar Evento de Sueño
            {selectedChild && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                para {selectedChild.firstName} {selectedChild.lastName}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Sección: Tipo de Evento y Estado Emocional */}
            <EventFormSection title="Información del Evento">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="eventType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Evento</FormLabel>
                      <FormControl>
                        <CompactEventTypeSelector
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="emotionalState"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado Emocional</FormLabel>
                      <FormControl>
                        <CompactEmotionalStateSelector
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </EventFormSection>

            {/* Sección: Horarios */}
            <EventFormSection title="Horario del Evento">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {eventTypeInfo?.startLabel || "Hora de Inicio"}
                      </FormLabel>
                      <FormControl>
                        <TimeSelector
                          value={field.value}
                          onChange={field.onChange}
                          maxDateTime={new Date().toISOString()}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {hasEndTime && (
                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {eventTypeInfo?.endLabel || "Hora de Fin"}
                        </FormLabel>
                        <FormControl>
                          <TimeSelector
                            value={field.value}
                            onChange={field.onChange}
                            minDateTime={form.watch("startTime")}
                            maxDateTime={new Date().toISOString()}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </EventFormSection>

            {/* Sección: Detalles Adicionales (condicional) */}
            {eventType === "sleep" && (
              <EventFormSection title="Detalles del Sueño">
                <FormField
                  control={form.control}
                  name="sleepDelay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tiempo para Dormir</FormLabel>
                      <FormControl>
                        <SleepDelayInput
                          value={field.value || 0}
                          onChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </EventFormSection>
            )}

            {eventType === "night_waking" && (
              <EventFormSection title="Detalles del Despertar">
                <FormField
                  control={form.control}
                  name="nightWakingCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tiempo para Volver a Dormir</FormLabel>
                      <FormControl>
                        <NightWakingDelayInput
                          value={field.value || 0}
                          onChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </EventFormSection>
            )}

            {eventType === "wake" && (
              <EventFormSection title="Actividades al Despertar">
                <FormField
                  control={form.control}
                  name="extraActivities"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Actividades Adicionales</FormLabel>
                      <FormControl>
                        <ExtraActivitiesInput
                          value={field.value || []}
                          onChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </EventFormSection>
            )}

            {/* Sección: Notas */}
            <EventFormSection title="Notas Adicionales">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Agrega cualquier observación relevante..."
                        className="min-h-[80px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </EventFormSection>

            {/* Botones de acción */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar Evento"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}