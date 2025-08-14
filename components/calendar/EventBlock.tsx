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
  // Validar que el string no esté vacío
  if (!isoString) {
    console.error('parseLocalISODate: string vacío o undefined')
    return new Date() // Retornar fecha actual como fallback
  }
  
  try {
    // IMPORTANTE: No usar parseISO con timezone porque convierte a UTC
    // En lugar de eso, extraemos la parte local del string (antes del timezone)
    
    if (isoString.includes('T')) {
      // Extraer la parte YYYY-MM-DDTHH:mm:ss (ignorar timezone y milisegundos)
      const localPart = isoString.split(/[+-Z]/)[0].split('.')[0]
      const date = new Date(localPart)
      
      // Validar que la fecha sea válida
      if (isNaN(date.getTime())) {
        console.error('parseLocalISODate: fecha inválida generada de:', localPart)
        // Intentar con el string original
        return new Date(isoString)
      }
      
      return date
    }
    
    // Para fechas sin T, usar Date directamente
    const date = new Date(isoString)
    if (isNaN(date.getTime())) {
      console.error('parseLocalISODate: fecha inválida de:', isoString)
      return new Date() // Fallback a fecha actual
    }
    
    return date
  } catch (error) {
    console.error('parseLocalISODate error:', error, 'para string:', isoString)
    return new Date() // Fallback seguro
  }
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
  // Validar que el evento tenga datos mínimos necesarios
  if (!event.startTime || event.startTime === '') {
    console.warn('EventBlock: evento sin startTime válido', event)
    return null // No renderizar eventos sin fecha de inicio
  }

  // Calcular duración del evento
  const calculateEventDuration = () => {
    try {
      if (event.endTime && event.endTime !== '' && event.startTime && event.startTime !== '') {
        const start = parseLocalISODate(event.startTime)
        const end = parseLocalISODate(event.endTime)
        
        // Validar que ambas fechas sean válidas
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          console.error('calculateEventDuration: fechas inválidas', event.startTime, event.endTime)
          return 0
        }
        
        const duration = differenceInMinutes(end, start)
        // Asegurar que la duración no sea negativa
        return Math.max(0, duration)
      }
    } catch (error) {
      console.error('calculateEventDuration error:', error)
    }
    return 0 // Eventos puntuales o error
  }

  // Calcular posición vertical según la hora
  const calculateVerticalPosition = () => {
    // Validar que startTime exista y no esté vacío
    if (!event.startTime || event.startTime === '') {
      return 0 // Posición por defecto
    }
    
    // Extraer hora y minutos directamente del string ISO
    // Esto evita problemas de conversión de timezone
    const timeMatch = event.startTime.match(/T(\d{2}):(\d{2})/)
    
    if (timeMatch) {
      const hours = parseInt(timeMatch[1], 10)
      const minutes = parseInt(timeMatch[2], 10)
      
      // Calcular minutos totales desde medianoche
      const totalMinutes = hours * 60 + minutes
      
      // Calcular píxeles basados en la altura por hora
      const pixelsPerMinute = hourHeight / 60
      
      // Posición exacta basada en minutos
      const position = totalMinutes * pixelsPerMinute
      
      return position
    }
    
    // Fallback: usar el método anterior si no se puede extraer del string
    const eventDate = parseLocalISODate(event.startTime)
    const hours = eventDate.getHours()
    const minutes = eventDate.getMinutes()
    const totalMinutes = hours * 60 + minutes
    const pixelsPerMinute = hourHeight / 60
    return totalMinutes * pixelsPerMinute
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
    try {
      if (!event.startTime || event.startTime === '') return '--:--'
      
      const start = parseLocalISODate(event.startTime)
      // Validar que la fecha sea válida antes de formatear
      if (isNaN(start.getTime())) {
        console.error('formatEventTime: fecha de inicio inválida', event.startTime)
        return '--:--'
      }
      
      if (event.endTime && event.endTime !== '') {
        const end = parseLocalISODate(event.endTime)
        if (isNaN(end.getTime())) {
          console.error('formatEventTime: fecha de fin inválida', event.endTime)
          return format(start, "HH:mm")
        }
        return `${format(start, "HH:mm")}-${format(end, "HH:mm")}`
      }
      return format(start, "HH:mm")
    } catch (error) {
      console.error('formatEventTime error:', error)
      return '--:--'
    }
  }
  
  // Formatear tiempo compacto para mostrar en el bloque
  const formatCompactTime = () => {
    try {
      if (!event.startTime || event.startTime === '') return '--:--'
      
      const start = parseLocalISODate(event.startTime)
      // Validar que la fecha sea válida antes de formatear
      if (isNaN(start.getTime())) {
        console.error('formatCompactTime: fecha de inicio inválida', event.startTime)
        return '--:--'
      }
      
      if (event.endTime && event.endTime !== '') {
        const end = parseLocalISODate(event.endTime)
        if (isNaN(end.getTime())) {
          console.error('formatCompactTime: fecha de fin inválida', event.endTime)
          return format(start, "H:mm")
        }
        return `${format(start, "H:mm")}-${format(end, "H:mm")}`
      }
      return format(start, "H:mm")
    } catch (error) {
      console.error('formatCompactTime error:', error)
      return '--:--'
    }
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

  // Formatear hora con validación
  const formatTime = () => {
    try {
      if (!event.startTime || event.startTime === '') return '--:--'
      
      const date = parseLocalISODate(event.startTime)
      if (isNaN(date.getTime())) {
        console.error('CompactEventBlock: fecha inválida', event.startTime)
        return '--:--'
      }
      
      return format(date, "HH:mm")
    } catch (error) {
      console.error('CompactEventBlock format error:', error)
      return '--:--'
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
        {formatTime()}
      </span>
    </div>
  )
}