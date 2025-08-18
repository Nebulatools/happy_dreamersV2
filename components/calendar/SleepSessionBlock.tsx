// Componente para mostrar sesiones de sueño completas con gradiente
// Muestra estado en progreso (fade) o completado (gradiente)

"use client"

import React from 'react'
import { Moon, Sun, AlertCircle } from "lucide-react"
import { format, differenceInMinutes, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'

interface Event {
  _id: string
  childId: string
  eventType: string
  emotionalState: string
  startTime: string
  endTime?: string
  notes?: string
  duration?: number
}

interface SleepSessionBlockProps {
  startTime: string
  endTime?: string
  originalStartTime?: string  // Tiempo original del evento completo
  originalEndTime?: string    // Tiempo original del evento completo
  nightWakings: Event[]
  hourHeight: number
  className?: string
  onClick?: () => void
  isContinuationFromPrevious?: boolean  // Si es continuación del día anterior
  continuesNextDay?: boolean           // Si continúa al día siguiente
}

export function SleepSessionBlock({ 
  startTime, 
  endTime,
  originalStartTime,
  originalEndTime,
  nightWakings,
  hourHeight,
  className,
  onClick,
  isContinuationFromPrevious = false,
  continuesNextDay = false
}: SleepSessionBlockProps) {
  
  // Calcular posición vertical según la hora de inicio
  const calculateStartPosition = () => {
    // Si es continuación del día anterior, empieza desde el top
    if (isContinuationFromPrevious) {
      return 0
    }
    
    const timeMatch = startTime.match(/T(\d{2}):(\d{2})/)
    if (timeMatch) {
      const hours = parseInt(timeMatch[1], 10)
      const minutes = parseInt(timeMatch[2], 10)
      const totalMinutes = hours * 60 + minutes
      const pixelsPerMinute = hourHeight / 60
      return Math.round(totalMinutes * pixelsPerMinute)
    }
    return 0
  }
  
  // Calcular altura del bloque
  const calculateBlockHeight = () => {
    // Si continúa al día siguiente, extender hasta el final del día
    if (continuesNextDay) {
      // Calcular desde el inicio hasta las 24:00
      const startHour = isContinuationFromPrevious ? 0 : parseInt(startTime.match(/T(\d{2}):/)?.[1] || '0')
      const startMinute = isContinuationFromPrevious ? 0 : parseInt(startTime.match(/T(\d{2}):(\d{2})/)?.[2] || '0')
      const minutesUntilMidnight = (24 * 60) - (startHour * 60 + startMinute)
      const pixelsPerMinute = hourHeight / 60
      return Math.max(20, minutesUntilMidnight * pixelsPerMinute)
    }
    
    if (!endTime) {
      // Sueño en progreso: altura fija con fade
      // Mostrar hasta el final del día actual o una altura por defecto
      const remainingHours = 24 - parseInt(startTime.match(/T(\d{2}):/)?.[1] || '0')
      return Math.min(remainingHours * hourHeight, 300) // Máximo 300px para el fade
    }
    
    // Sueño completado: calcular duración real
    try {
      const start = parseISO(startTime)
      const end = parseISO(endTime)
      const durationMinutes = differenceInMinutes(end, start)
      const pixelsPerMinute = hourHeight / 60
      return Math.max(20, durationMinutes * pixelsPerMinute) // Mínimo 20px
    } catch {
      return 100 // Altura por defecto si hay error
    }
  }
  
  // Formatear hora para mostrar
  const formatTime = (timeString: string) => {
    try {
      const date = parseISO(timeString)
      return format(date, 'HH:mm')
    } catch {
      return '--:--'
    }
  }
  
  const position = calculateStartPosition()
  const height = calculateBlockHeight()
  const isInProgress = !endTime
  
  // Renderizar despertares nocturnos dentro de la sesión
  const renderNightWakings = () => {
    return nightWakings.map(waking => {
      const wakingTimeMatch = waking.startTime.match(/T(\d{2}):(\d{2})/)
      if (!wakingTimeMatch) return null
      
      const wakingHours = parseInt(wakingTimeMatch[1], 10)
      const wakingMinutes = parseInt(wakingTimeMatch[2], 10)
      const wakingTotalMinutes = wakingHours * 60 + wakingMinutes
      const wakingPosition = Math.round(wakingTotalMinutes * (hourHeight / 60))
      const relativePosition = wakingPosition - position
      
      if (relativePosition < 0 || relativePosition > height) return null
      
      return (
        <div
          key={waking._id}
          className="absolute left-2 right-2 bg-red-500/80 text-white rounded px-2 py-1 z-10"
          style={{ 
            top: `${relativePosition}px`,
            height: '20px'
          }}
        >
          <div className="flex items-center gap-1 text-xs">
            <AlertCircle className="w-3 h-3" />
            <span>{formatTime(waking.startTime)}</span>
          </div>
        </div>
      )
    })
  }
  
  if (isInProgress) {
    // SUEÑO EN PROGRESO - Con fade hacia abajo
    return (
      <div
        className={cn("absolute left-2 right-2 cursor-pointer", className)}
        style={{ top: `${position}px` }}
        onClick={onClick}
      >
        {/* Parte superior sólida */}
        <div 
          className="bg-blue-500/60 rounded-t-lg border border-blue-400/30 flex items-center justify-center"
          style={{ height: '24px' }}
        >
          <div className="flex items-center gap-1 text-white text-xs font-medium">
            <Moon className="w-3 h-3" />
            <span>{formatTime(startTime)}</span>
          </div>
        </div>
        
        {/* Fade hacia abajo indicando continuación */}
        <div 
          className="relative"
          style={{ 
            height: `${height - 24}px`,
            background: 'linear-gradient(to bottom, rgba(59, 130, 246, 0.5), rgba(59, 130, 246, 0.3), rgba(59, 130, 246, 0.1), transparent)',
            animation: 'pulse 3s ease-in-out infinite'
          }}
        >
          {/* Indicador visual de "continúa..." */}
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
            <div className="flex flex-col items-center gap-1">
              <div className="w-1 h-1 bg-blue-400/60 rounded-full animate-pulse" />
              <div className="w-1 h-1 bg-blue-400/40 rounded-full animate-pulse delay-75" />
              <div className="w-1 h-1 bg-blue-400/20 rounded-full animate-pulse delay-150" />
            </div>
          </div>
          
          {/* Despertares nocturnos si los hay */}
          {renderNightWakings()}
        </div>
      </div>
    )
  }
  
  // SUEÑO COMPLETADO - Con gradiente completo
  return (
    <div
      className={cn(
        "absolute left-2 right-2 cursor-pointer border border-white/10 backdrop-blur-sm",
        !isContinuationFromPrevious && !continuesNextDay && "rounded-lg",
        isContinuationFromPrevious && !continuesNextDay && "rounded-b-lg",
        !isContinuationFromPrevious && continuesNextDay && "rounded-t-lg",
        className
      )}
      style={{ 
        top: `${position}px`,
        height: `${height}px`,
        background: 'linear-gradient(to bottom, rgba(59, 130, 246, 0.3), rgba(139, 92, 246, 0.25), rgba(251, 191, 36, 0.2))'
      }}
      onClick={onClick}
    >
      {/* Indicador de continuación desde día anterior */}
      {isContinuationFromPrevious && (
        <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-blue-500/40 to-transparent flex items-center justify-center">
          <div className="text-xs text-blue-700 font-medium flex items-center gap-1">
            <span>↑</span>
            <span>Continúa desde ayer</span>
          </div>
        </div>
      )}
      
      {/* Indicador de inicio (solo si no es continuación) */}
      {!isContinuationFromPrevious && (
        <div className="absolute top-2 left-2 flex items-center gap-1">
          <Moon className="w-3 h-3 text-blue-600" />
          <span className="text-xs font-medium text-blue-700">
            {formatTime(originalStartTime || startTime)}
          </span>
        </div>
      )}
      
      {/* Indicador de fin (solo si no continúa al día siguiente) */}
      {!continuesNextDay && endTime && (
        <div className="absolute bottom-2 right-2 flex items-center gap-1">
          <Sun className="w-3 h-3 text-yellow-600" />
          <span className="text-xs font-medium text-yellow-700">
            {formatTime(originalEndTime || endTime)}
          </span>
        </div>
      )}
      
      {/* Indicador de continuación al día siguiente */}
      {continuesNextDay && (
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-yellow-500/40 to-transparent flex items-center justify-center">
          <div className="text-xs text-yellow-700 font-medium flex items-center gap-1">
            <span>Continúa mañana</span>
            <span>↓</span>
          </div>
        </div>
      )}
      
      {/* Despertares nocturnos */}
      {renderNightWakings()}
      
      {/* Duración total en el centro */}
      {height > 60 && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="bg-white/80 backdrop-blur-sm rounded-full px-3 py-1">
            <span className="text-xs font-medium text-gray-700">
              {(() => {
                try {
                  const start = parseISO(startTime)
                  const end = parseISO(endTime)
                  const minutes = differenceInMinutes(end, start)
                  const hours = Math.floor(minutes / 60)
                  const mins = minutes % 60
                  return `${hours}h ${mins}m`
                } catch {
                  return ''
                }
              })()}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// Agregar estilos de animación al archivo global CSS
const styles = `
@keyframes pulse {
  0%, 100% { 
    opacity: 1; 
  }
  50% { 
    opacity: 0.7; 
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.delay-75 {
  animation-delay: 75ms;
}

.delay-150 {
  animation-delay: 150ms;
}
`