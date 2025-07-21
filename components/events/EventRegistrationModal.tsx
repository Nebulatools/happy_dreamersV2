"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Calendar, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { EventTypeSelector } from "./EventTypeSelector"
import { EmotionalStateSelector } from "./EmotionalStateSelector"
import { DurationSlider } from "./DurationSlider"

// Función auxiliar para formatear la fecha actual en formato ISO para input datetime-local
const getCurrentDateTimeISO = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

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
    return new Date(val) <= new Date();
  }, {
    message: "La fecha de inicio no puede ser en el futuro",
  }),
  endTime: z.string().optional().refine(val => {
    return !val || new Date(val) <= new Date();
  }, {
    message: "La fecha de finalización no puede ser en el futuro",
  }),
  duration: z.number().min(0).max(12),
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
  onEventCreated
}: EventRegistrationModalProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTimeISO())

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      notes: "",
      duration: 8,
    },
  })

  // Actualizar la fecha máxima cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime(getCurrentDateTimeISO());
    }, 60000);
    
    return () => clearInterval(interval);
  }, [])

  // Reset form cuando se abre/cierra el modal
  useEffect(() => {
    if (isOpen) {
      form.reset({
        notes: "",
        duration: 8,
      })
    }
  }, [isOpen, form])

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
      const response = await fetch('/api/children/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          childId,
        }),
      })
      
      const responseData = await response.json()
      
      if (!response.ok) {
        throw new Error(responseData.message || 'Error al registrar el evento')
      }

      toast({
        title: "Evento registrado",
        description: "El evento ha sido registrado correctamente.",
      })

      onClose()
      onEventCreated?.()
    } catch (error: any) {
      console.error("Error:", error)
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-gray-100 pb-4">
          <DialogTitle className="text-xl font-bold text-gray-800">
            Registrar Evento de Sueño
          </DialogTitle>
          {selectedChild && (
            <p className="text-sm text-gray-600">
              Para {selectedChild.firstName} {selectedChild.lastName}
            </p>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            {/* Tipo de Evento */}
            <FormField
              control={form.control}
              name="eventType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium text-gray-700">
                    Tipo de Evento
                  </FormLabel>
                  <FormControl>
                    <EventTypeSelector
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fechas y Horas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium text-gray-700">
                      Hora de Inicio
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          type="datetime-local" 
                          max={currentDateTime}
                          className="bg-gray-50 border-gray-200"
                          {...field} 
                        />
                        <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium text-gray-700">
                      Hora de Fin 
                      <span className="text-sm font-normal text-gray-500 ml-1">(opcional)</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          type="datetime-local" 
                          max={currentDateTime}
                          className="bg-gray-50 border-gray-200"
                          {...field} 
                        />
                        <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Estado Emocional */}
            <FormField
              control={form.control}
              name="emotionalState"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium text-gray-700">
                    Estado Emocional
                  </FormLabel>
                  <FormControl>
                    <EmotionalStateSelector
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Duración */}
            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium text-gray-700">
                    Duración (horas)
                  </FormLabel>
                  <FormControl>
                    <DurationSlider
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
              <div>
                {/* Botón eliminar - solo visible si estamos editando */}
              </div>
              
              <div className="flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose}
                  className="px-6"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="px-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
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
