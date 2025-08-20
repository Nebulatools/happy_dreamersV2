// 📅 Calendario Principal - Integración completa
"use client"

import React from 'react'
import { Card } from '@/components/ui/card'
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
  onDateChange?: (date: Date) => void; // Callback cuando cambia la fecha (opcional)
  onViewChange?: (view: ViewMode) => void; // Callback cuando cambia la vista (opcional)
  onDayNavigateBack?: () => void; // Navegación día por día hacia atrás
  onDayNavigateForward?: () => void; // Navegación día por día hacia adelante
}

export function CalendarMain({
  events,
  onEventClick,
  onCreateEvent,
  monthView,
  initialDate,
  initialView,
  onDateChange,
  onViewChange,
  onDayNavigateBack,
  onDayNavigateForward
}: CalendarMainProps) {
  
  // Usar directamente las props del padre en lugar del estado interno
  const date = initialDate || new Date()
  const view = initialView || "day"
  
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
      {/* Calendario */}
      <Card className="p-4">
        {view === "week" && (
          <CalendarWeekView
            date={date}
            events={events}
            hourHeight={HOUR_HEIGHT}
            onEventClick={onEventClick}
            onCalendarClick={handleClick}
            onDayNavigateBack={onDayNavigateBack}
            onDayNavigateForward={onDayNavigateForward}
          />
        )}
        
        {view === "day" && (
          <CalendarDayView
            date={date}
            events={events}
            hourHeight={HOUR_HEIGHT}
            onEventClick={onEventClick}
            onCalendarClick={handleClick}
            onDayNavigateBack={onDayNavigateBack}
            onDayNavigateForward={onDayNavigateForward}
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