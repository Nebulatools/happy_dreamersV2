// 📅 Vista Semanal - 7 días con eventos
"use client"

import React from 'react'
import { format, addDays, startOfWeek, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { TimeAxis } from './TimeAxis'
import { BackgroundAreas } from './BackgroundAreas' 
import { GridLines } from './GridLines'
import { EventGlobe } from './EventGlobe'
import { SleepSessionBlock } from './SleepSessionBlock'
import { processSleepSessions, type Event as SleepEvent } from '@/lib/utils/sleep-sessions'

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
}

export function CalendarWeekView({
  date,
  events,
  hourHeight = 30,
  onEventClick,
  onCalendarClick,
  className = ""
}: CalendarWeekViewProps) {
  
  const weekStart = startOfWeek(date, { weekStartsOn: 0 }) // Domingo
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
  
  // Obtener eventos de un día específico
  const getEventsForDay = (day: Date) => {
    const dayStr = format(day, "yyyy-MM-dd")
    
    const dayEvents = events.filter(event => {
      if (!event.startTime || event.startTime === '') return false
      
      try {
        // Método más robusto: parsear la fecha del evento y comparar solo el día
        const eventDate = new Date(event.startTime)
        const eventDateStr = format(eventDate, "yyyy-MM-dd")
        return eventDateStr === dayStr
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
          const dayName = weekDays[day.getDay()]
          const dayEvents = getEventsForDay(day)
          const isDayToday = isToday(day)
          
          return (
            <div key={day.toString()} className="flex-1 relative">
              {/* Header del día */}
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
                style={{ height: `${24 * hourHeight}px` }}
                onClick={(e) => onCalendarClick?.(e, day)}
              >
                {/* Fondo con colores */}
                <BackgroundAreas />
                
                {/* Líneas de grid */}
                <GridLines hourHeight={hourHeight} />
                
                {/* Eventos procesados - Sesiones de sueño y otros eventos */}
                {(() => {
                  const { sessions, otherEvents } = processSleepSessions(dayEvents as SleepEvent[], day)
                  
                  return (
                    <>
                      {/* Renderizar sesiones de sueño primero (z-index más bajo) */}
                      {sessions.map((session, idx) => (
                        <SleepSessionBlock
                          key={`session-${day.toString()}-${idx}`}
                          startTime={session.startTime}
                          endTime={session.endTime}
                          originalStartTime={session.originalStartTime}
                          originalEndTime={session.originalEndTime}
                          nightWakings={session.nightWakings}
                          hourHeight={hourHeight}
                          onClick={() => onEventClick?.(session.originalEvent as Event)}
                          onNightWakingClick={(waking) => onEventClick?.(waking as Event)}
                          isContinuationFromPrevious={session.isContinuationFromPrevious}
                          continuesNextDay={session.continuesNextDay}
                        />
                      ))}
                      
                      {/* Renderizar otros eventos encima */}
                      {otherEvents.map((event) => (
                        <EventGlobe 
                          key={event._id} 
                          event={event as Event} 
                          hourHeight={hourHeight}
                          onClick={onEventClick} 
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