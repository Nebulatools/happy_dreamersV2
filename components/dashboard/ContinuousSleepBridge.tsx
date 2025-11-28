"use client"

// Componente que renderiza una barra de degradado visual conectando eventos de sueño multi-día
// Usado en el dashboard de usuario para mostrar eventos continuos que cruzan medianoche

import React from "react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import type { ContinuousSleepEvent } from "@/lib/utils/continuous-sleep-detector"
import { formatMinutesAsHours } from "@/lib/utils/continuous-sleep-detector"

interface ContinuousSleepBridgeProps {
  event: ContinuousSleepEvent
  visibleDays: Date[] // Días visibles en el grid
  weekIndex?: number  // Índice de la semana en el grid (para posicionamiento vertical)
}

export function ContinuousSleepBridge({
  event,
  visibleDays,
  weekIndex = 0
}: ContinuousSleepBridgeProps) {
  // Encontrar índice del día de inicio en el grid visible
  const startDayIndex = visibleDays.findIndex(day =>
    format(day, 'yyyy-MM-dd') === event.startDate
  )

  // Si el evento no está visible, no renderizar
  if (startDayIndex === -1) {
    return null
  }

  // Calcular posición en el grid (CSS Grid 1-indexed)
  const gridColumnStart = (startDayIndex % 7) + 1
  const gridColumnSpan = Math.min(event.spansDays, 7 - (startDayIndex % 7))
  const gridColumnEnd = gridColumnStart + gridColumnSpan

  // Formatear duración para mostrar
  const durationText = formatMinutesAsHours(event.totalMinutes)

  return (
    <div
      className={cn(
        "h-8 rounded-lg border border-white/30 backdrop-blur-sm",
        "flex items-center justify-between px-3",
        "transition-all duration-200",
        "hover:opacity-100 z-10",
        "cursor-pointer group pointer-events-auto"
      )}
      style={{
        gridColumn: `${gridColumnStart} / ${gridColumnEnd}`,
        gridRow: 1,
        marginTop: '65px', // Posicionado SOBRE la sección de dormir
        background: 'linear-gradient(to right, rgba(59, 130, 246, 0.25), rgba(139, 92, 246, 0.22), rgba(251, 191, 36, 0.18))',
        opacity: 0.95
      }}
      title={`${event.startTime} - ${event.endTime} (${durationText})${event.nightWakings > 0 ? `\n${event.nightWakings} despertar${event.nightWakings > 1 ? 'es' : ''}` : ''}`}
    >
      {/* Sección Izquierda - Hora de inicio */}
      <span className="text-xs font-semibold text-gray-700">
        {event.startTime}
      </span>

      {/* Sección Centro - Duración total */}
      <div className="flex items-center gap-1">
        <span className="text-xs">🌙</span>
        <span className="text-xs font-bold text-gray-800">
          {durationText}
        </span>
      </div>

      {/* Sección Derecha - Hora de fin */}
      <span className="text-xs font-semibold text-gray-700">
        {event.endTime}
      </span>

      {/* Tooltip con detalles al hacer hover */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
          <div className="font-medium">{durationText} de sueño</div>
          <div className="text-gray-300">{event.startTime} - {event.endTime}</div>
          {event.nightWakings > 0 && (
            <div className="text-gray-300 mt-1">
              {event.nightWakings} despertar{event.nightWakings > 1 ? 'es' : ''} nocturno{event.nightWakings > 1 ? 's' : ''}
            </div>
          )}
          {/* Flecha del tooltip */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      </div>
    </div>
  )
}
