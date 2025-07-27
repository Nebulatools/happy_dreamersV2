import React from "react"
import { useSleepData } from "@/hooks/use-sleep-data"
import { AlertCircle } from "lucide-react"

interface NightWakeupsChartProps {
  childId: string
}

export default function NightWakeupsChart({ childId }: NightWakeupsChartProps) {
  const { data, loading, error } = useSleepData(childId)

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#2F2F2F]">
            Despertares nocturnos
          </h3>
          <AlertCircle className="w-5 h-5 text-[#FF6B6B]" />
        </div>
        <div className="h-64 flex items-center justify-center text-gray-500">
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
            Despertares nocturnos
          </h3>
          <AlertCircle className="w-5 h-5 text-[#FF6B6B]" />
        </div>
        <div className="h-64 flex items-center justify-center text-red-500">
          <p>Error al cargar datos</p>
        </div>
      </div>
    )
  }

  // Simular datos por día de la semana para el gráfico
  const daysOfWeek = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
  const wakeupsPerDay = Array.from({ length: 7 }, () => 
    Math.floor(Math.random() * (data.avgWakeupsPerNight * 2 + 1))
  )
  
  const maxWakeups = Math.max(...wakeupsPerDay, 3)
  
  const getWakeupLevel = (avg: number) => {
    if (avg < 1) return { label: 'Excelente', color: 'text-green-600' }
    if (avg <= 2) return { label: 'Normal', color: 'text-blue-600' }
    if (avg <= 3) return { label: 'Frecuente', color: 'text-yellow-600' }
    return { label: 'Muy frecuente', color: 'text-red-600' }
  }

  const level = getWakeupLevel(data.avgWakeupsPerNight)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-[#2F2F2F]">
          Despertares nocturnos
        </h3>
        <AlertCircle className="w-5 h-5 text-[#FF6B6B]" />
      </div>
      
      {/* Gráfico de barras por día */}
      <div className="h-64 flex items-end justify-center space-x-2 mb-4">
        {daysOfWeek.map((day, index) => {
          const height = maxWakeups > 0 ? (wakeupsPerDay[index] / maxWakeups) * 180 : 0
          return (
            <div key={day} className="flex flex-col items-center">
              <div className="w-8 bg-gray-100 rounded-t-sm relative" style={{ height: '180px' }}>
                <div 
                  className="w-full bg-gradient-to-t from-[#FF6B6B] to-[#FF8E8E] rounded-t-sm absolute bottom-0 transition-all duration-1000"
                  style={{ height: `${height}px` }}
                />
              </div>
              <p className="mt-2 text-xs font-medium text-gray-600">{day}</p>
              <p className="text-xs text-gray-400">{wakeupsPerDay[index]}</p>
            </div>
          )
        })}
      </div>
      
      {/* Estadísticas */}
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center justify-between">
          <span>Total de despertares:</span>
          <span className="font-medium text-[#FF6B6B]">
            {data.totalWakeups} veces
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Promedio por noche:</span>
          <span className="font-medium text-[#FF6B6B]">
            {data.avgWakeupsPerNight.toFixed(1)} veces
          </span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span>Evaluación:</span>
          <span className={`font-medium ${level.color}`}>
            {level.label}
          </span>
        </div>
      </div>
    </div>
  )
}