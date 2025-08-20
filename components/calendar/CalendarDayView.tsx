// 🔍 Vista Diaria - Un solo día con eventos
"use client"

import React from 'react'
import { format } from 'date-fns'
import { Cloud } from 'lucide-react'
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

interface CalendarDayViewProps {
  date: Date;
  events: Event[];
  hourHeight?: number;
  onEventClick?: (event: Event) => void;
  onCalendarClick?: (clickEvent: React.MouseEvent, dayDate: Date) => void;
  className?: string;
}

export function CalendarDayView({
  date,
  events,
  hourHeight = 30,
  onEventClick,
  onCalendarClick,
  className = ""
}: CalendarDayViewProps) {
  
  return (
    <div className={`flex ${className}`} style={{ height: `${24 * hourHeight + 32}px` }}>
      {/* Eje de tiempo */}
      <TimeAxis hourHeight={hourHeight} />
      
      {/* Área de eventos */}
      <div className="flex-1 relative">
        {/* Header del día */}
        <div className="h-8 bg-white border-b border-gray-200 flex items-center justify-center">
          <span className="font-medium text-sm">{format(date, "d")}</span>
        </div>
        
        {/* Container de eventos */}
        <div 
          className="relative overflow-hidden cursor-pointer"
          style={{ height: `${24 * hourHeight}px` }}
          onClick={(e) => onCalendarClick?.(e, date)}
        >
          {/* Fondo con colores */}
          <BackgroundAreas />
          
          {/* Líneas de grid */}
          <GridLines hourHeight={hourHeight} />
          
          {/* Eventos procesados - Sesiones de sueño y otros eventos */}
          {(() => {
            const { sessions, otherEvents } = processSleepSessions(events as SleepEvent[], date)
            
            return (
              <>
                {/* Renderizar sesiones de sueño primero (z-index más bajo) */}
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