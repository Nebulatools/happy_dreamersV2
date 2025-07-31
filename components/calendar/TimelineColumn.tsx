// Componente de columna de timeline vertical para vista semanal del calendario
// Muestra horas de 00:00 a 23:00 con líneas de separación

"use client"

import React from 'react'
import { cn } from '@/lib/utils'

interface TimelineColumnProps {
  className?: string
  hourHeight?: number // Altura en píxeles por hora
}

export function TimelineColumn({ 
  className,
  hourHeight = 25 // Altura optimizada para vista completa sin scroll
}: TimelineColumnProps) {
  // Generar array de 24 horas
  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className={cn("flex flex-col border-r border-gray-200 bg-gray-50", className)}>
      {/* Header vacío para alinear con los días */}
      <div className="h-12 border-b border-gray-200 bg-white" />
      
      {/* Timeline de horas */}
      <div className="flex-1 relative">
        {hours.map((hour) => (
          <div
            key={hour}
            className="relative text-center"
            style={{ height: `${hourHeight}px` }}
          >
            {/* Mostrar solo etiquetas de horas principales (cada 3 horas) */}
            {hour % 3 === 0 && (
              <div className="absolute -top-2 left-0 right-0 z-10">
                <span className="inline-block bg-gray-50 px-1 text-xs font-medium text-gray-700 rounded">
                  {hour.toString().padStart(2, '0')}:00
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Componente compacto para móviles/tablets
export function CompactTimelineColumn({ 
  className,
  hourHeight = 25 
}: TimelineColumnProps) {
  // Solo mostrar horas principales (cada 4 horas)
  const mainHours = [0, 4, 8, 12, 16, 20]

  return (
    <div className={cn("flex flex-col border-r border-gray-200 bg-gray-50", className)}>
      {/* Header vacío */}
      <div className="h-12 border-b border-gray-200 bg-white" />
      
      {/* Timeline simplificado */}
      <div className="flex-1 relative" style={{ height: `${24 * hourHeight}px` }}>
        {mainHours.map((hour) => (
          <div
            key={hour}
            className="absolute left-0 right-0 text-center"
            style={{ top: `${hour * hourHeight}px` }}
          >
            {/* Línea principal */}
            <div className="absolute left-0 right-0 top-0 border-t border-gray-300" />
            
            {/* Etiqueta de hora */}
            <div className="inline-block bg-gray-50 px-1 text-xs font-medium text-gray-600 rounded">
              {hour.toString().padStart(2, '0')}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}