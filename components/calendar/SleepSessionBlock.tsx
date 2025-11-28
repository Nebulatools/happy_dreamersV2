// Componente para mostrar sesiones de sueño completas con gradiente
// Muestra estado en progreso (fade) o completado (gradiente)

"use client"

import React from "react"
import { Moon, Sun, AlertCircle } from "lucide-react"
import { format, differenceInMinutes, parseISO } from "date-fns"
import { cn } from "@/lib/utils"

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
  onNightWakingClick?: (waking: Event) => void  // Handler para clicks en despertares nocturnos
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
  onNightWakingClick,
  isContinuationFromPrevious = false,
  continuesNextDay = false,
}: SleepSessionBlockProps) {
  
  // Calcular posición vertical según la hora de inicio
  const calculateStartPosition = () => {
    // Para continuaciones del día anterior, empezar desde medianoche (00:00)
    if (isContinuationFromPrevious) {
      return 0 // Empezar desde el principio del día (medianoche)
    }
    
    try {
      // Usar parseISO para convertir correctamente a hora local
      const date = parseISO(startTime)
      const hours = date.getHours()
      const minutes = date.getMinutes()
      const totalMinutes = hours * 60 + minutes
      const pixelsPerMinute = hourHeight / 60
      return Math.round(totalMinutes * pixelsPerMinute)
    } catch (error) {
      console.error("Error parsing startTime in calculateStartPosition:", error)
      return 0
    }
  }
  
  // Calcular altura del bloque
  const calculateBlockHeight = () => {
    const marginBottom = 4 // Margen para que no se salga del borde

    // Si continúa al día siguiente, extender hasta el final del día
    if (continuesNextDay) {
      try {
        const useStartTime = isContinuationFromPrevious && originalStartTime ? originalStartTime : startTime
        const startDate = parseISO(useStartTime)
        const startHour = startDate.getHours()
        const startMinute = startDate.getMinutes()
        const minutesUntilMidnight = (24 * 60) - (startHour * 60 + startMinute)
        const pixelsPerMinute = hourHeight / 60
        return Math.max(20, minutesUntilMidnight * pixelsPerMinute - marginBottom)
      } catch (error) {
        console.error("Error calculating height for continuesNextDay:", error)
        return 20
      }
    }
    
    if (!endTime) {
      // Sueño en progreso: calcular hasta medianoche solamente
      try {
        const useStartTime = isContinuationFromPrevious && originalStartTime ? originalStartTime : startTime
        const startDate = parseISO(useStartTime)
        const startHour = startDate.getHours()
        const startMinute = startDate.getMinutes()
        const minutesUntilMidnight = (24 * 60) - (startHour * 60 + startMinute)
        const pixelsPerMinute = hourHeight / 60
        // Altura máxima: hasta medianoche con margen
        return Math.min(minutesUntilMidnight * pixelsPerMinute - marginBottom, 300)
      } catch (error) {
        console.error("Error calculating height for in progress sleep:", error)
        return 100
      }
    }
    
    // Sueño completado: calcular duración real usando tiempos originales si disponible
    try {
      const useStartTime = isContinuationFromPrevious && originalStartTime ? originalStartTime : startTime
      const useEndTime = continuesNextDay && originalEndTime ? originalEndTime : endTime

      const start = parseISO(useStartTime)
      const end = parseISO(useEndTime)
      const durationMinutes = differenceInMinutes(end, start)
      const pixelsPerMinute = hourHeight / 60

      // Para eventos que cruzan días, ajustar la altura a solo la parte visible del día
      if (isContinuationFromPrevious || continuesNextDay) {
        const dayStart = isContinuationFromPrevious ? 0 : start.getHours() * 60 + start.getMinutes()
        // Si continúa al día siguiente, cortar exactamente a medianoche (00:00)
        const dayEnd = continuesNextDay ? 24 * 60 : end.getHours() * 60 + end.getMinutes()
        const visibleMinutes = dayEnd - dayStart
        // Aplicar margen si continua al dia siguiente
        const margin = continuesNextDay ? marginBottom : 0
        return Math.max(20, visibleMinutes * pixelsPerMinute - margin)
      }

      return Math.max(20, durationMinutes * pixelsPerMinute) // Mínimo 20px
    } catch {
      return 100 // Altura por defecto si hay error
    }
  }
  
  // Formatear hora para mostrar
  const formatTime = (timeString: string) => {
    try {
      const date = parseISO(timeString)
      return format(date, "HH:mm")
    } catch {
      return "--:--"
    }
  }
  
  const position = calculateStartPosition()
  const height = calculateBlockHeight()
  const isInProgress = !endTime
  
  // Renderizar despertares nocturnos dentro de la sesión
  const renderNightWakings = () => {
    return nightWakings.map(waking => {
      try {
        // Usar parseISO para convertir correctamente a hora local
        const wakingDate = parseISO(waking.startTime)
        const wakingHours = wakingDate.getHours()
        const wakingMinutes = wakingDate.getMinutes()
        const wakingTotalMinutes = wakingHours * 60 + wakingMinutes
        const wakingPosition = Math.round(wakingTotalMinutes * (hourHeight / 60))
        const relativePosition = wakingPosition - position
        
        if (relativePosition < 0 || relativePosition > height) return null
        
        return (
          <div
            key={waking._id}
            className="absolute left-2 right-2 bg-red-600/90 hover:bg-red-700 text-white rounded px-2 py-1 z-20 cursor-pointer transition-colors shadow-md border border-red-400/50"
            style={{ 
              top: `${relativePosition}px`,
              height: "20px",
            }}
            onClick={(e) => {
              e.stopPropagation() // Evitar que el click se propague al contenedor padre
              if (onNightWakingClick) {
                onNightWakingClick(waking)
              }
            }}
            title="Click para editar despertar nocturno"
          >
            <div className="flex items-center gap-1 pointer-events-none">
              <span className="text-xs">👶</span>
              <span style={{ fontSize: "9px" }}>{formatTime(waking.startTime)}</span>
            </div>
          </div>
        )
      } catch (error) {
        console.error("Error parsing waking startTime:", error)
        return null
      }
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
        {/* Parte superior sólida - Emoji izq + hora centrada grande */}
        <div
          className="bg-blue-500/50 rounded-t-lg border border-blue-400/40 flex items-center px-2 shadow-sm"
          style={{ height: "28px" }}
        >
          <div className="flex-shrink-0">
            <span className="text-sm">🌙</span>
          </div>
          <div className="flex-1 text-center">
            <span className="text-white font-bold" style={{ fontSize: "13px" }}>{formatTime(startTime)}</span>
          </div>
        </div>
        
        {/* Fade hacia abajo indicando continuación */}
        <div 
          className="relative"
          style={{ 
            height: `${height - 24}px`,
            background: "linear-gradient(to bottom, rgba(59, 130, 246, 0.35), rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.08), transparent)",
            animation: "pulse 3s ease-in-out infinite",
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
        background: "linear-gradient(to bottom, rgba(59, 130, 246, 0.18), rgba(139, 92, 246, 0.15), rgba(251, 191, 36, 0.12))",
      }}
      onClick={onClick}
    >
      {/* Indicador de continuación desde día anterior */}
      {isContinuationFromPrevious && (
        <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-blue-500/40 to-transparent flex items-center justify-center">
          <div className="text-blue-700 font-medium flex items-center gap-0.5" style={{ fontSize: "9px" }}>
            <span>↑</span>
            <span>Desde ayer</span>
          </div>
        </div>
      )}
      
      {/* Indicador de inicio (solo si no es continuación) - Emoji izq + hora centrada grande */}
      {!isContinuationFromPrevious && (
        <div className="absolute top-1 left-2 right-2 flex items-center">
          <div className="flex-shrink-0">
            <span className="text-sm">🌙</span>
          </div>
          <div className="flex-1 text-center">
            <span className="font-bold text-blue-700" style={{ fontSize: "13px" }}>
              {formatTime(originalStartTime || startTime)}
            </span>
          </div>
        </div>
      )}
      
      {/* Indicador de fin con duración total (solo si no continúa al día siguiente) */}
      {!continuesNextDay && endTime && (
        <div className="absolute bottom-1 left-2 right-2 flex items-center">
          <div className="flex-shrink-0">
            <span className="text-sm">☀️</span>
          </div>
          <div className="flex-1 text-center">
            <span className="font-bold text-yellow-700" style={{ fontSize: "13px" }}>
              {formatTime(originalEndTime || endTime)}
            </span>
          </div>
        </div>
      )}

      {/* Duración total centrada (solo si tiene inicio y fin completos) */}
      {!isContinuationFromPrevious && !continuesNextDay && endTime && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg px-2 py-1 shadow-sm">
            <span className="font-bold text-gray-700" style={{ fontSize: "12px" }}>
              {(() => {
                try {
                  const start = parseISO(originalStartTime || startTime)
                  const end = parseISO(originalEndTime || endTime)
                  const minutes = differenceInMinutes(end, start)
                  const hours = Math.floor(minutes / 60)
                  const mins = minutes % 60
                  if (mins === 0) return `${hours}h`
                  return `${hours}h ${mins}m`
                } catch {
                  return "--"
                }
              })()}
            </span>
          </div>
        </div>
      )}
      
      {/* Indicador de continuacion al dia siguiente - minimalista */}
      {continuesNextDay && (
        <div className="absolute bottom-0 left-0 right-0 h-3 flex items-center justify-center">
          <span className="text-yellow-600" style={{ fontSize: "10px" }}>↓</span>
        </div>
      )}
      
      {/* Despertares nocturnos */}
      {renderNightWakings()}
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