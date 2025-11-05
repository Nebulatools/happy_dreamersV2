"use client"

import React, { useState } from "react"
import { Clock, Moon, AlertCircle, Sun, Activity, TrendingUp, TrendingDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { useSleepData } from "@/hooks/use-sleep-data"
import { calculateMorningWakeTime } from "@/lib/sleep-calculations"
import { aggregateDailySleep } from "@/lib/sleep-calculations"
import { useEventsCache } from "@/hooks/use-events-cache"
import { differenceInMinutes, parseISO } from "date-fns"

interface EnhancedSleepMetricsCardProps {
  childId: string
  dateRange?: string
}

type DailyTotalsEntry = {
  dateKey: string
  nightHours: number
  napHours: number
  totalHours: number
}

type BreakdownState = {
  nightSleepHours: number
  napHours: number
  nightSleepPercentage: number
  napPercentage: number
  totalHours: number
  nightSleepCount: number
  napCount: number
  daysInPeriod: number
  actualDaysWithData: number
  nightsWithSleep: number
  daysWithNaps: number
  dailyTotals: DailyTotalsEntry[]
}

// Función para clasificar sueño como nocturno o siesta
function classifySleep(startTime: Date, endTime: Date) {
  const startHour = startTime.getHours()
  const duration = differenceInMinutes(endTime, startTime) / 60
  
  if (startHour >= 19 || startHour <= 7 || duration > 6) {
    return 'night'
  }
  return 'nap'
}

// Reemplazado por aggregateDailySleep() de lib/sleep-calculations.ts para coherencia global

export default function EnhancedSleepMetricsCard({ childId, dateRange = "7-days" }: EnhancedSleepMetricsCardProps) {
  const { refreshTrigger, subscribe } = useEventsCache(childId)
  const { data: sleepData, loading, error } = useSleepData(childId, dateRange)
  const [breakdown, setBreakdown] = useState<BreakdownState>({
    nightSleepHours: 0,
    napHours: 0,
    nightSleepPercentage: 0,
    napPercentage: 0,
    totalHours: 0,
    nightSleepCount: 0,
    napCount: 0,
    daysInPeriod: 7,
    actualDaysWithData: 0,
    nightsWithSleep: 0,
    daysWithNaps: 0,
    dailyTotals: []
  })

  // Suscribirse a invalidaciones de cache
  React.useEffect(() => {
    const unsubscribe = subscribe()
    return unsubscribe
  }, [subscribe])

  // Procesar eventos cuando sleepData cambie (promedios por día consistentes)
  React.useEffect(() => {
    if (sleepData?.events) {
      const agg = aggregateDailySleep(sleepData.events as any[], dateRange, { denominator: 'dataDays' })
      setBreakdown({
        nightSleepHours: agg.avgNightHoursPerDay,
        napHours: agg.avgNapHoursPerDay,
        nightSleepPercentage: agg.nightPercentage,
        napPercentage: agg.napPercentage,
        totalHours: agg.avgTotalHoursPerDay,
        nightSleepCount: agg.nightsCount,
        napCount: agg.napsCount,
        daysInPeriod: agg.daysInPeriod,
        actualDaysWithData: agg.daysWithData,
        nightsWithSleep: agg.nightsCount,
        daysWithNaps: agg.napsCount, // aproximación: cantidad de siestas
        dailyTotals: (agg.dailyTotals || []).map((day) => ({
          dateKey: day.dateKey,
          nightHours: day.nightMinutes / 60,
          napHours: day.napMinutes / 60,
          totalHours: day.totalMinutes / 60
        }))
      })
    }
  }, [sleepData, dateRange])

  // Hora promedio matutina (usa lógica centralizada, con fallback)
  const morningWakeAvg = React.useMemo(() => {
    const base = calculateMorningWakeTime((sleepData?.events || []) as any[])
    if (base !== "--:--") return base
    // Fallback 1: relajar ventana a 03:00–12:00 para compensar posibles offsets de timezone marginales
    try {
      const evts = sleepData?.events || []
      const sorted = evts.filter((e: any) => e?.startTime).sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      const wakes: Date[] = []
      for (let i = 0; i < sorted.length; i++) {
        const e = sorted[i]
        if (!['sleep','bedtime'].includes(e.eventType)) continue
        const start = parseISO(e.startTime)
        const hour = start.getHours()
        const nocturnal = (hour >= 18 || hour <= 6)
        if (!nocturnal) continue
        if (e.endTime) { wakes.push(parseISO(e.endTime)); continue }
        for (let j = i + 1; j < sorted.length; j++) {
          const n = sorted[j]
          if (n.eventType === 'wake' && n.startTime) { wakes.push(parseISO(n.startTime)); break }
          if (['sleep','bedtime'].includes(n.eventType)) break
        }
      }
      const morning = wakes.filter(d => { const h = d.getHours(); return h >= 3 && h <= 12 })
      if (!morning.length) return sleepData?.avgWakeTime || "--:--" // Fallback 2: valor inferido general
      const total = morning.reduce((sum, d) => sum + d.getHours() * 60 + d.getMinutes(), 0)
      const avg = Math.round(total / morning.length)
      const hh = String(Math.floor(avg / 60)).padStart(2,'0')
      const mm = String(avg % 60).padStart(2,'0')
      return `${hh}:${mm}`
    } catch {
      return sleepData?.avgWakeTime || "--:--"
    }
  }, [sleepData])

  // Funciones de formato
  const formatDuration = (hours: number): string => {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }

  // Funciones de estado
  const getWakeTimeStatus = (avgWakeTime: string) => {
    if (avgWakeTime === "--:--") {
      return { label: "Sin datos", variant: "poor" as const, color: "text-gray-500" }
    }

    const [hours, minutes] = avgWakeTime.split(":").map(Number)
    const wakeTimeInMinutes = hours * 60 + minutes

    if (wakeTimeInMinutes >= 6 * 60 && wakeTimeInMinutes <= 7.5 * 60) {
      return { label: "Ideal", variant: "good" as const, color: "text-green-600" }
    } else if (
      (wakeTimeInMinutes >= 5.5 * 60 && wakeTimeInMinutes < 6 * 60) ||
      (wakeTimeInMinutes > 7.5 * 60 && wakeTimeInMinutes <= 8.5 * 60)
    ) {
      return { label: "Bueno", variant: "consistent" as const, color: "text-blue-600" }
    } else if (
      (wakeTimeInMinutes >= 5 * 60 && wakeTimeInMinutes < 5.5 * 60) ||
      (wakeTimeInMinutes > 8.5 * 60 && wakeTimeInMinutes <= 9 * 60)
    ) {
      return { label: "Aceptable", variant: "average" as const, color: "text-yellow-600" }
    } else {
      return { label: "Necesita ajuste", variant: "poor" as const, color: "text-red-600" }
    }
  }

  const getBedtimeConsistencyStatus = (variation: number) => {
    if (variation <= 15) return { label: "Muy consistente", variant: "good" as const }
    if (variation <= 30) return { label: "Consistente", variant: "consistent" as const }
    if (variation <= 45) return { label: "Variable", variant: "average" as const }
    return { label: "Muy variable", variant: "poor" as const }
  }

  const getWakeupsStatus = (wakeups: number) => {
    if (wakeups < 1) return { label: "Excelente", variant: "good" as const }
    if (wakeups <= 2) return { label: "Normal", variant: "consistent" as const }
    if (wakeups <= 3) return { label: "Frecuente", variant: "average" as const }
    return { label: "Muy frecuente", variant: "poor" as const }
  }

  const formatDateLabel = (dateKey?: string) => {
    if (!dateKey) return ""
    try {
      return parseISO(dateKey).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit"
      })
    } catch {
      return dateKey
    }
  }

  const ranges = React.useMemo(() => {
    const buildRange = (key: 'nightHours' | 'napHours' | 'totalHours') => {
      const entries = breakdown.dailyTotals
        .map(day => ({
          value: day[key],
          dateKey: day.dateKey
        }))
        .filter(entry => typeof entry.value === "number" && entry.value > 0)

      if (entries.length === 0) {
        return null
      }

      const maxEntry = entries.reduce((prev, curr) => (curr.value > prev.value ? curr : prev))
      const minEntry = entries.reduce((prev, curr) => (curr.value < prev.value ? curr : prev))

      return {
        max: maxEntry,
        min: minEntry,
        spread: maxEntry.value - minEntry.value
      }
    }

    return {
      night: buildRange('nightHours'),
      nap: buildRange('napHours'),
      total: buildRange('totalHours')
    }
  }, [breakdown.dailyTotals])

  const nightRange = ranges.night
  const napRange = ranges.nap
  const totalRange = ranges.total
  const hasRangeData = Boolean(nightRange || napRange || totalRange)

  const variabilityStatus = React.useMemo(() => {
    if (!totalRange) return null
    const spread = totalRange.spread
    if (spread <= 0.5) {
      return { label: "Rutina muy consistente", icon: TrendingUp, color: "text-green-600" }
    }
    if (spread <= 1) {
      return { label: "Variación moderada", icon: TrendingUp, color: "text-blue-600" }
    }
    if (spread <= 2) {
      return { label: "Variación elevada", icon: TrendingDown, color: "text-orange-600" }
    }
    return { label: "Necesita ajustar horarios", icon: TrendingDown, color: "text-red-600" }
  }, [totalRange])

  const StatusIcon = variabilityStatus?.icon

  const rangeDetails = React.useMemo(() => ([
    {
      key: "night" as const,
      title: "Sueño nocturno",
      icon: Moon,
      iconColor: "text-indigo-600",
      range: nightRange
    },
    {
      key: "nap" as const,
      title: "Siestas",
      icon: Sun,
      iconColor: "text-orange-500",
      range: napRange
    },
    {
      key: "total" as const,
      title: "Sueño total",
      icon: Activity,
      iconColor: "text-blue-600",
      range: totalRange
    }
  ]), [nightRange, napRange, totalRange])

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        <div className="flex items-center justify-center h-48">
          <div className="text-gray-500">Cargando métricas de sueño...</div>
        </div>
      </div>
    )
  }

  if (error || !sleepData) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        <div className="flex items-center justify-center h-48">
          <div className="text-red-500">Error al cargar las métricas de sueño</div>
        </div>
      </div>
    )
  }

  const wakeTimeStatus = getWakeTimeStatus(sleepData.avgWakeTime)
  const bedtimeStatus = getBedtimeConsistencyStatus(sleepData.bedtimeVariation)
  const wakeupsStatus = getWakeupsStatus(sleepData.totalWakeups)

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
      <div className="p-6 space-y-4">
        {/* Métricas principales en línea horizontal */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4"
        >
          {/* Hora de Despertar */}
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-4 border border-orange-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-lg flex items-center justify-center shadow">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-600 font-medium">Hora de Despertar</p>
                <p className="text-2xl font-bold text-gray-900">{morningWakeAvg}</p>
              </div>
            </div>
            <Badge variant={getWakeTimeStatus(morningWakeAvg).variant} className="text-xs">
              {getWakeTimeStatus(morningWakeAvg).label}
            </Badge>
          </div>

          {/* Sueño nocturno (promedio diario) */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-lg flex items-center justify-center shadow">
                <Moon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-600 font-medium">Sueño nocturno</p>
                <p className="text-2xl font-bold text-gray-900">{breakdown.nightSleepHours.toFixed(1)}h</p>
              </div>
            </div>
          </div>

          {/* Hora de Acostarse */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center shadow">
                <Moon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-600 font-medium">Hora de Acostarse</p>
                <p className="text-2xl font-bold text-gray-900">{sleepData.avgBedtime}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Badge variant={bedtimeStatus.variant} className="text-xs">
                {bedtimeStatus.label}
              </Badge>
              <span className="text-xs text-gray-500">±{Math.round(sleepData.bedtimeVariation)} min</span>
            </div>
          </div>

          {/* Despertares Nocturnos */}
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-4 border border-yellow-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-lg flex items-center justify-center shadow">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-600 font-medium">Despertares Nocturnos</p>
                <p className="text-2xl font-bold text-gray-900">{sleepData.totalWakeups}</p>
              </div>
            </div>
            <Badge variant={wakeupsStatus.variant} className="text-xs">
              {wakeupsStatus.label}
            </Badge>
          </div>
        </motion.div>

        {/* Máximos y mínimos de sueño */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-5 border border-indigo-200"
        >
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-gray-800">Máximos y mínimos diarios</h3>
          </div>

          {hasRangeData ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {rangeDetails.map((detail) => {
                  const Icon = detail.icon
                  const range = detail.range
                  return (
                    <div
                      key={detail.key}
                      className="bg-white/80 rounded-lg p-4 border border-white/40 shadow-sm"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white shadow">
                          <Icon className={`w-5 h-5 ${detail.iconColor}`} />
                        </div>
                        <h4 className="font-semibold text-gray-700">{detail.title}</h4>
                      </div>
                      {range ? (
                        <>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wide">Máximo</p>
                              <p className="text-base font-semibold text-gray-900">
                                {formatDuration(range.max.value)}
                              </p>
                              <p className="text-xs text-gray-400">
                                {formatDateLabel(range.max.dateKey)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wide">Mínimo</p>
                              <p className="text-base font-semibold text-gray-900">
                                {formatDuration(range.min.value)}
                              </p>
                              <p className="text-xs text-gray-400">
                                {formatDateLabel(range.min.dateKey)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
                            <span>Variación diaria</span>
                            <span className="font-semibold text-gray-700">
                              {formatDuration(Math.max(range.spread, 0))}
                            </span>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-gray-500">
                          Sin datos suficientes en el periodo seleccionado.
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                {variabilityStatus && StatusIcon && (
                  <div className={`flex items-center gap-2 ${variabilityStatus.color}`}>
                    <StatusIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">{variabilityStatus.label}</span>
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  Basado en {breakdown.actualDaysWithData}{" "}
                  {breakdown.actualDaysWithData === 1 ? "día con datos" : "días con datos"} dentro de
                  los últimos {breakdown.daysInPeriod} días.
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">
              Sin datos suficientes para calcular máximos y mínimos en el periodo seleccionado.
            </p>
          )}
        </motion.div>
      </div>
    </div>
  )
}
