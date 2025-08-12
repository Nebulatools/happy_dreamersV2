import React from "react"
import { useSleepData } from "@/hooks/use-sleep-data"
import { Clock, Moon, Sun, Activity } from "lucide-react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

interface SleepDistributionChartProps {
  childId: string
  dateRange?: string
}

export default function SleepDistributionChart({ childId, dateRange = "7-days" }: SleepDistributionChartProps) {
  const { data, loading, error } = useSleepData(childId, dateRange)

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#2F2F2F]">
            Distribución del sueño
          </h3>
          <Clock className="w-5 h-5 text-[#4ECDC4]" />
        </div>
        <div className="h-96 flex items-center justify-center text-gray-500">
          <p>Cargando datos...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#2F2F2F]">
            Distribución del sueño
          </h3>
          <Clock className="w-5 h-5 text-[#4ECDC4]" />
        </div>
        <div className="h-96 flex items-center justify-center text-red-500">
          <p>Error al cargar datos</p>
        </div>
      </div>
    )
  }

  // Calcular porcentajes para nocturno vs siestas
  const totalSleep = data.nightSleepHours + data.napHours
  const nightPercentage = totalSleep > 0 ? (data.nightSleepHours / totalSleep) * 100 : 0
  const napPercentage = totalSleep > 0 ? (data.napHours / totalSleep) * 100 : 0

  // Función para obtener color según duración del período
  const getWindowColor = (minutes: number) => {
    if (minutes < 120) return "#60A5FA" // Azul claro < 2h
    if (minutes < 180) return "#86EFAC" // Verde suave 2-3h
    if (minutes < 240) return "#FDE047" // Amarillo suave 3-4h
    if (minutes < 300) return "#FDBA74" // Naranja suave 4-5h
    return "#FCA5A5" // Rojo suave > 5h
  }

  const getWindowColorClass = (minutes: number) => {
    if (minutes < 120) return "bg-blue-100 text-blue-700"
    if (minutes < 180) return "bg-green-100 text-green-700"
    if (minutes < 240) return "bg-yellow-100 text-yellow-700"
    if (minutes < 300) return "bg-orange-100 text-orange-700"
    return "bg-red-100 text-red-700"
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-[#2F2F2F]">
          Distribución del sueño
        </h3>
        <Clock className="w-5 h-5 text-[#4ECDC4]" />
      </div>

      {/* Sección 1: Timeline Visual del Día */}
      <div className="mb-8">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">
          Timeline del día
          {data.awakePeriods.length > 0 && data.awakePeriods[0].durationFormatted.includes('promedio') && (
            <span className="ml-2 text-xs font-normal text-gray-500">
              (Mostrando promedios de {dateRange.replace('-', ' ')})
            </span>
          )}
        </h4>
        <div className="relative h-20 bg-gray-50 rounded-lg p-2">
          {/* Marcadores de hora */}
          <div className="absolute inset-x-0 top-0 flex justify-between px-2 text-xs text-gray-400">
            <span>6am</span>
            <span>12pm</span>
            <span>6pm</span>
            <span>12am</span>
            <span>6am</span>
          </div>
          
          {/* Barra de timeline */}
          <div className="relative mt-6 h-8 bg-gray-200 rounded-full overflow-hidden">
            {/* Bloques de períodos despierto del día */}
            {data.awakePeriods.map((period, index) => {
              // Solo mostrar en timeline si tiene horarios reales (no es promedio)
              if (!period.durationFormatted.includes('promedio')) {
                const startHour = parseISO(period.startTime).getHours()
                const startMinutes = parseISO(period.startTime).getMinutes()
                const startPercent = ((startHour + startMinutes/60) / 24) * 100
                const durationPercent = (period.duration / (24 * 60)) * 100
                
                return (
                  <div
                    key={index}
                    className="absolute h-full"
                    style={{
                      left: `${startPercent}%`,
                      width: `${durationPercent}%`,
                      backgroundColor: getWindowColor(period.duration),
                      opacity: 0.7
                    }}
                    title={`${period.period}: ${period.durationFormatted}`}
                  />
                )
              }
              return null
            })}
          </div>
        </div>
      </div>

      {/* Sección 2: Distribución Nocturno vs Siestas */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {/* Donut Chart */}
        <div className="flex items-center justify-center">
          <div className="relative">
            <svg width="120" height="120" className="transform -rotate-90">
              {/* Círculo de fondo */}
              <circle
                cx="60"
                cy="60"
                r="35"
                fill="none"
                stroke="#E5E7EB"
                strokeWidth="15"
              />
              
              {/* Círculo de sueño nocturno */}
              <circle
                cx="60"
                cy="60"
                r="35"
                fill="none"
                stroke="#1E40AF"
                strokeWidth="15"
                strokeDasharray={`${(nightPercentage / 100) * 220} 220`}
                className="transition-all duration-1000"
              />
              
              {/* Círculo de siestas */}
              <circle
                cx="60"
                cy="60"
                r="35"
                fill="none"
                stroke="#FBBF24"
                strokeWidth="15"
                strokeDasharray={`${(napPercentage / 100) * 220} 220`}
                strokeDashoffset={`-${(nightPercentage / 100) * 220}`}
                className="transition-all duration-1000"
              />
            </svg>
            
            {/* Texto central */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-[#2F2F2F]">
                {data.totalSleepHours.toFixed(1)}h
              </span>
              <span className="text-xs text-gray-600">total</span>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Moon className="w-4 h-4 mr-2 text-[#1E40AF]" />
              <span className="text-sm">Nocturno:</span>
            </div>
            <span className="text-sm font-semibold text-[#1E40AF]">
              {data.nightSleepHours.toFixed(1)}h ({nightPercentage.toFixed(0)}%)
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Sun className="w-4 h-4 mr-2 text-[#FBBF24]" />
              <span className="text-sm">Siestas:</span>
            </div>
            <span className="text-sm font-semibold text-[#FBBF24]">
              {data.napHours.toFixed(1)}h ({napPercentage.toFixed(0)}%)
            </span>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total diario:</span>
              <span className="text-sm font-semibold text-[#4ECDC4]">
                {data.totalSleepHours.toFixed(1)} horas
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sección 3: Tiempo despierto */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
          <Activity className="w-4 h-4 mr-2" />
          Tiempo despierto entre sueños
        </h4>
        
        {data.awakePeriods.length > 0 ? (
          <div className="space-y-2">
            {data.awakePeriods.map((period, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`px-2 py-1 rounded-md text-xs font-medium ${getWindowColorClass(period.duration)}`}>
                    {period.period}
                  </div>
                  {!period.durationFormatted.includes('promedio') ? (
                    <div className="text-sm text-gray-600">
                      {format(parseISO(period.startTime), "HH:mm", { locale: es })} - 
                      {format(parseISO(period.endTime), "HH:mm", { locale: es })}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 italic">
                      Promedio del período
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-4">
                  {/* Barra visual de duración */}
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${Math.min((period.duration / 300) * 100, 100)}%`,
                        backgroundColor: getWindowColor(period.duration)
                      }}
                    />
                  </div>
                  
                  <span className="text-sm font-semibold text-gray-700 min-w-[60px] text-right">
                    {period.durationFormatted}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Activity className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No hay registros de tiempo despierto para hoy</p>
            <p className="text-xs mt-1">Registra cuando duerme y despierta para ver esta información</p>
          </div>
        )}

        {/* Leyenda de colores */}
        {data.awakePeriods.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            {data.awakePeriods[0].durationFormatted.includes('promedio') && (
              <p className="text-xs text-blue-600 mb-2">
                ℹ️ Mostrando promedios basados en los últimos {dateRange.replace('-days', ' días')}
              </p>
            )}
            <p className="text-xs text-gray-500 mb-2">Escala de duración:</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-blue-300 mr-1"></span> &lt; 2h
              </span>
              <span className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-green-300 mr-1"></span> 2-3h
              </span>
              <span className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-yellow-300 mr-1"></span> 3-4h
              </span>
              <span className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-orange-300 mr-1"></span> 4-5h
              </span>
              <span className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-red-300 mr-1"></span> &gt; 5h
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}