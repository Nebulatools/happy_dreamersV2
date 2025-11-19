// Componente de gráfica de líneas para visualización mensual
// Muestra la evolución de horarios de eventos a lo largo del mes

"use client"

import React, { useMemo, useState } from 'react'
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
} from 'recharts'
import { format, getDaysInMonth, startOfMonth, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

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

interface MonthLineChartProps {
  events: Event[]
  currentDate: Date
  onEventClick?: (event: Event) => void
  className?: string
  idealBedtime?: string  // Hora ideal de dormir del plan (ej: "20:00")
  idealWakeTime?: string // Hora ideal de despertar del plan (ej: "07:00")
}

// Colores consistentes con el sistema existente
const EVENT_COLORS = {
  sleep: '#9B7EDE',      // Morado para dormir
  nap: '#FFB951',        // Naranja para siesta
  wake: '#65C466',       // Verde para despertar
  night_waking: '#FF6B6B' // Rojo para despertar nocturno
}

const EVENT_LABELS = {
  sleep: 'Dormir',
  nap: 'Siesta',
  wake: 'Despertar',
  night_waking: 'Despertar nocturno'
}

export function MonthLineChart({ 
  events, 
  currentDate, 
  onEventClick,
  className,
  idealBedtime = "20:00",  // Valor por defecto si no hay plan
  idealWakeTime = "07:00"  // Valor por defecto si no hay plan
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
      const dayStr = format(currentDay, 'yyyy-MM-dd')
      
      const dayData: any = {
        day: day,
        dayLabel: format(currentDay, 'd', { locale: es }),
        fullDate: dayStr
      }
      
      // Procesar eventos del día por tipo
      const dayEvents = events.filter(event => 
        event.startTime.startsWith(dayStr)
      )
      
      // Agrupar eventos por tipo y obtener la hora promedio
      const eventsByType: Record<string, number[]> = {}
      
      dayEvents.forEach(event => {
        const eventDate = new Date(event.startTime)
        const hours = eventDate.getHours() + eventDate.getMinutes() / 60
        
        if (!eventsByType[event.eventType]) {
          eventsByType[event.eventType] = []
        }
        eventsByType[event.eventType].push(hours)
      })
      
      // Calcular hora promedio para cada tipo de evento
      Object.keys(eventsByType).forEach(eventType => {
        const hours = eventsByType[eventType]
        const avgHour = hours.reduce((sum, h) => sum + h, 0) / hours.length
        dayData[eventType] = parseFloat(avgHour.toFixed(2))
        // Guardar los eventos originales para el tooltip
        dayData[`${eventType}_events`] = dayEvents.filter(e => e.eventType === eventType)
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
            if (eventType === 'night_waking') return null // Skip, se maneja aparte
            
            const events = entry.payload[`${eventType}_events`] || []
            const hours = Math.floor(entry.value)
            const minutes = Math.round((entry.value - hours) * 60)
            
            if (entry.value === undefined) return null
            
            return (
              <div key={eventType} className="mb-1">
                <p 
                  className="text-sm font-medium"
                  style={{ color: entry.color }}
                >
                  {EVENT_LABELS[eventType as keyof typeof EVENT_LABELS] || eventType}
                </p>
                <p className="text-xs text-gray-600">
                  Promedio: {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
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
                {nightWakingEventsForDay.length} evento{nightWakingEventsForDay.length > 1 ? 's' : ''}
              </p>
              {nightWakingEventsForDay.map((event: Event, index: number) => (
                <p key={event._id} className="text-xs text-gray-500">
                  {format(new Date(event.startTime), 'HH:mm')} - Duración: {event.sleepDelay || 5} min
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
    return `${hours.toString().padStart(2, '0')}:00`
  }
  
  // Determinar qué tipos de eventos mostrar
  const eventTypes = useMemo(() => {
    const types = new Set<string>()
    events.forEach(event => types.add(event.eventType))
    return Array.from(types)
  }, [events])
  
  // Convertir hora del plan a número para el eje Y
  const convertTimeToHours = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number)
    return hours + (minutes / 60)
  }
  
  const idealBedtimeHours = convertTimeToHours(idealBedtime)
  const idealWakeTimeHours = convertTimeToHours(idealWakeTime)
  
  
  // Custom dot para night_waking con tamaño variable
  const NightWakingDot = (props: any) => {
    const { cx, cy, payload, dataKey } = props
    
    if (dataKey !== 'night_waking') return null
    
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
          margin={{ top: 20, right: 30, left: 80, bottom: 40 }}
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
            width={60}
            reversed
          >
            <Label
              value="Hora del día"
              position="left"
              angle={-90}
              style={{ textAnchor: "middle", fontSize: 12, fill: "#4b5563", fontWeight: 600 }}
              offset={-55}
            />
          </YAxis>
          
          <Tooltip content={<CustomTooltip />} />
          
          <Legend 
            wrapperStyle={{ fontSize: '12px' }}
            formatter={(value) => EVENT_LABELS[value as keyof typeof EVENT_LABELS] || value}
            payload={[
              ...(eventTypes.includes('sleep') ? [{ value: 'sleep', type: 'line', color: EVENT_COLORS.sleep }] : []),
              ...(eventTypes.includes('wake') ? [{ value: 'wake', type: 'line', color: EVENT_COLORS.wake }] : []),
              ...(eventTypes.includes('nap') ? [{ value: 'nap', type: 'line', color: EVENT_COLORS.nap }] : []),
              ...(eventTypes.includes('night_waking') ? [{ value: 'night_waking', type: 'circle', color: EVENT_COLORS.night_waking }] : [])
            ]}
          />
          
          {/* Líneas de referencia para horas ideales del plan con colores distintivos */}
          <ReferenceLine 
            y={idealBedtimeHours} 
            stroke="#B794F4"  // Morado claro para hora de dormir
            strokeWidth={2}
            strokeDasharray="5 5" 
            opacity={0.6}
            label={{ 
              value: `Dormir ideal: ${idealBedtime}`, 
              fontSize: 11, 
              fill: '#805AD5',  // Morado más oscuro para el texto
              fontWeight: 'bold',
              position: 'insideTopRight'
            }}
          />
          <ReferenceLine 
            y={idealWakeTimeHours} 
            stroke="#68D391"  // Verde claro para hora de despertar
            strokeWidth={2}
            strokeDasharray="5 5" 
            opacity={0.6}
            label={{ 
              value: `Despertar ideal: ${idealWakeTime}`, 
              fontSize: 11, 
              fill: '#38A169',  // Verde más oscuro para el texto
              fontWeight: 'bold',
              position: 'insideTopRight'
            }}
          />
          
          {/* Líneas para cada tipo de evento */}
          {eventTypes.includes('sleep') && (
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
          
          {eventTypes.includes('wake') && (
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
          
          {eventTypes.includes('nap') && (
            <Line
              type="monotone"
              dataKey="nap"
              stroke={EVENT_COLORS.nap}
              strokeWidth={2}
              dot={<CustomDot />}
              connectNulls
              name="nap"
            />
          )}
          
          {/* Puntos individuales para night_waking sin líneas conectoras */}
          {eventTypes.includes('night_waking') && (
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
