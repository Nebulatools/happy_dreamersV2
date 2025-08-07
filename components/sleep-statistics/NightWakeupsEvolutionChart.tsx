import React from "react"
import { useSleepData } from "@/hooks/use-sleep-data"
import { AlertCircle, TrendingDown, TrendingUp, Minus } from "lucide-react"
import { parseISO, format, differenceInMinutes, subDays, startOfDay, isSameDay } from "date-fns"
import { es } from "date-fns/locale"

// Función para procesar evolución de despertares por fecha con detalles individuales
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

  // Contar despertares y duración por fecha con detalles individuales
  const dailyData = dates.map(date => {
    const dayEvents = nightWakingEvents.filter(event => 
      isSameDay(parseISO(event.startTime), date)
    )

    // Obtener detalles de cada despertar individual
    const wakeups = dayEvents.map(event => {
      let duration = 0
      
      if (event.endTime) {
        duration = differenceInMinutes(parseISO(event.endTime), parseISO(event.startTime))
      } else if (event.nightWakingDelay) {
        duration = event.nightWakingDelay
      } else if (event.sleepDelay) {
        duration = event.sleepDelay
      } else {
        duration = 15 // Duración estimada si no hay datos
      }
      
      return {
        duration: Math.max(duration, 5), // Mínimo 5 minutos para que sea visible
        time: format(parseISO(event.startTime), 'HH:mm', { locale: es })
      }
    })

    const count = wakeups.length
    const totalDuration = wakeups.reduce((sum, w) => sum + w.duration, 0)

    return {
      date,
      count,
      duration: totalDuration,
      wakeups, // Array de despertares individuales
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

  // Calcular el máximo de duración total para escalar las barras
  const maxDuration = Math.max(...evolutionData.map(d => d.duration), 60)
  
  // Colores para diferentes despertares (se ciclan si hay más de 5)
  const wakeupColors = [
    'from-[#FF6B6B] to-[#FF8E8E]', // Rojo
    'from-[#FFB366] to-[#FFC599]', // Naranja
    'from-[#66C3FF] to-[#99D5FF]', // Azul
    'from-[#9B66FF] to-[#B899FF]', // Morado
    'from-[#66FFB3] to-[#99FFC5]', // Verde
  ]
  
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
      
      {/* Leyenda pequeña */}
      <div className="flex items-center justify-center gap-4 mb-2 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gradient-to-t from-[#FF6B6B] to-[#FF8E8E] rounded"></div>
          <span>1er despertar</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gradient-to-t from-[#FFB366] to-[#FFC599] rounded"></div>
          <span>2do despertar</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gradient-to-t from-[#66C3FF] to-[#99D5FF] rounded"></div>
          <span>3er despertar</span>
        </div>
        <span className="text-gray-400">• La altura = duración (min)</span>
      </div>
      
      {/* Gráfica de barras apiladas */}
      <div className="flex items-end justify-between space-x-1 mb-4 relative pt-8">
        {evolutionData.map((dayData) => {
          const maxHeight = 220 // Altura máxima del contenedor (reducida para dar espacio al número)
          
          return (
            <div key={dayData.date.toISOString()} className="flex flex-col items-center flex-1 relative">
              {/* Número de despertares encima de la barra */}
              {dayData.count > 0 && (
                <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 z-10">
                  <span className="text-xs font-bold text-[#FF6B6B] bg-white px-1.5 py-0.5 rounded shadow-sm border border-gray-100">
                    {dayData.count}
                  </span>
                </div>
              )}
              
              {/* Contenedor de barras apiladas */}
              <div className="w-full max-w-8 bg-gray-100 rounded-t-sm relative" style={{ height: `${maxHeight}px` }}>
                <div className="absolute bottom-0 w-full flex flex-col justify-end">
                  {dayData.wakeups.map((wakeup, wakeupIndex) => {
                    // Calcular altura de cada segmento basado en su duración
                    const segmentHeight = maxDuration > 0 
                      ? (wakeup.duration / maxDuration) * maxHeight 
                      : 0
                    
                    const colorClass = wakeupColors[wakeupIndex % wakeupColors.length]
                    
                    return (
                      <div
                        key={wakeupIndex}
                        className={`w-full bg-gradient-to-t ${colorClass} transition-all duration-1000 relative group`}
                        style={{ 
                          height: `${Math.max(segmentHeight, dayData.count > 0 ? 8 : 0)}px`,
                          borderTop: wakeupIndex > 0 ? '1px solid rgba(255, 255, 255, 0.3)' : 'none'
                        }}
                        title={`Despertar ${wakeupIndex + 1}: ${wakeup.duration} min a las ${wakeup.time}`}
                      >
                        {/* Mostrar duración en hover si el segmento es suficientemente grande */}
                        {segmentHeight > 20 && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs text-white font-bold drop-shadow">
                              {wakeup.duration}m
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
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
          <span>Promedio de despertares:</span>
          <span className="font-medium text-[#FF6B6B]">
            {(evolutionData.reduce((sum, d) => sum + d.count, 0) / evolutionData.length).toFixed(1)} por noche
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span>Duración promedio total:</span>
          <span className="font-medium text-[#FF9F40]">
            {Math.round(evolutionData.reduce((sum, d) => sum + d.duration, 0) / evolutionData.filter(d => d.count > 0).length || 0)} min/noche
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