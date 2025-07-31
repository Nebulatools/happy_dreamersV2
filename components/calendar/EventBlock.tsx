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
import { format, differenceInMinutes, differenceInHours } from 'date-fns'
import { cn } from '@/lib/utils'

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
      const start = new Date(event.startTime)
      const end = new Date(event.endTime)
      return differenceInMinutes(end, start)
    }
    return 0 // Eventos puntuales (sleep, wake sin endTime)
  }

  // Calcular posición vertical según la hora
  const calculateVerticalPosition = () => {
    const eventDate = new Date(event.startTime)
    const hours = eventDate.getHours()
    const minutes = eventDate.getMinutes()
    const totalMinutes = hours * 60 + minutes
    const pixelsPerMinute = hourHeight / 60
    // Posición exacta basada en minutos
    return totalMinutes * pixelsPerMinute
  }

  // Calcular altura del bloque según duración
  const calculateBlockHeight = () => {
    const duration = calculateEventDuration()
    if (duration > 0) {
      // Eventos con duración: altura proporcional
      const pixelsPerMinute = hourHeight / 60
      return Math.max(20, duration * pixelsPerMinute) // Mínimo 20px para legibilidad
    }
    // Eventos puntuales: altura fija pequeña
    return 14
  }

  // Calcular ancho del bloque
  const calculateBlockWidth = () => {
    const duration = calculateEventDuration()
    if (duration > 0) {
      return 'w-full' // Eventos con duración ocupan todo el ancho
    }
    return 'w-3/4' // Eventos puntuales más angostos
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
        return 'bg-sleep border-sleep text-white'
      case 'nap':
        return 'bg-nap border-nap text-white'
      case 'wake':
        return 'bg-wake border-wake text-black'
      case 'night_waking':
        return 'bg-night-wake border-night-wake text-white'
      default:
        return 'bg-gray-400 border-gray-400 text-white'
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
    const start = new Date(event.startTime)
    if (event.endTime) {
      const end = new Date(event.endTime)
      return `${format(start, "HH:mm")}-${format(end, "HH:mm")}`
    }
    return format(start, "HH:mm")
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
        "absolute left-1 right-1 rounded-md border flex items-center justify-start px-1 py-0.5",
        "shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer",
        "group relative z-10",
        eventColor,
        blockWidth,
        className
      )}
      style={{
        top: `${topPosition}px`,
        height: `${blockHeight}px`,
        minHeight: '14px',
        fontSize: '11px'
      }}
      title={showTooltip ? undefined : `${getEventTypeName()} - ${formatEventTime()}`}
      onClick={() => onClick?.(event)}
    >
      {/* Contenido del bloque */}
      <div className="flex items-center gap-0.5 truncate w-full">
        {blockHeight >= 20 && getEventIcon()}
        <span className="font-medium truncate">
          {blockHeight >= 30 ? (
            // Si hay espacio, mostrar nombre y hora
            <div>
              <div className="truncate text-xs">{getEventTypeName()}</div>
              <div className="opacity-90" style={{ fontSize: '10px' }}>{format(new Date(event.startTime), "HH:mm")}</div>
            </div>
          ) : blockHeight >= 20 ? (
            // Si es mediano, nombre corto y hora
            <span className="flex items-center gap-1">
              <span className="truncate">{getEventTypeName().substring(0, 3)}</span>
              <span className="opacity-75">{format(new Date(event.startTime), "HH:mm")}</span>
            </span>
          ) : (
            // Si es muy pequeño, solo la hora
            format(new Date(event.startTime), "HH:mm")
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
        {format(new Date(event.startTime), "HH:mm")}
      </span>
    </div>
  )
}