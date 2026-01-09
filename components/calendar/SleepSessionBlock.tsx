// Componente para mostrar sesiones de sueño completas con gradiente
// Muestra estado en progreso (fade) o completado (gradiente)

"use client"

import React, { useState } from "react"
import { createPortal } from "react-dom"
import { Moon, Sun, AlertCircle, Baby } from "lucide-react"
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
  column?: number        // Columna del evento (para eventos superpuestos)
  totalColumns?: number  // Total de columnas en el grupo
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
  column = 0,
  totalColumns = 1,
}: SleepSessionBlockProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [tooltipShownByTouch, setTooltipShownByTouch] = useState(false)
  const blockRef = React.useRef<HTMLDivElement>(null)

  // Detectar si es touch device
  const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window

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

  // Calcular posicion horizontal basada en columna (igual que EventGlobe)
  const widthPercent = (1 / totalColumns) * 100
  const leftPercent = column * widthPercent
  const padding = 2 // px de margen
  const actualWidth = `calc(${widthPercent}% - ${padding * 2}px)`
  const actualLeft = `calc(${leftPercent}% + ${padding}px)`
  
  // Renderizar despertares nocturnos como HERMANOS (no hijos) para z-index correcto
  const renderNightWakingsAsSiblings = () => {
    return nightWakings.map(waking => {
      try {
        // Usar parseISO para convertir correctamente a hora local
        const wakingDate = parseISO(waking.startTime)
        const wakingHours = wakingDate.getHours()
        const wakingMinutes = wakingDate.getMinutes()
        const wakingTotalMinutes = wakingHours * 60 + wakingMinutes
        // Posición ABSOLUTA en el contenedor del calendario (no relativa al bloque de sleep)
        const wakingPosition = Math.round(wakingTotalMinutes * (hourHeight / 60))

        // Verificar que el waking está dentro del rango del sleep
        const relativePosition = wakingPosition - position
        if (relativePosition < 0 || relativePosition > height) return null

        return (
          <div
            key={waking._id}
            className="absolute bg-red-600/90 hover:bg-red-700 text-white rounded cursor-pointer transition-colors shadow-md border border-red-400/50 z-30"
            style={{
              top: `${wakingPosition}px`,
              height: "20px",
              left: actualLeft,
              width: actualWidth,
            }}
            onClick={(e) => {
              e.stopPropagation()
              if (onNightWakingClick) {
                onNightWakingClick(waking)
              }
            }}
            title="Click para editar despertar nocturno"
          >
            <div className="flex items-center justify-center w-full h-full pointer-events-none">
              <Baby className="h-3 w-3 [filter:drop-shadow(0_0_1px_black)_drop-shadow(0_0_1px_black)]" style={{ color: "#fff" }} />
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
      <>
        <div
          className={cn("absolute cursor-pointer", className)}
          style={{ top: `${position}px`, left: actualLeft, width: actualWidth }}
          onClick={onClick}
        >
          {/* Parte superior sólida - Solo icono Moon */}
          <div
            className="bg-blue-500/50 rounded-t-lg border border-blue-400/40 flex items-center justify-center shadow-sm"
            style={{ height: "24px" }}
          >
            <Moon className="h-4 w-4 [filter:drop-shadow(0_0_1px_black)_drop-shadow(0_0_1px_black)]" style={{ color: "#6366f1" }} />
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
          </div>
        </div>

        {/* Despertares nocturnos como HERMANOS (z-index alto) */}
        {renderNightWakingsAsSiblings()}
      </>
    )
  }

  // Función para obtener duración total en texto formateado
  const getTotalDuration = () => {
    if (!endTime) return ""
    try {
      const start = parseISO(originalStartTime || startTime)
      const end = parseISO(originalEndTime || endTime)
      const minutes = differenceInMinutes(end, start)
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      if (mins === 0) return `${hours}h`
      return `${hours}h ${mins}m`
    } catch {
      return ""
    }
  }

  // Contenido del tooltip
  const getTooltipContent = () => {
    const duration = getTotalDuration()

    return (
      <div className="text-xs space-y-1">
        <div className="font-semibold text-gray-900">Sesión de sueño</div>
        <div className="text-gray-700">
          {formatTime(originalStartTime || startTime)}
          {endTime && ` - ${formatTime(originalEndTime || endTime)}`}
          {duration && ` (${duration})`}
        </div>
        {nightWakings.length > 0 && (
          <div className="text-blue-600 font-medium text-[11px]">
            {nightWakings.length} {nightWakings.length === 1 ? "despertar" : "despertares"}
          </div>
        )}
      </div>
    )
  }

  // Calcular posición del tooltip
  const updateTooltipPosition = () => {
    if (blockRef.current) {
      const rect = blockRef.current.getBoundingClientRect()
      setTooltipPosition({
        x: rect.right + 8, // 8px de margen desde el borde derecho
        y: rect.top + 16 // Un poco más abajo para alinearse mejor
      })
    }
  }

  const handleMouseEnter = () => {
    if (!isTouchDevice) {
      updateTooltipPosition()
      setShowTooltip(true)
    }
  }

  const handleMouseLeave = () => {
    if (!isTouchDevice) {
      setShowTooltip(false)
      setTooltipShownByTouch(false)
    }
  }

  // En móvil: tap 1 = tooltip, tap 2 = abrir evento
  const handleClick = () => {
    if (isTouchDevice) {
      if (!tooltipShownByTouch) {
        // Primer tap: mostrar tooltip
        updateTooltipPosition()
        setShowTooltip(true)
        setTooltipShownByTouch(true)
      } else {
        // Segundo tap: abrir evento
        setShowTooltip(false)
        setTooltipShownByTouch(false)
        onClick?.()
      }
    } else {
      // Desktop: abrir directamente
      onClick?.()
    }
  }

  // SUEÑO COMPLETADO - Con gradiente completo
  return (
    <>
      <div
        ref={blockRef}
        className={cn(
          "group absolute cursor-pointer border border-white/10 backdrop-blur-sm",
          !isContinuationFromPrevious && !continuesNextDay && "rounded-lg",
          isContinuationFromPrevious && !continuesNextDay && "rounded-b-lg",
          !isContinuationFromPrevious && continuesNextDay && "rounded-t-lg",
          className
        )}
        style={{
          top: `${position}px`,
          height: `${height}px`,
          left: actualLeft,
          width: actualWidth,
          background: "linear-gradient(to bottom, rgba(59, 130, 246, 0.18), rgba(139, 92, 246, 0.15), rgba(251, 191, 36, 0.12))",
        }}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
      
      {/* Indicador de inicio (solo si no es continuación) - Solo icono Moon */}
      {!isContinuationFromPrevious && (
        <div className="absolute top-1 left-0 right-0 flex items-center justify-center">
          <Moon className="h-4 w-4 [filter:drop-shadow(0_0_1px_black)_drop-shadow(0_0_1px_black)]" style={{ color: "#6366f1" }} />
        </div>
      )}
      
      {/* Indicador de fin (solo si no continúa al día siguiente) - Solo icono Sun */}
      {!continuesNextDay && endTime && (
        <div className="absolute bottom-1 left-0 right-0 flex items-center justify-center">
          <Sun className="h-4 w-4 [filter:drop-shadow(0_0_1px_black)_drop-shadow(0_0_1px_black)]" style={{ color: "#eab308" }} />
        </div>
      )}

      {/* Indicador de continuacion al dia siguiente - minimalista */}
      {continuesNextDay && (
        <div className="absolute bottom-0 left-0 right-0 h-3 flex items-center justify-center">
          <span className="text-yellow-600" style={{ fontSize: "10px" }}>↓</span>
        </div>
      )}
      </div>

      {/* Despertares nocturnos como HERMANOS (z-index alto) */}
      {renderNightWakingsAsSiblings()}

      {/* Tooltip - Renderizado en document.body usando Portal para escapar del contexto de apilamiento */}
      {showTooltip && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed bg-white/95 backdrop-blur-sm border border-blue-200/60 text-gray-800 px-3 py-2 rounded-lg shadow-lg whitespace-nowrap pointer-events-none"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            zIndex: 9999
          }}
        >
          {getTooltipContent()}
          {/* Flecha del tooltip */}
          <div className="absolute right-full top-2 border-4 border-transparent border-r-white/95"
               style={{ filter: 'drop-shadow(-1px 0 0 rgba(191, 219, 254, 0.6))' }} />
        </div>,
        document.body
      )}
    </>
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