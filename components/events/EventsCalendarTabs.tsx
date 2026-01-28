"use client"

import React, { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react"
import { getEventIconConfig } from "@/lib/icons/event-icons"
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  isWithinInterval,
  isSameDay,
} from "date-fns"
import { es } from "date-fns/locale"

// Tipo de evento simplificado para el componente
interface Event {
  _id: string
  childId: string
  eventType: string
  startTime: string
  endTime?: string
  duration?: number
  notes?: string
  noteText?: string
  emotionalState?: string
  feedingType?: "breast" | "bottle" | "solids"
  feedingDuration?: number
  feedingAmount?: number
  babyState?: "awake" | "asleep"
  isNightFeeding?: boolean
  medicationName?: string
  medicationDose?: string
  activityDescription?: string
  activityDuration?: number
  sleepDelay?: number
  awakeDelay?: number
}

type ViewMode = "day" | "week" | "month"

interface EventsCalendarTabsProps {
  events: Event[]
  onEventClick?: (event: Event) => void
  onEventEdit?: (event: Event) => void
  isLoading?: boolean
  showEditButton?: boolean
  className?: string
}

/**
 * Componente reutilizable para visualizar eventos en tabs dia/semana/mes
 * Usado tanto en "Mis Eventos" del usuario como en Tab "Eventos" del admin
 */
