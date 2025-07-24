// Página para registrar un nuevo evento
// Permite al usuario registrar eventos como sueño, comida, actividad, etc.

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

import { createLogger } from "@/lib/logger"

const logger = createLogger("page")


// Función auxiliar para formatear la fecha actual en formato ISO para input datetime-local
const getCurrentDateTimeISO = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  const hours = String(now.getHours()).padStart(2, "0")
  const minutes = String(now.getMinutes()).padStart(2, "0")
  
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

// Esquema con validación para fechas que no sean futuras
const eventFormSchema = z.object({
  childId: z.string({
    required_error: "Por favor selecciona un niño",
  }),
  eventType: z.string({
    required_error: "Por favor selecciona un tipo de evento",
  }),
  emotionalState: z.string({
    required_error: "Por favor selecciona un estado emocional",
  }),
  startTime: z.string({
    required_error: "Por favor ingresa la hora de inicio",
  }).refine(val => {
    // Verificar que la fecha no sea en el futuro
    return new Date(val) <= new Date()
  }, {
    message: "La fecha de inicio no puede ser en el futuro",
  }),
  endTime: z.string().optional().refine(val => {
    // Si hay un valor, verificar que no sea en el futuro
    return !val || new Date(val) <= new Date()
  }, {
    message: "La fecha de finalización no puede ser en el futuro",
  }),
  notes: z.string().optional(),
})

type EventFormValues = z.infer<typeof eventFormSchema>

interface Child {
  _id: string;
  firstName: string;
  lastName: string;
}

export default function EventPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingChildren, setIsLoadingChildren] = useState(true)
  const [children, setChildren] = useState<Child[]>([])
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTimeISO())

  // Cargar los niños del usuario actual
  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const response = await fetch("/api/children")
        if (!response.ok) {
          throw new Error("Error al cargar los niños")
        }
        const data = await response.json()
        setChildren(data)
      } catch (error) {
        logger.error("Error:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los niños. Inténtalo de nuevo.",
          variant: "destructive",
        })
      } finally {
        setIsLoadingChildren(false)
      }
    }

    fetchChildren()
    
    // Actualizar la fecha máxima cada minuto para mantenerla actual
    const interval = setInterval(() => {
      setCurrentDateTime(getCurrentDateTimeISO())
    }, 60000)
    
    return () => clearInterval(interval)
  }, [toast])

  const eventTypes = [
    { id: "sleep", label: "Dormir" },
    { id: "nap", label: "Siesta" },
    { id: "meal", label: "Comida" },
    { id: "play", label: "Juego" },
    { id: "activity", label: "Actividad física" },
    { id: "bath", label: "Baño" },
    { id: "other", label: "Otro" },
  ]

  const emotionalStates = [
    { id: "happy", label: "Feliz" },
    { id: "calm", label: "Tranquilo" },
    { id: "excited", label: "Emocionado" },
    { id: "tired", label: "Cansado" },
    { id: "irritable", label: "Irritable" },
    { id: "sad", label: "Triste" },
    { id: "anxious", label: "Ansioso" },
  ]

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      notes: "",
    },
  })

  async function onSubmit(data: EventFormValues) {
    setIsLoading(true)
    try {
      // Enviar los datos a la API
      logger.info("Enviando evento:", data)
      
      const response = await fetch("/api/children/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
      
      const responseData = await response.json()
      
      if (!response.ok) {
        throw new Error(responseData.message || "Error al registrar el evento")
      }

      toast({
        title: "Evento registrado",
        description: "El evento ha sido registrado correctamente para el niño.",
      })

      router.push("/dashboard")
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

  if (isLoadingChildren) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando niños...</span>
      </div>
    )
  }

  if (children.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Registrar Evento</h1>
          <p className="text-muted-foreground">No hay niños registrados para agregar eventos</p>
        </div>
        <Button onClick={() => router.push("/dashboard/children/new")}>
          Registrar un niño
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Registrar Evento</h1>
        <p className="text-muted-foreground">Registra un nuevo evento para tu hijo</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalles del evento</CardTitle>
          <CardDescription>Completa la información sobre el evento que deseas registrar</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="childId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Niño</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un niño" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {children.map((child) => (
                          <SelectItem key={child._id} value={child._id}>
                            {child.firstName} {child.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="eventType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de evento</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un tipo de evento" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {eventTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="emotionalState"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado emocional</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un estado emocional" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {emotionalStates.map((state) => (
                          <SelectItem key={state.id} value={state.id}>
                            {state.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora de inicio</FormLabel>
                      <FormControl>
                        <Input 
                          type="datetime-local" 
                          max={currentDateTime}
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Selecciona cuándo inició el evento (no puede ser en el futuro)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora de finalización (opcional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="datetime-local" 
                          max={currentDateTime}
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Selecciona cuándo terminó el evento (no puede ser en el futuro)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas adicionales (opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Escribe cualquier observación relevante sobre el evento..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Puedes incluir detalles sobre cómo se comportó el niño, circunstancias especiales, etc.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Registrar evento"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
