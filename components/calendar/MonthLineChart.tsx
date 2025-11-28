// Componente de gráfica de líneas para visualización mensual
// Muestra la evolución de horarios de eventos a lo largo del mes

"use client"

import React, { useMemo, useState } from "react"
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Dot,
  ReferenceLine,
  Label,
} from "recharts"
import { format, getDaysInMonth, startOfMonth, addDays } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { getStartOfDayAsDate, getEndOfDayAsDate, parseTimestamp, DEFAULT_TIMEZONE } from "@/lib/datetime"

interface Event {
  _id: string
  childId: string
  eventType: string
  emotionalState: string
  startTime: string
  endTime?: string
  notes?: string
  duration?: number
  sleepDelay?: number
}

interface MonthLineChartProps {
  events: Event[]
  currentDate: Date
  onEventClick?: (event: Event) => void
  className?: string
  idealBedtime?: string  // Hora ideal de dormir del plan (ej: "20:00")
  idealWakeTime?: string // Hora ideal de despertar del plan (ej: "07:00")
  timezone?: string      // Timezone del usuario (ej: "America/Monterrey")
}

// Colores consistentes con el sistema existente
const EVENT_COLORS: Record<string, string> = {
  sleep: "#9B7EDE",      // Morado para dormir
  nap: "#FFB951",        // Naranja para siesta
  nap1: "#FFB951",       // Siesta 1
  nap2: "#FFA726",       // Siesta 2 (naranja mas oscuro)
  nap3: "#FF9800",       // Siesta 3
  wake: "#65C466",       // Verde para despertar
  night_waking: "#FF6B6B", // Rojo para despertar nocturno
}

const EVENT_LABELS: Record<string, string> = {
  sleep: "Dormir",
  nap: "Siesta",
  nap1: "Siesta 1",
  nap2: "Siesta 2",
  nap3: "Siesta 3",
  wake: "Despertar",
  night_waking: "Despertar nocturno",
}

// Maximo de siestas a mostrar individualmente
const MAX_INDIVIDUAL_NAPS = 3

