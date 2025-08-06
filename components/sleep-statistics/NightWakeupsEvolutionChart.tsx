import React from "react"
import { useSleepData } from "@/hooks/use-sleep-data"
import { AlertCircle, TrendingDown, TrendingUp, Minus } from "lucide-react"
import { parseISO, format, differenceInMinutes, subDays, startOfDay, isSameDay } from "date-fns"
import { es } from "date-fns/locale"

// Función para procesar evolución de despertares por fecha
function processNightWakeupsEvolution(events: any[], dateRange: string) {
  const now = new Date()
  let daysToSubtract = 7

  if (dateRange === "30-days") {
    daysToSubtract = 30
  } else if (dateRange === "90-days") {
    daysToSubtract = 90
  }

  // Crear array de fechas para el período
  const dates = []
  for (let i = daysToSubtract - 1; i >= 0; i--) {
    dates.push(subDays(now, i))
  }

  // Procesar eventos de despertares nocturnos
  const nightWakingEvents = events.filter(event => 
    event.eventType === 'night_waking' && event.startTime
  )

  // Contar despertares y duración por fecha
  const dailyData = dates.map(date => {
    const dayEvents = nightWakingEvents.filter(event => 
      isSameDay(parseISO(event.startTime), date)
    )

    const count = dayEvents.length
    const totalDuration = dayEvents.reduce((sum, event) => {
      if (event.endTime) {
        return sum + differenceInMinutes(parseISO(event.endTime), parseISO(event.startTime))
      }
      return sum + (event.sleepDelay || 15) // Duración estimada si no hay endTime
    }, 0)

    return {
      date,
      count,
      duration: totalDuration,
      label: format(date, 'd MMM', { locale: es })
    }
  })

  return dailyData
}

interface NightWakeupsEvolutionChartProps {
  childId: string
  dateRange?: string
}

export default function NightWakeupsEvolutionChart({ 
  childId, 
  dateRange = "7-days" 
}: NightWakeupsEvolutionChartProps) {
  const { data: sleepData, loading, error } = useSleepData(childId, dateRange)

  // Calcular evolución de datos
  const evolutionData = React.useMemo(() => {
    if (!sleepData?.events) return []
    return processNightWakeupsEvolution(sleepData.events, dateRange)
  }, [sleepData, dateRange])

  // Calcular tendencia
  const trend = React.useMemo(() => {
    if (evolutionData.length < 2) return null
    
    const firstHalf = evolutionData.slice(0, Math.floor(evolutionData.length / 2))
    const secondHalf = evolutionData.slice(Math.floor(evolutionData.length / 2))
    
    const firstHalfAvg = firstHalf.reduce((sum, day) => sum + day.count, 0) / firstHalf.length
    const secondHalfAvg = secondHalf.reduce((sum, day) => sum + day.count, 0) / secondHalf.length
    
    const difference = secondHalfAvg - firstHalfAvg
    
    if (Math.abs(difference) < 0.1) {
      return { type: 'stable', icon: Minus, color: 'text-gray-600', text: 'Estable' }
    } else if (difference < 0) {
      return { type: 'improving', icon: TrendingDown, color: 'text-green-600', text: 'Mejorando' }
    } else {
      return { type: 'worsening', icon: TrendingUp, color: 'text-red-600', text: 'Empeorando' }
    }
  }, [evolutionData])

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

  if (error || evolutionData.length === 0) {
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

  const maxCount = Math.max(...evolutionData.map(d => d.count), 1)
  
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-[#2F2F2F]">
          Evolución de despertares nocturnos
        </h3>
        <div className="flex items-center gap-2">
          {trend && (
            <div className={`flex items-center gap-1 ${trend.color}`}>
              <trend.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{trend.text}</span>
            </div>
          )}
          <AlertCircle className="w-5 h-5 text-[#FF6B6B]" />
        </div>
      </div>
      
      {/* Gráfica de líneas y barras combinada */}
      <div className="h-64 flex items-end justify-between space-x-1 mb-4 relative">
        {evolutionData.map((dayData, index) => {
          const heightPercentage = maxCount > 0 ? (dayData.count / maxCount) * 100 : 0
          const height = (heightPercentage / 100) * 180
          
          return (
            <div key={dayData.date.toISOString()} className="flex flex-col items-center flex-1">
              {/* Barra */}
              <div className="w-full max-w-6 bg-gray-100 rounded-t-sm relative" style={{ height: '180px' }}>
                <div 
                  className={`w-full rounded-t-sm absolute bottom-0 transition-all duration-1000 ${
                    dayData.count > 0 
                      ? 'bg-gradient-to-t from-[#FF6B6B] to-[#FF8E8E]' 
                      : 'bg-gray-200'
                  }`}
                  style={{ height: `${height}px` }}
                  title={`${dayData.count} despertares - ${dayData.duration} min total`}
                />
                {/* Número de despertares encima de la barra */}
                {dayData.count > 0 && (
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                    <span className="text-xs font-bold text-[#FF6B6B] bg-white px-1 rounded shadow-sm">
                      {dayData.count}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Etiqueta de fecha */}
              <p className="mt-2 text-xs font-medium text-gray-600 text-center">
                {dayData.label}
              </p>
            </div>
          )
        })}
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
            {evolutionData.filter(d => d.count === 0).length} días
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span>Promedio diario:</span>
          <span className="font-medium text-[#FF6B6B]">
            {(evolutionData.reduce((sum, d) => sum + d.count, 0) / evolutionData.length).toFixed(1)} despertares
          </span>
        </div>
        
        {trend && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <span>Tendencia:</span>
            <div className={`flex items-center gap-1 font-medium ${trend.color}`}>
              <trend.icon className="w-3 w-3" />
              <span>{trend.text}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}