import React from "react"
import { Clock, Moon, AlertCircle } from "lucide-react"
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
  priority?: boolean // Marca si la métrica es prioritaria
}

interface SleepMetricsGridProps {
  childId: string
  dateRange?: string
}

export default function SleepMetricsGrid({ childId, dateRange = "7-days" }: SleepMetricsGridProps) {
  const { refreshTrigger, subscribe } = useEventsCache(childId)
  const { data: sleepData, loading, error } = useSleepData(childId, dateRange)

  // Suscribirse a invalidaciones de cache
  React.useEffect(() => {
    const unsubscribe = subscribe()
    return unsubscribe
  }, [subscribe])

  const sleepMetrics = React.useMemo(() => {
    if (!sleepData) return []
    
    // Nuevo orden según prioridad Dra. Mariana: Despertar -> Sueño -> Acostarse -> Despertares
    return [
      {
        title: "Hora de despertar (promedio)",
        value: sleepData.avgWakeTime,
        icon: <Clock className="w-4 h-4" />,
        status: getWakeTimeStatus(sleepData.avgWakeTime),
        change: `Hora promedio de despertar matutino`,
        iconBg: "bg-gradient-to-br from-orange-100 to-yellow-100",
        priority: true, // Marca esta métrica como prioritaria
      },
      {
        title: "Sueño nocturno (promedio)",
        value: formatDuration(sleepData.avgSleepDuration),
        icon: <Moon className="w-4 h-4" />,
        status: getSleepDurationStatus(sleepData.avgSleepDuration),
        change: `${sleepData.avgSleepDuration.toFixed(1)}h nocturno`,
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


  function getNapDurationStatus(hours: number): { label: string; variant: "good" | "consistent" | "average" | "poor" } {
    if (hours >= 1 && hours <= 2.5) return { label: "Óptimo", variant: "good" }
    if (hours >= 0.5 && hours < 1) return { label: "Corto", variant: "consistent" }
    if (hours > 2.5 && hours <= 4) return { label: "Largo", variant: "average" }
    if (hours === 0) return { label: "Sin siestas", variant: "average" }
    return { label: "Excesivo", variant: "poor" }
  }

  function getWakeTimeStatus(avgWakeTime: string): { label: string; variant: "good" | "consistent" | "average" | "poor" } {
    if (avgWakeTime === "--:--") {
      return { label: "Sin datos", variant: "poor" }
    }

    // Extraer la hora para análisis (formato HH:MM)
    const [hours, minutes] = avgWakeTime.split(":").map(Number)
    const wakeTimeInMinutes = hours * 60 + minutes

    // Evaluar horarios ideales para niños
    // 6:00-7:30 AM = Ideal
    // 5:30-6:00 AM o 7:30-8:30 AM = Bueno  
    // 5:00-5:30 AM o 8:30-9:00 AM = Aceptable
    // Fuera de estos rangos = Necesita ajuste

    if (wakeTimeInMinutes >= 6 * 60 && wakeTimeInMinutes <= 7.5 * 60) { // 6:00-7:30
      return { label: "Ideal", variant: "good" }
    } else if (
      (wakeTimeInMinutes >= 5.5 * 60 && wakeTimeInMinutes < 6 * 60) || // 5:30-6:00
      (wakeTimeInMinutes > 7.5 * 60 && wakeTimeInMinutes <= 8.5 * 60)   // 7:30-8:30
    ) {
      return { label: "Bueno", variant: "consistent" }
    } else if (
      (wakeTimeInMinutes >= 5 * 60 && wakeTimeInMinutes < 5.5 * 60) ||  // 5:00-5:30
      (wakeTimeInMinutes > 8.5 * 60 && wakeTimeInMinutes <= 9 * 60)     // 8:30-9:00
    ) {
      return { label: "Aceptable", variant: "average" }
    } else {
      return { label: "Necesita ajuste", variant: "poor" }
    }
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 lg:gap-6">
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
          className="bg-white rounded-lg md:rounded-2xl border border-gray-100 shadow-sm md:shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.02] cursor-pointer"
        >
          {/* Badge de métrica prioritaria */}
          {metric.priority && (
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 px-4 py-2 border-b border-orange-100">
              <div className="flex items-center justify-center">
                <div className="bg-gradient-to-r from-orange-400 to-yellow-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
                  🌅 Métrica Prioritaria
                </div>
              </div>
            </div>
          )}
          
          {/* Contenido principal */}
          <div className="p-3 md:p-6">
            <div className="flex items-start justify-between mb-3 md:mb-6">
              {/* Información de la métrica */}
              <div className="flex-1">
                <p className="text-xs md:text-sm text-gray-600 mb-1 md:mb-2 leading-tight">
                  {metric.title}
                </p>
                <p className="text-lg md:text-4xl font-bold md:font-extrabold text-[#2F2F2F] leading-none">
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
