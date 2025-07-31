// Componente de columna de timeline vertical para vista semanal del calendario
// Muestra horas de 00:00 a 23:00 con líneas de separación

"use client"

import React from 'react'
import { cn } from '@/lib/utils'

interface TimelineColumnProps {
  className?: string
  hourHeight?: number // Altura en píxeles por hora
  hourInterval?: number // Intervalo de horas a mostrar (1 = todas, 3 = cada 3 horas, etc.)
}

export function TimelineColumn({ 
  className,
  hourHeight = 25, // Altura optimizada para vista completa sin scroll
  hourInterval = 3 // Por defecto muestra cada 3 horas
}: TimelineColumnProps) {
  // Generar array de 24 horas
  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className={cn("flex flex-col border-r border-gray-200 bg-gray-50", hourInterval === 1 ? "w-20" : "w-16", className)}>
      {/* Header vacío para alinear con los días */}
      <div className="h-12 border-b border-gray-200 bg-white" />
      
      {/* Timeline de horas */}
      <div className="flex-1 relative">
        {hours.map((hour) => (
          <div
            key={hour}
            className="relative flex items-center justify-end pr-2"
            style={{ height: `${hourHeight}px` }}
          >
            {/* Mostrar etiquetas según el intervalo especificado */}
            {hour % hourInterval === 0 && (
              <span 
                className={cn(
                  "text-xs",
                  // Horas principales (0, 6, 12, 18) en negrita y más grandes
                  hour % 6 === 0 
                    ? "font-bold text-gray-800 text-sm" 
                    : "font-normal text-gray-500"
                )}
              >
                {hour.toString().padStart(2, '0')}:00
              </span>
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