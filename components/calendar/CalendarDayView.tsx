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
import { calculateEventColumns } from "@/lib/utils/calculate-event-columns"

interface Event {
  _id: string;
  childId: string;
  eventType: string;
  emotionalState: string;
  startTime: string;
  endTime?: string;
  notes?: string;
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
                    overlayEvents={session.overlayEvents}
                    hourHeight={hourHeight}
                    onClick={() => onEventClick?.(session.originalEvent as Event)}
                    onDoubleClick={() => onEventDoubleClick?.(session.originalEvent as Event)}
                    onNightWakingClick={(waking) => onEventClick?.(waking as Event)}
                    onNightWakingDoubleClick={(waking) => onEventDoubleClick?.(waking as Event)}
                    onOverlayEventClick={(overlay) => onEventClick?.(overlay as Event)}
                    onOverlayEventDoubleClick={(overlay) => onEventDoubleClick?.(overlay as Event)}
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