export function EventsCalendarTabs({
  events,
  onEventClick,
  onEventEdit,
  isLoading = false,
  showEditButton = false,
  className = "",
}: EventsCalendarTabsProps) {
  const [view, setView] = useState<ViewMode>("week")
  const [currentDate, setCurrentDate] = useState(new Date())

  // Calcular rango de fechas segun la vista
  const dateRange = useMemo(() => {
    switch (view) {
    case "day":
      return {
        start: startOfDay(currentDate),
        end: endOfDay(currentDate),
      }
    case "week":
      return {
        start: startOfWeek(currentDate, { weekStartsOn: 1 }),
        end: endOfWeek(currentDate, { weekStartsOn: 1 }),
      }
    case "month":
      return {
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate),
      }
    }
  }, [view, currentDate])

  // Filtrar eventos dentro del rango actual
  const filteredEvents = useMemo(() => {
    return events
      .filter((event) => {
        const eventDate = new Date(event.startTime)
        return isWithinInterval(eventDate, { start: dateRange.start, end: dateRange.end })
      })
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
  }, [events, dateRange])

  // Agrupar eventos por dia (para vistas semana/mes)
  const eventsByDay = useMemo(() => {
    const grouped: Record<string, Event[]> = {}
    filteredEvents.forEach((event) => {
      const dayKey = format(new Date(event.startTime), "yyyy-MM-dd")
      if (!grouped[dayKey]) {
        grouped[dayKey] = []
      }
      grouped[dayKey].push(event)
    })
    return grouped
  }, [filteredEvents])

  // Navegacion
  const navigatePrevious = () => {
    switch (view) {
    case "day":
      setCurrentDate(subDays(currentDate, 1))
      break
    case "week":
      setCurrentDate(subWeeks(currentDate, 1))
      break
    case "month":
      setCurrentDate(subMonths(currentDate, 1))
      break
    }
  }

  const navigateNext = () => {
    switch (view) {
    case "day":
      setCurrentDate(addDays(currentDate, 1))
      break
    case "week":
      setCurrentDate(addWeeks(currentDate, 1))
      break
    case "month":
      setCurrentDate(addMonths(currentDate, 1))
      break
    }
  }

  // Titulo del periodo actual
  const getPeriodTitle = () => {
    switch (view) {
    case "day":
      return format(currentDate, "EEEE, d 'de' MMMM yyyy", { locale: es })
    case "week": {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
      if (weekStart.getMonth() === weekEnd.getMonth()) {
        return `${format(weekStart, "d", { locale: es })} - ${format(weekEnd, "d 'de' MMMM yyyy", { locale: es })}`
      }
      return `${format(weekStart, "d MMM", { locale: es })} - ${format(weekEnd, "d MMM yyyy", { locale: es })}`
    }
    case "month":
      return format(currentDate, "MMMM yyyy", { locale: es })
    }
  }

  // Iconos por tipo de evento - Usa el registry centralizado
  const getEventIcon = (event: Event) => {
    const iconConfig = getEventIconConfig(event.eventType, event.feedingType)
    const IconComponent = iconConfig.icon

    return (
      <IconComponent
        className="h-4 w-4"
        style={{ color: iconConfig.color }}
      />
    )
  }

  // Nombre del tipo de evento - Usa el label del registry
  const getEventLabel = (event: Event): string => {
    const iconConfig = getEventIconConfig(event.eventType, event.feedingType)
    return iconConfig.label
  }

  // Color de fondo segun tipo
  const getEventBgColor = (type: string) => {
    const colors: Record<string, string> = {
      sleep: "bg-blue-50 border-blue-200",
      nap: "bg-violet-50 border-violet-200",
      wake: "bg-green-50 border-green-200",
      night_waking: "bg-red-50 border-red-200",
      feeding: "bg-sky-50 border-sky-200",
      night_feeding: "bg-yellow-50 border-yellow-200",
      medication: "bg-amber-50 border-amber-200",
      activity: "bg-teal-50 border-teal-200",
      extra_activities: "bg-teal-50 border-teal-200",
      note: "bg-violet-50 border-violet-200",
    }
    return colors[type] || "bg-gray-50 border-gray-200"
  }

  // Formatear duracion
  const formatDuration = (minutes?: number | null) => {
    if (!minutes) return null
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  // Obtener descripcion breve del evento
  const getEventDescription = (event: Event) => {
    switch (event.eventType) {
    case "feeding":
    case "night_feeding": {
      const type = event.feedingType === "breast" ? "Pecho" : event.feedingType === "bottle" ? "Biberon" : "Solidos"
      const dur = event.feedingDuration ? ` - ${event.feedingDuration}m` : ""
      return `${type}${dur}`
    }
    case "medication":
      return event.medicationName || "Medicamento"
    case "extra_activities":
    case "activity":
      return event.activityDescription?.substring(0, 30) || "Actividad"
    case "note":
      return event.noteText?.substring(0, 40) || event.notes?.substring(0, 40) || "Nota"
    case "sleep":
    case "nap": {
      const dur = formatDuration(event.duration)
      const delay = event.sleepDelay ? `(${event.sleepDelay}m para dormirse)` : ""
      return dur ? `${dur} ${delay}`.trim() : delay
    }
    case "night_waking": {
      const awake = event.awakeDelay ? `${event.awakeDelay}m despierto` : ""
      return awake || "Despertar"
    }
    default:
      return event.notes?.substring(0, 30) || ""
    }
  }

  // Renderizar un evento individual
  const renderEventCard = (event: Event) => (
    <div
      key={event._id}
      className={`flex items-start gap-3 p-3 rounded-lg border ${getEventBgColor(event.eventType)} hover:shadow-sm transition-shadow cursor-pointer`}
      onClick={() => onEventClick?.(event)}
    >
      <div className="mt-0.5">{getEventIcon(event)}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{getEventLabel(event)}</span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(event.startTime), "HH:mm")}
            {event.endTime && ` - ${format(new Date(event.endTime), "HH:mm")}`}
          </span>
        </div>
        {getEventDescription(event) && (
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {getEventDescription(event)}
          </p>
        )}
      </div>
      {showEditButton && onEventEdit && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation()
            onEventEdit(event)
          }}
        >
          <span className="sr-only">Editar</span>
        </Button>
      )}
    </div>
  )

  // Renderizar vista de dia
  const renderDayView = () => (
    <div className="space-y-2">
      {filteredEvents.length === 0 ? (
        <div className="py-8 text-center">
          <Clock className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground text-sm">No hay eventos este dia</p>
        </div>
      ) : (
        filteredEvents.map(renderEventCard)
      )}
    </div>
  )

  // Renderizar vista de semana/mes (agrupada por dias)
  const renderGroupedView = () => {
    const sortedDays = Object.keys(eventsByDay).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

    if (sortedDays.length === 0) {
      return (
        <div className="py-8 text-center">
          <Clock className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground text-sm">
            No hay eventos {view === "week" ? "esta semana" : "este mes"}
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {sortedDays.map((dayKey) => {
          const dayDate = new Date(dayKey)
          const dayEvents = eventsByDay[dayKey]
          const isToday = isSameDay(dayDate, new Date())

          return (
            <div key={dayKey}>
              <div className={`text-sm font-medium mb-2 ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                {format(dayDate, "EEEE d", { locale: es })}
                {isToday && <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Hoy</span>}
              </div>
              <div className="space-y-2 pl-2 border-l-2 border-gray-100">
                {dayEvents.map(renderEventCard)}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3" />
            <span className="text-muted-foreground">Cargando eventos...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardContent className="pt-4">
        {/* Header con tabs y navegacion */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          {/* Tabs de vista */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-fit">
            <Button
              variant={view === "day" ? "default" : "ghost"}
              size="sm"
              className={view === "day" ? "bg-white shadow-sm" : ""}
              onClick={() => setView("day")}
            >
              Dia
            </Button>
            <Button
              variant={view === "week" ? "default" : "ghost"}
              size="sm"
              className={view === "week" ? "bg-white shadow-sm" : ""}
              onClick={() => setView("week")}
            >
              Semana
            </Button>
            <Button
              variant={view === "month" ? "default" : "ghost"}
              size="sm"
              className={view === "month" ? "bg-white shadow-sm" : ""}
              onClick={() => setView("month")}
            >
              Mes
            </Button>
          </div>

          {/* Navegacion de periodo */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={navigatePrevious}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-gray-700 min-w-[160px] text-center capitalize">
              {getPeriodTitle()}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={navigateNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Contador de eventos */}
        <div className="text-xs text-muted-foreground mb-3">
          {filteredEvents.length} evento{filteredEvents.length !== 1 ? "s" : ""}
        </div>

        {/* Contenido segun vista */}
        <div className="max-h-[500px] overflow-y-auto">
          {view === "day" ? renderDayView() : renderGroupedView()}
        </div>
      </CardContent>
    </Card>
  )
}
