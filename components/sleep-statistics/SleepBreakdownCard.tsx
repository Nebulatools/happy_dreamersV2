"use client"

import React from "react"
import { Moon, Sun } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useSleepData } from "@/hooks/use-sleep-data"
import { differenceInMinutes, parseISO, startOfDay, endOfDay } from "date-fns"

interface SleepBreakdownCardProps {
  childId: string
  dateRange?: string
}

// Función para clasificar sueño como nocturno o siesta
function classifySleep(startTime: Date, endTime: Date) {
  const startHour = startTime.getHours()
  const duration = differenceInMinutes(endTime, startTime) / 60 // Duración en horas
  
  // Sueño nocturno: después de 7pm (19:00) o antes de 7am O duración > 6 horas
  if (startHour >= 19 || startHour <= 7 || duration > 6) {
    return "night"
  }
  
  // Siesta: durante el día y < 6 horas
  return "nap"
}

// Función para procesar eventos y calcular totales
function processSleepBreakdown(events: any[]) {
  let nightSleepMinutes = 0
  let napMinutes = 0
  let nightSleepCount = 0
  let napCount = 0
  
  if (!events || events.length === 0) {
    return {
      nightSleepHours: 0,
      napHours: 0,
      nightSleepPercentage: 0,
      napPercentage: 0,
      totalHours: 0,
      nightSleepCount: 0,
      napCount: 0,
    }
  }
  
  // Filtrar eventos de sueño
  const sleepEvents = events.filter(event => 
    event.eventType === "sleep" && event.startTime && event.endTime
  )
  
  // Procesar cada evento
  sleepEvents.forEach(event => {
    const startTime = parseISO(event.startTime)
    const endTime = parseISO(event.endTime)
    const duration = differenceInMinutes(endTime, startTime)
    
    const sleepType = classifySleep(startTime, endTime)
    
    if (sleepType === "night") {
      nightSleepMinutes += duration
      nightSleepCount++
    } else {
      napMinutes += duration
      napCount++
    }
  })
  
  const totalMinutes = nightSleepMinutes + napMinutes
  const nightSleepHours = nightSleepMinutes / 60
  const napHours = napMinutes / 60
  const totalHours = totalMinutes / 60
  
  return {
    nightSleepHours,
    napHours,
    nightSleepPercentage: totalMinutes > 0 ? (nightSleepMinutes / totalMinutes) * 100 : 0,
    napPercentage: totalMinutes > 0 ? (napMinutes / totalMinutes) * 100 : 0,
    totalHours,
    nightSleepCount,
    napCount,
  }
}

export default function SleepBreakdownCard({ childId, dateRange = "7-days" }: SleepBreakdownCardProps) {
  const { data: sleepData, loading, error } = useSleepData(childId, dateRange)
  const [breakdown, setBreakdown] = React.useState({
    nightSleepHours: 0,
    napHours: 0,
    nightSleepPercentage: 0,
    napPercentage: 0,
    totalHours: 0,
    nightSleepCount: 0,
    napCount: 0,
  })
  
  // Obtener eventos y calcular desglose
  React.useEffect(() => {
    async function fetchAndProcessEvents() {
      try {
        const response = await fetch(`/api/children/events?childId=${childId}`)
        if (!response.ok) throw new Error("Error al cargar eventos")
        
        const { events } = await response.json()
        const processedBreakdown = processSleepBreakdown(events)
        setBreakdown(processedBreakdown)
      } catch (err) {
        console.error("Error procesando desglose de sueño:", err)
      }
    }
    
    if (childId) {
      fetchAndProcessEvents()
    }
  }, [childId, dateRange])
  
  // Formatear horas para mostrar
  const formatHours = (hours: number) => {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  
  // Determinar recomendaciones basadas en edad (esto se puede ajustar según la edad del niño)
  const getRecommendation = () => {
    if (breakdown.nightSleepPercentage < 70) {
      return {
        text: "⚠️ Poco sueño nocturno",
        color: "text-orange-600",
      }
    } else if (breakdown.nightSleepPercentage > 85) {
      return {
        text: "✅ Buen balance de sueño",
        color: "text-green-600",
      }
    } else {
      return {
        text: "Balance de sueño normal",
        color: "text-gray-600",
      }
    }
  }
  
  const recommendation = getRecommendation()
  
  if (loading) {
    return (
      <Card className="col-span-full">
        <CardContent className="p-6">
          <p className="text-gray-500 text-center">Cargando desglose de sueño...</p>
        </CardContent>
      </Card>
    )
  }
  
  if (error) {
    return (
      <Card className="col-span-full">
        <CardContent className="p-6">
          <p className="text-red-500 text-center">Error al cargar desglose de sueño</p>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className="col-span-full bg-gradient-to-br from-blue-50 to-purple-50">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-gray-800">
          Desglose de Sueño: Nocturno vs Siestas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sueño Nocturno */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Moon className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Sueño Nocturno</h3>
                  <p className="text-xs text-gray-500">{breakdown.nightSleepCount} períodos</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="text-3xl font-bold text-indigo-600">
                {formatHours(breakdown.nightSleepHours)}
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Del total</span>
                  <span className="font-medium">{Math.round(breakdown.nightSleepPercentage)}%</span>
                </div>
                <Progress 
                  value={breakdown.nightSleepPercentage} 
                  className="h-2"
                  indicatorClassName="bg-indigo-500"
                />
              </div>
              
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-600">
                  Promedio por noche: {formatHours(breakdown.nightSleepHours / Math.max(breakdown.nightSleepCount, 1))}
                </p>
              </div>
            </div>
          </div>
          
          {/* Siestas */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Sun className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Siestas</h3>
                  <p className="text-xs text-gray-500">{breakdown.napCount} períodos</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="text-3xl font-bold text-orange-600">
                {formatHours(breakdown.napHours)}
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Del total</span>
                  <span className="font-medium">{Math.round(breakdown.napPercentage)}%</span>
                </div>
                <Progress 
                  value={breakdown.napPercentage} 
                  className="h-2"
                  indicatorClassName="bg-orange-500"
                />
              </div>
              
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-600">
                  Promedio por siesta: {formatHours(breakdown.napHours / Math.max(breakdown.napCount, 1))}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Resumen y recomendación */}
        <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total de sueño en el período</p>
              <p className="text-xl font-bold text-gray-800">{formatHours(breakdown.totalHours)}</p>
            </div>
            <div className={`text-sm font-medium ${recommendation.color}`}>
              {recommendation.text}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}