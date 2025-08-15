"use client"

import React, { useState, useEffect } from "react"
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
  Clock
} from "lucide-react"
import { useActiveChild } from "@/context/active-child-context"
import { usePageHeaderConfig } from "@/context/page-header-context"
import { MonthLineChart } from "@/components/calendar"
import { cn } from "@/lib/utils"
import {
  format,
  addDays,
  subDays,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
} from "date-fns"
import { es } from "date-fns/locale"
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
import { useToast } from "@/hooks/use-toast"

const logger = createLogger("NewCalendarPage")

// Configuración del calendario
const HOUR_HEIGHT = 30 // 30px por hora para vista más compacta (24 horas = 720px)
const HOURS = Array.from({ length: 24 }, (_, i) => i) // 0-23

interface Event {
  _id: string;
  childId: string;
  eventType: string;
  emotionalState: string;
  startTime: string;
  endTime?: string;
  notes?: string;
}

// Función para extraer hora real del ISO string
function extractTimeFromISO(isoString: string) {
  const match = isoString.match(/T(\d{2}):(\d{2})/)
  if (match) {
    return {
      hours: parseInt(match[1], 10),
      minutes: parseInt(match[2], 10),
      formatted: `${match[1]}:${match[2]}`
    }
  }
  return null
}

// Componente de globo de evento
function EventGlobe({ event, onClick }: { event: Event; onClick?: (event: Event) => void }) {
  const timeData = extractTimeFromISO(event.startTime)
  const endTimeData = event.endTime ? extractTimeFromISO(event.endTime) : null
  
  if (!timeData) return null
  
  const { hours, minutes } = timeData
  
  // Posición: minutos desde medianoche * altura por minuto
  const totalMinutes = hours * 60 + minutes
  const position = totalMinutes * (HOUR_HEIGHT / 60) // posición exacta
  
  // Duración para altura del globo
  let duration = 0
  if (endTimeData) {
    const endTotalMinutes = endTimeData.hours * 60 + endTimeData.minutes
    duration = endTotalMinutes - totalMinutes
  }
  const height = duration > 0 ? Math.max(20, duration * (HOUR_HEIGHT / 60)) : 20
  
  // Color según tipo
  const getColor = () => {
    switch (event.eventType) {
      case 'nap': return 'bg-orange-400 text-white'
      case 'sleep': return 'bg-blue-400 text-white'
      case 'wake': return 'bg-green-400 text-white'
      case 'night_waking': return 'bg-red-400 text-white'
      default: return 'bg-gray-400 text-white'
    }
  }
  
  // Icono según tipo
  const getIcon = () => {
    switch (event.eventType) {
      case 'nap': return <Sun className="w-3 h-3" />
      case 'sleep': return <Moon className="w-3 h-3" />
      case 'wake': return <Sun className="w-3 h-3" />
      case 'night_waking': return <AlertCircle className="w-3 h-3" />
      default: return <Clock className="w-3 h-3" />
    }
  }
  
  // Nombre del evento
  const getName = () => {
    switch (event.eventType) {
      case 'nap': return 'Siesta'
      case 'sleep': return 'Dormir'
      case 'wake': return 'Despertar'
      case 'night_waking': return 'Despertar nocturno'
      default: return event.eventType
    }
  }
  
  return (
    <div
      className={`absolute left-2 right-2 rounded-lg shadow-md px-2 py-1 text-xs font-medium flex items-center gap-1 cursor-pointer hover:shadow-lg transition-shadow ${getColor()}`}
      style={{
        top: `${position}px`,
        height: `${height}px`,
        minHeight: '20px'
      }}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.(event)
      }}
    >
      {getIcon()}
      <div className="flex-1 truncate">
        <div>{getName()}</div>
        <div className="text-xs opacity-90">
          {timeData.formatted}
          {endTimeData && `-${endTimeData.formatted}`}
        </div>
      </div>
    </div>
  )
}

// Componente del eje de tiempo - memoizado y compacto
const TimeAxis = React.memo(() => {
  return (
    <div className="w-12 bg-gray-50 border-r border-gray-200 flex-shrink-0">
      {/* Header vacío - más compacto */}
      <div className="h-8 border-b border-gray-200 bg-white" />
      
      {/* Timeline - solo mostrar horas cada 2 horas para no saturar */}
      <div className="relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
        {HOURS.filter(hour => hour % 2 === 0).map((hour) => (
          <div
            key={hour}
            className="absolute right-1 text-xs font-medium text-gray-600"
            style={{ 
              top: `${hour * HOUR_HEIGHT}px`,
              transform: 'translateY(-50%)'
            }}
          >
            {hour.toString().padStart(2, '0')}:00
          </div>
        ))}
      </div>
    </div>
  )
})
TimeAxis.displayName = 'TimeAxis'

