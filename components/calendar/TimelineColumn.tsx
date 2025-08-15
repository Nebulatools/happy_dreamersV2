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
  // NUEVO: Crear eje basado en posiciones REALES de globos
  // Los globos usan: totalMinutes * (hourHeight / 60)
  // Vamos a crear etiquetas donde los globos REALMENTE aparecen
  
  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className={cn("flex flex-col border-r border-gray-200 bg-gray-50", hourInterval === 1 ? "w-20" : "w-16", className)}>
      {/* Header vacío para alinear con los días */}
      <div className="h-12 border-b border-gray-200 bg-white" />
      
      {/* Timeline de horas - ALINEADO CON GLOBOS */}
      <div className="flex-1 relative">
        {hours.map((hour) => {
          // CALCULAR POSICIÓN REAL donde aparecen los globos para esta hora
          const globePosition = (hour * 60) * (hourHeight / 60) // Misma fórmula que EventBlock
          
          return (
            <div
              key={hour}
              className="absolute w-full flex justify-end pr-2"
              style={{ 
                top: `${globePosition}px`, // USAR MISMA POSICIÓN QUE GLOBOS
                height: `${hourHeight}px`
              }}
            >
              {/* Mostrar etiquetas según el intervalo especificado */}
              {hour % hourInterval === 0 && (
                <span 
                  className={cn(
                    "text-xs",
                    // Alinear texto exactamente donde están los globos
                    "relative",
                    // Horas principales en negrita
                    hour % 6 === 0 
                      ? "font-bold text-gray-800 text-sm" 
                      : "font-normal text-gray-500",
                    // Color según el área de fondo
                    hour >= 0 && hour < 6 ? "text-blue-700" :  // Área azul nocturna
                    hour >= 6 && hour < 19 ? "text-amber-700" : // Área amarilla diurna  
                    "text-blue-700" // Área azul nocturna
                  )}
                  style={{ 
                    // NO centrar - alinear exactamente con donde están los globos
                    top: "0px",
                    display: "inline-block"
                  }}
                >
                  {hour.toString().padStart(2, '0')}:00
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Componente compacto para móviles/tablets - ALINEADO CON GLOBOS
export function CompactTimelineColumn({ 
  className,
  hourHeight = 25 
}: TimelineColumnProps) {
  // Solo mostrar horas principales (cada 4 horas) pero alineadas con globos
  const mainHours = [0, 4, 8, 12, 16, 20]

  return (
    <div className={cn("flex flex-col border-r border-gray-200 bg-gray-50", className)}>
      {/* Header vacío */}
      <div className="h-12 border-b border-gray-200 bg-white" />
      
      {/* Timeline simplificado - ALINEADO CON POSICIONES DE GLOBOS */}
      <div className="flex-1 relative" style={{ height: `${24 * hourHeight}px` }}>
        {mainHours.map((hour) => {
          // USAR MISMA POSICIÓN QUE LOS GLOBOS
          const globePosition = (hour * 60) * (hourHeight / 60)
          
          return (
            <div
              key={hour}
              className="absolute left-0 right-0 text-center"
              style={{ top: `${globePosition}px` }}
            >
              {/* Línea principal alineada con globos */}
              <div className="absolute left-0 right-0 top-0 border-t border-gray-300" />
              
              {/* Etiqueta de hora con color según área */}
              <div className={cn(
                "inline-block bg-gray-50 px-1 text-xs font-medium rounded",
                // Color según el área de fondo
                hour >= 0 && hour < 6 ? "text-blue-700" :  // Área azul nocturna
                hour >= 6 && hour < 19 ? "text-amber-700" : // Área amarilla diurna  
                "text-blue-700" // Área azul nocturna
              )}>
                {hour.toString().padStart(2, '0')}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}