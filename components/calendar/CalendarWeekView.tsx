// 📅 Vista Semanal - 7 días con eventos
"use client"

import React from "react"
import { format, addDays, isToday, startOfDay, endOfDay } from "date-fns"
import { es } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
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

interface CalendarWeekViewProps {
  date: Date;
  events: Event[];
  hourHeight?: number;
  onEventClick?: (event: Event) => void;
  onCalendarClick?: (clickEvent: React.MouseEvent, dayDate: Date) => void;
  className?: string;
  onDayNavigateBack?: () => void;
  onDayNavigateForward?: () => void;
}

export function CalendarWeekView({
  date,
  events,
  hourHeight = 30,
  onEventClick,
  onCalendarClick,
  className = "",
  onDayNavigateBack,
  onDayNavigateForward,
}: CalendarWeekViewProps) {
  // CAMBIO: En lugar de mostrar la semana completa, mostrar 7 días consecutivos
  // centrando la fecha seleccionada en el medio (posición 3, índice 2)
  const centerDate = date
  const days = Array.from({ length: 7 }, (_, i) => addDays(centerDate, i - 3))
  
  // Generar nombres de días dinámicamente basados en los días reales
  const weekDays = days.map(day => {
    const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
    return dayNames[day.getDay()]
  })
  
  // Obtener eventos que afectan un día específico (incluye eventos que cruzan días)
  const getEventsForDay = (day: Date) => {
    const dayStart = startOfDay(day)
    const dayEnd = endOfDay(day)

    const dayEvents = events.filter(event => {
      if (!event.startTime || event.startTime === "") return false

      try {
        const eventStart = new Date(event.startTime)
        const eventEnd = event.endTime ? new Date(event.endTime) : eventStart

        // Incluir evento si:
        // 1. Empieza en este día
        // 2. Termina en este día
        // 3. Cruza este día (empieza antes y termina después)
        // 4. Es una sesión de sueño en progreso que empezó antes de este día
        const startsThisDay = eventStart >= dayStart && eventStart <= dayEnd
        const endsThisDay = eventEnd >= dayStart && eventEnd <= dayEnd
        const crossesThisDay = eventStart < dayStart && eventEnd > dayEnd
        const sleepInProgress = event.eventType === "sleep" && !event.endTime && eventStart < dayEnd

        return startsThisDay || endsThisDay || crossesThisDay || sleepInProgress
      } catch (error) {
        return false
      }
    })

    return dayEvents.sort((a, b) => {
      const timeA = new Date(a.startTime).getTime()
      const timeB = new Date(b.startTime).getTime()
      return timeA - timeB
    })
  }
  
  return (
    <div className={`flex ${className}`} style={{ height: `${24 * hourHeight + 32}px` }}>
      {/* Eje de tiempo */}
      <TimeAxis hourHeight={hourHeight} />
      
      {/* Días de la semana */}
      <div className="flex-1 flex">
        {days.map((day, index) => {
          const dayName = weekDays[index]
          const dayEvents = getEventsForDay(day)
          const isDayToday = isToday(day)
          
          return (
            <div key={day.toString()} className="flex-1 relative">
              {/* Header del día - compacto en una línea */}
              <div
                className={cn(
                  "h-8 bg-white border-b border-gray-200 flex items-center justify-center text-xs font-medium relative",
                  isDayToday && "bg-blue-50 text-blue-600"
                )}
              >
                {/* Flecha izquierda - solo en el primer día (domingo) */}
                {index === 0 && onDayNavigateBack && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDayNavigateBack()
                    }}
                    className="absolute left-0.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-100 transition-colors"
                    aria-label="Día anterior"
                  >
                    <ChevronLeft className="w-3 h-3 text-gray-500 hover:text-gray-700" />
                  </button>
                )}

                {/* Contenido del día - una sola línea */}
                <span>{dayName} {format(day, "d")}</span>

                {/* Flecha derecha - solo en el último día (sábado) */}
                {index === 6 && onDayNavigateForward && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDayNavigateForward()
                    }}
                    className="absolute right-0.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-100 transition-colors"
                    aria-label="Día siguiente"
                  >
                    <ChevronRight className="w-3 h-3 text-gray-500 hover:text-gray-700" />
                  </button>
                )}
              </div>
              
              {/* Container de eventos */}
              <div
                className={cn(
                  "relative border-r border-gray-200 cursor-pointer overflow-hidden"
                )}
                style={{ height: `${24 * hourHeight}px` }}
                onClick={(e) => onCalendarClick?.(e, day)}
              >
                {/* Fondo con colores */}
                <BackgroundAreas />
                
                {/* Líneas de grid */}
                <GridLines hourHeight={hourHeight} />
                
                {/* Eventos procesados - Sesiones SIEMPRE 100% ancho, otros eventos con columnas */}
                {(() => {
                  const { sessions, otherEvents } = processSleepSessions(dayEvents as SleepEvent[], day)

                  // Solo otros eventos pasan por calculateEventColumns (no sesiones)
                  const eventsWithColumns = calculateEventColumns(otherEvents as Event[])

                  return (
                    <>
                      {/* Sesiones de sleep PRIMERO (fondo) - SIEMPRE 100% ancho */}
                      {sessions.map((session, idx) => (
                        <SleepSessionBlock
                          key={`session-${day.toString()}-${idx}`}
                          startTime={session.startTime}
                          endTime={session.endTime}
                          originalStartTime={session.originalStartTime}
                          originalEndTime={session.originalEndTime}
                          nightWakings={session.nightWakings}
                          overlayEvents={session.overlayEvents}
                          hourHeight={hourHeight}
                          onClick={() => onEventClick?.(session.originalEvent as Event)}
                          onNightWakingClick={(waking) => onEventClick?.(waking as Event)}
                          onOverlayEventClick={(overlay) => onEventClick?.(overlay as Event)}
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
                          column={event.column}
                          totalColumns={event.totalColumns}
                        />
                      ))}
                    </>
                  )
                })()}
                
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
