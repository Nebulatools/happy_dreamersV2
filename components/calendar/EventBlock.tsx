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
  if (!isoString || isoString === '') {
    console.error('parseLocalISODate: string vacío o undefined')
    return new Date() // Retornar fecha actual como fallback
  }
  
  try {
    // Usar parseISO de date-fns que maneja correctamente las zonas horarias
    // parseISO convierte a UTC pero luego getHours() devuelve hora local correcta
    const date = parseISO(isoString)
    
    // Validar que la fecha sea válida
    if (isNaN(date.getTime())) {
      console.error('parseLocalISODate: fecha inválida de:', isoString)
      // Intentar con Date constructor como fallback
      const fallbackDate = new Date(isoString)
      if (isNaN(fallbackDate.getTime())) {
        return new Date() // Fallback a fecha actual
      }
      return fallbackDate
    }
    
    return date
  } catch (error) {
    console.error('parseLocalISODate error:', error, 'para string:', isoString)
    // Último intento con Date constructor
    try {
      const lastTry = new Date(isoString)
      if (!isNaN(lastTry.getTime())) {
        return lastTry
      }
    } catch {
      // Nada
    }
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

  // FUNCIÓN CENTRAL: Extraer hora y minutos del string ISO de forma consistente
  const extractTimeFromISO = (isoString: string) => {
    const timeMatch = isoString.match(/T(\d{2}):(\d{2})/)
    if (timeMatch) {
      return {
        hours: parseInt(timeMatch[1], 10),
        minutes: parseInt(timeMatch[2], 10),
        formatted: `${timeMatch[1]}:${timeMatch[2]}`
      }
    }
    return null
  }

  // Calcular posición vertical según la hora - USANDO FUNCIÓN CENTRAL
  const calculateVerticalPosition = () => {
    // Validar que startTime exista y no esté vacío
    if (!event.startTime || event.startTime === '') {
      console.warn('calculateVerticalPosition: startTime vacío para evento', event._id)
      return 0 // Posición por defecto
    }
    
    const timeData = extractTimeFromISO(event.startTime)
    
    if (timeData) {
      const { hours, minutes } = timeData
      
      // Validar rangos válidos
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        console.error('calculateVerticalPosition: hora inválida', hours, minutes, event.startTime)
        return 0
      }
      
      // Calcular minutos totales desde medianoche
      const totalMinutes = hours * 60 + minutes
      
      // Calcular píxeles basados en la altura por hora
      const pixelsPerMinute = hourHeight / 60
      
      // CORRECCIÓN: Asegurar alineación exacta con las líneas de hora
      // La posición debe coincidir exactamente con las líneas del grid
      // IMPORTANTE: NO hay offset porque los eventos están DENTRO del container
      // que ya está posicionado correctamente después del header
      const position = totalMinutes * pixelsPerMinute
      
      // Log para debugging - ANALIZAR POSICIÓN ACTUAL DE GLOBOS
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔥 GLOBO [${event.eventType}] ANÁLISIS:`)
        console.log(`   📅 ISO: ${event.startTime}`)
        console.log(`   ⏰ Hora extraída: ${hours}:${minutes.toString().padStart(2, '0')}`)
        console.log(`   📐 Posición calculada: ${position.toFixed(2)}px`)
        console.log(`   📏 Esto equivale a hora: ${(position / hourHeight).toFixed(2)} (debería ser ${hours + minutes/60})`)
        
        // MAPEO INVERSO: ¿A qué hora corresponde esta posición?
        const equivalentHour = position / hourHeight
        const realHour = Math.floor(equivalentHour)
        const realMinutes = Math.round((equivalentHour - realHour) * 60)
        console.log(`   🎯 GLOBO ESTÁ EN: ${realHour.toString().padStart(2, '0')}:${realMinutes.toString().padStart(2, '0')}`)
        
        // VERIFICAR COHERENCIA CON ÁREAS DE FONDO
        if (event.eventType === 'nap') {
          const isInDayArea = hours >= 6 && hours < 19
          console.log(`   🍊 SIESTA (${hours}:${minutes.toString().padStart(2, '0')}): ${isInDayArea ? '✅ CORRECTO - En área amarilla' : '⚠️ PROBLEMA - Fuera de área amarilla'}`)
        }
        if (event.eventType === 'sleep') {
          const isInNightArea = hours < 6 || hours >= 19
          console.log(`   🟦 DORMIR (${hours}:${minutes.toString().padStart(2, '0')}): ${isInNightArea ? '✅ CORRECTO - En área azul' : '⚠️ PROBLEMA - Fuera de área azul'}`)
        }
      }
      
      return position
    }
    
    // Si no se puede extraer con regex, intentar fallback
    console.warn('calculateVerticalPosition: no se pudo extraer tiempo con regex', event.startTime)
    
    try {
      const eventDate = parseLocalISODate(event.startTime)
      const hours = eventDate.getHours()
      const minutes = eventDate.getMinutes()
      const totalMinutes = hours * 60 + minutes
      const pixelsPerMinute = hourHeight / 60
      
      // NO usar Math.round() para mantener precisión
      return totalMinutes * pixelsPerMinute
    } catch (error) {
      console.error('calculateVerticalPosition: error en fallback', error)
      return 0
    }
  }

  // Calcular altura del bloque según duración
  const calculateBlockHeight = () => {
    const duration = calculateEventDuration()
    if (duration > 0) {
      // Eventos con duración: altura proporcional exacta
      const pixelsPerMinute = hourHeight / 60
      // Altura exacta basada en duración, con mínimo para visibilidad
      const calculatedHeight = duration * pixelsPerMinute
      return Math.max(20, calculatedHeight) // Mínimo 20px para mejor visibilidad
    }
    // Eventos puntuales: altura fija pequeña
    return 16
  }

  // Calcular ancho del bloque - Ahora retorna estilos en línea para ancho fijo
  const calculateBlockStyles = () => {
    const duration = calculateEventDuration()
    if (duration > 0) {
      // Eventos con duración: 90% del ancho con margen pequeño
      return {
        left: '2px',
        width: 'calc(100% - 4px)'
      }
    }
    // Eventos puntuales: 85% del ancho con más margen
    return {
      left: '4px', 
      width: 'calc(100% - 8px)'
    }
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

  // Formatear tiempo del evento - USANDO FUNCIÓN CENTRAL
  const formatEventTime = () => {
    try {
      if (!event.startTime || event.startTime === '') return '--:--'
      
      const startTime = extractTimeFromISO(event.startTime)
      const endTime = event.endTime ? extractTimeFromISO(event.endTime) : null
      
      if (startTime) {
        if (endTime) {
          return `${startTime.formatted}-${endTime.formatted}`
        }
        return startTime.formatted
      }
      
      // Fallback si regex no funciona
      const start = parseLocalISODate(event.startTime)
      if (isNaN(start.getTime())) {
        console.error('formatEventTime: fecha de inicio inválida', event.startTime)
        return '--:--'
      }
      
      if (event.endTime && event.endTime !== '') {
        const end = parseLocalISODate(event.endTime)
        if (isNaN(end.getTime())) {
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
  
  // Formatear tiempo compacto para mostrar en el bloque - USANDO FUNCIÓN CENTRAL
  const formatCompactTime = () => {
    try {
      if (!event.startTime || event.startTime === '') return '--:--'
      
      const startTime = extractTimeFromISO(event.startTime)
      const endTime = event.endTime ? extractTimeFromISO(event.endTime) : null
      
      if (startTime) {
        if (endTime) {
          return `${startTime.formatted}-${endTime.formatted}`
        }
        return startTime.formatted
      }
      
      // Fallback si regex no funciona
      const start = parseLocalISODate(event.startTime)
      if (isNaN(start.getTime())) {
        console.error('formatCompactTime: fecha de inicio inválida', event.startTime)
        return '--:--'
      }
      
      if (event.endTime && event.endTime !== '') {
        const end = parseLocalISODate(event.endTime)
        if (isNaN(end.getTime())) {
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

  // Validar que el evento tenga datos mínimos necesarios ANTES de llamar funciones
  if (!event.startTime || event.startTime === '') {
    console.warn('EventBlock: evento sin startTime válido', event)
    return null // No renderizar eventos sin fecha de inicio
  }

  const topPosition = calculateVerticalPosition()
  const blockHeight = calculateBlockHeight()
  const blockStyles = calculateBlockStyles()
  const eventColor = getEventColor()

  return (
    <div
      className={cn(
        "absolute rounded-md border flex items-center justify-start px-1.5 py-0.5",
        "shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer",
        "group relative",
        eventColor,
        className
      )}
      style={{
        top: `${topPosition}px`,
        height: `${blockHeight}px`,
        minHeight: '14px',
        fontSize: '11px',
        borderWidth: '1.5px',
        ...blockStyles // Aplicar los estilos de ancho y posición horizontal
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
              <span className="opacity-75">
                {extractTimeFromISO(event.startTime)?.formatted || '--:--'}
              </span>
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