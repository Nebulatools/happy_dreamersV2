// Página de Calendario de Sueño según diseño de Figma
// Muestra eventos de sueño en vista mensual/semanal/diaria con resumen estadístico

"use client"

import React, { useState, useEffect } from "react"
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

import { createLogger } from "@/lib/logger"

const logger = createLogger("page")


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
      <div className="mt-6">
        {/* Headers de días */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-sm font-medium text-gray-600">
              {day}
            </div>
          ))}
        </div>
        
        {/* Grid de días */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const dayEvents = getEventsForDay(day)
            const isCurrentMonth = isSameMonth(day, date)
            const isDayToday = isToday(day)
            
            return (
              <div 
                key={day.toString()} 
                className={cn(
                  "calendar-cell rounded-lg relative cursor-pointer hover:bg-gray-50 transition-colors",
                  !isCurrentMonth && "bg-gray-50 text-gray-400",
                  isDayToday && "bg-blue-50 border-2 border-[#4A90E2]"
                )}
                onClick={() => handleDayClick(day)}
              >
                <div className="absolute top-2 right-2 text-sm font-medium">
                  {format(day, "d")}
                </div>
                
                <div className="mt-6 space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event._id}
                      className={cn(
                        getEventTypeColor(event.eventType),
                        "flex items-center gap-1 cursor-pointer hover:opacity-80 z-10 relative"
                      )}
                      onClick={(e) => {
                        e.stopPropagation() // Evitar que se propague al clic del día
                        handleEventClick(event)
                      }}
                    >
                      {getEventTypeIcon(event.eventType)}
                      <span className="text-xs truncate">
                        {formatEventTime(event)}
                      </span>
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-500 pl-1">
                      +{dayEvents.length - 3} más
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
    const weekDays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
    
    // Ajustar altura por hora para que quepa en pantalla
    // Aumentamos ligeramente para mejor visualización de divisiones de 15 minutos
    const hourHeight = 48 // 48px por hora = 1152px total para 24 horas
    
    return (
      <div className="mt-6 calendar-timeline">
        <div className="week-view-timeline">
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
                    <div className="text-lg font-bold">
                      {format(day, "d")}
                    </div>
                    {isDayToday && (
                      <div className="text-xs font-medium">Hoy</div>
                    )}
                  </div>
                  
                  {/* Events Timeline Container */}
                  <div 
                    className="events-timeline-container cursor-pointer hover:bg-gray-50/50 transition-colors"
                    onClick={() => handleDayClick(day)}
                  >
                    {/* Hour grid lines */}
                    {Array.from({ length: 24 }, (_, hour) => (
                      <div key={hour}>
                        {/* Major hour lines (every 4 hours) */}
                        {hour % 4 === 0 && (
                          <div 
                            className="hour-grid-line-major"
                            style={{ top: `${hour * hourHeight}px` }}
                          />
                        )}
                        {/* Regular hour lines */}
                        <div 
                          className="hour-grid-line"
                          style={{ top: `${hour * hourHeight}px` }}
                        />
                        {/* Quarter-hour lines (15, 30, 45 minutes) */}
                        <div 
                          className="hour-grid-line opacity-30"
                          style={{ top: `${hour * hourHeight + hourHeight / 4}px` }}
                        />
                        <div 
                          className="hour-grid-line opacity-40"
                          style={{ top: `${hour * hourHeight + hourHeight / 2}px` }}
                        />
                        <div 
                          className="hour-grid-line opacity-30"
                          style={{ top: `${hour * hourHeight + (3 * hourHeight / 4)}px` }}
                        />
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
    const hourHeight = 48 // Misma altura por hora que en vista semanal
    
    return (
      <div className="mt-6">
        {/* Header del día */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {format(date, "EEEE, d 'de' MMMM", { locale: es })}
          </h2>
          {isToday(date) && (
            <div className="text-blue-600 font-medium mt-1">Hoy</div>
          )}
        </div>
        
        {/* Timeline de 24 horas */}
        <div className="calendar-timeline">
          <div className="flex">
            {/* Columna de horas */}
            <TimelineColumn hourHeight={hourHeight} />
            
            {/* Columna de eventos del día */}
            <div className="flex-1 relative border-l border-gray-200">
              {/* Header del día */}
              <div 
                className="h-16 bg-white border-b border-gray-200 flex items-center justify-center sticky top-0 z-10 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleDayClick(date)}
              >
                <div className="text-lg font-bold">
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
                    {/* Líneas principales de hora */}
                    {hour % 4 === 0 && (
                      <div 
                        className="hour-grid-line-major"
                        style={{ top: `${hour * hourHeight}px` }}
                      />
                    )}
                    {/* Líneas regulares de hora */}
                    <div 
                      className="hour-grid-line"
                      style={{ top: `${hour * hourHeight}px` }}
                    />
                    {/* Líneas de cuarto de hora (15, 30, 45 minutos) */}
                    <div 
                      className="hour-grid-line opacity-30"
                      style={{ top: `${hour * hourHeight + hourHeight / 4}px` }}
                    />
                    <div 
                      className="hour-grid-line opacity-40"
                      style={{ top: `${hour * hourHeight + hourHeight / 2}px` }}
                    />
                    <div 
                      className="hour-grid-line opacity-30"
                      style={{ top: `${hour * hourHeight + (3 * hourHeight / 4)}px` }}
                    />
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

  const renderStatCard = (
    title: string, 
    value: string, 
    unit: string, 
    change: number, 
    changeLabel: string,
    type?: "sleep" | "nap" | "wake"
  ) => {
    const isPositive = change > 0
    const isNeutral = change === 0
    const Icon = isPositive ? TrendingUp : (isNeutral ? Minus : TrendingDown)
    const color = isPositive ? "text-green-600" : (isNeutral ? "text-gray-600" : "text-red-600")
    
    // Determinar el color de fondo según el tipo
    const bgColorClass = type === "sleep" ? "bg-sleep/10" : 
      type === "nap" ? "bg-nap/10" : 
        type === "wake" ? "bg-night-wake/10" : ""
    
    const borderColorClass = type === "sleep" ? "border-sleep" : 
      type === "nap" ? "border-nap" : 
        type === "wake" ? "border-night-wake" : ""
    
    const iconColorClass = type === "sleep" ? "bg-sleep" : 
      type === "nap" ? "bg-nap" : 
        type === "wake" ? "bg-night-wake" : ""
    
    return (
      <div className={cn("p-5 rounded-lg border", bgColorClass, borderColorClass)}>
        <div className="flex items-start gap-4">
          <div className={cn("w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0", iconColorClass)}>
            {type === "sleep" && <Moon className="w-6 h-6 text-white" />}
            {type === "nap" && <Cloud className="w-6 h-6 text-white" />}
            {type === "wake" && <AlertCircle className="w-6 h-6 text-white" />}
          </div>
          <div className="flex-1 space-y-3">
            <h4 className="text-sm font-medium text-gray-600">{title}</h4>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#2F2F2F]">{value}</span>
              <span className="text-sm text-gray-500">{unit}</span>
            </div>
          </div>
        </div>
        <div className={cn("flex items-center gap-2 mt-4 pt-4 border-t", color, borderColorClass + "/20")}>
          <Icon className="w-4 h-4" />
          <span className="text-sm flex-1">
            {isNeutral ? "Sin cambios" : `${Math.abs(change)} ${changeLabel}`}
          </span>
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
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-[#2F2F2F]">Calendario de Sueño</h1>
        
        <div className="flex items-center gap-4">
          {/* Navegación de fecha */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
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
            
            <span className="font-medium text-lg min-w-[200px] text-center">
              {view === "month" && format(date, "MMMM yyyy", { locale: es })}
              {view === "week" && `Semana del ${format(startOfWeek(date, { weekStartsOn: 1 }), "d 'de' MMMM", { locale: es })}`}
              {view === "day" && format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
            </span>
            
            <Button
              variant="outline"
              size="icon"
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
          
          {/* Botón Registrar Evento */}
          <Button 
            className="hd-gradient-button text-white"
            onClick={() => {
              setSelectedDateForEvent(null) // No preseleccionar fecha cuando se usa el botón
              setEventModalOpen(true)
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Registrar Evento
          </Button>
        </div>
      </div>

      {/* Controles de vista y layout */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={view === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("month")}
            className={view === "month" ? "hd-gradient-button text-white" : ""}
          >
            Mensual
          </Button>
          <Button
            variant={view === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("week")}
            className={view === "week" ? "hd-gradient-button text-white" : ""}
          >
            Semanal
          </Button>
          <Button
            variant={view === "day" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("day")}
            className={view === "day" ? "hd-gradient-button text-white" : ""}
          >
            Diario
          </Button>
        </div>
        
      </div>

      {/* Leyenda */}
      <div className="flex gap-6">
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

      {/* Layout con resumen inferior */}
      <div className="space-y-6">
        {/* Calendario Principal */}
        <Card className="p-6">
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

        {/* Panel de Resumen Inferior */}
        <Card className="summary-panel-bottom p-6">
          <h3 className="text-lg font-semibold mb-6">
            {view === "month" && "Resumen del mes"}
            {view === "week" && "Resumen de la semana"}
            {view === "day" && "Resumen del día"}
          </h3>
          
          {/* Cards horizontales en layout inferior */}
          <div className="summary-cards-horizontal">
            {renderStatCard(
              view === "day" ? "Horas de sueño nocturno" : "Promedio de sueño nocturno",
              monthlyStats.nightSleepHours.toFixed(1),
              "horas",
              monthlyStats.nightSleepChange,
              monthlyStats.nightSleepChange > 0 ? 
                (view === "month" ? "horas más que el mes pasado" : 
                 view === "week" ? "horas más vs semana anterior" : "horas del día") :
              monthlyStats.nightSleepChange < 0 ?
                (view === "month" ? "horas menos que el mes pasado" : 
                 view === "week" ? "horas menos vs semana anterior" : "horas del día") :
                "",
              "sleep"
            )}
            
            {renderStatCard(
              view === "day" ? "Tiempo de siesta" : "Promedio de siestas",
              monthlyStats.napHours.toFixed(1),
              "horas",
              monthlyStats.napChange,
              monthlyStats.napChange > 0 ?
                (view === "month" ? "horas más que el mes pasado" : 
                 view === "week" ? "horas más vs semana anterior" : "horas del día") :
              monthlyStats.napChange < 0 ?
                (view === "month" ? "horas menos que el mes pasado" : 
                 view === "week" ? "horas menos vs semana anterior" : "horas del día") :
                "",
              "nap"
            )}
            
            {renderStatCard(
              "Despertares nocturnos",
              monthlyStats.nightWakings.toString(),
              view === "day" ? "" : "total",
              monthlyStats.wakingsChange,
              monthlyStats.wakingsChange > 0 ?
                (view === "month" ? "más que el mes pasado" : 
                 view === "week" ? "más vs semana anterior" : "del día") :
              monthlyStats.wakingsChange < 0 ?
                (view === "month" ? "menos que el mes pasado" : 
                 view === "week" ? "menos vs semana anterior" : "del día") :
                "",
              "wake"
            )}
          </div>
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
                        console.log("Abriendo modal de eliminación")
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
                        console.log("Abriendo modal de eliminación desde vista")
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
            console.log("Cerrando modal de eliminación")
            setShowDeleteModal(false)
          }}
          onConfirm={() => {
            console.log("Confirmando eliminación")
            deleteEvent()
          }}
          itemName={`evento de ${getEventTypeName(selectedEvent.eventType)}`}
          isDeleting={isSaving}
        />
      )}
    </div>
  )
}