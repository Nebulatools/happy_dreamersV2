"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, PlusCircle, Edit, Trash, Save, ChevronLeft, Clock } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { useRouter, useParams } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useActiveChild } from "@/context/active-child-context"

interface Event {
  _id: string;
  childId: string;
  eventType: string;
  emotionalState: string;
  startTime: string;
  endTime?: string;
  notes?: string;
  createdAt: string;
}

interface Child {
  _id: string;
  firstName: string;
  lastName: string;
  events?: Event[];
}

export default function ChildEventsPage() {
  const params = useParams();
  const childIdFromUrl = params.id as string;
  
  const router = useRouter()
  const { toast } = useToast()
  const { activeChildId, setActiveChildId } = useActiveChild();
  
  const [isLoading, setIsLoading] = useState(true)
  const [child, setChild] = useState<Child | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  
  // Estado para el diálogo de edición
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editedEvent, setEditedEvent] = useState<Partial<Event>>({})

  // Efecto 1: Sincronizar URL con Contexto al cargar o si cambia la URL
  useEffect(() => {
    if (childIdFromUrl && childIdFromUrl !== activeChildId) {
      setActiveChildId(childIdFromUrl);
    }
  }, [childIdFromUrl, setActiveChildId]);

  // Efecto 2: Cargar datos cuando el niño activo del contexto cambia
  useEffect(() => {
    const fetchData = async () => {
      if (!activeChildId) {
        setEvents([]);
        setChild(null);
        if (isLoading) setIsLoading(false);
        return;
      }
      
      if (!isLoading) setIsLoading(true);
      
      try {
        const response = await fetch(`/api/children/events?childId=${activeChildId}`)
        if (!response.ok) {
          // Si falla (ej: niño no encontrado), limpiar estado y redirigir o mostrar error
          setEvents([]);
          setChild(null);
          toast({
            title: "Error",
            description: "No se pudieron cargar los eventos del niño seleccionado.",
            variant: "destructive",
          });
          // Podríamos redirigir a /dashboard si el niño no existe
          // router.push('/dashboard');
          throw new Error('Error al cargar los eventos')
        }
        const data = await response.json()
        setChild({
          _id: data._id,
          firstName: data.firstName,
          lastName: data.lastName
        })
        setEvents(data.events || [])
      } catch (error) {
        // No mostramos el toast aquí si ya lo hicimos en el if (!response.ok)
        if (error instanceof Error && error.message !== 'Error al cargar los eventos') {
           toast({
            title: "Error",
            description: "Ocurrió un problema al cargar los datos.",
            variant: "destructive",
          })
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [activeChildId, toast]);

  // Efecto 3: Sincronizar Contexto con URL si cambia el contexto
  useEffect(() => {
    if (activeChildId && activeChildId !== childIdFromUrl) {
      const targetUrl = `/dashboard/children/${activeChildId}/events`;
      router.push(targetUrl);
    }
  }, [activeChildId, childIdFromUrl, router]);

  // Función para obtener nombre de tipo de evento
  const getEventTypeName = (type: string) => {
    const types: Record<string, string> = {
      sleep: "Dormir",
      nap: "Siesta",
      meal: "Comida",
      play: "Juego",
      activity: "Actividad física",
      bath: "Baño",
      other: "Otro"
    }
    return types[type] || type
  }

  // Función para obtener nombre de estado emocional
  const getEmotionalStateName = (state: string) => {
    const states: Record<string, string> = {
      happy: "Feliz",
      calm: "Tranquilo",
      excited: "Emocionado",
      tired: "Cansado",
      irritable: "Irritable",
      sad: "Triste",
      anxious: "Ansioso"
    }
    return states[state] || state
  }

  // Función para obtener un color según el tipo de evento
  const getEventColor = (type: string) => {
    const colors: Record<string, string> = {
      sleep: "bg-blue-200 text-blue-800",
      nap: "bg-blue-100 text-blue-600",
      meal: "bg-green-200 text-green-800",
      play: "bg-yellow-200 text-yellow-800",
      activity: "bg-orange-200 text-orange-800", 
      bath: "bg-cyan-200 text-cyan-800",
      other: "bg-purple-200 text-purple-800"
    }
    return colors[type] || "bg-gray-200 text-gray-800"
  }

  // Función para manejar el clic en un evento
  const handleEventClick = (event: Event) => {
    setSelectedEvent(event)
    setEditedEvent({
      childId: event.childId,
      eventType: event.eventType,
      emotionalState: event.emotionalState,
      startTime: event.startTime,
      endTime: event.endTime || '',
      notes: event.notes || ''
    })
    setIsEditing(false)
    setIsDialogOpen(true)
  }

  // Función para actualizar un evento
  const updateEvent = async () => {
    if (!selectedEvent || !editedEvent) return
    
    setIsSaving(true)
    try {
      // Datos a enviar - asegurar que childId siempre esté presente
      const updateData = {
        childId: activeChildId,
        eventType: editedEvent.eventType,
        emotionalState: editedEvent.emotionalState,
        startTime: editedEvent.startTime,
        endTime: editedEvent.endTime || null,
        notes: editedEvent.notes || "",
        createdAt: selectedEvent.createdAt
      }
      
      // Usar la URL con el ID en la ruta
      const response = await fetch(`/api/children/events/${selectedEvent._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })
      
      const responseData = await response.json()
      
      if (!response.ok) {
        throw new Error(responseData.message || responseData.error || 'Error al actualizar el evento')
      }
      
      // Actualizar el evento en el estado local
      setEvents(currentEvents => 
        currentEvents.map(event => 
          event._id === selectedEvent._id 
            ? { 
                ...event, 
                ...editedEvent
              } 
            : event
        )
      )
      
      toast({
        title: "Evento actualizado",
        description: "El evento ha sido actualizado correctamente.",
      })
      
      setIsEditing(false)
      setIsDialogOpen(false)
    } catch (error: any) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: error?.message || "No se pudo actualizar el evento. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Función para eliminar un evento
  const deleteEvent = async () => {
    if (!selectedEvent) return
    
    setIsSaving(true)
    try {
      // Usar la URL con el ID en la ruta
      const response = await fetch(`/api/children/events/${selectedEvent._id}`, {
        method: 'DELETE',
      })
      
      const responseData = await response.json()
      
      if (!response.ok) {
        throw new Error(responseData.message || responseData.error || 'Error al eliminar el evento')
      }
      
      // Eliminar el evento del estado local
      setEvents(currentEvents => 
        currentEvents.filter(event => event._id !== selectedEvent._id)
      )
      
      toast({
        title: "Evento eliminado",
        description: "El evento ha sido eliminado correctamente.",
      })
      
      setIsDialogOpen(false)
    } catch (error: any) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: error?.message || "No se pudo eliminar el evento. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-12rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando eventos...</span>
      </div>
    )
  }

  // Opciones para el formulario de edición
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/children">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">
              Eventos de {child?.firstName} {child?.lastName}
            </h1>
          </div>
          <p className="text-muted-foreground">
            Lista de todos los eventos registrados para este niño
          </p>
        </div>
        <Link href={`/dashboard/event?childId=${activeChildId}`}>
          <Button className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Registrar evento
          </Button>
        </Link>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <p>No hay eventos registrados para este niño.</p>
              <Link href={`/dashboard/event?childId=${activeChildId}`}>
                <Button className="mt-4">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Registrar el primer evento
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Eventos registrados</CardTitle>
            <CardDescription>
              Un registro de todos los eventos, ordenados por fecha
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Ordenar los eventos por fecha descendente (más recientes primero) */}
              {events
                .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
                .map((event) => (
                  <div
                    key={event._id || `${event.childId}-${event.startTime}-${event.eventType}`}
                    className="border rounded-lg p-4 hover:border-primary cursor-pointer transition-colors"
                    onClick={() => handleEventClick(event)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`px-2 py-1 rounded-full text-sm ${getEventColor(event.eventType)}`}>
                        {getEventTypeName(event.eventType)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(event.startTime), 'PPpp', { locale: es })}
                      </div>
                    </div>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">Estado: {getEmotionalStateName(event.emotionalState)}</p>
                        {event.notes && <p className="text-sm mt-1">{event.notes}</p>}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation(); // Evitar que se abra el diálogo completo
                            handleEventClick(event);
                            setIsEditing(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation(); // Evitar que se abra el diálogo completo
                            setSelectedEvent(event);
                            deleteEvent();
                          }}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diálogo para mostrar/editar detalles del evento */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle>{isEditing ? "Editar evento" : getEventTypeName(selectedEvent.eventType)}</DialogTitle>
                <DialogDescription>
                  {isEditing ? "Modifica los detalles del evento" : "Detalles del evento"}
                </DialogDescription>
              </DialogHeader>
              
              {!isEditing ? (
                // Modo visualización
                <div className="space-y-4 py-4">
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-sm">
                        {format(new Date(selectedEvent.startTime), 'PPpp', { locale: es })}
                        {selectedEvent.endTime && (
                          <> hasta {format(new Date(selectedEvent.endTime), 'p', { locale: es })}</>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium mr-2">Estado emocional:</span>
                      <span>{getEmotionalStateName(selectedEvent.emotionalState)}</span>
                    </div>
                    {selectedEvent.notes && (
                      <div className="mt-2">
                        <span className="font-medium">Notas:</span>
                        <p className="text-sm mt-1">{selectedEvent.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // Modo edición
                <div className="py-4">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="eventType">Tipo de evento</Label>
                      <Select 
                        value={editedEvent.eventType || ""}
                        onValueChange={(value) => setEditedEvent({...editedEvent, eventType: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {eventTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="emotionalState">Estado emocional</Label>
                      <Select 
                        value={editedEvent.emotionalState || ""}
                        onValueChange={(value) => setEditedEvent({...editedEvent, emotionalState: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un estado" />
                        </SelectTrigger>
                        <SelectContent>
                          {emotionalStates.map((state) => (
                            <SelectItem key={state.id} value={state.id}>
                              {state.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="startTime">Hora de inicio</Label>
                        <Input 
                          type="datetime-local" 
                          value={editedEvent.startTime?.replace('Z', '') || ""}
                          onChange={(e) => setEditedEvent({...editedEvent, startTime: e.target.value})}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="endTime">Hora de finalización</Label>
                        <Input 
                          type="datetime-local" 
                          value={editedEvent.endTime?.replace('Z', '') || ""}
                          onChange={(e) => setEditedEvent({...editedEvent, endTime: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="notes">Notas</Label>
                      <Textarea 
                        value={editedEvent.notes || ""}
                        onChange={(e) => setEditedEvent({...editedEvent, notes: e.target.value})}
                        placeholder="Notas adicionales sobre el evento..."
                      />
                    </div>
                  </div>
                </div>
              )}
              
              <DialogFooter className="flex justify-between">
                {isEditing ? (
                  <>
                    <Button variant="destructive" onClick={deleteEvent} disabled={isSaving}>
                      <Trash className="h-4 w-4 mr-2" />
                      Eliminar
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
                        Cancelar
                      </Button>
                      <Button onClick={updateEvent} disabled={isSaving}>
                        {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Guardar cambios
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cerrar
                    </Button>
                    <Button onClick={() => setIsEditing(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar evento
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 