import React from "react"
import { useSleepData } from "@/hooks/use-sleep-data"
import { Moon } from "lucide-react"

interface SleepConsistencyChartProps {
  childId: string
  dateRange?: string
}


export default function SleepConsistencyChart({ childId, dateRange = "7-days" }: SleepConsistencyChartProps) {
  const { data: sleepData, loading, error } = useSleepData(childId)

  // Usar datos centralizados del hook
  const avgBedtime = sleepData?.avgBedtime || "--:--"
  const avgSleepTime = sleepData?.avgSleepTime || "--:--"
  const sleepDuration = sleepData?.avgSleepDuration || 0
  const bedtimeToSleepDiff = sleepData?.bedtimeToSleepDifference || "--"

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#2F2F2F]">
            Acostarse vs Dormir
          </h3>
          <Moon className="w-5 h-5 text-[#8B7ADD]" />
        </div>
        <div className="h-64 flex items-center justify-center text-gray-500">
          <p>Cargando datos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#2F2F2F]">
            Acostarse vs Dormir
          </h3>
          <Moon className="w-5 h-5 text-[#8B7ADD]" />
        </div>
        <div className="h-64 flex items-center justify-center text-red-500">
          <p>Error al cargar datos</p>
        </div>
      </div>
    )
  }
  
  const sleepQuality = sleepDuration >= 9 && sleepDuration <= 11 ? 'excellent' :
                      sleepDuration >= 8 && sleepDuration <= 12 ? 'good' :
                      sleepDuration >= 7 && sleepDuration <= 13 ? 'fair' : 'poor'
  
  const qualityScore = sleepDuration >= 9 && sleepDuration <= 11 ? 90 :
                      sleepDuration >= 8 && sleepDuration <= 12 ? 70 :
                      sleepDuration >= 7 && sleepDuration <= 13 ? 50 : 25

  const getSleepQualityColor = () => {
    if (sleepQuality === 'excellent') return 'from-green-400 to-green-500'
    if (sleepQuality === 'good') return 'from-blue-400 to-blue-500'
    if (sleepQuality === 'fair') return 'from-yellow-400 to-yellow-500'
    return 'from-red-400 to-red-500'
  }

  const getSleepQualityLabel = () => {
    if (sleepQuality === 'excellent') return 'Excelente'
    if (sleepQuality === 'good') return 'Buena'
    if (sleepQuality === 'fair') return 'Regular'
    return 'Necesita mejorar'
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-[#2F2F2F]">
          Acostarse vs Dormir
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
            className={`absolute top-0 left-0 w-full h-full rounded-full bg-gradient-to-r ${getSleepQualityColor()} opacity-80`}
            style={{
              clipPath: `polygon(50% 50%, 50% 0%, ${50 + (qualityScore / 100) * 50}% 0%, 100% 100%, 0% 100%)`
            }}
          ></div>
          
          {/* Texto central */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-[#2F2F2F]">
              {sleepDuration.toFixed(1)}h
            </span>
            <span className="text-xs text-gray-600">Duración</span>
          </div>
        </div>
        
        <div className="text-center">
          <p className={`text-sm font-medium ${
            sleepQuality === 'excellent' ? 'text-green-600' :
            sleepQuality === 'good' ? 'text-blue-600' :
            sleepQuality === 'fair' ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {getSleepQualityLabel()}
          </p>
        </div>
      </div>
      
      {/* Estadísticas */}
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center justify-between">
          <span>Hora de acostarse:</span>
          <span className="font-medium text-[#8B7ADD]">
            {avgBedtime}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Hora de dormir:</span>
          <span className="font-medium text-[#8B7ADD]">
            {avgSleepTime}
          </span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span>Duración del sueño:</span>
          <span className={`font-medium ${
            sleepQuality === 'excellent' ? 'text-green-600' :
            sleepQuality === 'good' ? 'text-blue-600' :
            sleepQuality === 'fair' ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {sleepDuration.toFixed(1)} horas
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Diferencia (acostarse → dormir):</span>
          <span className="font-medium text-[#FF6B7A]">
            {bedtimeToSleepDiff}
          </span>
        </div>
      </div>
    </div>
  )
}