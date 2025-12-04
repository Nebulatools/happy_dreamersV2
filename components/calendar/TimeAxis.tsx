// ⏰ Componente del eje de tiempo - Optimizado y memoizado
"use client"

import React from "react"

interface TimeAxisProps {
  hourHeight?: number;
  className?: string;
}

export const TimeAxis = React.memo(({ 
  hourHeight = 30, 
  className = "", 
}: TimeAxisProps) => {
  const HOURS = Array.from({ length: 24 }, (_, i) => i)
  
  return (
    <div className={`w-12 bg-gray-50 border-r border-gray-200 flex-shrink-0 ${className}`}>
      {/* Header vacío para alineación */}
      <div className="h-8 border-b border-gray-200 bg-white" />
      
      {/* Timeline - mostrar horas cada 2 horas para no saturar */}
      <div className="relative" style={{ height: `${24 * hourHeight}px` }}>
        {HOURS.filter(hour => hour % 2 === 0).map((hour) => (
          <div
            key={hour}
            className="absolute right-1 text-xs font-medium text-gray-600"
            style={{ 
              top: `${hour * hourHeight}px`,
              transform: "translateY(-50%)",
            }}
          >
            {hour.toString().padStart(2, "0")}:00
          </div>
        ))}
      </div>
    </div>
  )
})

TimeAxis.displayName = "TimeAxis"