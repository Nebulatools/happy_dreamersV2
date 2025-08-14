// Componente de bloque de evento mejorado con tamaños dinámicos
// Ajusta el tamaño visual según la duración del evento

"use client"

import React from 'react'
import { 
  Moon, 
  Sun, 
  AlertCircle,
  Clock
} from "lucide-react"
import { format, differenceInMinutes, differenceInHours, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'

// Función auxiliar para parsear fechas ISO locales correctamente
function parseLocalISODate(isoString: string): Date {
  // Si la fecha ya tiene timezone, parseISO la manejará correctamente
  // Si no tiene timezone, asumimos que es hora local
  if (isoString.includes('+') || isoString.includes('-')) {
    return parseISO(isoString)
  }
  // Para fechas sin timezone, crear Date directamente para mantener hora local
  return new Date(isoString)
}

interface Event {
  _id: string;
  childId: string;
  eventType: string;
  emotionalState: string;
  startTime: string;
  endTime?: string;
  notes?: string;
  duration?: number;
}

interface EventBlockProps {
  event: Event
  hourHeight: number // Altura en píxeles por hora para calcular posición
  className?: string
  showTooltip?: boolean
  onClick?: (event: Event) => void
}

export function EventBlock({ 
  event, 
  hourHeight, 
  className,
  showTooltip = true,
  onClick 
}: EventBlockProps) {
  // Calcular duración del evento
  const calculateEventDuration = () => {
    if (event.endTime) {
      const start = parseLocalISODate(event.startTime)
      const end = parseLocalISODate(event.endTime)
      return differenceInMinutes(end, start)
    }
    return 0 // Eventos puntuales (sleep, wake sin endTime)
  }

  // Calcular posición vertical según la hora
  const calculateVerticalPosition = () => {
    // Parsear la fecha correctamente considerando el timezone
    const eventDate = parseLocalISODate(event.startTime)
    // Usar métodos locales para obtener la hora correcta
    const hours = eventDate.getHours()
    const minutes = eventDate.getMinutes()
    
    // Calcular minutos totales desde medianoche
    const totalMinutes = hours * 60 + minutes
    
    // Calcular píxeles basados en la altura por hora
    const pixelsPerMinute = hourHeight / 60
    
    // Posición exacta basada en minutos
    const position = totalMinutes * pixelsPerMinute
    
    return position
  }

  // Calcular altura del bloque según duración
  const calculateBlockHeight = () => {
    const duration = calculateEventDuration()
    if (duration > 0) {
      // Eventos con duración: altura proporcional
      const pixelsPerMinute = hourHeight / 60
      return Math.max(18, duration * pixelsPerMinute) // Mínimo 18px para mejor visibilidad
    }
    // Eventos puntuales: altura fija pequeña
    return 12
  }

  // Calcular ancho del bloque
  const calculateBlockWidth = () => {
    const duration = calculateEventDuration()
    if (duration > 0) {
      return 'left-0.5 right-0.5' // Eventos con duración ocupan casi todo el ancho
    }
    return 'left-1 right-1' // Eventos puntuales con margen normal
  }

  // Obtener icono según tipo de evento
  const getEventIcon = () => {
    switch (event.eventType) {
      case 'sleep':
      case 'bedtime':
        return <Moon className="w-3 h-3" />
      case 'nap':
        return <Sun className="w-3 h-3" />
      case 'wake':
        return <Sun className="w-3 h-3" />
      case 'night_waking':
        return <AlertCircle className="w-3 h-3" />
      default:
        return <Clock className="w-3 h-3" />
    }
  }

  // Obtener color según tipo de evento
  const getEventColor = () => {
    switch (event.eventType) {
      case 'sleep':
      case 'bedtime':
        return 'bg-sleep border-sleep text-white font-semibold'
      case 'nap':
        return 'bg-nap border-nap text-white font-semibold'
      case 'wake':
        return 'bg-wake border-wake text-gray-900 font-semibold'
      case 'night_waking':
        return 'bg-night-wake border-night-wake text-white font-semibold'
      default:
        return 'bg-gray-400 border-gray-400 text-white font-semibold'
    }
  }

  // Obtener nombre del tipo de evento
  const getEventTypeName = () => {
    const types: Record<string, string> = {
      sleep: "Dormir",
      bedtime: "Dormir",
      nap: "Siesta", 
      wake: "Despertar",
      night_waking: "Despertar nocturno",
    }
    return types[event.eventType] || event.eventType
  }

  // Formatear tiempo del evento
  const formatEventTime = () => {
    const start = parseLocalISODate(event.startTime)
    if (event.endTime) {
      const end = parseLocalISODate(event.endTime)
      return `${format(start, "HH:mm")}-${format(end, "HH:mm")}`
    }
    return format(start, "HH:mm")
  }
  
  // Formatear tiempo compacto para mostrar en el bloque
  const formatCompactTime = () => {
    const start = parseLocalISODate(event.startTime)
    if (event.endTime) {
      const end = parseLocalISODate(event.endTime)
      return `${format(start, "H:mm")}-${format(end, "H:mm")}`
    }
    return format(start, "H:mm")
  }

  // Obtener información para tooltip
  const getTooltipContent = () => {
    const duration = calculateEventDuration()
    const durationText = duration > 0 ? ` (${Math.floor(duration / 60)}h ${duration % 60}m)` : ''
    
    return (
      <div className="text-xs space-y-1">
        <div className="font-medium">{getEventTypeName()}</div>
        <div>{formatEventTime()}{durationText}</div>
        {event.notes && <div className="text-gray-200">"{event.notes}"</div>}
        <div className="text-gray-200">Estado: {event.emotionalState}</div>
      </div>
    )
  }

  const topPosition = calculateVerticalPosition()
  const blockHeight = calculateBlockHeight()
  const blockWidth = calculateBlockWidth()
  const eventColor = getEventColor()

  return (
    <div
      className={cn(
        "absolute rounded-md border flex items-center justify-start px-1.5 py-0.5",
        "shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer",
        "group relative",
        eventColor,
        blockWidth,
        className
      )}
      style={{
        top: `${topPosition}px`,
        height: `${blockHeight}px`,
        minHeight: '14px',
        fontSize: '11px',
        borderWidth: '1.5px'
      }}
      title={showTooltip ? undefined : `${getEventTypeName()} - ${formatEventTime()}`}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.(event)
      }}
    >
      {/* Contenido del bloque */}
      <div className="flex items-center gap-0.5 truncate w-full">
        {blockHeight >= 16 && getEventIcon()}
        <span className="font-medium truncate" style={{ fontSize: '11px' }}>
          {event.endTime && blockHeight >= 24 ? (
            // Si tiene duración y espacio suficiente, mostrar rango completo
            <div className="leading-tight">
              <div className="truncate">{getEventTypeName()}</div>
              <div className="opacity-80 text-xs">{formatEventTime()}</div>
            </div>
          ) : event.endTime && blockHeight >= 18 ? (
            // Si tiene duración pero menos espacio, solo horas
            formatEventTime()
          ) : blockHeight >= 16 ? (
            // Eventos puntuales o poco espacio
            <span className="flex items-center gap-0.5">
              <span>{getEventTypeName().substring(0, 3)}</span>
              <span className="opacity-75">{format(parseLocalISODate(event.startTime), "H:mm")}</span>
            </span>
          ) : (
            // Muy poco espacio
            formatCompactTime()
          )}
        </span>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute left-full top-0 ml-2 bg-gray-900 text-white p-2 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20 whitespace-nowrap">
          {getTooltipContent()}
          {/* Flecha del tooltip */}
          <div className="absolute right-full top-2 border-4 border-transparent border-r-gray-900" />
        </div>
      )}
    </div>
  )
}

// Componente simplificado para dispositivos móviles
export function CompactEventBlock({ 
  event, 
  className 
}: { 
  event: Event; 
  className?: string; 
}) {
  const getEventColor = () => {
    switch (event.eventType) {
      case 'sleep':
      case 'bedtime':
        return 'bg-sleep'
      case 'nap':
        return 'bg-nap'
      case 'wake':
        return 'bg-wake'
      case 'night_waking':
        return 'bg-night-wake'
      default:
        return 'bg-gray-400'
    }
  }

  const getEventIcon = () => {
    switch (event.eventType) {
      case 'sleep':
      case 'bedtime':
        return <Moon className="w-3 h-3" />
      case 'nap':
        return <Sun className="w-3 h-3" />
      case 'wake':
        return <Sun className="w-3 h-3" />
      case 'night_waking':
        return <AlertCircle className="w-3 h-3" />
      default:
        return <Clock className="w-3 h-3" />
    }
  }

  return (
    <div className={cn(
      "flex items-center gap-1 p-1 rounded text-white text-xs",
      getEventColor(),
      className
    )}>
      {getEventIcon()}
      <span className="truncate">
        {format(parseLocalISODate(event.startTime), "HH:mm")}
      </span>
    </div>
  )
}