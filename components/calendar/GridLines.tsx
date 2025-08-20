// 📏 Componente de líneas de grid - Cada hora con énfasis cada 3h
"use client"

import React from 'react'

interface GridLinesProps {
  hourHeight?: number;
}

export const GridLines = React.memo(({ hourHeight = 30 }: GridLinesProps) => {
  const HOURS = Array.from({ length: 24 }, (_, i) => i)
  
  return (
    <>
      {HOURS.map((hour) => (
        <div
          key={hour}
          className={`absolute left-0 right-0 border-t ${
            hour % 3 === 0 ? 'border-gray-300' : 'border-gray-200'
          }`}
          style={{ top: `${hour * hourHeight}px` }}
        />
      ))}
    </>
  )
})

GridLines.displayName = 'GridLines'