export function MonthLineChart({
  events,
  currentDate,
  onEventClick,
  className,
  idealBedtime,
  idealWakeTime,
  timezone = DEFAULT_TIMEZONE,
}: MonthLineChartProps) {
  
  // Si no hay eventos, mostrar mensaje informativo
  if (!events || events.length === 0) {
    return (
      <div className={cn("w-full h-full flex items-center justify-center", className)} style={{ minHeight: "400px" }}>
        <div className="text-center">
          <div className="text-gray-400 text-lg mb-2">No hay eventos registrados este mes</div>
          <div className="text-gray-500 text-sm">
            Registra eventos de sueño para ver la evolución en la gráfica
          </div>
          <div className="text-xs text-gray-400 mt-4">
            Mes: {format(currentDate, "MMMM yyyy", { locale: es })}
          </div>
        </div>
      </div>
    )
  }
  
  // Procesar eventos para crear datos de la gráfica
  const chartData = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentDate)
    const monthStart = startOfMonth(currentDate)
    const data = []

    // Crear un punto de datos para cada día del mes
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDay = addDays(monthStart, day - 1)
      const dayStr = format(currentDay, "yyyy-MM-dd")

      const dayData: any = {
        day: day,
        dayLabel: format(currentDay, "d", { locale: es }),
        fullDate: dayStr,
      }

      // Procesar eventos del día por tipo
      // CORRECCION: Usar comparacion de objetos Date con timezone en lugar de strings
      // para manejar correctamente las zonas horarias
      const dayStartDate = getStartOfDayAsDate(currentDay, timezone)
      const dayEndDate = getEndOfDayAsDate(currentDay, timezone)

      const dayEvents = events.filter(event => {
        if (!event.startTime) return false
        const eventDate = parseTimestamp(event.startTime)
        return eventDate >= dayStartDate && eventDate <= dayEndDate
      })

      // Tambien buscar eventos de sleep que TERMINAN en este dia (para despertar)
      const wakeFromSleep = events.filter(event => {
        if (event.eventType === "sleep" && event.endTime) {
          const endDate = parseTimestamp(event.endTime)
          return endDate >= dayStartDate && endDate <= dayEndDate
        }
        return false
      })

      // Agrupar eventos por tipo
      const eventsByType: Record<string, { hours: number; event: Event }[]> = {}

      dayEvents.forEach(event => {
        const eventDate = new Date(event.startTime)
        const hours = eventDate.getHours() + eventDate.getMinutes() / 60

        if (!eventsByType[event.eventType]) {
          eventsByType[event.eventType] = []
        }
        eventsByType[event.eventType].push({ hours, event })
      })

      // Agregar despertares basados en endTime de eventos sleep
      wakeFromSleep.forEach(event => {
        if (event.endTime) {
          const wakeDate = new Date(event.endTime)
          const hours = wakeDate.getHours() + wakeDate.getMinutes() / 60

          if (!eventsByType["wake"]) {
            eventsByType["wake"] = []
          }
          eventsByType["wake"].push({ hours, event })
        }
      })

      // Procesar cada tipo de evento
      Object.keys(eventsByType).forEach(eventType => {
        const eventData = eventsByType[eventType]

        if (eventType === "nap" && eventData.length > 0) {
          // Para siestas: mostrar cada una individualmente (hasta MAX_INDIVIDUAL_NAPS)
          // Ordenar por hora
          eventData.sort((a, b) => a.hours - b.hours)

          eventData.slice(0, MAX_INDIVIDUAL_NAPS).forEach((item, index) => {
            const napKey = `nap${index + 1}`
            dayData[napKey] = parseFloat(item.hours.toFixed(2))
            dayData[`${napKey}_events`] = [item.event]
          })

          // Guardar todas las siestas en nap_events para referencia
          dayData["nap_events"] = eventData.map(d => d.event)
        } else {
          // Para otros tipos: calcular promedio si hay multiples
          const avgHour = eventData.reduce((sum, d) => sum + d.hours, 0) / eventData.length
          dayData[eventType] = parseFloat(avgHour.toFixed(2))
          dayData[`${eventType}_events`] = eventData.map(d => d.event)
        }
      })

      data.push(dayData)
    }

    return data
  }, [events, currentDate])
  
  // Custom tooltip para mostrar detalles del evento
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Tooltip general del día
      const nightWakingEventsForDay = payload[0]?.payload?.night_waking_events || []
      
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-sm mb-2">Día {label}</p>
          
          {/* Información existente de otros eventos */}
          {payload.map((entry: any, index: number) => {
            const eventType = entry.dataKey
            if (eventType === "night_waking") return null // Skip, se maneja aparte
            
            const events = entry.payload[`${eventType}_events`] || []
            const hours = Math.floor(entry.value)
            const minutes = Math.round((entry.value - hours) * 60)
            
            if (entry.value === undefined) return null
            
            // Para siestas individuales, mostrar "Hora:" en lugar de "Promedio:"
            const isIndividualNap = eventType.startsWith("nap")
            const timeLabel = isIndividualNap ? "Hora:" : "Promedio:"

            return (
              <div key={eventType} className="mb-1">
                <p
                  className="text-sm font-medium"
                  style={{ color: entry.color }}
                >
                  {EVENT_LABELS[eventType] || eventType}
                </p>
                <p className="text-xs text-gray-600">
                  {timeLabel} {hours.toString().padStart(2, "0")}:{minutes.toString().padStart(2, "0")}
                </p>
                {events.length > 1 && (
                  <p className="text-xs text-gray-500">
                    ({events.length} eventos)
                  </p>
                )}
              </div>
            )
          })}
          
          {/* Información detallada de despertares nocturnos */}
          {nightWakingEventsForDay.length > 0 && (
            <div className="mb-1 pt-2 border-t border-gray-100">
              <p className="text-sm font-medium" style={{ color: EVENT_COLORS.night_waking }}>
                Despertares nocturnos
              </p>
              <p className="text-xs text-gray-600 mb-1">
                {nightWakingEventsForDay.length} evento{nightWakingEventsForDay.length > 1 ? "s" : ""}
              </p>
              {nightWakingEventsForDay.map((event: Event, index: number) => (
                <p key={event._id} className="text-xs text-gray-500">
                  {format(new Date(event.startTime), "HH:mm")} - Duración: {event.sleepDelay || 5} min
                </p>
              ))}
            </div>
          )}
        </div>
      )
    }
    return null
  }
  
  // Custom Dot para hacer los puntos clickeables
  const CustomDot = (props: any) => {
    const { cx, cy, payload, dataKey } = props
    const events = payload[`${dataKey}_events`]
    
    if (!events || events.length === 0) return null
    
    return (
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={EVENT_COLORS[dataKey as keyof typeof EVENT_COLORS]}
        stroke="#fff"
        strokeWidth={2}
        className="cursor-pointer hover:r-6 transition-all"
        onClick={() => {
          if (events && events[0] && onEventClick) {
            onEventClick(events[0])
          }
        }}
      />
    )
  }
  
  // Formatear las etiquetas del eje Y (horas)
  const formatYAxisTick = (value: number) => {
    const hours = Math.floor(value)
    return `${hours.toString().padStart(2, "0")}:00`
  }
  
  // Determinar qué tipos de eventos mostrar (incluyendo siestas individuales)
  const eventTypes = useMemo(() => {
    const types = new Set<string>()
    const napCounts: Record<string, number> = {} // Contar siestas por dia
    let hasWakeData = false // Flag para verificar si hay datos de despertar

    events.forEach(event => {
      if (event.eventType === "nap") {
        // Para siestas, contar cuantas hay por dia
        const dayStr = event.startTime.substring(0, 10)
        napCounts[dayStr] = (napCounts[dayStr] || 0) + 1
      } else {
        types.add(event.eventType)
      }

      // Verificar si hay eventos sleep con endTime (generan datos de wake)
      if (event.eventType === "sleep" && event.endTime) {
        hasWakeData = true
      }
    })

    // Agregar 'wake' si hay datos de despertar
    if (hasWakeData) {
      types.add("wake")
    }

    // Determinar cuantas lineas de siesta necesitamos
    const maxNaps = Math.min(MAX_INDIVIDUAL_NAPS, Math.max(0, ...Object.values(napCounts)))
    for (let i = 1; i <= maxNaps; i++) {
      types.add(`nap${i}`)
    }

    return Array.from(types)
  }, [events])
  
  // Convertir hora del plan a número para el eje Y
  const convertTimeToHours = (timeString?: string) => {
    if (!timeString || !timeString.includes(":")) return null
    const [hours, minutes] = timeString.split(":").map(Number)
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
    return hours + (minutes / 60)
  }

  const idealBedtimeHours = convertTimeToHours(idealBedtime)
  const idealWakeTimeHours = convertTimeToHours(idealWakeTime)
  
  
  // Custom dot para night_waking con tamaño variable
  const NightWakingDot = (props: any) => {
    const { cx, cy, payload, dataKey } = props
    
    if (dataKey !== "night_waking") return null
    
    const events = payload[`${dataKey}_events`] || []
    if (!events || events.length === 0) return null
    
    // Para múltiples eventos en el mismo día, usar el primer evento para posicionamiento
    // y calcular un tamaño promedio
    const totalSleepDelay = events.reduce((sum: number, event: Event) => sum + (event.sleepDelay || 5), 0)
    const avgSleepDelay = totalSleepDelay / events.length
    
    // Calcular tamaño basado en duración promedio (5-60 min → 4-12px radius)
    const radius = Math.max(4, Math.min(12, (avgSleepDelay / 5) + 3))
    
    return (
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill={EVENT_COLORS.night_waking}
        stroke="#fff"
        strokeWidth={2}
        className="cursor-pointer hover:opacity-80 transition-all"
        onClick={() => {
          if (events && events[0] && onEventClick) {
            onEventClick(events[0])
          }
        }}
      />
    )
  }
  
  return (
    <div className={cn("w-full h-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />

          <XAxis
            dataKey="dayLabel"
            tick={{ fontSize: 12 }}
            interval={0}
            angle={0}
            textAnchor="middle"
            height={40}
          />

          <YAxis
            domain={[0, 24]}
            ticks={[0, 3, 6, 9, 12, 15, 18, 21, 24]}
            tickFormatter={formatYAxisTick}
            tick={{ fontSize: 12 }}
            width={80}
            reversed
            label={{
              value: "Hora del día",
              angle: -90,
              position: "insideLeft",
              style: { textAnchor: "middle", fontSize: 12, fill: "#4b5563", fontWeight: 600 },
            }}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Legend
            wrapperStyle={{ fontSize: "12px" }}
            formatter={(value) => EVENT_LABELS[value] || value}
            payload={[
              ...(eventTypes.includes("sleep") ? [{ value: "sleep", type: "line" as const, color: EVENT_COLORS.sleep }] : []),
              ...(eventTypes.includes("wake") ? [{ value: "wake", type: "line" as const, color: EVENT_COLORS.wake }] : []),
              ...(eventTypes.includes("nap1") ? [{ value: "nap1", type: "line" as const, color: EVENT_COLORS.nap1 }] : []),
              ...(eventTypes.includes("nap2") ? [{ value: "nap2", type: "line" as const, color: EVENT_COLORS.nap2 }] : []),
              ...(eventTypes.includes("nap3") ? [{ value: "nap3", type: "line" as const, color: EVENT_COLORS.nap3 }] : []),
              ...(eventTypes.includes("night_waking") ? [{ value: "night_waking", type: "circle" as const, color: EVENT_COLORS.night_waking }] : []),
            ]}
          />
          
          {/* Líneas de referencia para horas ideales del plan con colores distintivos */}
          {idealBedtimeHours !== null && (
            <ReferenceLine 
              y={idealBedtimeHours} 
              stroke="#B794F4"  // Morado claro para hora de dormir
              strokeWidth={2}
              strokeDasharray="5 5" 
              opacity={0.6}
              label={{ 
                value: `Dormir ideal: ${idealBedtime}`, 
                fontSize: 11, 
                fill: "#805AD5",  // Morado más oscuro para el texto
                fontWeight: "bold",
                position: "insideTopRight",
              }}
            />
          )}
          {idealWakeTimeHours !== null && (
            <ReferenceLine 
              y={idealWakeTimeHours} 
              stroke="#68D391"  // Verde claro para hora de despertar
              strokeWidth={2}
              strokeDasharray="5 5" 
              opacity={0.6}
              label={{ 
                value: `Despertar ideal: ${idealWakeTime}`, 
                fontSize: 11, 
                fill: "#38A169",  // Verde más oscuro para el texto
                fontWeight: "bold",
                position: "insideTopRight",
              }}
            />
          )}
          
          {/* Líneas para cada tipo de evento */}
          {eventTypes.includes("sleep") && (
            <Line
              type="monotone"
              dataKey="sleep"
              stroke={EVENT_COLORS.sleep}
              strokeWidth={2}
              dot={<CustomDot />}
              connectNulls
              name="sleep"
            />
          )}
          
          {eventTypes.includes("wake") && (
            <Line
              type="monotone"
              dataKey="wake"
              stroke={EVENT_COLORS.wake}
              strokeWidth={2}
              dot={<CustomDot />}
              connectNulls
              name="wake"
            />
          )}
          
          {/* Lineas individuales para cada siesta */}
          {eventTypes.includes("nap1") && (
            <Line
              type="monotone"
              dataKey="nap1"
              stroke={EVENT_COLORS.nap1}
              strokeWidth={2}
              dot={<CustomDot />}
              connectNulls
              name="nap1"
            />
          )}
          {eventTypes.includes("nap2") && (
            <Line
              type="monotone"
              dataKey="nap2"
              stroke={EVENT_COLORS.nap2}
              strokeWidth={2}
              dot={<CustomDot />}
              connectNulls
              name="nap2"
            />
          )}
          {eventTypes.includes("nap3") && (
            <Line
              type="monotone"
              dataKey="nap3"
              stroke={EVENT_COLORS.nap3}
              strokeWidth={2}
              dot={<CustomDot />}
              connectNulls
              name="nap3"
            />
          )}
          
          {/* Puntos individuales para night_waking sin líneas conectoras */}
          {eventTypes.includes("night_waking") && (
            <Line
              type="monotone"
              dataKey="night_waking"
              stroke="transparent"
              strokeWidth={0}
              dot={<NightWakingDot />}
              connectNulls={false}
              name="night_waking"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
