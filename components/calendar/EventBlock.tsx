// Componente de bloque de evento mejorado con tamaños dinámicos
// Ajusta el tamaño visual según la duración del evento

"use client"

import React, { useState, useEffect, useRef } from 'react'
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
  // Estado para tooltip en mobile (click)
  const [isMobileTooltipOpen, setIsMobileTooltipOpen] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const blockRef = useRef<HTMLDivElement>(null)

  // Detectar si es dispositivo tactil
  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore - matchMedia para coarse pointer
        window.matchMedia('(pointer: coarse)').matches
      )
    }
    checkTouch()
    window.addEventListener('resize', checkTouch)
    return () => window.removeEventListener('resize', checkTouch)
  }, [])

  // Cerrar tooltip al hacer click fuera
  useEffect(() => {
    if (!isMobileTooltipOpen) return

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (blockRef.current && !blockRef.current.contains(e.target as Node)) {
        setIsMobileTooltipOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isMobileTooltipOpen])

  // Manejar click en el evento
  const handleBlockClick = (e: React.MouseEvent) => {
    e.stopPropagation()

    if (isTouchDevice && showTooltip) {
      // En mobile: toggle tooltip
      setIsMobileTooltipOpen(prev => !prev)
    }

    // Siempre ejecutar callback si existe
    onClick?.(event)
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

  // Calcular posición vertical según la hora - MEJORADO para consistencia
  const calculateVerticalPosition = () => {
    // Validar que startTime exista y no esté vacío
    if (!event.startTime || event.startTime === '') {
      console.warn('calculateVerticalPosition: startTime vacío para evento', event._id)
      return 0 // Posición por defecto
    }
    
    try {
      // Usar parseLocalISODate para convertir correctamente a hora local
      const date = parseLocalISODate(event.startTime)
      const hours = date.getHours()
      const minutes = date.getMinutes()
      
      // Validar rangos válidos
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        console.error('calculateVerticalPosition: hora inválida', hours, minutes, event.startTime)
        return 0
      }
      
      // Calcular minutos totales desde medianoche
      const totalMinutes = hours * 60 + minutes
      
      // Calcular píxeles basados en la altura por hora
      const pixelsPerMinute = hourHeight / 60
      
      // Posición exacta basada en minutos
      const position = Math.round(totalMinutes * pixelsPerMinute)
      
      return position
    } catch (error) {
      console.error('calculateVerticalPosition: error parsing startTime', error, event.startTime)
      return 0
    }
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

  // Calcular ancho del bloque - Más espacio para mejor visibilidad
  const calculateBlockStyles = () => {
    const duration = calculateEventDuration()
    if (duration > 0) {
      // Eventos con duración: 95% del ancho con margen mínimo
      return {
        left: '3px',
        width: 'calc(100% - 6px)'
      }
    }
    // Eventos puntuales: 90% del ancho con más espacio
    return {
      left: '5px',
      width: 'calc(100% - 10px)'
    }
  }

  // Obtener emoji según tipo de evento - Tamaño ajustado
  const getEventEmoji = () => {
    // Ajustar tamaño del emoji según altura del bloque
    const emojiSize = blockHeight >= 40 ? "12px" : blockHeight >= 28 ? "11px" : "10px"

    switch (event.eventType) {
      case 'sleep':
      case 'bedtime':
        return <span style={{ fontSize: emojiSize }}>😴</span>
      case 'nap':
        return <span style={{ fontSize: emojiSize }}>💤</span>
      case 'wake':
        return <span style={{ fontSize: emojiSize }}>☀️</span>
      case 'night_waking':
        return <span style={{ fontSize: emojiSize }}>👶</span>
      case 'feeding':
        return <span style={{ fontSize: emojiSize }}>🍼</span>
      case 'medication':
        return <span style={{ fontSize: emojiSize }}>💊</span>
      case 'activity':
      case 'extra_activities':
        return <span style={{ fontSize: emojiSize }}>🎈</span>
      default:
        return <span style={{ fontSize: emojiSize }}>⏰</span>
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
      case 'feeding':
        return 'bg-feeding border-feeding text-white font-semibold'
      case 'medication':
        return 'bg-medication border-medication text-white font-semibold'
      case 'extra_activities':
        return 'bg-extra-activity border-extra-activity text-white font-semibold'
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
      feeding: "Alimentación",
      medication: "Medicamento",
      extra_activities: "Actividad Extra",
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
      ref={blockRef}
      className={cn(
        "absolute rounded-lg border-2 flex items-center justify-start",
        "shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer",
        "group relative",
        eventColor,
        className
      )}
      style={{
        top: `${topPosition}px`,
        height: `${blockHeight}px`,
        minHeight: '14px',
        padding: blockHeight < 22 ? '0px 2px' : blockHeight < 35 ? '1px 4px' : '2px 6px',
        fontSize: '11px',
        ...blockStyles // Aplicar los estilos de ancho y posición horizontal
      }}
      title={showTooltip ? undefined : `${getEventTypeName()} - ${formatEventTime()}`}
      onClick={handleBlockClick}
    >
      {/* Contenido del bloque - Ajustado dinámicamente según altura del bloque */}
      {/* UX: Eventos pequeños solo muestran emoji + horario para evitar texto apretado */}
      <div className="flex items-center w-full overflow-hidden justify-center">
        {blockHeight < 20 ? (
          // MUY PEQUEÑO (< 20px): Solo emoji centrado
          <div className="flex items-center justify-center">
            {getEventEmoji()}
          </div>
        ) : blockHeight < 30 ? (
          // PEQUEÑO (20-30px): Emoji + hora compacta
          <div className="flex items-center gap-0.5">
            {getEventEmoji()}
            <span className="font-bold truncate" style={{ fontSize: '8px', lineHeight: '1' }}>
              {format(parseLocalISODate(event.startTime), "HH:mm")}
            </span>
          </div>
        ) : blockHeight < 55 ? (
          // MEDIANO (30-55px): Emoji + horario completo (SIN nombre para mejor legibilidad)
          <div className="flex items-center gap-1">
            {getEventEmoji()}
            <span className="font-bold truncate" style={{ fontSize: '9px', lineHeight: '1' }}>
              {formatEventTime()}
            </span>
          </div>
        ) : (
          // GRANDE (> 55px): Emoji + Nombre + horario (hay suficiente espacio)
          <div className="flex items-center gap-1 w-full min-w-0">
            {getEventEmoji()}
            <span className="truncate font-bold" style={{ fontSize: '10px' }}>
              {getEventTypeName()}
            </span>
            <span className="font-medium opacity-90" style={{ fontSize: '9px' }}>
              {formatEventTime()}
            </span>
          </div>
        )}
      </div>

      {/* Tooltip - Hover en desktop, click en mobile */}
      {showTooltip && (
        <div
          className={cn(
            "absolute left-full top-0 ml-2 bg-gray-900 text-white p-2 rounded shadow-lg transition-opacity duration-200 z-20 whitespace-nowrap",
            // En dispositivos tactiles: controlado por estado
            isTouchDevice
              ? isMobileTooltipOpen
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none"
              // En desktop: hover con CSS
              : "opacity-0 group-hover:opacity-100 pointer-events-none"
          )}
        >
          {getTooltipContent()}
          {/* Flecha del tooltip */}
          <div className="absolute right-full top-2 border-4 border-transparent border-r-gray-900" />
          {/* Boton cerrar solo en mobile */}
          {isTouchDevice && isMobileTooltipOpen && (
            <button
              className="absolute -top-2 -right-2 bg-gray-700 hover:bg-gray-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
              onClick={(e) => {
                e.stopPropagation()
                setIsMobileTooltipOpen(false)
              }}
            >
              x
            </button>
          )}
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
      case 'feeding':
        return 'bg-feeding'
      case 'medication':
        return 'bg-medication'
      case 'extra_activities':
        return 'bg-extra-activity'
      default:
        return 'bg-gray-400'
    }
  }

  const getEventEmoji = () => {
    switch (event.eventType) {
      case 'sleep':
      case 'bedtime':
        return <span className="text-xs">😴</span>
      case 'nap':
        return <span className="text-xs">💤</span>
      case 'wake':
        return <span className="text-xs">☀️</span>
      case 'night_waking':
        return <span className="text-xs">👶</span>
      case 'feeding':
        return <span className="text-xs">🍼</span>
      case 'medication':
        return <span className="text-xs">💊</span>
      case 'activity':
      case 'extra_activities':
        return <span className="text-xs">🎈</span>
      default:
        return <span className="text-xs">⏰</span>
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
      "flex items-center gap-1 px-1.5 py-0.5 rounded text-white",
      getEventColor(),
      className
    )} style={{ fontSize: '10px' }}>
      {getEventEmoji()}
      <span className="line-clamp-1 font-medium">
        {formatTime()}
      </span>
    </div>
  )
}