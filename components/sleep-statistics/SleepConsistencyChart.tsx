import React from "react"
import { useSleepData } from "@/hooks/use-sleep-data"
import { Moon } from "lucide-react"

interface SleepConsistencyChartProps {
  childId: string
}

export default function SleepConsistencyChart({ childId }: SleepConsistencyChartProps) {
  const { data, loading, error } = useSleepData(childId)

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#2F2F2F]">
            Consistencia de horarios
          </h3>
          <Moon className="w-5 h-5 text-[#8B7ADD]" />
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
            Consistencia de horarios
          </h3>
          <Moon className="w-5 h-5 text-[#8B7ADD]" />
        </div>
        <div className="h-64 flex items-center justify-center text-red-500">
          <p>Error al cargar datos</p>
        </div>
      </div>
    )
  }

  // Crear una visualización simple de consistencia
  const variationLevel = data.bedtimeVariation <= 15 ? 'excellent' : 
                        data.bedtimeVariation <= 30 ? 'good' : 
                        data.bedtimeVariation <= 45 ? 'fair' : 'poor'
  
  const consistencyScore = Math.max(0, 100 - data.bedtimeVariation)
  const consistencyPercentage = (consistencyScore / 100) * 100

  const getConsistencyColor = () => {
    if (variationLevel === 'excellent') return 'from-green-400 to-green-500'
    if (variationLevel === 'good') return 'from-blue-400 to-blue-500'
    if (variationLevel === 'fair') return 'from-yellow-400 to-yellow-500'
    return 'from-red-400 to-red-500'
  }

  const getConsistencyLabel = () => {
    if (variationLevel === 'excellent') return 'Excelente'
    if (variationLevel === 'good') return 'Buena'
    if (variationLevel === 'fair') return 'Regular'
    return 'Necesita mejorar'
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-[#2F2F2F]">
          Consistencia de horarios
        </h3>
        <Moon className="w-5 h-5 text-[#8B7ADD]" />
      </div>
      
      {/* Medidor circular simple */}
      <div className="h-64 flex flex-col items-center justify-center">
        <div className="relative w-32 h-32 mb-6">
          {/* Círculo de fondo */}
          <div className="w-full h-full bg-gray-200 rounded-full"></div>
          
          {/* Círculo de progreso */}
          <div 
            className={`absolute top-0 left-0 w-full h-full rounded-full bg-gradient-to-r ${getConsistencyColor()} opacity-80`}
            style={{
              clipPath: `polygon(50% 50%, 50% 0%, ${50 + (consistencyPercentage / 100) * 50}% 0%, 100% 100%, 0% 100%)`
            }}
          ></div>
          
          {/* Texto central */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-[#2F2F2F]">
              {Math.round(consistencyScore)}%
            </span>
            <span className="text-xs text-gray-600">Consistencia</span>
          </div>
        </div>
        
        <div className="text-center">
          <p className={`text-sm font-medium ${
            variationLevel === 'excellent' ? 'text-green-600' :
            variationLevel === 'good' ? 'text-blue-600' :
            variationLevel === 'fair' ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {getConsistencyLabel()}
          </p>
        </div>
      </div>
      
      {/* Estadísticas */}
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center justify-between">
          <span>Hora promedio de acostarse:</span>
          <span className="font-medium text-[#8B7ADD]">
            {data.avgBedtime} ±{Math.round(data.bedtimeVariation)}min
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Hora promedio de levantarse:</span>
          <span className="font-medium text-[#8B7ADD]">
            {data.avgWakeTime}
          </span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span>Variación:</span>
          <span className={`font-medium ${
            variationLevel === 'excellent' ? 'text-green-600' :
            variationLevel === 'good' ? 'text-blue-600' :
            variationLevel === 'fair' ? 'text-yellow-600' : 'text-red-600'
          }`}>
            ±{Math.round(data.bedtimeVariation)} minutos
          </span>
        </div>
      </div>
    </div>
  )
}