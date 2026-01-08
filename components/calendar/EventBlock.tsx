// Componente de bloque de evento mejorado con tamaños dinámicos
// Ajusta el tamaño visual según la duración del evento

"use client"

import React, { useState, useEffect, useRef } from "react"
import {
  Moon,
  Sun,
  Clock,
  Baby,
  Utensils,
  UtensilsCrossed,
  Pill,
  Activity,
} from "lucide-react"
import { format, differenceInMinutes, differenceInHours } from "date-fns"
import { cn } from "@/lib/utils"

// Funcion auxiliar para parsear fechas ISO locales correctamente
// CORREGIDO: Usa el constructor Date nativo que respeta el offset en el string
// No usar parseISO porque puede tener comportamiento inconsistente con timezones
function parseLocalISODate(isoString: string): Date {
  // Validar que el string no este vacio
  if (!isoString || isoString === "") {
    console.error("parseLocalISODate: string vacio o undefined")
    return new Date() // Retornar fecha actual como fallback
  }

  try {
    // El constructor Date() nativo respeta el offset de timezone en el string ISO
    // ej: "2025-11-27T14:30:00.000-06:00" se interpreta correctamente
    const date = new Date(isoString)

    // Validar que la fecha sea valida
    if (isNaN(date.getTime())) {
      console.error("parseLocalISODate: fecha invalida de:", isoString)
      return new Date() // Fallback a fecha actual
    }

    return date
  } catch (error) {
    console.error("parseLocalISODate error:", error, "para string:", isoString)
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
  feedingType?: "breast" | "bottle" | "solids";
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
  onClick,
}: EventBlockProps) {
  // Estado para tooltip en mobile (click)
  const [isMobileTooltipOpen, setIsMobileTooltipOpen] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const blockRef = useRef<HTMLDivElement>(null)

  // Detectar si es dispositivo tactil
  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice(
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore - matchMedia para coarse pointer
        window.matchMedia("(pointer: coarse)").matches
      )
    }
    checkTouch()
    window.addEventListener("resize", checkTouch)
    return () => window.removeEventListener("resize", checkTouch)
  }, [])

  // Cerrar tooltip al hacer click fuera
  useEffect(() => {
    if (!isMobileTooltipOpen) return

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (blockRef.current && !blockRef.current.contains(e.target as Node)) {
        setIsMobileTooltipOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("touchstart", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
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
      if (event.endTime && event.endTime !== "" && event.startTime && event.startTime !== "") {
        const start = parseLocalISODate(event.startTime)
        const end = parseLocalISODate(event.endTime)
        
        // Validar que ambas fechas sean válidas
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          console.error("calculateEventDuration: fechas inválidas", event.startTime, event.endTime)
          return 0
        }
        
        const duration = differenceInMinutes(end, start)
        // Asegurar que la duración no sea negativa
        return Math.max(0, duration)
      }
    } catch (error) {
      console.error("calculateEventDuration error:", error)
    }
    return 0 // Eventos puntuales o error
  }

  // Calcular posición vertical según la hora - MEJORADO para consistencia
  const calculateVerticalPosition = () => {
    // Validar que startTime exista y no esté vacío
    if (!event.startTime || event.startTime === "") {
      console.warn("calculateVerticalPosition: startTime vacío para evento", event._id)
      return 0 // Posición por defecto
    }
    
    try {
      // Usar parseLocalISODate para convertir correctamente a hora local
      const date = parseLocalISODate(event.startTime)
      const hours = date.getHours()
      const minutes = date.getMinutes()
      
      // Validar rangos válidos
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        console.error("calculateVerticalPosition: hora inválida", hours, minutes, event.startTime)
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
      console.error("calculateVerticalPosition: error parsing startTime", error, event.startTime)
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
        left: "3px",
        width: "calc(100% - 6px)",
      }
    }
    // Eventos puntuales: 90% del ancho con más espacio
    return {
      left: "5px",
      width: "calc(100% - 10px)",
    }
  }

  // Obtener icono Lucide según tipo de evento - Sin emojis
  const getEventIcon = () => {
    // Ajustar tamaño del icono según altura del bloque
    const iconSize = blockHeight >= 40 ? 14 : blockHeight >= 28 ? 12 : 10
    const iconClass = `h-${iconSize <= 10 ? 3 : iconSize <= 12 ? 3.5 : 4} w-${iconSize <= 10 ? 3 : iconSize <= 12 ? 3.5 : 4}`

    switch (event.eventType) {
    case "sleep":
    case "bedtime":
      return <Moon className={iconClass} style={{ color: "#6366f1" }} /> // indigo
    case "nap":
      return <Sun className={iconClass} style={{ color: "#f59e0b" }} /> // amber
    case "wake":
      return <Sun className={iconClass} style={{ color: "#eab308" }} /> // yellow
    case "night_waking":
      return <Baby className={iconClass} style={{ color: "#a855f7" }} /> // purple
    case "feeding":
    case "night_feeding":
      // Icono segun tipo de alimentacion: solidos = diferente, liquidos = mismo
      if (event.feedingType === "solids") {
        return <UtensilsCrossed className={iconClass} style={{ color: "#22c55e" }} /> // green
      }
      // breast y bottle usan el mismo icono (liquidos)
      return <Utensils className={iconClass} style={{ color: "#22c55e" }} /> // green
    case "medication":
      return <Pill className={iconClass} style={{ color: "#3b82f6" }} /> // blue
    case "activity":
    case "extra_activities":
      return <Activity className={iconClass} style={{ color: "#f97316" }} /> // orange
    default:
      return <Clock className={iconClass} style={{ color: "#6b7280" }} /> // gray
    }
  }

  // Obtener color según tipo de evento
  const getEventColor = () => {
    switch (event.eventType) {
    case "sleep":
    case "bedtime":
      return "bg-sleep border-sleep text-white font-semibold"
    case "nap":
      return "bg-nap border-nap text-white font-semibold"
    case "wake":
      return "bg-wake border-wake text-gray-900 font-semibold"
    case "night_waking":
      return "bg-night-wake border-night-wake text-white font-semibold"
    case "feeding":
    case "night_feeding":
      return "bg-feeding border-feeding text-white font-semibold"
    case "medication":
      return "bg-medication border-medication text-white font-semibold"
    case "extra_activities":
      return "bg-extra-activity border-extra-activity text-white font-semibold"
    default:
      return "bg-gray-400 border-gray-400 text-white font-semibold"
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
      feeding: "Alimentacion",
      night_feeding: "Toma nocturna",
      medication: "Medicamento",
      extra_activities: "Actividad Extra",
    }
    return types[event.eventType] || event.eventType
  }

  // Formatear tiempo del evento
  const formatEventTime = () => {
    try {
      if (!event.startTime || event.startTime === "") return "--:--"

      const start = parseLocalISODate(event.startTime)
      // Validar que la fecha sea válida antes de formatear
      if (isNaN(start.getTime())) {
        console.error("formatEventTime: fecha de inicio inválida", event.startTime)
        return "--:--"
      }

      if (event.endTime && event.endTime !== "") {
        const end = parseLocalISODate(event.endTime)
        if (isNaN(end.getTime())) {
          console.error("formatEventTime: fecha de fin inválida", event.endTime)
          return format(start, "HH:mm")
        }
        return `${format(start, "HH:mm")}-${format(end, "HH:mm")}`
      }
      return format(start, "HH:mm")
    } catch (error) {
      console.error("formatEventTime error:", error)
      return "--:--"
    }
  }

  // Formatear duración del evento
  const formatDuration = () => {
    // Priorizar event.duration si existe (ya calculado en API)
    const duration = event.duration && event.duration > 0
      ? event.duration
      : calculateEventDuration()

    if (duration <= 0) return ""
    const hours = Math.floor(duration / 60)
    const mins = duration % 60
    if (hours === 0) return `${mins}m`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}m`
  }

  // Verificar si es evento de despertar nocturno
  const isNightWaking = event.eventType === "night_waking"
  
  // Formatear tiempo compacto para mostrar en el bloque
  const formatCompactTime = () => {
    try {
      if (!event.startTime || event.startTime === "") return "--:--"
      
      const start = parseLocalISODate(event.startTime)
      // Validar que la fecha sea válida antes de formatear
      if (isNaN(start.getTime())) {
        console.error("formatCompactTime: fecha de inicio inválida", event.startTime)
        return "--:--"
      }
      
      if (event.endTime && event.endTime !== "") {
        const end = parseLocalISODate(event.endTime)
        if (isNaN(end.getTime())) {
          console.error("formatCompactTime: fecha de fin inválida", event.endTime)
          return format(start, "H:mm")
        }
        return `${format(start, "H:mm")}-${format(end, "H:mm")}`
      }
      return format(start, "H:mm")
    } catch (error) {
      console.error("formatCompactTime error:", error)
      return "--:--"
    }
  }

  // Obtener información para tooltip
  const getTooltipContent = () => {
    const duration = calculateEventDuration()
    const durationText = duration > 0 ? ` (${Math.floor(duration / 60)}h ${duration % 60}m)` : ""
    
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
  if (!event.startTime || event.startTime === "") {
    console.warn("EventBlock: evento sin startTime válido", event)
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
        minHeight: "14px",
        padding: blockHeight < 22 ? "0px 2px" : blockHeight < 35 ? "1px 4px" : "2px 6px",
        fontSize: "11px",
        ...blockStyles, // Aplicar los estilos de ancho y posición horizontal
      }}
      title={showTooltip ? undefined : `${getEventTypeName()} - ${formatEventTime()}`}
      onClick={handleBlockClick}
    >
      {/* Contenido del bloque - Ajustado dinámicamente según altura del bloque */}
      {/* UX: Eventos pequeños solo muestran emoji + horario para evitar texto apretado */}
      {/* EXCEPCION: night_waking siempre muestra duración en lugar de hora */}
      <div className="flex items-center w-full overflow-hidden justify-center">
        {blockHeight < 20 ? (
          // MUY PEQUEÑO (< 20px): Solo emoji centrado
          <div className="flex items-center justify-center">
            {getEventIcon()}
          </div>
        ) : blockHeight < 30 ? (
          // PEQUEÑO (20-30px): Emoji + hora/duración compacta
          <div className="flex items-center gap-1">
            {getEventIcon()}
            <span className="font-bold truncate" style={{ fontSize: "8px", lineHeight: "1" }}>
              {isNightWaking ? formatDuration() : format(parseLocalISODate(event.startTime), "HH:mm")}
            </span>
          </div>
        ) : blockHeight < 55 ? (
          // MEDIANO (30-55px): Emoji + hora/duración (SIN nombre para mejor legibilidad)
          <div className="flex items-center gap-1">
            {getEventIcon()}
            <span className="font-bold truncate" style={{ fontSize: isNightWaking ? "11px" : "9px", lineHeight: "1" }}>
              {isNightWaking ? formatDuration() : formatEventTime()}
            </span>
          </div>
        ) : (
          // GRANDE (> 55px): Emoji + Nombre/Duración + horario (hay suficiente espacio)
          <div className="flex items-center gap-1 w-full min-w-0">
            {getEventIcon()}
            {isNightWaking ? (
              // Para night_waking: mostrar duración grande como texto principal
              <span className="truncate font-bold" style={{ fontSize: "12px" }}>
                {formatDuration()}
              </span>
            ) : (
              <>
                <span className="truncate font-bold" style={{ fontSize: "10px" }}>
                  {getEventTypeName()}
                </span>
                <span className="font-medium opacity-90" style={{ fontSize: "9px" }}>
                  {formatEventTime()}
                </span>
              </>
            )}
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
  className,
}: {
  event: Event;
  className?: string;
}) {
  const getEventColor = () => {
    switch (event.eventType) {
    case "sleep":
    case "bedtime":
      return "bg-sleep"
    case "nap":
      return "bg-nap"
    case "wake":
      return "bg-wake"
    case "night_waking":
      return "bg-night-wake"
    case "feeding":
    case "night_feeding":
      return "bg-feeding"
    case "medication":
      return "bg-medication"
    case "extra_activities":
      return "bg-extra-activity"
    default:
      return "bg-gray-400"
    }
  }

  const getEventIcon = () => {
    const iconClass = "h-3 w-3"
    switch (event.eventType) {
    case "sleep":
    case "bedtime":
      return <Moon className={iconClass} style={{ color: "#6366f1" }} />
    case "nap":
      return <Sun className={iconClass} style={{ color: "#f59e0b" }} />
    case "wake":
      return <Sun className={iconClass} style={{ color: "#eab308" }} />
    case "night_waking":
      return <Baby className={iconClass} style={{ color: "#a855f7" }} />
    case "feeding":
    case "night_feeding":
      if (event.feedingType === "solids") {
        return <UtensilsCrossed className={iconClass} style={{ color: "#22c55e" }} />
      }
      return <Utensils className={iconClass} style={{ color: "#22c55e" }} />
    case "medication":
      return <Pill className={iconClass} style={{ color: "#3b82f6" }} />
    case "activity":
    case "extra_activities":
      return <Activity className={iconClass} style={{ color: "#f97316" }} />
    default:
      return <Clock className={iconClass} style={{ color: "#6b7280" }} />
    }
  }

  // Formatear hora con validación
  const formatTime = () => {
    try {
      if (!event.startTime || event.startTime === "") return "--:--"
      
      const date = parseLocalISODate(event.startTime)
      if (isNaN(date.getTime())) {
        console.error("CompactEventBlock: fecha inválida", event.startTime)
        return "--:--"
      }
      
      return format(date, "HH:mm")
    } catch (error) {
      console.error("CompactEventBlock format error:", error)
      return "--:--"
    }
  }

  return (
    <div className={cn(
      "flex items-center gap-1 px-1.5 py-0.5 rounded text-white",
      getEventColor(),
      className
    )} style={{ fontSize: "10px" }}>
      {getEventIcon()}
      <span className="line-clamp-1 font-medium">
        {formatTime()}
      </span>
    </div>
  )
}