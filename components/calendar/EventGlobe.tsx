// 🎯 Componente de globo de evento - Versión completa funcional
"use client"

import React, { useState } from "react"
import { createPortal } from "react-dom"
import { Moon, Sun, AlertCircle, Clock } from "lucide-react"

interface Event {
  _id: string;
  childId: string;
  eventType: string;
  emotionalState: string;
  startTime: string;
  endTime?: string;
  notes?: string;
}

// ⚡ FUNCIÓN CLAVE: Extracción de tiempo con conversión de timezone
function extractTimeFromISO(isoString: string) {
  try {
    // Usar Date constructor para convertir correctamente a hora local
    const date = new Date(isoString)
    if (isNaN(date.getTime())) {
      console.error("extractTimeFromISO: fecha inválida", isoString)
      return null
    }
    
    const hours = date.getHours()
    const minutes = date.getMinutes()
    
    return {
      hours,
      minutes,
      formatted: `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`,
    }
  } catch (error) {
    console.error("extractTimeFromISO error:", error, isoString)
    return null
  }
}

interface EventGlobeProps {
  event: Event;
  hourHeight: number;  // Ej: 30px por hora
  onClick?: (event: Event) => void;
  column?: number;      // Columna del evento (para eventos superpuestos)
  totalColumns?: number; // Total de columnas en el grupo
}

