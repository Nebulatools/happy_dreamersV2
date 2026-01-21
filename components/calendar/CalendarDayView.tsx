// 🔍 Vista Diaria - Un solo día con eventos
"use client"

import React from "react"
import { format } from "date-fns"
import { Cloud, ChevronLeft, ChevronRight } from "lucide-react"
import { TimeAxis } from "./TimeAxis"
import { BackgroundAreas } from "./BackgroundAreas"
import { GridLines } from "./GridLines"
import { EventGlobe } from "./EventGlobe"
import { SleepSessionBlock } from "./SleepSessionBlock"
import { processSleepSessions, type Event as SleepEvent } from "@/lib/utils/sleep-sessions"

interface Event {
  _id: string;
  childId: string;
  eventType: string;
  emotionalState: string;
  startTime: string;
  endTime?: string;
  notes?: string;
}

// Funcion para calcular columnas de eventos superpuestos (misma que CalendarWeekView)
interface EventWithColumn extends Event {
  column: number;
  totalColumns: number;
}

function calculateEventColumns(events: Event[]): EventWithColumn[] {
  if (events.length === 0) return []

  // Ordenar por hora de inicio
  const sortedEvents = [...events].sort((a, b) =>
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )

  const eventsWithColumns: EventWithColumn[] = []
  const activeColumns: { endTime: number; column: number }[] = []

  sortedEvents.forEach(event => {
    const startTime = new Date(event.startTime).getTime()
    const endTime = event.endTime
      ? new Date(event.endTime).getTime()
      : startTime + 30 * 60 * 1000 // 30 min default para eventos sin fin

    // Limpiar columnas que ya terminaron
    const availableColumns = activeColumns.filter(col => col.endTime <= startTime)
    availableColumns.forEach(col => {
      const idx = activeColumns.indexOf(col)
      if (idx > -1) activeColumns.splice(idx, 1)
    })

    // Encontrar la primera columna disponible
    let column = 0
    const usedColumns = activeColumns.map(c => c.column).sort((a, b) => a - b)
    for (let i = 0; i <= usedColumns.length; i++) {
      if (!usedColumns.includes(i)) {
        column = i
        break
      }
    }

    // Agregar a columnas activas
    activeColumns.push({ endTime, column })

    // Guardar evento con su columna
    eventsWithColumns.push({
      ...event,
      column,
      totalColumns: Math.max(...activeColumns.map(c => c.column)) + 1,
    })
  })

  // Segunda pasada para calcular totalColumns correctamente para cada grupo
  const groups: EventWithColumn[][] = []
  let currentGroup: EventWithColumn[] = []
  let groupEndTime = 0

  eventsWithColumns.forEach(event => {
    const startTime = new Date(event.startTime).getTime()
    if (startTime >= groupEndTime && currentGroup.length > 0) {
      groups.push(currentGroup)
      currentGroup = []
    }
    currentGroup.push(event)
    const endTime = event.endTime
      ? new Date(event.endTime).getTime()
      : startTime + 30 * 60 * 1000
    groupEndTime = Math.max(groupEndTime, endTime)
  })
  if (currentGroup.length > 0) {
    groups.push(currentGroup)
  }

  // Actualizar totalColumns para cada grupo
  const result: EventWithColumn[] = []
  groups.forEach(group => {
    const maxColumn = Math.max(...group.map(e => e.column)) + 1
    group.forEach(event => {
      result.push({ ...event, totalColumns: maxColumn })
    })
  })

  return result
}

interface CalendarDayViewProps {
  date: Date;
  events: Event[];
  hourHeight?: number;
  onEventClick?: (event: Event) => void;
  onEventDoubleClick?: (event: Event) => void;
  onCalendarClick?: (clickEvent: React.MouseEvent, dayDate: Date) => void;
  className?: string;
  onDayNavigateBack?: () => void;
  onDayNavigateForward?: () => void;
}

export function CalendarDayView({
  date,
  events,
  hourHeight = 30,
  onEventClick,
  onEventDoubleClick,
  onCalendarClick,
  className = "",
  onDayNavigateBack,
  onDayNavigateForward,
}: CalendarDayViewProps) {
  
  return (
    <div className={`flex ${className}`} style={{ height: `${24 * hourHeight + 32}px` }}>
      {/* Eje de tiempo */}
      <TimeAxis hourHeight={hourHeight} />
      
      {/* Área de eventos */}
      <div className="flex-1 relative">
        {/* Header del día */}
        <div className="h-8 bg-white border-b border-gray-200 flex items-center justify-center relative">
          {/* Flecha izquierda */}
          {onDayNavigateBack && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDayNavigateBack()
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100 transition-colors"
              aria-label="Día anterior"
            >
              <ChevronLeft className="w-4 h-4 text-gray-500 hover:text-gray-700" />
            </button>
          )}
          
          {/* Contenido del día */}
          <span className="font-medium text-sm">{format(date, "d")}</span>
          
          {/* Flecha derecha */}
          {onDayNavigateForward && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDayNavigateForward()
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100 transition-colors"
              aria-label="Día siguiente"
            >
              <ChevronRight className="w-4 h-4 text-gray-500 hover:text-gray-700" />
            </button>
          )}
        </div>
        
        {/* Container de eventos - overflow-hidden evita que eventos se salgan */}
        <div
          className="relative overflow-hidden cursor-pointer"
          style={{ height: `${24 * hourHeight}px` }}
          onClick={(e) => onCalendarClick?.(e, date)}
        >
          {/* Fondo con colores */}
          <BackgroundAreas />
          
          {/* Líneas de grid */}
          <GridLines hourHeight={hourHeight} />
          
          {/* Eventos procesados - Sesiones SIEMPRE 100% ancho, otros eventos con columnas */}
          {(() => {
            const { sessions, otherEvents } = processSleepSessions(events as SleepEvent[], date)

            // Solo otros eventos pasan por calculateEventColumns (no sesiones)
            const eventsWithColumns = calculateEventColumns(otherEvents as Event[])

            return (
              <>
                {/* Sesiones de sleep PRIMERO (fondo) - SIEMPRE 100% ancho */}
                {sessions.map((session, idx) => (
                  <SleepSessionBlock
                    key={`session-${idx}`}
                    startTime={session.startTime}
                    endTime={session.endTime}
                    originalStartTime={session.originalStartTime}
                    originalEndTime={session.originalEndTime}
                    nightWakings={session.nightWakings}
                    hourHeight={hourHeight}
                    onClick={() => onEventClick?.(session.originalEvent as Event)}
                    onDoubleClick={() => onEventDoubleClick?.(session.originalEvent as Event)}
                    onNightWakingClick={(waking) => onEventClick?.(waking as Event)}
                    onNightWakingDoubleClick={(waking) => onEventDoubleClick?.(waking as Event)}
                    isContinuationFromPrevious={session.isContinuationFromPrevious}
                    continuesNextDay={session.continuesNextDay}
                    column={0}
                    totalColumns={1}
                  />
                ))}

                {/* EventGlobes con sistema de columnas */}
                {eventsWithColumns.map((event) => (
                  <EventGlobe
                    key={event._id}
                    event={event}
                    hourHeight={hourHeight}
                    onClick={onEventClick}
                    onDoubleClick={onEventDoubleClick}
                    column={event.column}
                    totalColumns={event.totalColumns}
                  />
                ))}
              </>
            )
          })()}
          
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