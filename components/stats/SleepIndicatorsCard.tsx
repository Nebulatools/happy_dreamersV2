import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sun, Moon, Clock, TrendingUp, BedDouble, Bed, Timer, CheckCircle, BarChart } from "lucide-react"

// Interfaces para las props
interface SleepIndicatorsCardProps {
  wakeTime?: string | null
  wakeTimeDeviation?: string | null
  firstNapTime?: string | null
  firstNapDeviation?: string | null
  totalNapDuration?: string | null
  napDurations?: {
    siesta1?: string
    siesta2?: string
    siesta3?: string
    siesta4?: string
  }
  maxNapsPerDay?: number
  bedTime?: string | null
  sleepTime?: string | null
  timeToSleep?: string | null
  sleepVsPlan?: string | null
  totalSleepHours?: string | null
  filteredEvents?: any[]
}

// Componente para una estadística individual
const Indicator = ({ icon, label, value, deviation, unit, colorClass }: {
  icon: React.ReactNode,
  label: string,
  value: string | null | undefined,
  deviation?: string | null,
  unit?: string,
  colorClass?: string
}) => {
  if (value === null || value === undefined) {
    return null // No renderizar si no hay valor
  }
  return (
    <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
      <div className={`mt-1 ${colorClass || "text-indigo-600"}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        <div className="flex items-baseline space-x-2">
          <p className="text-xl font-bold text-gray-900">{value}</p>
          {unit && <span className="text-sm text-gray-600">{unit}</span>}
          {deviation && <p className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">{deviation}</p>}
        </div>
      </div>
    </div>
  )
}

// Componente principal
export function SleepIndicatorsCard({
  wakeTime,
  wakeTimeDeviation,
  firstNapTime,
  firstNapDeviation,
  totalNapDuration,
  napDurations = {},
  bedTime,
  sleepTime,
  timeToSleep,
  sleepVsPlan,
  totalSleepHours,
}: SleepIndicatorsCardProps) {
  
  const hasNapData = totalNapDuration || Object.keys(napDurations).length > 0

  return (
    <Card className="w-full shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart className="h-6 w-6 text-indigo-600" />
          Indicadores Clave de Sueño
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Sección de Despertar y Noche */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Indicator 
            icon={<Sun size={24} />} 
            label="Hora de despertar" 
            value={wakeTime} 
            deviation={wakeTimeDeviation}
            colorClass="text-yellow-500"
          />
          <Indicator 
            icon={<Bed size={24} />} 
            label="Hora de acostar" 
            value={bedTime} 
            colorClass="text-purple-600"
          />
          <Indicator 
            icon={<Moon size={24} />} 
            label="Hora de dormir" 
            value={sleepTime} 
            colorClass="text-blue-800"
          />
          <Indicator 
            icon={<Timer size={24} />} 
            label="Tiempo para dormir" 
            value={timeToSleep}
            colorClass="text-gray-600"
          />
          <Indicator 
            icon={<Clock size={24} />} 
            label="Total de sueño" 
            value={totalSleepHours}
            colorClass="text-teal-600"
          />
          <Indicator 
            icon={<CheckCircle size={24} />} 
            label="Dormir vs Plan" 
            value={sleepVsPlan}
            colorClass="text-green-600"
          />
        </div>

        {/* Sección de Siestas */}
        {hasNapData && (
          <div>
            <h3 className="text-md font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <BedDouble size={20} className="text-orange-500" />
              Análisis de Siestas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Indicator 
                icon={<TrendingUp size={24} />} 
                label="Hora 1era Siesta" 
                value={firstNapTime} 
                deviation={firstNapDeviation}
                colorClass="text-orange-600"
              />
              <Indicator 
                icon={<Clock size={24} />} 
                label="Duración total siestas" 
                value={totalNapDuration}
                colorClass="text-cyan-600"
              />
              {/* Siestas individuales */}
              {Object.entries(napDurations).map(([key, value]) => {
                const napNumber = key.replace("siesta", "")
                return (
                  <Indicator
                    key={key}
                    icon={<BedDouble size={24} />}
                    label={`Siesta ${napNumber}`}
                    value={value}
                    colorClass="text-pink-500"
                  />
                )
              })}
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  )
} 