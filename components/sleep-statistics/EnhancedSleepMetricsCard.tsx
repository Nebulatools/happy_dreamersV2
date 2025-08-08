"use client"

import React, { useState } from "react"
import { Clock, Moon, AlertCircle, Sun, Activity, TrendingUp, TrendingDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { useSleepData } from "@/hooks/use-sleep-data"
import { useEventsCache } from "@/hooks/use-events-cache"
import { differenceInMinutes, parseISO } from "date-fns"

interface EnhancedSleepMetricsCardProps {
  childId: string
  dateRange?: string
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

// Procesar eventos para el desglose con promedios diarios usando inferencia
function processSleepBreakdown(events: any[], dateRange: string) {
  // Calcular el número de días según el rango
  let daysInPeriod = 7
  if (dateRange === "30-days") {
    daysInPeriod = 30
  } else if (dateRange === "90-days") {
    daysInPeriod = 90
  }
  
  if (!events || events.length === 0) {
    return {
      nightSleepHours: 0,
      napHours: 0,
      nightSleepPercentage: 0,
      napPercentage: 0,
      totalHours: 0,
      nightSleepCount: 0,
      napCount: 0,
      daysInPeriod: daysInPeriod
    }
  }
  
  // Ordenar eventos por fecha
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )
  
  let totalNightSleepMinutes = 0
  let totalNapMinutes = 0
  let nightSleepCount = 0
  let napCount = 0
  
  // Procesar siestas explícitas
  const napEvents = sortedEvents.filter(e => e.eventType === 'nap' && e.startTime && e.endTime)
  napEvents.forEach(event => {
    const duration = differenceInMinutes(parseISO(event.endTime), parseISO(event.startTime))
    if (duration > 0 && duration < 300) { // Siestas máximo 5 horas
      totalNapMinutes += duration
      napCount++
    }
  })
  
  // Procesar sueño nocturno usando inferencia bedtime/sleep → wake
  for (let i = 0; i < sortedEvents.length - 1; i++) {
    const currentEvent = sortedEvents[i]
    const nextEvent = sortedEvents[i + 1]
    
    // Buscar pares bedtime/sleep → wake
    if (
      (currentEvent.eventType === 'bedtime' || currentEvent.eventType === 'sleep') &&
      nextEvent.eventType === 'wake'
    ) {
      const bedTime = parseISO(currentEvent.startTime)
      const wakeTime = parseISO(nextEvent.startTime)
      
      // Si el evento tiene sleepDelay, ajustar el tiempo real de sueño
      // Limitar sleepDelay a máximo 180 minutos para evitar cálculos incorrectos
      const rawSleepDelay = currentEvent.sleepDelay || 0
      const sleepDelay = Math.min(rawSleepDelay, 180) // Máximo 3 horas
      const actualSleepTime = new Date(bedTime.getTime() + sleepDelay * 60 * 1000)
      
      // LÓGICA SIMPLIFICADA: Si la hora de wake es menor que bedtime, wake es al día siguiente
      const bedHour = actualSleepTime.getHours()
      const bedMinutes = actualSleepTime.getMinutes()
      const wakeHour = wakeTime.getHours()
      const wakeMinutes = wakeTime.getMinutes()
      
      const bedTimeInMinutes = bedHour * 60 + bedMinutes
      const wakeTimeInMinutes = wakeHour * 60 + wakeMinutes
      
      let duration: number
      
      if (wakeTimeInMinutes <= bedTimeInMinutes && bedHour >= 18) {
        // El despertar es al día siguiente
        duration = (24 * 60 - bedTimeInMinutes) + wakeTimeInMinutes
      } else {
        // Mismo día (probablemente una siesta larga mal categorizada)
        duration = differenceInMinutes(wakeTime, actualSleepTime)
      }
      
      // Validar que sea una duración razonable para sueño nocturno (2-16 horas)
      if (duration >= 120 && duration <= 960) {
        totalNightSleepMinutes += duration
        nightSleepCount++
      }
    }
    // Si no hay wake, pero hay un evento al día siguiente, inferir
    else if (
      (currentEvent.eventType === 'bedtime' || currentEvent.eventType === 'sleep') &&
      i === sortedEvents.length - 2 // Es el penúltimo evento
    ) {
      const bedTime = parseISO(currentEvent.startTime)
      const bedHour = bedTime.getHours()
      
      // Solo si es horario nocturno (después de 6pm o antes de 6am)
      if (bedHour >= 18 || bedHour <= 6) {
        // Asumir 8 horas de sueño si no hay evento wake
        // Limitar sleepDelay a máximo 180 minutos para evitar cálculos incorrectos
        const rawSleepDelay = currentEvent.sleepDelay || 0
        const sleepDelay = Math.min(rawSleepDelay, 180) // Máximo 3 horas
        const assumedDuration = (8 * 60) - sleepDelay // 8 horas menos el delay
        
        if (assumedDuration > 0) {
          totalNightSleepMinutes += assumedDuration
          nightSleepCount++
        }
      }
    }
  }
  
  // Si hay eventos sleep con endTime (formato antiguo), procesarlos también
  const oldFormatSleep = sortedEvents.filter(e => 
    e.eventType === 'sleep' && e.startTime && e.endTime
  )
  
  oldFormatSleep.forEach(event => {
    const startTime = parseISO(event.startTime)
    const endTime = parseISO(event.endTime)
    const duration = differenceInMinutes(endTime, startTime)
    const startHour = startTime.getHours()
    
    // Si es horario nocturno y duración razonable
    if ((startHour >= 18 || startHour <= 6) && duration >= 120 && duration <= 960) {
      // Solo agregar si no fue procesado ya como par bedtime→wake
      const alreadyProcessed = sortedEvents.some((e, idx) => 
        idx < sortedEvents.length - 1 &&
        e === event &&
        sortedEvents[idx + 1].eventType === 'wake'
      )
      
      if (!alreadyProcessed) {
        totalNightSleepMinutes += duration
        nightSleepCount++
      }
    }
  })
  
  // Calcular PROMEDIOS DIARIOS
  const avgNightSleepMinutesPerDay = totalNightSleepMinutes / daysInPeriod
  const avgNapMinutesPerDay = totalNapMinutes / daysInPeriod
  const avgTotalMinutesPerDay = avgNightSleepMinutesPerDay + avgNapMinutesPerDay
  
  // Convertir a horas
  const avgNightSleepHoursPerDay = avgNightSleepMinutesPerDay / 60
  const avgNapHoursPerDay = avgNapMinutesPerDay / 60
  const avgTotalHoursPerDay = avgTotalMinutesPerDay / 60
  
  return {
    nightSleepHours: avgNightSleepHoursPerDay,
    napHours: avgNapHoursPerDay,
    nightSleepPercentage: avgTotalMinutesPerDay > 0 ? (avgNightSleepMinutesPerDay / avgTotalMinutesPerDay) * 100 : 0,
    napPercentage: avgTotalMinutesPerDay > 0 ? (avgNapMinutesPerDay / avgTotalMinutesPerDay) * 100 : 0,
    totalHours: avgTotalHoursPerDay,
    nightSleepCount: nightSleepCount,
    napCount: napCount,
    daysInPeriod: daysInPeriod
  }
}

export default function EnhancedSleepMetricsCard({ childId, dateRange = "7-days" }: EnhancedSleepMetricsCardProps) {
  const { refreshTrigger, subscribe } = useEventsCache(childId)
  const { data: sleepData, loading, error } = useSleepData(childId, dateRange)
  const [breakdown, setBreakdown] = useState({
    nightSleepHours: 0,
    napHours: 0,
    nightSleepPercentage: 0,
    napPercentage: 0,
    totalHours: 0,
    nightSleepCount: 0,
    napCount: 0,
    daysInPeriod: 7
  })

  // Suscribirse a invalidaciones de cache
  React.useEffect(() => {
    const unsubscribe = subscribe()
    return unsubscribe
  }, [subscribe])

  // Procesar eventos cuando sleepData cambie
  React.useEffect(() => {
    if (sleepData && sleepData.events) {
      // Usar los eventos que ya vienen filtrados de useSleepData
      const processedBreakdown = processSleepBreakdown(sleepData.events, dateRange)
      setBreakdown(processedBreakdown)
    }
  }, [sleepData, dateRange])

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
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {/* Hora de Despertar */}
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-4 border border-orange-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-lg flex items-center justify-center shadow">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-600 font-medium">Hora de Despertar</p>
                <p className="text-2xl font-bold text-gray-900">{sleepData.avgWakeTime}</p>
              </div>
            </div>
            <Badge variant={wakeTimeStatus.variant} className="text-xs">
              {wakeTimeStatus.label}
            </Badge>
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

          {/* Análisis de Sueño Completo - Todo en una sección */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-5 border border-indigo-200"
          >
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-gray-800">Promedio Diario de Sueño</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Columna izquierda - Desglose detallado */}
              <div className="space-y-3">
                {/* Sueño Nocturno */}
                <div className="flex items-center justify-between bg-white/70 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Moon className="w-5 h-5 text-indigo-600" />
                    <span className="font-medium text-gray-700">Nocturno/día:</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-indigo-600 text-lg">
                      {formatDuration(breakdown.nightSleepHours)}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">
                      ({Math.round(breakdown.nightSleepPercentage)}%)
                    </span>
                  </div>
                </div>

                {/* Siestas */}
                <div className="flex items-center justify-between bg-white/70 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Sun className="w-5 h-5 text-orange-500" />
                    <span className="font-medium text-gray-700">Siestas/día:</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-orange-500 text-lg">
                      {formatDuration(breakdown.napHours)}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">
                      ({Math.round(breakdown.napPercentage)}%)
                    </span>
                  </div>
                </div>

                {/* Barra de progreso visual */}
                <div className="pt-2">
                  <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-gray-200">
                    <div 
                      className="bg-indigo-500 transition-all duration-500"
                      style={{ width: `${breakdown.nightSleepPercentage}%` }}
                    />
                    <div 
                      className="bg-orange-400 transition-all duration-500"
                      style={{ width: `${breakdown.napPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Columna derecha - Totales y tendencia */}
              <div className="flex flex-col justify-between">
                {/* Total de Sueño */}
                <div className="bg-white/70 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Promedio Total por Día</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatDuration(breakdown.totalHours)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    En {breakdown.daysInPeriod} días: {breakdown.nightSleepCount} noches, {breakdown.napCount} siestas
                  </p>
                </div>

                {/* Indicador de calidad */}
                <div className="mt-3">
                  {breakdown.totalHours > 0 && breakdown.nightSleepPercentage >= 70 ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm font-medium">Buen balance de sueño</span>
                    </div>
                  ) : breakdown.totalHours > 0 ? (
                    <div className="flex items-center gap-2 text-orange-600">
                      <TrendingDown className="w-4 h-4" />
                      <span className="text-sm font-medium">Balance mejorable</span>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">Sin datos suficientes</div>
                  )}
                </div>
              </div>
            </div>
        </motion.div>
      </div>
    </div>
  )
}