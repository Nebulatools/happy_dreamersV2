// 🎯 Componente de globo de evento - Versión completa funcional
"use client"

import React, { useState } from "react"
import { createPortal } from "react-dom"
import { getEventIconConfig, EVENT_ICONS } from "@/lib/icons/event-icons"

interface Event {
  _id: string;
  childId: string;
  eventType: string;
  emotionalState: string;
  startTime: string;
  endTime?: string;
  notes?: string;
  feedingType?: "breast" | "bottle" | "solids";
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
  onDoubleClick?: (event: Event) => void;  // Para abrir modal de edicion
  column?: number;      // Columna del evento (para eventos superpuestos)
  totalColumns?: number; // Total de columnas en el grupo
}

export function EventGlobe({ event, hourHeight = 30, onClick, onDoubleClick, column = 0, totalColumns = 1 }: EventGlobeProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [tooltipShownByTouch, setTooltipShownByTouch] = useState(false)
  const eventRef = React.useRef<HTMLDivElement>(null)
  const timeData = extractTimeFromISO(event.startTime)
  const endTimeData = event.endTime ? extractTimeFromISO(event.endTime) : null

  // Detectar si es touch device
  const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window

  if (!timeData) return null

  const { hours, minutes } = timeData

  // 🎯 POSICIÓN EXACTA: minutos desde medianoche * altura por minuto
  const totalMinutes = hours * 60 + minutes
  const position = totalMinutes * (hourHeight / 60)

  // 🎯 ALTURA DINÁMICA: basada en duración, limitada al borde del día
  const maxMinutesInDay = 24 * 60
  const availableMinutes = maxMinutesInDay - totalMinutes
  const maxHeight = availableMinutes * (hourHeight / 60)

  // 🚫 NO RENDERIZAR eventos que se salen del día (posición >= 24 horas)
  // Esto evita que eventos de madrugada del día siguiente aparezcan fuera del calendario
  if (totalMinutes >= maxMinutesInDay || availableMinutes <= 0) {
    return null
  }

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
  
  // 🎨 COLOR POR TIPO DE EVENTO - Usando registry centralizado
  const getColor = () => {
    const config = getEventIconConfig(event.eventType, event.feedingType)
    // Notas tienen fondo claro, necesitan texto oscuro
    const textColor = event.eventType === "note" ? "text-gray-700" : "text-white"
    return `${config.bgColor} ${textColor}`
  }

  // Icono Lucide segun tipo de evento - Usando registry centralizado
  // Color blanco para fondos oscuros, color del config para fondos claros (ej: note)
  const getIcon = () => {
    const config = getEventIconConfig(event.eventType, event.feedingType)
    const IconComponent = config.icon
    // Notas tienen fondo claro, necesitan icono oscuro
    const isLightBackground = event.eventType === "note"
    const colorStyle = isLightBackground ? { color: config.color } : { color: "white" }
    return <IconComponent className="h-3 w-3" style={colorStyle} />
  }
  
  // 📝 NOMBRE DEL EVENTO - Usando registry centralizado
  const getName = () => {
    const config = getEventIconConfig(event.eventType, event.feedingType)
    // Para feeding, incluir el tipo específico en el nombre
    if (event.eventType === "feeding" || event.eventType === "night_feeding") {
      const prefix = event.eventType === "night_feeding" ? "Toma nocturna" : "Alimentación"
      if (event.feedingType === "breast") return `${prefix} (Pecho)`
      if (event.feedingType === "bottle") return `${prefix} (Biberón)`
      if (event.feedingType === "solids") return `${prefix} (Sólidos)`
      return prefix
    }
    return config.label
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

  // Renderizar contenido - SOLO ICONO (info en tooltip)
  const renderContent = () => {
    return (
      <div className="flex items-center justify-center w-full h-full">
        {getIcon()}
      </div>
    )
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

  // Calcular posición del tooltip cuando aparece (ARRIBA del evento)
  const updateTooltipPosition = () => {
    if (eventRef.current) {
      const rect = eventRef.current.getBoundingClientRect()
      // Posicionar arriba del evento, centrado horizontalmente
      setTooltipPosition({
        x: rect.left + rect.width / 2, // Centrado
        y: rect.top - 8 // 8px arriba del evento
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
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()

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
        onClick?.(event)
      }
    } else {
      // Desktop: abrir directamente
      onClick?.(event)
    }
  }

  // Doble click abre modal de edicion
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowTooltip(false)
    setTooltipShownByTouch(false)
    onDoubleClick?.(event)
  }

  return (
    <>
      <div
        ref={eventRef}
        className={`group absolute shadow-md px-2 py-1 text-xs font-medium flex items-center justify-center cursor-pointer hover:shadow-lg transition-shadow z-10 ${getColor()} ${isTruncated ? "rounded-t-lg" : "rounded-lg"}`}
        style={{
          top: `${position}px`,
          height: `${height}px`,
          minHeight: "20px",
          left: actualLeft,
          width: actualWidth,
        }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {renderContent()}

        {/* Indicador de continuacion al dia siguiente */}
        {isTruncated && (
          <div className="absolute bottom-0 left-0 right-0 h-3 flex items-center justify-center bg-black/20 rounded-b-none">
            <span style={{ fontSize: "8px" }}>↓</span>
          </div>
        )}
      </div>

      {/* Tooltip - Renderizado ARRIBA del evento usando Portal */}
      {showTooltip && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed bg-white/95 backdrop-blur-sm border border-blue-200/60 text-gray-800 px-3 py-2 rounded-lg shadow-lg whitespace-nowrap pointer-events-none"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translate(-50%, -100%)', // Centrado y arriba
            zIndex: 9999
          }}
        >
          {getTooltipContent()}
          {/* Flecha del tooltip apuntando hacia abajo */}
          <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-white/95"
               style={{ filter: 'drop-shadow(0 1px 0 rgba(191, 219, 254, 0.6))' }} />
        </div>,
        document.body
      )}
    </>
  )
}