export function EventGlobe({ event, hourHeight = 30, onClick, column = 0, totalColumns = 1 }: EventGlobeProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const eventRef = React.useRef<HTMLDivElement>(null)
  const timeData = extractTimeFromISO(event.startTime)
  const endTimeData = event.endTime ? extractTimeFromISO(event.endTime) : null

  if (!timeData) return null
  
  const { hours, minutes } = timeData
  
  // 🎯 POSICIÓN EXACTA: minutos desde medianoche * altura por minuto
  const totalMinutes = hours * 60 + minutes
  const position = totalMinutes * (hourHeight / 60)
  
  // 🎯 ALTURA DINÁMICA: basada en duración, limitada al borde del día
  const maxMinutesInDay = 24 * 60
  const availableMinutes = maxMinutesInDay - totalMinutes
  const maxHeight = availableMinutes * (hourHeight / 60)

  let duration = 0
  let isTruncated = false
  if (endTimeData) {
    const endTotalMinutes = endTimeData.hours * 60 + endTimeData.minutes
    // Si termina "antes" de empezar, significa que cruza medianoche
    if (endTotalMinutes < totalMinutes) {
      duration = availableMinutes // Hasta medianoche
      isTruncated = true
    } else {
      duration = endTotalMinutes - totalMinutes
    }
  }

  let height = duration > 0 ? Math.max(20, duration * (hourHeight / 60)) : 20
  // Limitar altura al espacio disponible
  if (height > maxHeight - 2) {
    height = Math.max(20, maxHeight - 2)
    isTruncated = true
  }
  
  // 🎨 COLOR POR TIPO DE EVENTO
  const getColor = () => {
    switch (event.eventType) {
    case "nap": return "bg-orange-400 text-white"
    case "sleep": return "bg-blue-400 text-white"
    case "wake": return "bg-wake text-white"
    case "night_waking": return "bg-night-wake text-white"
    case "feeding": return "bg-feeding text-white"
    case "medication": return "bg-medication text-white"
    case "extra_activities": return "bg-extra-activities text-white"
    default: return "bg-gray-400 text-white"
    }
  }
  
  // 🎭 EMOJI POR TIPO
  const getEmoji = () => {
    switch (event.eventType) {
    case "nap": return <span className="text-sm">💤</span>
    case "sleep": return <span className="text-sm">😴</span>
    case "wake": return <span className="text-sm">☀️</span>
    case "night_waking": return <span className="text-sm">👶</span>
    case "feeding": return <span className="text-sm">🍼</span>
    case "medication": return <span className="text-sm">💊</span>
    case "extra_activities": return <span className="text-sm">🎈</span>
    default: return <span className="text-sm">⏰</span>
    }
  }
  
  // 📝 NOMBRE DEL EVENTO
  const getName = () => {
    const names: Record<string, string> = {
      nap: "Siesta",
      sleep: "Dormir",
      wake: "Despertar",
      night_waking: "Despertar nocturno",
      feeding: "Alimentación",
      medication: "Medicamento",
      extra_activities: "Actividad Extra",
    }
    return names[event.eventType] || event.eventType
  }

  // ⏱️ FORMATEAR DURACIÓN
  const formatDuration = () => {
    if (duration <= 0) return ""
    const hours = Math.floor(duration / 60)
    const mins = duration % 60
    if (hours === 0) return `${mins}m`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}m`
  }

  // Calcular posicion horizontal basada en columna
  const widthPercent = (1 / totalColumns) * 100
  const leftPercent = column * widthPercent
  const padding = 2 // px de margen
  const actualWidth = `calc(${widthPercent}% - ${padding * 2}px)`
  const actualLeft = `calc(${leftPercent}% + ${padding}px)`

  // Renderizar contenido basado en altura del bloque (UX mejorado)
  const renderContent = () => {
    if (height < 22) {
      // MUY PEQUEÑO (< 22px): Solo emoji centrado
      return (
        <div className="flex items-center justify-center w-full">
          {getEmoji()}
        </div>
      )
    } else if (height < 32) {
      // PEQUEÑO (22-32px): Emoji izq + duración centrada grande
      return (
        <div className="flex items-center w-full">
          <div className="flex-shrink-0">{getEmoji()}</div>
          <div className="flex-1 text-center">
            <span className="font-bold" style={{ fontSize: "11px" }}>
              {formatDuration() || timeData.formatted}
            </span>
          </div>
        </div>
      )
    } else if (height < 55) {
      // MEDIANO (32-55px): Emoji izq + duración centrada más grande
      return (
        <div className="flex items-center w-full">
          <div className="flex-shrink-0">{getEmoji()}</div>
          <div className="flex-1 text-center">
            <span className="font-bold" style={{ fontSize: "13px" }}>
              {formatDuration() || timeData.formatted}
            </span>
          </div>
        </div>
      )
    } else {
      // GRANDE (> 55px): Emoji + Nombre + horario (hay suficiente espacio)
      return (
        <>
          {getEmoji()}
          <div className="flex-1 truncate">
            <div>{getName()}</div>
            <div className="text-xs opacity-90">
              {timeData.formatted}
              {endTimeData && `-${endTimeData.formatted}`}
            </div>
          </div>
        </>
      )
    }
  }

  // Calcular duración del evento en minutos
  const calculateDuration = () => {
    if (!endTimeData) return 0
    const startMinutes = timeData.hours * 60 + timeData.minutes
    const endMinutes = endTimeData.hours * 60 + endTimeData.minutes
    return endMinutes > startMinutes ? endMinutes - startMinutes : 0
  }

  // Contenido del tooltip
  const getTooltipContent = () => {
    const duration = calculateDuration()
    const durationText = duration > 0
      ? ` (${Math.floor(duration / 60)}h ${duration % 60}m)`
      : ""

    return (
      <div className="text-xs space-y-1">
        <div className="font-semibold text-gray-900">{getName()}</div>
        <div className="text-gray-700">
          {timeData.formatted}
          {endTimeData && ` - ${endTimeData.formatted}`}
          {durationText}
        </div>
        {event.notes && <div className="text-gray-600 italic text-[11px]">"{event.notes}"</div>}
      </div>
    )
  }

  // Calcular posición del tooltip cuando aparece
  const handleMouseEnter = () => {
    if (eventRef.current) {
      const rect = eventRef.current.getBoundingClientRect()
      setTooltipPosition({
        x: rect.right + 8, // 8px de margen desde el borde derecho
        y: rect.top
      })
    }
    setShowTooltip(true)
  }

  return (
    <>
      <div
        ref={eventRef}
        className={`group relative absolute shadow-md px-2 py-1 text-xs font-medium flex items-center justify-center cursor-pointer hover:shadow-lg transition-shadow z-10 ${getColor()} ${isTruncated ? "rounded-t-lg" : "rounded-lg"}`}
        style={{
          top: `${position}px`,
          height: `${height}px`,
          minHeight: "20px",
          left: actualLeft,
          width: actualWidth,
        }}
        onClick={(e) => {
          e.stopPropagation()
          onClick?.(event)
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {renderContent()}

        {/* Indicador de continuacion al dia siguiente */}
        {isTruncated && (
          <div className="absolute bottom-0 left-0 right-0 h-3 flex items-center justify-center bg-black/20 rounded-b-none">
            <span style={{ fontSize: "8px" }}>↓</span>
          </div>
        )}
      </div>

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