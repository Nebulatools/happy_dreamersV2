import React from "react"
import { Clock, Moon, AlertCircle, Sun } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { differenceInMinutes, parseISO, subDays } from "date-fns"
import { quantile, median, toHHMM } from "@/lib/stats"
import { getNightSleepDurationsHours, getNocturnalBedtimes, getInferredWakeTimes, toNocturnalMinutesWithWrap } from "@/lib/sleep-stats"
import { useEventsCache } from "@/hooks/use-events-cache"
import { useSleepData } from "@/hooks/use-sleep-data"
import type { ChildPlan } from "@/types/models"

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
  priority?: boolean
  // Nuevos campos para comparación con plan
  planValue?: string
  planDiff?: string
  variationRange?: string
}

interface SleepMetricsGridProps {
  childId: string
  dateRange?: string
  activePlan?: ChildPlan | null // Plan activo del niño
}

export default function SleepMetricsGrid({ childId, dateRange = "7-days", activePlan }: SleepMetricsGridProps) {
  const { refreshTrigger, subscribe } = useEventsCache(childId)
  const { data: sleepData, loading, error } = useSleepData(childId, dateRange)

  // Suscribirse a invalidaciones de cache
  React.useEffect(() => {
    const unsubscribe = subscribe()
    return unsubscribe
  }, [subscribe])

  // Funciones helper para comparación con plan
  const calculateTimeDifference = (realMinutes: number, planTime: string): string => {
    const [planHours, planMinutes] = planTime.split(':').map(Number)
    const planMinutesTotal = planHours * 60 + planMinutes
    const diff = realMinutes - planMinutesTotal

    const absDiff = Math.abs(diff)
    const hours = Math.floor(absDiff / 60)
    const mins = absDiff % 60

    const sign = diff > 0 ? '+' : '-'
    if (hours === 0) {
      return `${sign}${mins}m`
    }
    return mins > 0 ? `${sign}${hours}h ${mins}m` : `${sign}${hours}h`
  }

  const calculateDurationDifference = (realHours: number, planHours: number): string => {
    const diff = realHours - planHours
    const absDiff = Math.abs(diff)
    const hours = Math.floor(absDiff)
    const mins = Math.round((absDiff - hours) * 60)

    const sign = diff > 0 ? '+' : '-'
    if (hours === 0 && mins === 0) return '0m'
    if (hours === 0) return `${sign}${mins}m`
    return mins > 0 ? `${sign}${hours}h ${mins}m` : `${sign}${hours}h`
  }

  const sleepMetrics = React.useMemo(() => {
    if (!sleepData) return []
    
    // Nuevo orden según prioridad Dra. Mariana: Despertar -> Sueño -> Acostarse -> Despertares
    // Preparar distribuciones (duración nocturna y horas de dormir/despertar)
    const events = sleepData.events || []
    const nightDurations = getNightSleepDurationsHours(events).sort((a,b)=>a-b) // horas
    const bedtimes = getNocturnalBedtimes(events)
    const wakeTimes = getInferredWakeTimes(events)
    const bedtimeMinutes = toNocturnalMinutesWithWrap(bedtimes).sort((a,b)=>a-b)
    const wakeMinutes = toNocturnalMinutesWithWrap(wakeTimes).sort((a,b)=>a-b)

    // Cuantiles
    const sleepMed = isFinite(median(nightDurations)) ? median(nightDurations) : sleepData.avgSleepDuration
    const sleepQ25 = isFinite(quantile(nightDurations, 0.25)) ? quantile(nightDurations, 0.25) : null
    const sleepQ75 = isFinite(quantile(nightDurations, 0.75)) ? quantile(nightDurations, 0.75) : null

    const wakeMedMin = isFinite(median(wakeMinutes)) ? median(wakeMinutes) : null
    const wakeQ25Min = isFinite(quantile(wakeMinutes, 0.25)) ? quantile(wakeMinutes, 0.25) : null
    const wakeQ75Min = isFinite(quantile(wakeMinutes, 0.75)) ? quantile(wakeMinutes, 0.75) : null

    const bedMedMin = isFinite(median(bedtimeMinutes)) ? median(bedtimeMinutes) : null
    const bedQ25Min = isFinite(quantile(bedtimeMinutes, 0.25)) ? quantile(bedtimeMinutes, 0.25) : null
    const bedQ75Min = isFinite(quantile(bedtimeMinutes, 0.75)) ? quantile(bedtimeMinutes, 0.75) : null

    const fmtDur = (h: number | null) => {
      if (h === null || !isFinite(h)) return sleepData.avgSleepDuration.toFixed(1) + "h"
      const hh = Math.floor(h)
      const mm = Math.round((h - hh) * 60)
      return mm > 0 ? `${hh}h ${mm}m` : `${hh}h`
    }

    // Obtener valores del plan si existe
    const planWakeTime = activePlan?.schedule?.wakeTime || activePlan?.sleepRoutine?.suggestedWakeTime
    const planBedtime = activePlan?.schedule?.bedtime || activePlan?.sleepRoutine?.suggestedBedtime
    // Para duración de sueño, calculamos desde bedtime y wakeTime del plan
    const planSleepDuration = (planBedtime && planWakeTime) ? (() => {
      const [bedHours, bedMinutes] = planBedtime.split(':').map(Number)
      const [wakeHours, wakeMinutes] = planWakeTime.split(':').map(Number)
      let bedMinutesTotal = bedHours * 60 + bedMinutes
      let wakeMinutesTotal = wakeHours * 60 + wakeMinutes
      // Si bedtime es después de medianoche (ej: 23:00) y wakeTime es antes (ej: 07:00)
      if (bedMinutesTotal > wakeMinutesTotal) {
        wakeMinutesTotal += 24 * 60
      }
      return (wakeMinutesTotal - bedMinutesTotal) / 60 // en horas
    })() : null

    return [
      {
        title: "Hora de Despertar",
        value: wakeMedMin !== null ? toHHMM(wakeMedMin) : sleepData.avgWakeTime,
        icon: <Sun className="w-5 h-5" />,
        status: getWakeTimeStatus(wakeMedMin !== null ? toHHMM(wakeMedMin) : sleepData.avgWakeTime),
        change: "Hora promedio de despertar matutino",
        iconBg: "bg-gradient-to-br from-orange-100 to-yellow-100",
        priority: true,
        planValue: planWakeTime,
        planDiff: (planWakeTime && wakeMedMin !== null) ? calculateTimeDifference(wakeMedMin, planWakeTime) : undefined,
        variationRange: (wakeQ25Min !== null && wakeQ75Min !== null) ? `±${Math.round((wakeQ75Min - wakeQ25Min) / 2)} min` : undefined,
      },
      {
        title: "Sueño nocturno",
        value: fmtDur(sleepMed),
        icon: <Moon className="w-5 h-5" />,
        status: getSleepDurationStatus(sleepMed || sleepData.avgSleepDuration),
        change: "Duración promedio del sueño",
        iconBg: "bg-gradient-to-br from-blue-100 to-cyan-100",
        planValue: planSleepDuration ? fmtDur(planSleepDuration) : undefined,
        planDiff: (planSleepDuration && sleepMed !== null) ? calculateDurationDifference(sleepMed, planSleepDuration) : undefined,
        variationRange: (sleepQ25 !== null && sleepQ75 !== null) ? `±${fmtDur((sleepQ75 - sleepQ25) / 2)}` : undefined,
      },
      {
        title: "Hora de Acostarse",
        value: bedMedMin !== null ? toHHMM(bedMedMin) : sleepData.avgBedtime,
        icon: <Moon className="w-5 h-5" />,
        status: getBedtimeConsistencyStatus(sleepData.bedtimeVariation),
        change: "Hora promedio de ir a la cama",
        iconBg: "bg-gradient-to-br from-purple-100 to-pink-100",
        planValue: planBedtime,
        planDiff: (planBedtime && bedMedMin !== null) ? calculateTimeDifference(bedMedMin, planBedtime) : undefined,
        variationRange: `±${Math.round(sleepData.bedtimeVariation)} min`,
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
  }, [sleepData, activePlan])


  // Funciones de formato y estado
  function formatDuration(hours: number): string {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }

  function formatDurationChange(hours: number): string {
    if (hours === 0) return "Sin cambios"
    const sign = hours > 0 ? "+" : ""
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
    <div>
      {/* Mobile: carrusel horizontal */}
      <div className="sm:hidden">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <p className="text-gray-500">Cargando métricas...</p>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-32">
            <p className="text-red-500">{error}</p>
          </div>
        ) : sleepMetrics.length === 0 ? (
          <div className="flex justify-center items-center h-32">
            <p className="text-gray-500">No hay suficientes datos para mostrar métricas</p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory px-1">
            {sleepMetrics.map((metric, index) => (
              <div
                key={index}
                className="min-w-[280px] snap-start bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-12 h-12 rounded-xl ${metric.iconBg} flex items-center justify-center flex-shrink-0`}>
                      <div className="text-gray-700">
                        {metric.icon}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {metric.title}
                      </p>
                    </div>
                  </div>

                  {/* Valor principal */}
                  <div className="mb-3">
                    <p className="text-3xl font-bold text-gray-900">
                      {metric.value}
                    </p>
                  </div>

                  {/* Comparación con plan */}
                  {metric.planValue && (
                    <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-xs text-blue-900 font-medium mb-1">Hora ideal del plan</p>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-blue-900">{metric.planValue}</p>
                        {metric.planDiff && (
                          <Badge
                            variant={metric.planDiff.startsWith('-') ? 'good' : 'poor'}
                            className="text-xs"
                          >
                            {metric.planDiff} vs plan
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Variación y estado */}
                  <div className="flex items-center justify-between">
                    <Badge variant={metric.status.variant} className="text-xs">
                      {metric.status.label}
                    </Badge>
                    {metric.variationRange && (
                      <span className="text-xs text-gray-500">{metric.variationRange}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Desktop/Tablet: grid */}
      <div className="hidden sm:grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 lg:gap-6">
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
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            >
              {/* Contenido principal */}
              <div className="p-4 md:p-6">
                {/* Header con ícono y título */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl ${metric.iconBg} flex items-center justify-center flex-shrink-0`}>
                    <div className="text-gray-700">
                      {metric.icon}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm md:text-base font-semibold text-gray-900">
                      {metric.title}
                    </p>
                  </div>
                </div>

                {/* Valor principal - grande y prominente */}
                <div className="mb-4">
                  <p className="text-3xl md:text-5xl font-bold text-gray-900">
                    {metric.value}
                  </p>
                </div>

                {/* Comparación con plan - si existe */}
                {metric.planValue && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-xs md:text-sm text-blue-900 font-medium mb-2">Hora ideal del plan</p>
                    <div className="flex items-center justify-between">
                      <p className="text-base md:text-lg font-bold text-blue-900">{metric.planValue}</p>
                      {metric.planDiff && (
                        <Badge
                          variant={metric.planDiff.startsWith('-') ? 'good' : 'poor'}
                          className="text-xs md:text-sm font-semibold"
                        >
                          {metric.planDiff} vs plan
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Estado y variación */}
                <div className="flex items-center justify-between">
                  <Badge variant={metric.status.variant} className="text-xs md:text-sm font-medium">
                    {metric.status.label}
                  </Badge>
                  {metric.variationRange && (
                    <span className="text-xs md:text-sm text-gray-500 font-medium">{metric.variationRange}</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
