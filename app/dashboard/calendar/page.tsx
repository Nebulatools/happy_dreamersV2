// Página de Calendario de Sueño según diseño de Figma
// Muestra eventos de sueño en vista mensual/semanal/diaria con resumen estadístico

"use client"

import React, { useState, useEffect, useMemo } from "react"
import { createLogger } from "@/lib/logger"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Moon,
  Sun,
  Cloud,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Edit,
  Trash,
  Save,
  Loader2,
  Clock,
  Calendar,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useActiveChild } from "@/context/active-child-context"
import { useEventsCache, useEventsInvalidation } from "@/hooks/use-events-cache"
import { EventRegistrationModal } from "@/components/events"
import { 
  TimelineColumn, 
  CompactTimelineColumn, 
  EventBlock, 
  CompactEventBlock
} from "@/components/calendar"
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
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal"
import { processSleepStatistics } from "@/lib/sleep-calculations"
import { usePageHeaderConfig } from "@/context/page-header-context"
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  parse,
  differenceInHours,
  differenceInMinutes,
  eachHourOfInterval,
} from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"

const logger = createLogger("CalendarPage")


interface Event {
  _id: string;
  childId: string;
  eventType: string;
  emotionalState: string;
  startTime: string;
  endTime?: string;
  notes?: string;
  duration?: number;
}

interface MonthlyStats {
  nightSleepHours: number;
  napHours: number;
  nightWakings: number;
  nightSleepChange: number;
  napChange: number;
  wakingsChange: number;
}

