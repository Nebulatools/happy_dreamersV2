import React from "react"
import { useSleepData } from "@/hooks/use-sleep-data"
import { AlertCircle, TrendingDown, TrendingUp, Minus, Clock, ChevronLeft, ChevronRight } from "lucide-react"
import { parseISO, format, differenceInMinutes, subDays, startOfDay, isSameDay, getHours, getMinutes } from "date-fns"
import { es } from "date-fns/locale"
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts"

// Función para convertir hora a valor decimal para el eje Y (21:00 = 21, 03:00 = 27)
function timeToDecimal(date: Date): number {
  const hours = getHours(date)
  const minutes = getMinutes(date)
  const decimal = hours + minutes / 60
  
  // Ajustar para el rango nocturno (21:00 - 06:00)
  // Si es después de las 21:00, usar la hora normal
  // Si es antes de las 6:00, sumar 24 para que aparezca después de medianoche
  if (decimal < 9) {
    return decimal + 24 // Horas de madrugada (0-8 AM -> 24-32)
  }
  return decimal // Horas nocturnas (9 PM - 11:59 PM -> 21-23.99)
}

// Función para formatear el valor decimal de vuelta a hora legible
function decimalToTimeString(decimal: number): string {
  let adjustedDecimal = decimal
  if (decimal >= 24) {
    adjustedDecimal = decimal - 24
  }
  
  const hours = Math.floor(adjustedDecimal)
  const minutes = Math.round((adjustedDecimal - hours) * 60)
  
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
}

// Función para procesar evolución de despertares por fecha con detalles individuales y tiempo
function processNightWakeupsEvolution(events: any[], dateRange: string, periodOffset: number = 0) {
  const now = new Date()
  let daysToSubtract = 7

  if (dateRange === "30-days") {
    daysToSubtract = 30
  } else if (dateRange === "90-days") {
    daysToSubtract = 90
  }

  // Calcular offset de dias basado en el periodo seleccionado
  const totalDaysOffset = Math.abs(periodOffset) * daysToSubtract

  // Crear array de fechas para el período
  const dates = []
  for (let i = daysToSubtract - 1; i >= 0; i--) {
    dates.push(subDays(now, i + totalDaysOffset))
  }

  // Procesar eventos de despertares nocturnos
  const nightWakingEvents = events.filter(event => 
    event.eventType === "night_waking" && event.startTime
  )

  // Crear datos para el scatter plot
  const scatterData: any[] = []
  const dailySummary: any[] = []

  dates.forEach((date, dateIndex) => {
    const dayEvents = nightWakingEvents.filter(event => 
      isSameDay(parseISO(event.startTime), date)
    )

    // Obtener detalles de cada despertar individual
    const wakeups = dayEvents.map((event, wakeupIndex) => {
      const eventDate = parseISO(event.startTime)
      let duration = 0

      // Prioridad: usar el campo duration ya calculado por la API
      if (event.duration && event.duration > 0) {
        duration = event.duration
      } else if (event.endTime) {
        duration = differenceInMinutes(parseISO(event.endTime), eventDate)
      } else if (event.awakeDelay) {
        duration = event.awakeDelay
      } else if (event.nightWakingDelay) {
        duration = event.nightWakingDelay
      } else {
        duration = 15 // Duración estimada si no hay datos
      }
      
      const timeDecimal = timeToDecimal(eventDate)
      
      // Agregar al scatter data
      scatterData.push({
        x: dateIndex, // Índice del día
        y: timeDecimal, // Hora como decimal
        duration: Math.max(duration, 5), // Mínimo 5 minutos
        time: format(eventDate, "HH:mm", { locale: es }),
        date: format(date, "d MMM", { locale: es }),
        dateValue: date,
        wakeupNumber: wakeupIndex + 1,
      })
      
      return {
        duration: Math.max(duration, 5),
        time: format(eventDate, "HH:mm", { locale: es }),
        timeDecimal,
      }
    })

    const count = wakeups.length
    const totalDuration = wakeups.reduce((sum, w) => sum + w.duration, 0)

    dailySummary.push({
      date,
      count,
      duration: totalDuration,
      wakeups,
      label: format(date, "d MMM", { locale: es }),
      dateIndex,
    })
  })

  return { scatterData, dailySummary, dates }
}

interface NightWakeupsEvolutionChartProps {
  childId: string
  dateRange?: string
}

