import React, { useState } from "react"
import { useSleepComparison } from "@/hooks/use-sleep-comparison"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface SleepComparisonProps {
  childId: string
}

export default function SleepComparison({ childId }: SleepComparisonProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('week')
  const { data, loading, error } = useSleepComparison(childId, selectedPeriod)

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[#2F2F2F] mb-4">
            Comparativa con períodos anteriores
          </h2>
          <div className="flex space-x-2">
            <Button size="sm" className="hd-gradient-button text-white">
              Esta semana
            </Button>
            <Button size="sm" variant="outline" className="text-gray-600">
              Mes anterior
            </Button>
            <Button size="sm" variant="outline" className="text-gray-600">
              3 meses
            </Button>
          </div>
        </div>
        <div className="text-center py-8 text-gray-500">
          <p>Cargando datos de comparación...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[#2F2F2F] mb-4">
            Comparativa con períodos anteriores
          </h2>
        </div>
        <div className="text-center py-8 text-red-500">
          <p>Error al cargar datos de comparación</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
        <h2 className="text-xl font-bold text-[#2F2F2F] mb-4">
          Comparativa con períodos anteriores
        </h2>
        <p className="text-gray-500">No hay suficientes datos para comparar</p>
      </div>
    )
  }

  const getTrendIcon = (change: number, reverse: boolean = false) => {
    const isPositive = reverse ? change < 0 : change > 0
    const isNegative = reverse ? change > 0 : change < 0
    
    if (Math.abs(change) < 0.1) return <Minus className="w-4 h-4 text-gray-500" />
    if (isPositive) return <TrendingUp className="w-4 h-4 text-green-500" />
    if (isNegative) return <TrendingDown className="w-4 h-4 text-red-500" />
    return <Minus className="w-4 h-4 text-gray-500" />
  }

  const getTrendColor = (change: number, reverse: boolean = false) => {
    const isPositive = reverse ? change < 0 : change > 0
    const isNegative = reverse ? change > 0 : change < 0
    
    if (Math.abs(change) < 0.1) return 'text-gray-600'
    if (isPositive) return 'text-green-600'
    if (isNegative) return 'text-red-600'
    return 'text-gray-600'
  }

  const formatChange = (change: number, unit: string = 'h') => {
    const sign = change > 0 ? '+' : ''
    if (unit === 'min') {
      return `${sign}${Math.round(change)} ${unit}`
    }
    return `${sign}${change.toFixed(1)} ${unit}`
  }

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'week': return 'semana anterior'
      case 'month': return 'mes anterior'
      case 'quarter': return '3 meses atrás'
      default: return 'período anterior'
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#2F2F2F] mb-4">
          Comparativa con períodos anteriores
        </h2>
        <div className="flex space-x-2">
          <Button 
            size="sm" 
            className={selectedPeriod === 'week' ? 'hd-gradient-button text-white' : 'text-gray-600'}
            variant={selectedPeriod === 'week' ? 'default' : 'outline'}
            onClick={() => setSelectedPeriod('week')}
          >
            Esta semana
          </Button>
          <Button 
            size="sm" 
            className={selectedPeriod === 'month' ? 'hd-gradient-button text-white' : 'text-gray-600'}
            variant={selectedPeriod === 'month' ? 'default' : 'outline'}
            onClick={() => setSelectedPeriod('month')}
          >
            Mes anterior
          </Button>
          <Button 
            size="sm" 
            className={selectedPeriod === 'quarter' ? 'hd-gradient-button text-white' : 'text-gray-600'}
            variant={selectedPeriod === 'quarter' ? 'default' : 'outline'}
            onClick={() => setSelectedPeriod('quarter')}
          >
            3 meses
          </Button>
        </div>
      </div>
      
      {/* Tabla comparativa */}
      <div className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-700">Métrica</th>
              <th className="text-center py-3 px-4 font-medium text-gray-700">Actual</th>
              <th className="text-center py-3 px-4 font-medium text-gray-700">
                {getPeriodLabel()}
              </th>
              <th className="text-center py-3 px-4 font-medium text-gray-700">Cambio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr className="hover:bg-gray-50 transition-colors">
              <td className="py-4 px-4 font-medium text-gray-900">Duración del sueño</td>
              <td className="py-4 px-4 text-center text-blue-600 font-semibold">
                {data.sleepDuration.current.toFixed(1)}h
              </td>
              <td className="py-4 px-4 text-center text-gray-600">
                {data.sleepDuration.previous.toFixed(1)}h
              </td>
              <td className="py-4 px-4 text-center">
                <div className="flex items-center justify-center space-x-1">
                  {getTrendIcon(data.sleepDuration.change)}
                  <span className={getTrendColor(data.sleepDuration.change)}>
                    {formatChange(data.sleepDuration.change)}
                  </span>
                </div>
              </td>
            </tr>
            
            <tr className="hover:bg-gray-50 transition-colors">
              <td className="py-4 px-4 font-medium text-gray-900">Despertares por noche</td>
              <td className="py-4 px-4 text-center text-red-600 font-semibold">
                {data.wakeups.current.toFixed(1)}
              </td>
              <td className="py-4 px-4 text-center text-gray-600">
                {data.wakeups.previous.toFixed(1)}
              </td>
              <td className="py-4 px-4 text-center">
                <div className="flex items-center justify-center space-x-1">
                  {getTrendIcon(data.wakeups.change, true)}
                  <span className={getTrendColor(data.wakeups.change, true)}>
                    {formatChange(data.wakeups.change, '')}
                  </span>
                </div>
              </td>
            </tr>
            
            <tr className="hover:bg-gray-50 transition-colors">
              <td className="py-4 px-4 font-medium text-gray-900">Variación de horarios</td>
              <td className="py-4 px-4 text-center text-purple-600 font-semibold">
                ±{Math.round(data.consistency.current)}min
              </td>
              <td className="py-4 px-4 text-center text-gray-600">
                ±{Math.round(data.consistency.previous)}min
              </td>
              <td className="py-4 px-4 text-center">
                <div className="flex items-center justify-center space-x-1">
                  {getTrendIcon(data.consistency.change, true)}
                  <span className={getTrendColor(data.consistency.change, true)}>
                    {formatChange(data.consistency.change, 'min')}
                  </span>
                </div>
              </td>
            </tr>
            
            <tr className="hover:bg-gray-50 transition-colors">
              <td className="py-4 px-4 font-medium text-gray-900">Total horas de sueño</td>
              <td className="py-4 px-4 text-center text-green-600 font-semibold">
                {data.totalSleep.current.toFixed(1)}h
              </td>
              <td className="py-4 px-4 text-center text-gray-600">
                {data.totalSleep.previous.toFixed(1)}h
              </td>
              <td className="py-4 px-4 text-center">
                <div className="flex items-center justify-center space-x-1">
                  {getTrendIcon(data.totalSleep.change)}
                  <span className={getTrendColor(data.totalSleep.change)}>
                    {formatChange(data.totalSleep.change)}
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}