export default function CalendarPage() {
  const { toast } = useToast()
  const { activeChildId } = useActiveChild()
  const { refreshTrigger, subscribe } = useEventsCache(activeChildId)
  const invalidateEvents = useEventsInvalidation()
  const [date, setDate] = useState<Date>(new Date())
  const [view, setView] = useState<"month" | "week" | "day">("month")
  const [isLoading, setIsLoading] = useState(true)
  const [events, setEvents] = useState<Event[]>([])
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({
    nightSleepHours: 0,
    napHours: 0,
    nightWakings: 0,
    nightSleepChange: 0,
    napChange: 0,
    wakingsChange: 0,
  })
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [selectedDateForEvent, setSelectedDateForEvent] = useState<Date | null>(null)
  const [children, setChildren] = useState([])
  
  // Estados para el diálogo de edición
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editedEvent, setEditedEvent] = useState<Partial<Event>>({})

  // Configurar el header dinámico con useMemo para estabilizar las acciones
  const headerActions = useMemo(() => (
    <div className="flex items-center gap-2">
      {/* Navegación de fecha */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            if (view === "month") {
              setDate(subMonths(date, 1))
            } else if (view === "week") {
              setDate(subWeeks(date, 1))
            } else {
              setDate(subDays(date, 1))
            }
          }}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <span className="font-medium text-sm min-w-[140px] text-center">
          {view === "month" && format(date, "MMMM yyyy", { locale: es })}
          {view === "week" && `Sem. ${format(startOfWeek(date, { weekStartsOn: 1 }), "d MMM", { locale: es })}`}
          {view === "day" && format(date, "d MMM yyyy", { locale: es })}
        </span>
        
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            if (view === "month") {
              setDate(addMonths(date, 1))
            } else if (view === "week") {
              setDate(addWeeks(date, 1))
            } else {
              setDate(addDays(date, 1))
            }
          }}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Filtros de vista */}
      <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
        <Button
          variant={view === "month" ? "default" : "ghost"}
          size="sm"
          onClick={() => setView("month")}
          className={`text-xs md:text-sm ${view === "month" ? "hd-gradient-button text-white shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
        >
          Mensual
        </Button>
        <Button
          variant={view === "week" ? "default" : "ghost"}
          size="sm"
          onClick={() => setView("week")}
          className={`text-xs md:text-sm ${view === "week" ? "hd-gradient-button text-white shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
        >
          Semanal
        </Button>
        <Button
          variant={view === "day" ? "default" : "ghost"}
          size="sm"
          onClick={() => setView("day")}
          className={`text-xs md:text-sm ${view === "day" ? "hd-gradient-button text-white shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
        >
          Diario
        </Button>
      </div>

      {/* Botón de registrar evento - solo ícono para ahorrar espacio */}
      <Button 
        size="icon"
        className="hd-gradient-button text-white h-8 w-8"
        onClick={() => {
          setSelectedDateForEvent(null)
          setEventModalOpen(true)
        }}
        title="Registrar nuevo evento"
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  ), [date, view])

  usePageHeaderConfig({
    title: "",
    actions: headerActions,
    showSearch: true,
    showChildSelector: true,
    showNotifications: true
  })

  // Suscribirse a invalidaciones de cache
  useEffect(() => {
    const unsubscribe = subscribe()
    return unsubscribe
  }, [subscribe])

  // Cargar datos cuando cambia el niño activo, fecha o vista
  useEffect(() => {
    fetchEvents()
  }, [activeChildId, date, view, refreshTrigger])

  // Cargar lista de niños para el modal
  useEffect(() => {
    if (eventModalOpen) {
      fetch("/api/children")
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setChildren(data.children)
          }
        })
        .catch(error => logger.error("Error al cargar niños", error))
    }
  }, [eventModalOpen])

  const fetchEvents = async () => {
    if (!activeChildId) {
      setEvents([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/children/events?childId=${activeChildId}`)
      if (!response.ok) throw new Error("Error al cargar eventos")
      
      const data = await response.json()
      const eventsData = data.events || []
      
      // Filtrar eventos según la vista actual
      let filteredEvents = eventsData
      
      if (view === "month") {
        filteredEvents = eventsData.filter((event: Event) => {
          const eventDate = new Date(event.startTime)
          return eventDate.getMonth() === date.getMonth() && 
                 eventDate.getFullYear() === date.getFullYear()
        })
      } else if (view === "week") {
        const weekStart = startOfWeek(date, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(date, { weekStartsOn: 1 })
        filteredEvents = eventsData.filter((event: Event) => {
          const eventDate = new Date(event.startTime)
          return eventDate >= weekStart && eventDate <= weekEnd
        })
      } else if (view === "day") {
        const dayStart = startOfDay(date)
        const dayEnd = endOfDay(date)
        filteredEvents = eventsData.filter((event: Event) => {
          const eventDate = new Date(event.startTime)
          return eventDate >= dayStart && eventDate <= dayEnd
        })
      }
      
      setEvents(filteredEvents)
      calculateMonthlyStats(filteredEvents)
    } catch (error) {
      logger.error("Error:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los eventos",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const calculateMonthlyStats = (periodEvents: Event[]) => {
    logger.info(`Calculando estadísticas para ${periodEvents.length} eventos en vista ${view}`)

    // Convertir eventos al formato esperado por processSleepStatistics
    const sleepEvents = periodEvents.map(event => ({
      _id: event._id,
      eventType: event.eventType,
      startTime: event.startTime,
      endTime: event.endTime,
      notes: event.notes,
      emotionalState: event.emotionalState,
      sleepDelay: event.sleepDelay
    }))

    // Usar la función unificada de cálculo de estadísticas
    const stats = processSleepStatistics(sleepEvents)

    logger.info(`Resumen de estadísticas unificadas:`, {
      avgSleepDuration: stats.avgSleepDuration.toFixed(2),
      avgNapDuration: stats.avgNapDuration.toFixed(2),
      totalSleepHours: stats.totalSleepHours.toFixed(2),
      avgWakeupsPerNight: stats.avgWakeupsPerNight.toFixed(2),
      totalWakeups: stats.totalWakeups,
      avgBedtime: stats.avgBedtime,
      avgWakeTime: stats.avgWakeTime,
      view
    })

    // Mapear las estadísticas al formato esperado por el calendario
    setMonthlyStats({
      nightSleepHours: stats.avgSleepDuration,
      napHours: stats.avgNapDuration,
      nightWakings: Math.round(stats.totalWakeups), // Total de despertares en el período
      nightSleepChange: 0, // TODO: Implementar comparación con período anterior
      napChange: 0,
      wakingsChange: 0,
    })
  }

  const getEventsForDay = (day: Date) => {
    const dayStr = format(day, "yyyy-MM-dd")
    return events.filter(event => event.startTime.startsWith(dayStr))
  }

  const getEventTypeIcon = (type: string) => {
    switch(type) {
    case "sleep":
      return <Moon className="w-3 h-3" />
    case "nap":
      return <Sun className="w-3 h-3" />
    case "wake":
      return <Sun className="w-3 h-3" />
    case "night_waking":
      return <AlertCircle className="w-3 h-3" />
    default:
      return null
    }
  }

  const getEventTypeColor = (type: string) => {
    switch(type) {
    case "sleep":
      return "bg-sleep event-pill"
    case "nap":
      return "bg-nap event-pill"
    case "wake":
      return "bg-wake event-pill"  // Verde para despertar matutino
    case "night_waking":
      return "bg-night-wake event-pill"  // Rojo para despertar nocturno
    default:
      return "bg-gray-400 event-pill"
    }
  }

  const formatEventTime = (event: Event) => {
    const start = new Date(event.startTime)
    if (event.eventType === "wake" || event.eventType === "sleep") {
      return format(start, "HH:mm")
    }
    if (event.endTime) {
      const end = new Date(event.endTime)
      return `${format(start, "HH:mm")}-${format(end, "HH:mm")}`
    }
    return format(start, "HH:mm")
  }

  const getEventTypeName = (type: string) => {
    const types: Record<string, string> = {
      sleep: "Dormir",
      bedtime: "Dormir", // Para compatibilidad con datos antiguos
      nap: "Siesta",
      wake: "Despertar",
      night_waking: "Despertar nocturno",
      meal: "Comida",
      play: "Juego",
      activity: "Actividad física",
      bath: "Baño",
      other: "Otro",
    }
    return types[type] || type
  }

  const getEmotionalStateName = (state: string) => {
    const states: Record<string, string> = {
      happy: "Feliz",
      calm: "Tranquilo",
      excited: "Emocionado",
      tired: "Cansado",
      irritable: "Irritable",
      sad: "Triste",
      anxious: "Ansioso",
      restless: "Inquieto",
    }
    return states[state] || state
  }
  
  // Función para manejar el clic en un día del calendario
  const handleDayClick = (day: Date) => {
    setSelectedDateForEvent(day)
    setEventModalOpen(true)
  }

  // Función para manejar el clic en un evento
  const handleEventClick = (event: Event) => {
    setSelectedEvent(event)
    setEditedEvent({
      childId: event.childId,
      eventType: event.eventType,
      emotionalState: event.emotionalState,
      startTime: event.startTime,
      endTime: event.endTime || "",
      notes: event.notes || "",
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
        createdAt: selectedEvent.createdAt,
      }
      
      // Usar la URL con el ID en la ruta
      const response = await fetch(`/api/children/events/${selectedEvent._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      })
      
      const responseData = await response.json()
      
      if (!response.ok) {
        throw new Error(responseData.message || responseData.error || "Error al actualizar el evento")
      }
      
      // Recargar eventos para reflejar cambios
      await fetchEvents()
      
      // Invalidar cache global
      invalidateEvents()
      
      toast({
        title: "Evento actualizado",
        description: "El evento ha sido actualizado correctamente.",
      })
      
      setIsEditing(false)
      setIsDialogOpen(false)
    } catch (error: any) {
      logger.error("Error:", error)
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
    if (!selectedEvent || isSaving) return // Prevenir doble click
    
    setIsSaving(true)
    try {
      // Usar la URL con el ID en la ruta
      const response = await fetch(`/api/children/events/${selectedEvent._id}`, {
        method: "DELETE",
      })
      
      const responseData = await response.json()
      
      if (!response.ok) {
        throw new Error(responseData.message || responseData.error || "Error al eliminar el evento")
      }
      
      // Recargar eventos
      await fetchEvents()
      
      // Invalidar cache global
      invalidateEvents()
      
      toast({
        title: "Evento eliminado",
        description: "El evento ha sido eliminado correctamente.",
      })
      
      setIsDialogOpen(false)
      setSelectedEvent(null)
      setShowDeleteModal(false)
    } catch (error: any) {
      logger.error("Error al eliminar evento:", error?.message || error)
      toast({
        title: "Error",
        description: error?.message || "No se pudo eliminar el evento. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const renderMonthView = () => {
    const monthStart = startOfMonth(date)
    const monthEnd = endOfMonth(date)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 })
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })
    
    const days = eachDayOfInterval({ start: startDate, end: endDate })
    const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
    
    return (
      <div className="h-full flex flex-col">
        {/* Headers de días */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-gray-600 py-1">
              {day}
            </div>
          ))}
        </div>
        
        {/* Grid de días - altura flexible */}
        <div className="grid grid-cols-7 gap-1 flex-1">
          {days.map((day) => {
            const dayEvents = getEventsForDay(day)
            const isCurrentMonth = isSameMonth(day, date)
            const isDayToday = isToday(day)
            
            return (
              <div 
                key={day.toString()} 
                className={cn(
                  "min-h-[80px] p-1 rounded-md relative cursor-pointer hover:bg-gray-50 transition-colors border",
                  !isCurrentMonth && "bg-gray-50/50 text-gray-400 border-gray-100",
                  isCurrentMonth && "bg-white border-gray-200",
                  isDayToday && "bg-blue-50 border-[#4A90E2] border-2"
                )}
                onClick={() => handleDayClick(day)}
              >
                <div className="text-xs font-medium mb-1 text-right">
                  {format(day, "d")}
                </div>
                
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 4).map((event) => (
                    <div
                      key={event._id}
                      className={cn(
                        getEventTypeColor(event.eventType),
                        "flex items-center gap-0.5 cursor-pointer hover:opacity-80 z-10 relative text-xs px-1 py-0.5 rounded"
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEventClick(event)
                      }}
                    >
                      {getEventTypeIcon(event.eventType)}
                      <span className="truncate" style={{ fontSize: "10px" }}>
                        {format(new Date(event.startTime), "HH:mm")}
                      </span>
                    </div>
                  ))}
                  {dayEvents.length > 4 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{dayEvents.length - 4}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderWeekView = () => {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 })
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
    const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
    
    // Altura optimizada para que todo quepa en una pantalla sin scroll
    const hourHeight = 25 // 25px * 24 horas = 600px total
    
    return (
      <div className="calendar-timeline">
        <div className="week-view-timeline" style={{ maxHeight: "calc(100vh - 280px)", overflow: "auto" }}>
          {/* Timeline Column */}
          <div className="hidden md:block">
            <TimelineColumn hourHeight={hourHeight} />
          </div>
          <div className="md:hidden">
            <CompactTimelineColumn hourHeight={hourHeight} />
          </div>
          
          {/* Days Grid */}
          <div className="flex-1 flex">
            {days.map((day, index) => {
              const dayName = weekDays[index]
              const dayEvents = getEventsForDay(day)
              const isDayToday = isToday(day)
              
              return (
                <div key={day.toString()} className="day-column-timeline">
                  {/* Day Header */}
                  <div 
                    className={cn(
                      "day-header-timeline cursor-pointer hover:bg-gray-50 transition-colors",
                      isDayToday && "bg-blue-50 text-blue-600 hover:bg-blue-100"
                    )}
                    onClick={() => handleDayClick(day)}
                  >
                    <div className="text-xs font-medium opacity-75">{dayName}</div>
                    <div className="text-sm font-bold">
                      {format(day, "d")}
                    </div>
                  </div>
                  
                  {/* Events Timeline Container */}
                  <div 
                    className="events-timeline-container cursor-pointer hover:bg-gray-50/50 transition-colors"
                    onClick={() => handleDayClick(day)}
                  >
                    {/* Hour grid lines - solo líneas principales para menos desorden */}
                    {Array.from({ length: 24 }, (_, hour) => (
                      <div key={hour}>
                        {/* Major hour lines (every 3 hours) */}
                        {hour % 3 === 0 && (
                          <div 
                            className="hour-grid-line-major"
                            style={{ top: `${hour * hourHeight}px` }}
                          />
                        )}
                        {/* Regular hour lines */}
                        {hour % 3 !== 0 && (
                          <div 
                            className="hour-grid-line"
                            style={{ top: `${hour * hourHeight}px` }}
                          />
                        )}
                      </div>
                    ))}
                    
                    {/* Events positioned absolutely */}
                    {dayEvents.map((event) => (
                      <EventBlock
                        key={event._id}
                        event={event}
                        hourHeight={hourHeight}
                        showTooltip={true}
                        onClick={(clickedEvent) => {
                          handleEventClick(clickedEvent)
                        }}
                      />
                    ))}
                    
                    {/* Empty state */}
                    {dayEvents.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-xs text-gray-400 text-center">
                          <div>Sin eventos</div>
                          <div className="mt-1 opacity-75">este día</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const renderDayView = () => {
    const dayEvents = getEventsForDay(date)
    const hourHeight = 25 // Reducida para que quepa en pantalla sin scroll
    
    return (
      <div className="h-full flex flex-col">
        {/* Header del día - más compacto */}
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {format(date, "EEEE, d 'de' MMMM", { locale: es })}
          </h2>
          {isToday(date) && (
            <div className="text-blue-600 font-medium text-sm">Hoy</div>
          )}
        </div>
        
        {/* Timeline de 24 horas */}
        <div className="calendar-timeline flex-1" style={{ maxHeight: "calc(100vh - 350px)" }}>
          <div className="flex h-full">
            {/* Columna de horas */}
            <TimelineColumn hourHeight={hourHeight} hourInterval={1} />
            
            {/* Columna de eventos del día */}
            <div className="flex-1 relative border-l border-gray-200">
              {/* Header del día - más pequeño */}
              <div 
                className="h-12 bg-white border-b border-gray-200 flex items-center justify-center sticky top-0 z-20 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleDayClick(date)}
              >
                <div className="text-base font-bold">
                  {format(date, "d")}
                </div>
              </div>
              
              {/* Container de eventos */}
              <div 
                className="events-timeline-container relative cursor-pointer hover:bg-gray-50/50 transition-colors"
                onClick={() => handleDayClick(date)}
              >
                {/* Líneas de la grilla de horas */}
                {Array.from({ length: 24 }, (_, hour) => (
                  <div key={hour}>
                    {/* Líneas principales de hora (cada 3 horas) */}
                    {hour % 3 === 0 && (
                      <div 
                        className="hour-grid-line-major"
                        style={{ top: `${hour * hourHeight}px` }}
                      />
                    )}
                    {/* Líneas regulares de hora */}
                    {hour % 3 !== 0 && (
                      <div 
                        className="hour-grid-line"
                        style={{ top: `${hour * hourHeight}px` }}
                      />
                    )}
                  </div>
                ))}
                
                {/* Eventos posicionados de manera absoluta */}
                {dayEvents.map((event) => (
                  <EventBlock
                    key={event._id}
                    event={event}
                    hourHeight={hourHeight}
                    showTooltip={true}
                    onClick={(clickedEvent) => {
                      handleEventClick(clickedEvent)
                    }}
                  />
                ))}
                
                {/* Estado vacío */}
                {dayEvents.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <div className="text-gray-400 text-lg mb-2">No hay eventos registrados</div>
                      <div className="text-gray-500 text-sm">
                        Haz clic para agregar el primer evento del día
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }


  // Opciones para el formulario de edición
  const eventTypes = [
    { id: "sleep", label: "Dormir" },
    { id: "nap", label: "Siesta" },
    { id: "wake", label: "Despertar" },
    { id: "night_waking", label: "Despertar nocturno" },
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
  
  if (!activeChildId) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Selecciona un niño</h2>
          <p className="text-gray-600">
            Por favor, selecciona un niño en la parte superior para ver su calendario de sueño.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Leyenda compacta */}
      <div className="flex gap-4 px-6 pt-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-sleep" />
          <span className="text-sm text-gray-600">Dormir / Acostarse</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-nap" />
          <span className="text-sm text-gray-600">Siesta</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-wake" />
          <span className="text-sm text-gray-600">Despertar</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-night-wake" />
          <span className="text-sm text-gray-600">Despertar nocturno</span>
        </div>
      </div>

      {/* Resumen superior compacto */}
      <div className="px-6">
        <Card className="p-3 md:p-4 bg-gray-50 border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            {/* Título del resumen */}
            <h3 className="text-sm font-semibold text-gray-700">
              {view === "month" && "Resumen del mes"}
              {view === "week" && "Resumen de la semana"}
              {view === "day" && "Resumen del día"}
            </h3>
            
            {/* Métricas en línea */}
            <div className="flex items-center gap-3 md:gap-6 flex-wrap">
              {/* Sueño nocturno */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-sleep/20 flex items-center justify-center">
                  <Moon className="w-4 h-4 text-sleep" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">
                    {view === "day" ? "Sueño" : "Promedio sueño"}
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {monthlyStats.nightSleepHours.toFixed(1)}h
                  </span>
                </div>
              </div>
              
              {/* Siestas */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-nap/20 flex items-center justify-center">
                  <Cloud className="w-4 h-4 text-nap" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">
                    {view === "day" ? "Siesta" : "Promedio siesta"}
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {monthlyStats.napHours.toFixed(1)}h
                  </span>
                </div>
              </div>
              
              {/* Despertares */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-night-wake/20 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-night-wake" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">Despertares</span>
                  <span className="text-sm font-bold text-gray-900">
                    {monthlyStats.nightWakings}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Calendario Principal */}
      <div className="px-6 pb-6">
        <Card className={`p-4 ${view === 'day' ? 'h-[calc(100vh-320px)]' : ''}`} style={{ minHeight: view === 'day' ? 'auto' : '600px' }}>
          {isLoading ? (
            <div className="flex justify-center items-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A90E2] mx-auto mb-4" />
                <p className="text-gray-600">Cargando calendario...</p>
              </div>
            </div>
          ) : (
            view === "month" ? renderMonthView() :
            view === "week" ? renderWeekView() :
            renderDayView()
          )}
        </Card>
      </div>

      {/* Modal de registro de evento */}
      <EventRegistrationModal
        isOpen={eventModalOpen}
        onClose={() => {
          setEventModalOpen(false)
          setSelectedDateForEvent(null) // Limpiar fecha seleccionada al cerrar
        }}
        childId={activeChildId || undefined}
        children={children}
        selectedDate={selectedDateForEvent || undefined}
        onEventCreated={() => {
          invalidateEvents() // Invalidar cache global
          setEventModalOpen(false)
          setSelectedDateForEvent(null) // Limpiar fecha seleccionada
        }}
      />
      
      {/* Diálogo para mostrar/editar detalles del evento */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open)
        if (!open) setSelectedEvent(null) // Limpiar cuando se cierra
      }}>
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
                        {format(new Date(selectedEvent.startTime), "PPpp", { locale: es })}
                        {selectedEvent.endTime && (
                          <> hasta {format(new Date(selectedEvent.endTime), "p", { locale: es })}</>
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
                        onValueChange={(value) => setEditedEvent({ ...editedEvent, eventType: value })}
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
                        onValueChange={(value) => setEditedEvent({ ...editedEvent, emotionalState: value })}
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
                          value={editedEvent.startTime?.replace("Z", "") || ""}
                          onChange={(e) => setEditedEvent({ ...editedEvent, startTime: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="endTime">Hora de finalización</Label>
                        <Input 
                          type="datetime-local" 
                          value={editedEvent.endTime?.replace("Z", "") || ""}
                          onChange={(e) => setEditedEvent({ ...editedEvent, endTime: e.target.value })}
                        />
                      </div>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="notes">Notas</Label>
                      <Textarea 
                        value={editedEvent.notes || ""}
                        onChange={(e) => setEditedEvent({ ...editedEvent, notes: e.target.value })}
                        placeholder="Notas adicionales sobre el evento..."
                      />
                    </div>
                  </div>
                </div>
              )}
              
              <DialogFooter className="flex justify-between">
                {isEditing ? (
                  <>
                    <Button 
                      variant="destructive" 
                      onClick={() => {
                        // Modal de eliminación abierto
                        setShowDeleteModal(true)
                      }}
                      disabled={isSaving}
                    >
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
                  <div className="flex justify-between w-full">
                    <Button 
                      variant="destructive" 
                      onClick={() => {
                        // Modal de eliminación abierto desde vista
                        setShowDeleteModal(true)
                      }}
                    >
                      <Trash className="h-4 w-4 mr-2" />
                      Eliminar
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cerrar
                      </Button>
                      <Button onClick={() => setIsEditing(true)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar evento
                      </Button>
                    </div>
                  </div>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Modal de confirmación de eliminación */}
      {selectedEvent && (
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => {
            // Cerrando modal
            setShowDeleteModal(false)
          }}
          onConfirm={() => {
            // Confirmación de eliminación
            deleteEvent()
          }}
          itemName={`evento de ${getEventTypeName(selectedEvent.eventType)}`}
          isDeleting={isSaving}
        />
      )}
    </div>
  )
}