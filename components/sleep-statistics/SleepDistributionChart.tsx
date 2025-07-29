import React from "react"
import { useSleepData } from "@/hooks/use-sleep-data"
import { PieChart } from "lucide-react"

interface SleepDistributionChartProps {
  childId: string
  dateRange?: string
}

export default function SleepDistributionChart({ childId, dateRange = "7-days" }: SleepDistributionChartProps) {
  const { data, loading, error } = useSleepData(childId)

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#2F2F2F]">
            Distribución del sueño
          </h3>
          <PieChart className="w-5 h-5 text-[#4ECDC4]" />
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
            Distribución del sueño
          </h3>
          <PieChart className="w-5 h-5 text-[#4ECDC4]" />
        </div>
        <div className="h-64 flex items-center justify-center text-red-500">
          <p>Error al cargar datos</p>
        </div>
      </div>
    )
  }

  // Calcular porcentajes para el gráfico circular
  const totalHours = 24
  const sleepHours = data.totalSleepHours
  const awakeHours = totalHours - sleepHours
  
  const sleepPercentage = (sleepHours / totalHours) * 100
  const awakePercentage = (awakeHours / totalHours) * 100
  
  // Porcentajes para el SVG (círculo completo = 100)
  const sleepCircumference = (sleepPercentage / 100) * 283 // 283 ≈ circunferencia del círculo
  const awakeCircumference = (awakePercentage / 100) * 283
  
  // Recomendaciones por edad (simplificado para niños 3-12 años)
  const recommendedMin = 10
  const recommendedMax = 13
  
  const getSleepStatus = () => {
    if (sleepHours >= recommendedMin && sleepHours <= recommendedMax) {
      return { label: 'Óptimo', color: 'text-green-600' }
    } else if (sleepHours >= recommendedMin - 1 && sleepHours <= recommendedMax + 1) {
      return { label: 'Aceptable', color: 'text-blue-600' }
    } else if (sleepHours < recommendedMin) {
      return { label: 'Insuficiente', color: 'text-red-600' }
    } else {
      return { label: 'Excesivo', color: 'text-yellow-600' }
    }
  }

  const status = getSleepStatus()

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-[#2F2F2F]">
          Distribución del sueño
        </h3>
        <PieChart className="w-5 h-5 text-[#4ECDC4]" />
      </div>
      
      {/* Gráfico circular simple */}
      <div className="h-64 flex items-center justify-center">
        <div className="relative">
          {/* SVG para el gráfico circular */}
          <svg width="160" height="160" className="transform -rotate-90">
            {/* Círculo de fondo */}
            <circle
              cx="80"
              cy="80"
              r="45"
              fill="none"
              stroke="#E5E7EB"
              strokeWidth="20"
            />
            
            {/* Círculo de sueño */}
            <circle
              cx="80"
              cy="80"
              r="45"
              fill="none"
              stroke="#4ECDC4"
              strokeWidth="20"
              strokeDasharray={`${sleepCircumference} 283`}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          
          {/* Texto central */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-[#2F2F2F]">
              {sleepHours.toFixed(1)}h
            </span>
            <span className="text-xs text-gray-600">de sueño</span>
          </div>
        </div>
      </div>
      
      {/* Leyenda y estadísticas */}
      <div className="space-y-3">
        {/* Leyenda */}
        <div className="flex justify-center space-x-6 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-[#4ECDC4] rounded-full mr-2"></div>
            <span>Sueño ({sleepPercentage.toFixed(0)}%)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-gray-300 rounded-full mr-2"></div>
            <span>Despierto ({awakePercentage.toFixed(0)}%)</span>
          </div>
        </div>
        
        <div className="border-t border-gray-100 pt-3 space-y-2 text-sm text-gray-600">
          <div className="flex items-center justify-between">
            <span>Total horas de sueño:</span>
            <span className="font-medium text-[#4ECDC4]">
              {sleepHours.toFixed(1)} horas/día
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Recomendado para su edad:</span>
            <span className="font-medium text-gray-700">
              {recommendedMin}-{recommendedMax} horas/día
            </span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <span>Estado:</span>
            <span className={`font-medium ${status.color}`}>
              {status.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}