// Componente de fondo con colores - memoizado
const BackgroundAreas = React.memo(() => {
  return (
    <div 
      className="absolute inset-0"
      style={{
        background: `linear-gradient(
          to bottom,
          hsl(220 40% 85%) 0%,        /* Noche (0:00-6:00) */
          hsl(220 40% 85%) 25%,       /* 25% = 6 horas */
          hsl(48 100% 94%) 25%,       /* Día (6:00-19:00) */
          hsl(48 100% 94%) 79.17%,    /* 79.17% = 19 horas */
          hsl(220 40% 85%) 79.17%,    /* Noche (19:00-24:00) */
          hsl(220 40% 85%) 100%
        )`
      }}
    />
  )
})
BackgroundAreas.displayName = 'BackgroundAreas'

// Componente de líneas de grid - memoizado
const GridLines = React.memo(() => {
  return (
    <>
      {HOURS.map((hour) => (
        <div
          key={hour}
          className={`absolute left-0 right-0 border-t ${
            hour % 3 === 0 ? 'border-gray-300' : 'border-gray-200'
          }`}
          style={{ top: `${hour * HOUR_HEIGHT}px` }}
        />
      ))}
    </>
  )
})
GridLines.displayName = 'GridLines'

// Componente principal del calendario
export default function NewCalendarPage() {
  const { activeChildId } = useActiveChild()
  const [date, setDate] = useState<Date>(new Date())
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Estados para modales de eventos
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [clickedTime, setClickedTime] = useState<{ hour: number; minute: number; date: Date } | null>(null)
  
  // Estado para vista del calendario con localStorage
  const [view, setView] = useState<"month" | "week" | "day">(() => {
    if (typeof window !== "undefined") {
      const savedView = localStorage.getItem("calendar-view-preference")
      if (savedView && ["month", "week", "day"].includes(savedView)) {
        return savedView as "month" | "week" | "day"
      }
    }
    return "day" // Default a vista diaria (nuestra nueva vista)
  })
  
  // Función para cambiar la vista y guardar en localStorage
  const handleViewChange = (newView: "month" | "week" | "day") => {
    setView(newView)
    if (typeof window !== "undefined") {
      localStorage.setItem("calendar-view-preference", newView)
    }
  }

  // Función para manejar click en eventos (editar)
  const handleEventClick = (event: Event) => {
    setSelectedEvent(event)
    setIsEventModalOpen(true)
    setClickedTime(null) // Limpiar tiempo de click para indicar que es edición
  }

  // Función para manejar click en el calendario (agregar nuevo evento)
  const handleCalendarClick = (clickEvent: React.MouseEvent, dayDate: Date) => {
    // Solo para vistas de timeline (día y semana)
    if (view === "month") return

    const rect = (clickEvent.currentTarget as HTMLElement).getBoundingClientRect()
    const y = clickEvent.clientY - rect.top
    
    // Calcular hora basada en la posición Y
    const totalMinutes = (y / HOUR_HEIGHT) * 60
    const hour = Math.floor(totalMinutes / 60)
    const minute = Math.round((totalMinutes % 60) / 15) * 15 // Redondear a cada 15 minutos
    
    // Validar que la hora esté en rango válido
    if (hour >= 0 && hour < 24 && minute >= 0 && minute < 60) {
      setClickedTime({ hour, minute, date: dayDate })
      setSelectedEvent(null) // Limpiar evento seleccionado para indicar que es nuevo
      setIsEventModalOpen(true)
    }
  }

  // Configurar header sin botón extra
  usePageHeaderConfig({
    title: "Calendario",
    showSearch: true,
    showChildSelector: true,
    showNotifications: true
  })

  // Cargar eventos
  const fetchEvents = React.useCallback(async () => {
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
          const isInMonth = eventDate.getMonth() === date.getMonth() && 
                           eventDate.getFullYear() === date.getFullYear()
          if (isInMonth) {
            logger.info(`Evento incluido en vista mensual:`, event.eventType, format(eventDate, "yyyy-MM-dd HH:mm"))
          }
          return isInMonth
        })
        logger.info(`Vista mensual: ${filteredEvents.length} eventos filtrados de ${eventsData.length} total`)
      } else if (view === "week") {
        const weekStart = startOfDay(startOfWeek(date, { weekStartsOn: 0 }))
        const weekEnd = endOfDay(endOfWeek(date, { weekStartsOn: 0 }))
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
      logger.info(`Cargados ${filteredEvents.length} eventos para el día`)
    } catch (error) {
      logger.error("Error:", error)
      setEvents([])
    } finally {
      setIsLoading(false)
    }
  }, [activeChildId, date, view])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // Función para obtener eventos de un día específico
  const getEventsForDay = (day: Date) => {
    const dayStr = format(day, "yyyy-MM-dd")
    const dayEvents = events.filter(event => {
      if (!event.startTime || event.startTime === '') {
        return false
      }
      return event.startTime.startsWith(dayStr)
    })
    
    return dayEvents.sort((a, b) => {
      const timeA = new Date(a.startTime).getTime()
      const timeB = new Date(b.startTime).getTime()
      return timeA - timeB
    })
  }

  // Vista mensual con gráficas
  const renderMonthView = () => {
    logger.info(`Renderizando vista mensual con ${events.length} eventos para`, format(date, "MMMM yyyy"))
    
    // Test: Si no hay eventos, crear algunos de prueba para verificar que la gráfica funciona
    const testEvents = events.length === 0 ? [
      {
        _id: "test1",
        childId: activeChildId || "test",
        eventType: "sleep",
        emotionalState: "tranquilo",
        startTime: `${format(date, "yyyy-MM")}-15T21:30:00.000Z`,
        endTime: `${format(date, "yyyy-MM")}-16T07:00:00.000Z`,
      },
      {
        _id: "test2", 
        childId: activeChildId || "test",
        eventType: "nap",
        emotionalState: "tranquilo",
        startTime: `${format(date, "yyyy-MM")}-16T14:00:00.000Z`,
        endTime: `${format(date, "yyyy-MM")}-16T15:30:00.000Z`,
      }
    ] : events
    
    return (
      <div className="w-full" style={{ height: "400px" }}>
        <MonthLineChart 
          events={testEvents}
          currentDate={date}
          onEventClick={handleEventClick}
          className="w-full h-full"
        />
      </div>
    )
  }

  // Vista semanal con múltiples días
  const renderWeekView = () => {
    const weekStart = startOfWeek(date, { weekStartsOn: 0 }) // Empezar en domingo
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
    
    return (
      <div className="flex" style={{ height: `${24 * HOUR_HEIGHT + 32}px` }}>
        {/* Eje de tiempo */}
        <TimeAxis />
        
        {/* Días de la semana */}
        <div className="flex-1 flex">
          {days.map((day, index) => {
            const dayName = weekDays[day.getDay()]
            const dayEvents = getEventsForDay(day)
            const isDayToday = isToday(day)
            
            return (
              <div key={day.toString()} className="flex-1 relative">
                {/* Header del día - más compacto */}
                <div 
                  className={cn(
                    "h-8 bg-white border-b border-gray-200 flex flex-col items-center justify-center text-xs font-medium",
                    isDayToday && "bg-blue-50 text-blue-600"
                  )}
                >
                  <div className="text-xs opacity-75">{dayName}</div>
                  <div className="font-bold text-xs">{format(day, "d")}</div>
                </div>
                
                {/* Container de eventos */}
                <div 
                  className="relative border-r border-gray-200 cursor-pointer"
                  style={{ height: `${24 * HOUR_HEIGHT}px` }}
                  onClick={(e) => handleCalendarClick(e, day)}
                >
                  {/* Fondo con colores */}
                  <BackgroundAreas />
                  
                  {/* Líneas de grid */}
                  <GridLines />
                  
                  {/* Eventos */}
                  {dayEvents.map((event) => (
                    <EventGlobe key={event._id} event={event} onClick={handleEventClick} />
                  ))}
                  
                  {/* Estado vacío */}
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
    )
  }

  // Vista diaria (la que ya tenemos)
  const renderDayView = () => {
    return (
      <div className="flex" style={{ height: `${24 * HOUR_HEIGHT + 32}px` }}>
        {/* Eje de tiempo */}
        <TimeAxis />
        
        {/* Área de eventos */}
        <div className="flex-1 relative">
          {/* Header del día - más compacto */}
          <div className="h-8 bg-white border-b border-gray-200 flex items-center justify-center">
            <span className="font-medium text-sm">{format(date, "d")}</span>
          </div>
          
          {/* Container de eventos */}
          <div 
            className="relative overflow-hidden cursor-pointer"
            style={{ height: `${24 * HOUR_HEIGHT}px` }}
            onClick={(e) => handleCalendarClick(e, date)}
          >
            {/* Fondo con colores */}
            <BackgroundAreas />
            
            {/* Líneas de grid */}
            <GridLines />
            
            {/* Eventos */}
            {events.map((event) => (
              <EventGlobe key={event._id} event={event} onClick={handleEventClick} />
            ))}
            
            {/* Estado vacío */}
            {events.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center text-gray-500">
                  <Cloud className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No hay eventos registrados para este día</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Funciones del modal de eventos
  const { toast } = useToast()

  const handleModalClose = () => {
    setIsEventModalOpen(false)
    setSelectedEvent(null)
    setClickedTime(null)
  }

  const handleEventSave = async (eventData: any) => {
    try {
      let url = "/api/children/events"
      let method = "POST"
      
      if (selectedEvent) {
        // Editando evento existente
        url = `/api/children/events/${selectedEvent._id}`
        method = "PUT"
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          childId: activeChildId,
          ...eventData,
        }),
      })

      if (!response.ok) throw new Error("Error al guardar evento")

      toast({
        title: selectedEvent ? "Evento actualizado" : "Evento creado",
        description: selectedEvent ? "El evento ha sido actualizado correctamente" : "El evento ha sido creado correctamente",
      })

      // Recargar eventos
      fetchEvents()
      handleModalClose()
    } catch (error) {
      logger.error("Error al guardar evento:", error)
      toast({
        title: "Error",
        description: "No se pudo guardar el evento",
        variant: "destructive",
      })
    }
  }

  const handleEventDelete = async () => {
    if (!selectedEvent) return

    try {
      const response = await fetch(`/api/children/events/${selectedEvent._id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Error al eliminar evento")

      toast({
        title: "Evento eliminado",
        description: "El evento ha sido eliminado correctamente",
      })

      // Recargar eventos
      fetchEvents()
      handleModalClose()
    } catch (error) {
      logger.error("Error al eliminar evento:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el evento",
        variant: "destructive",
      })
    }
  }

  if (!activeChildId) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Selecciona un niño</h2>
          <p className="text-gray-600">
            Por favor, selecciona un niño en la parte superior para ver su calendario.
          </p>
        </Card>
      </div>
    )
  }

  // Funciones de navegación según la vista
  const navigatePrevious = () => {
    if (view === "month") {
      setDate(subMonths(date, 1))
    } else if (view === "week") {
      setDate(subWeeks(date, 1))
    } else {
      setDate(subDays(date, 1))
    }
  }

  const navigateNext = () => {
    if (view === "month") {
      setDate(addMonths(date, 1))
    } else if (view === "week") {
      setDate(addWeeks(date, 1))
    } else {
      setDate(addDays(date, 1))
    }
  }

  // Función para obtener el título según la vista
  const getDateTitle = () => {
    if (view === "month") {
      return format(date, "MMMM yyyy", { locale: es })
    } else if (view === "week") {
      const weekStart = startOfWeek(date, { weekStartsOn: 0 })
      const weekEnd = endOfWeek(date, { weekStartsOn: 0 })
      if (isSameMonth(weekStart, weekEnd)) {
        return format(weekStart, "d", { locale: es }) + " - " + format(weekEnd, "d 'de' MMMM yyyy", { locale: es })
      } else {
        return format(weekStart, "d 'de' MMM", { locale: es }) + " - " + format(weekEnd, "d 'de' MMM yyyy", { locale: es })
      }
    } else {
      return format(date, "EEEE, d 'de' MMMM yyyy", { locale: es })
    }
  }

  return (
    <div className="space-y-3 p-4">
      {/* Selector de vista */}
      <div className="flex items-center justify-center gap-1 bg-gray-100 p-1 rounded-lg w-fit mx-auto">
        <Button
          variant={view === "month" ? "default" : "ghost"}
          size="sm"
          className={view === "month" ? "bg-white shadow-sm" : ""}
          onClick={() => handleViewChange("month")}
        >
          Mensual
        </Button>
        <Button
          variant={view === "week" ? "default" : "ghost"}
          size="sm"
          className={view === "week" ? "bg-white shadow-sm" : ""}
          onClick={() => handleViewChange("week")}
        >
          Semanal
        </Button>
        <Button
          variant={view === "day" ? "default" : "ghost"}
          size="sm"
          className={view === "day" ? "bg-white shadow-sm" : ""}
          onClick={() => handleViewChange("day")}
        >
          Diario
        </Button>
      </div>

      {/* Navegación de fecha */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={navigatePrevious}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <h2 className="text-xl font-semibold min-w-[200px] text-center">
          {getDateTitle()}
        </h2>
        
        <Button
          variant="outline"
          size="icon"
          onClick={navigateNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendario - más compacto */}
      <Card className={cn("p-3", view === "month" ? "min-h-[500px]" : "")}>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-600 text-sm">Cargando eventos...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Renderizar vista según selección */}
            {view === "month" && renderMonthView()}
            {view === "week" && renderWeekView()}
            {view === "day" && renderDayView()}
          </>
        )}
      </Card>

      {/* Modal de eventos */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={handleModalClose}
        event={selectedEvent}
        clickedTime={clickedTime}
        onSave={handleEventSave}
        onDelete={handleEventDelete}
      />
    </div>
  )
}

// Componente del modal de eventos
function EventModal({
  isOpen,
  onClose,
  event,
  clickedTime,
  onSave,
  onDelete,
}: {
  isOpen: boolean
  onClose: () => void
  event: Event | null
  clickedTime: { hour: number; minute: number; date: Date } | null
  onSave: (eventData: any) => void
  onDelete: () => void
}) {
  const [eventType, setEventType] = React.useState("sleep")
  const [emotionalState, setEmotionalState] = React.useState("tranquilo")
  const [startTime, setStartTime] = React.useState("")
  const [endTime, setEndTime] = React.useState("")
  const [notes, setNotes] = React.useState("")

  // Inicializar formulario cuando se abre el modal
  React.useEffect(() => {
    if (isOpen) {
      if (event) {
        // Editando evento existente
        setEventType(event.eventType)
        setEmotionalState(event.emotionalState)
        
        // Extraer fecha y hora del evento
        const startDate = new Date(event.startTime)
        const startTimeStr = format(startDate, "HH:mm")
        setStartTime(startTimeStr)
        
        if (event.endTime) {
          const endDate = new Date(event.endTime)
          const endTimeStr = format(endDate, "HH:mm")
          setEndTime(endTimeStr)
        } else {
          setEndTime("")
        }
        
        setNotes(event.notes || "")
      } else if (clickedTime) {
        // Nuevo evento con hora clickeada
        setEventType("sleep")
        setEmotionalState("tranquilo")
        setStartTime(`${clickedTime.hour.toString().padStart(2, '0')}:${clickedTime.minute.toString().padStart(2, '0')}`)
        setEndTime("")
        setNotes("")
      } else {
        // Nuevo evento sin hora específica
        setEventType("sleep")
        setEmotionalState("tranquilo")
        setStartTime("")
        setEndTime("")
        setNotes("")
      }
    }
  }, [isOpen, event, clickedTime])

  const handleSave = () => {
    if (!startTime) {
      alert("Por favor ingresa la hora de inicio")
      return
    }

    const baseDate = clickedTime?.date || (event ? new Date(event.startTime) : new Date())
    const [startHour, startMin] = startTime.split(':').map(Number)
    
    const startDateTime = new Date(baseDate)
    startDateTime.setHours(startHour, startMin, 0, 0)

    let endDateTime = null
    if (endTime) {
      const [endHour, endMin] = endTime.split(':').map(Number)
      endDateTime = new Date(baseDate)
      endDateTime.setHours(endHour, endMin, 0, 0)
      
      // Si la hora de fin es menor que la de inicio, asumimos que es al día siguiente
      if (endDateTime <= startDateTime) {
        endDateTime.setDate(endDateTime.getDate() + 1)
      }
    }

    const eventData = {
      eventType,
      emotionalState,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime ? endDateTime.toISOString() : undefined,
      notes: notes.trim() || undefined,
    }

    onSave(eventData)
  }

  const eventTypeOptions = [
    { value: "sleep", label: "Dormir" },
    { value: "nap", label: "Siesta" },
    { value: "wake", label: "Despertar" },
    { value: "night_waking", label: "Despertar nocturno" },
  ]

  const emotionalStateOptions = [
    { value: "tranquilo", label: "Tranquilo" },
    { value: "inquieto", label: "Inquieto" },
    { value: "llorando", label: "Llorando" },
    { value: "feliz", label: "Feliz" },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {event ? "Editar Evento" : "Nuevo Evento"}
          </DialogTitle>
          <DialogDescription>
            {event ? "Modifica los detalles del evento" : "Agrega un nuevo evento al calendario"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="eventType">Tipo de evento</Label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {eventTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="emotionalState">Estado emocional</Label>
            <Select value={emotionalState} onValueChange={setEmotionalState}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {emotionalStateOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startTime">Hora de inicio</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endTime">Hora de fin (opcional)</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Agrega cualquier detalle adicional..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            {event && (
              <Button variant="destructive" onClick={onDelete}>
                Eliminar
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {event ? "Actualizar" : "Crear"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}