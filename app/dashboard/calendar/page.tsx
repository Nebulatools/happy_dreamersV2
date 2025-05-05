// Página de calendario
// Muestra los eventos registrados en un calendario visual con vistas por día, semana y mes

"use client"

import React, { useState, useEffect, Fragment } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { 
  PlusCircle, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  Edit,
  X,
  Clock,
  CalendarIcon,
  Save,
  Trash
} from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { useActiveChild } from "@/context/active-child-context"
import {
  format,
  startOfToday,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  startOfWeek,
  endOfWeek,
  addDays,
  getHours,
  getMinutes,
  parse
} from "date-fns"
import { es } from "date-fns/locale"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
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

interface Event {
  _id: string;
  childId: string;
  childName?: string;
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

export default function CalendarPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { activeChildId } = useActiveChild()
  const [date, setDate] = useState<Date>(new Date())
  const [view, setView] = useState<"day" | "week" | "month">("month")
  const [isLoading, setIsLoading] = useState(true)
  const [allEvents, setAllEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editedEvent, setEditedEvent] = useState<Partial<Event>>({})

  useEffect(() => {
    // Cargar los eventos del niño activo
    const fetchData = async () => {
      // Si no hay niño seleccionado, limpiar eventos y parar
      if (!activeChildId) {
        setAllEvents([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true)
      setAllEvents([]); // Limpiar eventos anteriores
      try {
        // Obtener eventos solo del niño activo
        const eventsResponse = await fetch(`/api/children/events?childId=${activeChildId}`)
        if (!eventsResponse.ok) {
            // Podríamos intentar obtener el nombre del niño aquí si fuera necesario,
            // pero como solo mostramos eventos de un niño, el nombre no es crucial
            // en cada evento individual dentro del array.
            // Si necesitamos el nombre del niño en algún lugar, podríamos obtenerlo
            // con una llamada separada a /api/children/[activeChildId]
            throw new Error('Error al cargar los eventos del niño')
        }
        const eventsData = await eventsResponse.json()
        setAllEvents(eventsData.events || [])
        
      } catch (error) {
        console.error('Error:', error)
        setAllEvents([]) // Limpiar en caso de error
        toast({
          title: "Error",
          description: "No se pudieron cargar los eventos del niño seleccionado. Inténtalo de nuevo.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [activeChildId, toast])

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

  // Obtener eventos para un día específico
  const getEventsForDay = (day: Date) => {
    if (!allEvents.length) return []
    
    const dayStr = format(day, 'yyyy-MM-dd')
    return allEvents.filter(event => event.startTime.startsWith(dayStr))
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
      // Datos a enviar - solo necesitamos el childId y los detalles del evento
      const updateData = {
        childId: editedEvent.childId,
        eventType: editedEvent.eventType,
        emotionalState: editedEvent.emotionalState,
        startTime: editedEvent.startTime,
        endTime: editedEvent.endTime || null,
        notes: editedEvent.notes || "",
        createdAt: selectedEvent.createdAt
      }
      
      console.log("Enviando datos para actualización:", updateData);
      
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
      setAllEvents(currentEvents => 
        currentEvents.map(event => 
          event._id === selectedEvent._id 
            ? { 
                ...event, 
                ...editedEvent,
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
      setAllEvents(currentEvents => 
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

  // Renderizar la vista mensual
  const renderMonthView = () => {
    const today = startOfToday()
    const firstDayOfMonth = startOfMonth(date)
    const lastDayOfMonth = endOfMonth(date)
    
    const days = eachDayOfInterval({ start: startOfWeek(firstDayOfMonth, { weekStartsOn: 1 }), end: endOfWeek(lastDayOfMonth, { weekStartsOn: 1 }) })
    
    const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    
    return (
      <div className="mt-6">
        <div className="grid grid-cols-7 gap-2 mb-2 text-center">
          {weekDays.map((day) => (
            <div key={day} className="font-medium text-sm">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const dayEvents = getEventsForDay(day)
            const isCurrentMonth = isSameMonth(day, date)
            const isDayToday = isToday(day)
            
            return (
              <div 
                key={day.toString()} 
                className={`min-h-[100px] border rounded-md p-1 ${
                  !isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''
                } ${isDayToday ? 'border-primary' : ''}`}
              >
                <div className="font-semibold text-right text-sm">
                  {format(day, 'd')}
                </div>
                <div className="mt-1 max-h-[80px] overflow-y-auto space-y-1">
                  {dayEvents.map((event) => (
                    <div
                      key={event._id || `${event.childId}-${event.startTime}-${event.eventType}`}
                      onClick={() => handleEventClick(event)}
                      className={`text-xs px-2 py-1 rounded truncate cursor-pointer ${getEventColor(event.eventType)}`}
                    >
                      {format(new Date(event.startTime), 'HH:mm')} {getEventTypeName(event.eventType)}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Renderizar la vista semanal
  const renderWeekView = () => {
    const firstDayOfWeek = startOfWeek(date, { weekStartsOn: 1 })
    const lastDayOfWeek = endOfWeek(date, { weekStartsOn: 1 })
    const days = eachDayOfInterval({ start: firstDayOfWeek, end: lastDayOfWeek })
    
    // Horas del día para la vista
    const hours = Array.from({ length: 24 }, (_, i) => i)
    
    return (
      <div className="mt-6">
        <div className="grid grid-cols-8 gap-2">
          {/* Header con las fechas */}
          <div className="sticky top-0 z-10 bg-background"></div>
          {days.map((day) => (
            <div key={day.toString()} className="text-center">
              <div className="font-medium">{format(day, 'EEE', { locale: es })}</div>
              <div className={`text-sm ${isToday(day) ? 'bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center mx-auto' : ''}`}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
          
          {/* Grid de horas y eventos */}
          {hours.map((hour) => (
            <Fragment key={hour}>
              <div className="text-right pr-2 text-xs text-gray-500">
                {hour}:00
              </div>
              {days.map((day) => {
                const dayStr = format(day, 'yyyy-MM-dd')
                const hourStart = new Date(`${dayStr}T${hour.toString().padStart(2, '0')}:00:00`)
                const hourEnd = new Date(`${dayStr}T${hour.toString().padStart(2, '0')}:59:59`)
                
                // Filtrar eventos que ocurren en esta hora
                const hourEvents = allEvents.filter(event => {
                  const eventDate = new Date(event.startTime)
                  return isSameDay(eventDate, day) && getHours(eventDate) === hour
                })
                
                return (
                  <div key={`${day.toString()}-${hour}`} className="border-t border-l min-h-[50px] relative">
                    {hourEvents.map((event) => {
                      const eventMinutes = getMinutes(new Date(event.startTime))
                      return (
                        <div
                          key={event._id || `${event.childId}-${event.startTime}-${event.eventType}`}
                          style={{ top: `${(eventMinutes / 60) * 100}%` }}
                          onClick={() => handleEventClick(event)}
                          className={`absolute left-0 right-0 mx-1 p-1 text-xs rounded truncate cursor-pointer ${getEventColor(event.eventType)}`}
                        >
                          {format(new Date(event.startTime), 'HH:mm')} {getEventTypeName(event.eventType)}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </Fragment>
          ))}
        </div>
      </div>
    )
  }

  // Renderizar la vista diaria
  const renderDayView = () => {
    // Horas del día para la vista
    const hours = Array.from({ length: 24 }, (_, i) => i)
    const dayEvents = getEventsForDay(date)
    
    return (
      <div className="mt-6">
        <h2 className="font-semibold text-xl mb-4">{format(date, 'EEEE d MMMM yyyy', { locale: es })}</h2>
        <div className="space-y-2">
          {hours.map((hour) => {
            // Filtrar eventos que ocurren en esta hora
            const hourEvents = dayEvents.filter(event => {
              const eventDate = new Date(event.startTime)
              return getHours(eventDate) === hour
            })
            
            return (
              <div key={hour} className="grid grid-cols-[60px_1fr] gap-4">
                <div className="text-right text-sm text-gray-500">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                <div className="border-l pl-4 min-h-[60px] relative">
                  {hourEvents.map((event) => {
                    const eventMinutes = getMinutes(new Date(event.startTime))
                    return (
                      <div
                        key={event._id || `${event.childId}-${event.startTime}-${event.eventType}`}
                        style={{ top: `${(eventMinutes / 60) * 60}px` }}
                        onClick={() => handleEventClick(event)}
                        className={`absolute left-4 right-2 p-2 rounded cursor-pointer ${getEventColor(event.eventType)}`}
                      >
                        <div className="flex justify-between">
                          <span className="font-medium">
                            {format(new Date(event.startTime), 'HH:mm')} {getEventTypeName(event.eventType)}
                          </span>
                          <span className="text-xs">{event.childName}</span>
                        </div>
                        {event.notes && <p className="text-xs truncate">{event.notes}</p>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Funciones para navegar entre fechas
  const goToPrevious = () => {
    if (view === 'month') {
      setDate(subMonths(date, 1))
    } else if (view === 'week') {
      setDate(subWeeks(date, 1))
    } else {
      setDate(addDays(date, -1))
    }
  }
  
  const goToNext = () => {
    if (view === 'month') {
      setDate(addMonths(date, 1))
    } else if (view === 'week') {
      setDate(addWeeks(date, 1))
    } else {
      setDate(addDays(date, 1))
    }
  }

  const goToToday = () => {
    setDate(new Date())
  }

  if (isLoading && activeChildId) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-12rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando calendario...</span>
      </div>
    )
  }

  if (!activeChildId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calendario</CardTitle>
          <CardDescription>Vista de los eventos registrados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-10">
            <p>Por favor, selecciona un niño en la parte superior para ver su calendario de eventos.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

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
    <Card>
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <CardTitle>Calendario</CardTitle>
          <CardDescription>Vista de los eventos registrados para el niño seleccionado</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Controles de navegación */}
          <Button variant="outline" size="icon" onClick={goToPrevious}>
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Anterior</span>
          </Button>
          <Button variant="outline" onClick={goToToday} className="hidden sm:inline-flex">
            Hoy
          </Button>
          <span className="font-semibold text-center min-w-[150px]">
            {format(date, view === 'month' ? 'MMMM yyyy' : (view === 'week' ? 'dd MMM' : 'dd MMMM yyyy'), { locale: es })}
            {view === 'week' && ` - ${format(addDays(date, 6), 'dd MMM yyyy', { locale: es })}`}
          </span>
          <Button variant="outline" size="icon" onClick={goToNext}>
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Siguiente</span>
          </Button>
          <Tabs value={view} onValueChange={(v) => setView(v as "day" | "week" | "month")} className="ml-auto md:ml-0">
            <TabsList>
              <TabsTrigger value="day">Día</TabsTrigger>
              <TabsTrigger value="week">Semana</TabsTrigger>
              <TabsTrigger value="month">Mes</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button size="sm" className="gap-1" asChild>
            {/* Asegurarse que el link para añadir evento incluya el childId activo */}
            <Link href={`/dashboard/children/${activeChildId}/events/new`}>
              <PlusCircle className="h-4 w-4" />
              <span>Añadir evento</span>
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {view === 'month' && renderMonthView()}
        {view === 'week' && renderWeekView()}
        {view === 'day' && renderDayView()}
        {allEvents.length === 0 && !isLoading && (
           <div className="text-center py-10">
             <p>No hay eventos registrados para este niño en la vista actual.</p>
           </div>
        )}
      </CardContent>

      {/* Dialogo para ver/editar/eliminar evento */}
      {selectedEvent && (
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
                        <span className="font-medium mr-2">Niño:</span>
                        <span>{selectedEvent.childName}</span>
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
                          value={editedEvent.eventType}
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
                          value={editedEvent.emotionalState}
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
                            value={editedEvent.startTime?.replace('Z', '')}
                            onChange={(e) => setEditedEvent({...editedEvent, startTime: e.target.value})}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="endTime">Hora de finalización</Label>
                          <Input 
                            type="datetime-local" 
                            value={editedEvent.endTime?.replace('Z', '')}
                            onChange={(e) => setEditedEvent({...editedEvent, endTime: e.target.value})}
                          />
                        </div>
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="notes">Notas</Label>
                        <Textarea 
                          value={editedEvent.notes} 
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
      )}
    </Card>
  )
}
