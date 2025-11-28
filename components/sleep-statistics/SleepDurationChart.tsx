import React from "react"
import { useSleepData } from "@/hooks/use-sleep-data"
import { Clock } from "lucide-react"
import { BaseChart, CHART_COLORS } from "@/components/charts"

interface SleepDurationChartProps {
  childId: string
  dateRange?: string
}

export default function SleepDurationChart({ childId, dateRange = "7-days" }: SleepDurationChartProps) {
  const { data, loading, error } = useSleepData(childId, dateRange)

  // Crear gráfico simple con barras CSS
  const maxHours = data ? Math.max(data.avgSleepDuration, data.avgNapDuration, 10) : 10
  const sleepPercentage = data ? (data.avgSleepDuration / maxHours) * 100 : 0
  const napPercentage = data ? (data.avgNapDuration / maxHours) * 100 : 0

  return (
    <BaseChart
      title="Duración del sueño"
      icon={Clock}
      loading={loading}
      error={error}
      noData={!data}
      height={300}
    >
      {/* Gráfico simple con barras */}
      <div className="h-64 flex items-end justify-center space-x-8 mb-4">
        {/* Barra de sueño nocturno */}
        <div className="flex flex-col items-center">
          <div className="w-16 bg-gray-100 rounded-t-lg relative" style={{ height: "200px" }}>
            <div 
              className="w-full bg-gradient-to-t from-[#628BE6] to-[#67C5FF] rounded-t-lg absolute bottom-0 transition-all duration-1000"
              style={{ height: `${sleepPercentage}%` }}
            />
          </div>
          <p className="mt-2 text-sm font-medium text-gray-700">Nocturno</p>
          <p className="text-xs text-gray-500">{data?.avgSleepDuration?.toFixed(1) || "0.0"}h</p>
        </div>
        
        {/* Barra de siestas */}
        <div className="flex flex-col items-center">
          <div className="w-16 bg-gray-100 rounded-t-lg relative" style={{ height: "200px" }}>
            <div 
              className="w-full bg-gradient-to-t from-[#FFB84D] to-[#FFDD85] rounded-t-lg absolute bottom-0 transition-all duration-1000"
              style={{ height: `${napPercentage}%` }}
            />
          </div>
          <p className="mt-2 text-sm font-medium text-gray-700">Siestas</p>
          <p className="text-xs text-gray-500">{data?.avgNapDuration?.toFixed(1) || "0.0"}h</p>
        </div>
      </div>
      
      {/* Estadísticas */}
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center justify-between">
          <span>Promedio nocturno:</span>
          <span className="font-medium text-[#628BE6]">
            {data.avgSleepDuration.toFixed(1)} horas
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Promedio siestas:</span>
          <span className="font-medium text-[#FFB84D]">
            {data.avgNapDuration.toFixed(1)} horas
          </span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="font-medium">Total diario:</span>
          <span className="font-bold text-[#2F2F2F]">
            {data?.totalSleepHours?.toFixed(1) || "0.0"} horas
          </span>
        </div>
      </div>
    </BaseChart>
  )
}