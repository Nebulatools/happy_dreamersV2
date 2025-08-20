// 📅 Calendario Principal - Integración completa
"use client"

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { CalendarNavigation } from './CalendarNavigation'
import { CalendarWeekView } from './CalendarWeekView'
import { CalendarDayView } from './CalendarDayView'
import { handleCalendarClick } from './CalendarClickHandler'

// Configuración base
const HOUR_HEIGHT = 30

interface Event {
  _id: string;
  childId: string;
  eventType: string;
  emotionalState: string;
  startTime: string;
  endTime?: string;
  notes?: string;
}

type ViewMode = "month" | "week" | "day"

interface CalendarMainProps {
  events: Event[];
  onEventClick?: (event: Event) => void;
  onCreateEvent?: (clickTime: { hour: number; minute: number; date: Date }) => void;
  monthView?: React.ReactNode; // Para mantener la vista mensual existente
  initialDate?: Date; // Fecha inicial controlada por el padre
  initialView?: ViewMode; // Vista inicial controlada por el padre
  onDateChange?: (date: Date) => void; // Callback cuando cambia la fecha
  onViewChange?: (view: ViewMode) => void; // Callback cuando cambia la vista
}

export function CalendarMain({
  events,
  onEventClick,
  onCreateEvent,
  monthView,
  initialDate,
  initialView,
  onDateChange,
  onViewChange
}: CalendarMainProps) {
  
  const [date, setDate] = useState<Date>(initialDate || new Date())
  const [view, setView] = useState<ViewMode>(() => {
    if (initialView) return initialView
    // Cargar preferencia desde localStorage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("calendar-view-preference")
      if (saved && ["month", "week", "day"].includes(saved)) {
        return saved as ViewMode
      }
    }
    return "day"
  })
  
  // Sincronizar con prop de fecha inicial
  useEffect(() => {
    if (initialDate) {
      setDate(initialDate)
    }
  }, [initialDate])
  
  // Sincronizar con prop de vista inicial
  useEffect(() => {
    if (initialView) {
      setView(initialView)
    }
  }, [initialView])
  
  // Manejar cambio de fecha
  const handleDateChange = (newDate: Date) => {
    setDate(newDate)
    onDateChange?.(newDate)
  }
  
  // Guardar preferencia de vista
  const handleViewChange = (newView: ViewMode) => {
    setView(newView)
    if (typeof window !== "undefined") {
      localStorage.setItem("calendar-view-preference", newView)
    }
    onViewChange?.(newView)
  }
  
  // Manejar click en calendario para crear eventos
  const handleClick = (clickEvent: React.MouseEvent, dayDate: Date) => {
    // Solo para vistas timeline (no mensual)
    if (view === "month") return
    
    const clickTime = handleCalendarClick(clickEvent, dayDate, HOUR_HEIGHT)
    if (clickTime) {
      onCreateEvent?.(clickTime)
    }
  }
  
  return (
    <div className="space-y-4">
      {/* Navegación */}
      <CalendarNavigation
        date={date}
        view={view}
        onDateChange={handleDateChange}
        onViewChange={handleViewChange}
      />
      
      {/* Calendario */}
      <Card className="p-4">
        {view === "week" && (
          <CalendarWeekView
            date={date}
            events={events}
            hourHeight={HOUR_HEIGHT}
            onEventClick={onEventClick}
            onCalendarClick={handleClick}
          />
        )}
        
        {view === "day" && (
          <CalendarDayView
            date={date}
            events={events}
            hourHeight={HOUR_HEIGHT}
            onEventClick={onEventClick}
            onCalendarClick={handleClick}
          />
        )}
        
        {view === "month" && (
          monthView || (
            <div className="h-96 flex items-center justify-center text-gray-500">
              Vista mensual - Cargando...
            </div>
          )
        )}
      </Card>
    </div>
  )
}