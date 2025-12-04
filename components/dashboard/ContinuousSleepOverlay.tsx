"use client"

// Componente contenedor que renderiza todas las barras de degradado de eventos continuos
// Posicionado como overlay absoluto sobre el grid de tarjetas del dashboard

import React from "react"
import { ContinuousSleepBridge } from "./ContinuousSleepBridge"
import type { ContinuousSleepEvent } from "@/lib/utils/continuous-sleep-detector"
import { format } from "date-fns"

interface ContinuousSleepOverlayProps {
  continuousEvents: ContinuousSleepEvent[]
  visibleDays: Date[] // Días visibles en el grid actual
}

export function ContinuousSleepOverlay({
  continuousEvents,
  visibleDays
}: ContinuousSleepOverlayProps) {
  if (!continuousEvents || continuousEvents.length === 0) {
    return null
  }

  // Agrupar eventos por semana para posicionamiento correcto
  const eventsByWeek = continuousEvents.map(event => {
    const startDayIndex = visibleDays.findIndex(day =>
      format(day, 'yyyy-MM-dd') === event.startDate
    )

    if (startDayIndex === -1) return null

    const weekIndex = Math.floor(startDayIndex / 7)
    return { event, weekIndex }
  }).filter(Boolean) as Array<{ event: ContinuousSleepEvent; weekIndex: number }>

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Grid contenedor para alinear con las tarjetas */}
      <div className="space-y-2">
        {/* Renderizar semanas */}
        {Array.from({ length: Math.ceil(visibleDays.length / 7) }).map((_, weekIdx) => (
          <div
            key={weekIdx}
            className="grid grid-cols-7 gap-2 relative"
            style={{ minHeight: '130px' }} // Misma altura que las tarjetas
          >
            {/* Renderizar bridges para esta semana */}
            {eventsByWeek
              .filter(item => item.weekIndex === weekIdx)
              .map(({ event }) => (
                <ContinuousSleepBridge
                  key={event.id}
                  event={event}
                  visibleDays={visibleDays}
                  weekIndex={weekIdx}
                />
              ))}
          </div>
        ))}
      </div>
    </div>
  )
}