// Componente de Tooltip personalizado
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
        <p className="text-sm font-semibold text-gray-900">{data.date}</p>
        <p className="text-xs text-gray-600 mt-1">Despertar #{data.wakeupNumber}</p>
        <p className="text-sm font-medium text-[#FF6B6B] mt-1">
          Hora: {data.time}
        </p>
        <p className="text-sm text-gray-700">
          Duración: {data.duration} min
        </p>
      </div>
    )
  }
  return null
}

// Componente de punto personalizado - Mejorado
const CustomDot = (props: any) => {
  const { cx, cy, payload } = props
  const size = Math.min(Math.max(payload.duration / 4, 8), 24) // Tamaño basado en duración (8-24px)
  
  return (
    <circle
      cx={cx}
      cy={cy}
      r={size}
      fill="#FF6B6B"
      fillOpacity={0.8}
      stroke="#FF4444"
      strokeWidth={2}
      className="cursor-pointer hover:fill-opacity-100"
    />
  )
}

export default function NightWakeupsEvolutionChart({
  childId,
  dateRange = "7-days",
}: NightWakeupsEvolutionChartProps) {
  // Traer 5 periodos de datos para permitir navegacion historica
  const { data: sleepData, loading, error } = useSleepData(childId, dateRange, 5)

  // Estado para navegacion entre periodos de tiempo
  const [periodOffset, setPeriodOffset] = React.useState(0)

  // Navegacion entre periodos de tiempo
  const handlePeriodNavigation = (direction: "prev" | "next") => {
    if (direction === "prev") {
      setPeriodOffset(prev => prev - 1)
    } else {
      setPeriodOffset(prev => Math.min(0, prev + 1))
    }
  }

  // Resetear offset cuando cambia el rango de fechas
  React.useEffect(() => {
    setPeriodOffset(0)
  }, [dateRange])

  // Calcular evolución de datos
  const { scatterData, dailySummary, dates } = React.useMemo(() => {
    if (!sleepData?.events) return { scatterData: [], dailySummary: [], dates: [] }
    return processNightWakeupsEvolution(sleepData.events, dateRange, periodOffset)
  }, [sleepData, dateRange, periodOffset])

  // Calcular tendencia
  const trend = React.useMemo(() => {
    if (dailySummary.length < 2) return null
    
    const firstHalf = dailySummary.slice(0, Math.floor(dailySummary.length / 2))
    const secondHalf = dailySummary.slice(Math.floor(dailySummary.length / 2))
    
    const firstHalfAvg = firstHalf.reduce((sum, day) => sum + day.count, 0) / firstHalf.length
    const secondHalfAvg = secondHalf.reduce((sum, day) => sum + day.count, 0) / secondHalf.length
    
    const difference = secondHalfAvg - firstHalfAvg
    
    if (Math.abs(difference) < 0.1) {
      return { type: "stable", icon: Minus, color: "text-gray-600", text: "Estable" }
    } else if (difference < 0) {
      // Si mejora (menos despertares), mostrar flecha verde hacia arriba
      return { type: "improving", icon: TrendingUp, color: "text-green-600", text: "Mejorando" }
    } else {
      return { type: "worsening", icon: TrendingUp, color: "text-red-600", text: "Empeorando" }
    }
  }, [dailySummary])

  const wakeDays = dailySummary.filter(day => day.count > 0)
  const daysWithoutWakeups = dailySummary.length - wakeDays.length
  const minWakeDay = wakeDays.length
    ? wakeDays.reduce((prev, current) => (current.count < prev.count ? current : prev))
    : null
  const maxWakeDay = wakeDays.length
    ? wakeDays.reduce((prev, current) => (current.count > prev.count ? current : prev))
    : null

  const formatWakeDateLabel = (date?: Date) => {
    if (!date) return "N/A"
    try {
      return format(date, "EEEE d 'de' MMM", { locale: es })
    } catch {
      return "N/A"
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#2F2F2F]">
            Evolución de despertares nocturnos
          </h3>
          <AlertCircle className="w-5 h-5 text-[#FF6B6B]" />
        </div>
        <div className="h-64 flex items-center justify-center text-gray-500">
          <p>Cargando evolución...</p>
        </div>
      </div>
    )
  }

  if (error || dailySummary.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#2F2F2F]">
            Evolución de despertares nocturnos
          </h3>
          <AlertCircle className="w-5 h-5 text-[#FF6B6B]" />
        </div>
        <div className="h-64 flex items-center justify-center text-gray-500">
          <p>No hay suficientes datos para mostrar la evolución</p>
        </div>
      </div>
    )
  }

  // Crear etiquetas para el eje X con los días
  const xAxisTicks = dates.map((date, index) => ({
    value: index,
    label: format(date, dateRange === "7-days" ? "EEE d" : "d", { locale: es }),
  }))
  
  // Crear etiquetas para el eje Y (horas nocturnas) - Formato consistente
  const yAxisTicks = [
    { value: 21, label: "21:00" },
    { value: 22, label: "22:00" },
    { value: 23, label: "23:00" },
    { value: 24, label: "00:00" },
    { value: 25, label: "01:00" },
    { value: 26, label: "02:00" },
    { value: 27, label: "03:00" },
    { value: 28, label: "04:00" },
    { value: 29, label: "05:00" },
    { value: 30, label: "06:00" },
  ]
  
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-[#2F2F2F]">
            Evolución de despertares nocturnos
          </h3>
          {dates.length > 0 && (
            <p className="text-sm text-gray-600">
              {periodOffset === 0 ? "Últimos" : ""} {dates.length} días
              {periodOffset < 0 && (
                <span className="ml-1">
                  ({format(dates[0], "d MMM", { locale: es })} - {format(dates[dates.length - 1], "d MMM", { locale: es })})
                </span>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {trend && (
            <div className={`flex items-center gap-1 ${trend.color}`}>
              <trend.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{trend.text}</span>
            </div>
          )}
          <AlertCircle className="w-5 h-5 text-[#FF6B6B]" />
          {/* Navegación de periodos */}
          <div className="flex items-center gap-1 ml-2">
            <button
              type="button"
              aria-label="Ver días anteriores"
              onClick={() => handlePeriodNavigation("prev")}
              disabled={periodOffset <= -4}
              className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-all ${
                periodOffset > -4
                  ? "border-gray-200 bg-white text-gray-700 hover:bg-gray-100 hover:border-gray-300"
                  : "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Ver días siguientes"
              onClick={() => handlePeriodNavigation("next")}
              disabled={periodOffset >= 0}
              className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-all ${
                periodOffset < 0
                  ? "border-gray-200 bg-white text-gray-700 hover:bg-gray-100 hover:border-gray-300"
                  : "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Leyenda mejorada */}
      <div className="flex items-center justify-between mb-4 text-xs text-gray-600">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-gray-500" />
            <span>Eje Y: Hora del despertar</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-[#FF6B6B] rounded-full"></div>
            <span>Tamaño = Duración (min)</span>
          </div>
        </div>
        <div className="text-gray-400">
          {scatterData.length} despertares en {dateRange === "7-days" ? "7 días" : dateRange === "30-days" ? "30 días" : "90 días"}
        </div>
      </div>
      
      {/* Nueva visualización con ScatterChart - Mejorada */}
      <div className="mb-4 -mx-4 sm:mx-0 overflow-x-auto pb-2">
        <div className="relative min-w-[680px] sm:min-w-0 ml-8 sm:ml-12 pr-16 sm:pr-[160px] overflow-visible">
          {/* Título del eje Y posicionado absolutamente (oculto en mobile para ganar espacio) */}
          <div
            className="absolute hidden sm:block"
            style={{
              left: "-60px",
              top: "45%",
              transform: "rotate(-90deg) translateY(-50%)",
              transformOrigin: "center",
              fontSize: "13px",
              fontWeight: 600,
              color: "#4b5563",
              whiteSpace: "nowrap",
              zIndex: 10,
            }}
          >
            Hora del despertar
          </div>
          {/* Contador de despertares por día ARRIBA del gráfico - PERFECTAMENTE ALINEADO */}
          <div
            className="relative ml-[68px] sm:ml-[85px] mr-[120px] sm:mr-[160px] h-7 mb-1 grid"
            style={{
              gridTemplateColumns: `repeat(${dailySummary.length}, 1fr)`,
              alignItems: "center",
            }}
          >
            {dailySummary.map((day) => (
              <div 
                key={day.date.toISOString()} 
                className="flex items-center justify-center"
              >
                {day.count > 0 ? (
                  <span className="text-xs font-bold text-[#FF6B6B] bg-red-50 px-1.5 py-0.5 rounded-full">
                    {day.count}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 font-medium">0</span>
                )}
              </div>
            ))}
          </div>
          
          <ResponsiveContainer width="100%" height={380}>
            <ScatterChart
              margin={{ top: 5, right: 140, bottom: 50, left: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              
              {/* Eje X - Días */}
              <XAxis
                type="number"
                dataKey="x"
                domain={[0, dates.length - 1]}
                ticks={xAxisTicks.map(t => t.value)}
                tickFormatter={(value) => xAxisTicks[value]?.label || ""}
                stroke="#6b7280"
                fontSize={12}
                tick={{ fontSize: 12 }}
                label={{ value: "", position: "insideBottom", offset: -5 }}
                padding={{ left: 0, right: 0 }}
                interval={0}
              />
              
              {/* Eje Y - Horas (invertido para que 21:00 esté arriba) */}
              <YAxis 
                type="number"
                dataKey="y"
                domain={[21, 30]}
                reversed={false}
                ticks={yAxisTicks.map(t => t.value)}
                tickFormatter={(value) => {
                  const tick = yAxisTicks.find(t => t.value === value)
                  return tick ? tick.label : ""
                }}
                stroke="#6b7280"
                fontSize={12}
                tick={{ fontSize: 12 }}
              />
              
              {/* Líneas de referencia para zonas importantes - Más visibles */}
              <ReferenceLine 
                y={24} 
                stroke="#8b5cf6" 
                strokeWidth={2}
                strokeDasharray="8 4"
                label={{ 
                  value: "MEDIANOCHE", 
                  position: "right", 
                  fontSize: 11, 
                  fill: "#7c3aed",
                  fontWeight: 600,
                  offset: 10,
                }}
              />
              <ReferenceLine 
                y={27} 
                stroke="#f97316" 
                strokeWidth={2}
                strokeDasharray="8 4"
                strokeOpacity={0.8}
                label={{ 
                  value: "3 AM - Sueño profundo", 
                  position: "right", 
                  fontSize: 11, 
                  fill: "#ea580c",
                  fontWeight: 600,
                  offset: 10,
                }}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              {/* Puntos de despertares */}
              <Scatter
                name="Despertares"
                data={scatterData}
                fill="#FF6B6B"
                shape={<CustomDot />}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Estadísticas de evolución */}
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center justify-between">
          <span>Período analizado:</span>
          <span className="font-medium text-[#2F2F2F]">
            {dateRange === "7-days" ? "7 días" : 
              dateRange === "30-days" ? "30 días" : "90 días"}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span>Días sin despertares:</span>
          <span className="font-medium text-green-600">
            {daysWithoutWakeups} días
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span>Días con despertares:</span>
          <span className="font-medium text-[#FF6B6B]">
            {wakeDays.length} días
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span>Despertar mínimo:</span>
          <span className="font-medium text-[#2F2F2F] text-right">
            {minWakeDay
              ? `${minWakeDay.count} ${minWakeDay.count === 1 ? "despertar" : "despertares"} · ${formatWakeDateLabel(minWakeDay.date)}`
              : "Sin datos"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span>Despertar máximo:</span>
          <span className="font-medium text-[#2F2F2F] text-right">
            {maxWakeDay
              ? `${maxWakeDay.count} ${maxWakeDay.count === 1 ? "despertar" : "despertares"} · ${formatWakeDateLabel(maxWakeDay.date)}`
              : "Sin datos"}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span>Duración promedio total:</span>
          <span className="font-medium text-[#FF9F40]">
            {Math.round(dailySummary.reduce((sum, d) => sum + d.duration, 0) / dailySummary.filter(d => d.count > 0).length || 0)} min/noche
          </span>
        </div>
        
        {/* Nueva estadística: Hora más frecuente de despertares */}
        <div className="flex items-center justify-between">
          <span>Hora más frecuente:</span>
          <span className="font-medium text-[#9B66FF]">
            {(() => {
              if (scatterData.length === 0) return "N/A"
              const hourCounts: { [key: string]: number } = {}
              scatterData.forEach(point => {
                const hour = Math.floor(point.y)
                hourCounts[hour] = (hourCounts[hour] || 0) + 1
              })
              const maxHour = Object.entries(hourCounts).reduce((a, b) => 
                b[1] > a[1] ? b : a
              )[0]
              return decimalToTimeString(Number(maxHour))
            })()}
          </span>
        </div>
        
        {trend && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <span>Tendencia:</span>
            <div className={`flex items-center gap-1 font-medium ${trend.color}`}>
              <trend.icon className="w-3 h-3" />
              <span>{trend.text}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
