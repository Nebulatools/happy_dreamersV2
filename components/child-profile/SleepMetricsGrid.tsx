import React from "react"
import { Clock, Moon, AlertCircle, Heart } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { differenceInMinutes, parseISO, subDays } from "date-fns"
import { useEventsCache } from "@/hooks/use-events-cache"
import { useSleepData } from "@/hooks/use-sleep-data"

interface SleepMetric {
  title: string
  value: string
  icon: React.ReactNode
  status: {
    label: string
    variant: "good" | "consistent" | "average" | "poor"
  }
  change: string
  iconBg: string
}

interface SleepMetricsGridProps {
  childId: string
  dateRange?: string
}

export default function SleepMetricsGrid({ childId, dateRange = "7-days" }: SleepMetricsGridProps) {
  const { refreshTrigger, subscribe } = useEventsCache(childId)
  const { data: sleepData, loading, error } = useSleepData(childId)

  // Suscribirse a invalidaciones de cache
  React.useEffect(() => {
    const unsubscribe = subscribe()
    return unsubscribe
  }, [subscribe])

  const sleepMetrics = React.useMemo(() => {
    if (!sleepData) return []
    
    return [
      {
        title: "Tiempo total de sueño (promedio)",
        value: formatDuration(sleepData.avgSleepDuration),
        icon: <Clock className="w-3 h-3" />,
        status: getSleepDurationStatus(sleepData.avgSleepDuration),
        change: `${sleepData.avgSleepDuration.toFixed(1)} horas promedio`,
        iconBg: "bg-[#B7F1C0]",
      },
      {
        title: "Hora de acostarse (promedio)",
        value: sleepData.avgBedtime,
        icon: <Moon className="w-5 h-4" />,
        status: getBedtimeConsistencyStatus(sleepData.bedtimeVariation),
        change: `±${Math.round(sleepData.bedtimeVariation)} min de variación`,
        iconBg: "bg-[#D4C1FF]",
      },
      {
        title: "Despertares nocturnos (promedio)",
        value: sleepData.totalWakeups.toString(),
        icon: <AlertCircle className="w-4 h-4" />,
        status: getWakeupsStatus(sleepData.totalWakeups),
        change: `${sleepData.totalWakeups} despertares en período`,
        iconBg: "bg-[#FFE442]",
      },
      {
        title: "Calidad del sueño",
        value: `${Math.round((sleepData.avgSleepDuration >= 9 && sleepData.avgSleepDuration <= 11) ? 90 : 
                             (sleepData.avgSleepDuration >= 8 && sleepData.avgSleepDuration <= 12) ? 70 : 50)}%`,
        icon: <Heart className="w-4 h-4" />,
        status: getSleepQualityStatus((sleepData.avgSleepDuration >= 9 && sleepData.avgSleepDuration <= 11) ? 90 : 
                                   (sleepData.avgSleepDuration >= 8 && sleepData.avgSleepDuration <= 12) ? 70 : 50),
        change: "Basado en duración del sueño",
        iconBg: "bg-[#FFC4C4]",
      },
    ]
  }, [sleepData])


  // Funciones de formato y estado
  function formatDuration(hours: number): string {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }

  function formatDurationChange(hours: number): string {
    if (hours === 0) return 'Sin cambios'
    const sign = hours > 0 ? '+' : ''
    const h = Math.floor(Math.abs(hours))
    const m = Math.round((Math.abs(hours) - h) * 60)
    const formatted = m > 0 ? `${h}h ${m}m` : `${h}h`
    return `${sign}${formatted} desde período anterior`
  }

  function getSleepDurationStatus(hours: number): { label: string; variant: "good" | "consistent" | "average" | "poor" } {
    if (hours >= 9 && hours <= 12) return { label: "Bueno", variant: "good" }
    if (hours >= 8 && hours < 9) return { label: "Aceptable", variant: "consistent" }
    if (hours >= 7 && hours < 8) return { label: "Bajo", variant: "average" }
    return { label: "Insuficiente", variant: "poor" }
  }

  function getBedtimeConsistencyStatus(variation: number): { label: string; variant: "good" | "consistent" | "average" | "poor" } {
    if (variation <= 15) return { label: "Muy consistente", variant: "good" }
    if (variation <= 30) return { label: "Consistente", variant: "consistent" }
    if (variation <= 45) return { label: "Variable", variant: "average" }
    return { label: "Muy variable", variant: "poor" }
  }

  function getWakeupsStatus(wakeups: number): { label: string; variant: "good" | "consistent" | "average" | "poor" } {
    if (wakeups < 1) return { label: "Excelente", variant: "good" }
    if (wakeups <= 2) return { label: "Normal", variant: "consistent" }
    if (wakeups <= 3) return { label: "Frecuente", variant: "average" }
    return { label: "Muy frecuente", variant: "poor" }
  }

  function getSleepQualityStatus(quality: number): { label: string; variant: "good" | "consistent" | "average" | "poor" } {
    if (quality >= 80) return { label: "Excelente", variant: "good" }
    if (quality >= 60) return { label: "Buena", variant: "consistent" }
    if (quality >= 40) return { label: "Regular", variant: "average" }
    return { label: "Mala", variant: "poor" }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {loading ? (
        <div className="col-span-full flex justify-center items-center h-32">
          <p className="text-gray-500">Cargando métricas...</p>
        </div>
      ) : error ? (
        <div className="col-span-full flex justify-center items-center h-32">
          <p className="text-red-500">{error}</p>
        </div>
      ) : sleepMetrics.length === 0 ? (
        <div className="col-span-full flex justify-center items-center h-32">
          <p className="text-gray-500">No hay suficientes datos para mostrar métricas</p>
        </div>
      ) : (
        sleepMetrics.map((metric, index) => (
        <div 
          key={index}
          className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.02] cursor-pointer"
        >
          {/* Contenido principal */}
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              {/* Información de la métrica */}
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-2 leading-tight">
                  {metric.title}
                </p>
                <p className="text-4xl font-extrabold text-[#2F2F2F] leading-none">
                  {metric.value}
                </p>
              </div>

              {/* Ícono de la métrica */}
              <div className={`w-10 h-10 rounded-xl ${metric.iconBg} flex items-center justify-center ml-4`}>
                <div className="text-gray-700">
                  {metric.icon}
                </div>
              </div>
            </div>

            {/* Estado y cambio */}
            <div className="space-y-2">
              <Badge variant={metric.status.variant} className="text-xs font-medium">
                {metric.status.label}
              </Badge>
              <p className="text-xs text-gray-600">
                {metric.change}
              </p>
            </div>
          </div>
        </div>
      ))
      )}
    </div>
  )
}
