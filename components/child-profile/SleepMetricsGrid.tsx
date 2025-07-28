import React from "react"
import { Clock, Moon, AlertCircle, Heart } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { differenceInMinutes, parseISO, subDays } from "date-fns"
import { useEventsCache } from "@/hooks/use-events-cache"

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
  eventType?: string
}

export default function SleepMetricsGrid({ childId, dateRange = "7-days", eventType = "sleep" }: SleepMetricsGridProps) {
  const [sleepMetrics, setSleepMetrics] = React.useState<SleepMetric[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const { refreshTrigger, subscribe } = useEventsCache(childId)

  // Suscribirse a invalidaciones de cache
  React.useEffect(() => {
    const unsubscribe = subscribe()
    return unsubscribe
  }, [subscribe])

  React.useEffect(() => {
    async function fetchSleepMetrics() {
      try {
        setLoading(true)
        
        // Calcular período según filtro
        const now = new Date()
        const days = dateRange === "30-days" ? 30 : dateRange === "90-days" ? 90 : 7
        const currentPeriodStart = subDays(now, days)
        const previousPeriodStart = subDays(now, days * 2)
        const previousPeriodEnd = subDays(now, days)
        
        const response = await fetch(`/api/children/events?childId=${childId}`)
        
        if (!response.ok) {
          throw new Error('Error al cargar métricas de sueño')
        }
        
        const data = await response.json()
        const allEvents = data.events || []
        
        // Filtrar eventos según tipo seleccionado
        const filteredEvents = allEvents.filter((e: any) => {
          if (eventType === 'all') return ['sleep', 'bedtime', 'nap', 'wake', 'activity'].includes(e.eventType)
          if (eventType === 'sleep') return e.eventType === 'sleep'
          if (eventType === 'bedtime') return e.eventType === 'bedtime'
          if (eventType === 'nap') return e.eventType === 'nap'
          if (eventType === 'wake') return e.eventType === 'wake'
          if (eventType === 'activity') return e.eventType === 'activity'
          return ['sleep', 'nap'].includes(e.eventType) // Fallback para compatibilidad
        })
        
        const currentEvents = filteredEvents.filter((e: any) => {
          const date = parseISO(e.startTime)
          return date >= currentPeriodStart
        })
        
        const previousEvents = filteredEvents.filter((e: any) => {
          const date = parseISO(e.startTime)
          return date >= previousPeriodStart && date <= previousPeriodEnd
        })
        
        // Calcular métricas simples
        const metrics = calculateMetrics(currentEvents, previousEvents)
        setSleepMetrics(metrics)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }

    if (childId) {
      fetchSleepMetrics()
    }
  }, [childId, dateRange, eventType, refreshTrigger])

  function calculateMetrics(thisWeek: any[], lastWeek: any[]): SleepMetric[] {
    // Calcular tiempo total de sueño promedio
    const avgSleepThisWeek = calculateAverageSleepDuration(thisWeek)
    const avgSleepLastWeek = calculateAverageSleepDuration(lastWeek)
    const sleepDiff = avgSleepThisWeek - avgSleepLastWeek
    
    // Calcular hora promedio de acostarse
    const avgBedtimeThisWeek = calculateAverageBedtime(thisWeek)
    const bedtimeVariation = calculateBedtimeVariation(thisWeek)
    
    // Calcular despertares nocturnos (basado en eventos adicionales o notas)
    const avgWakeupsThisWeek = calculateAverageWakeups(thisWeek)
    const avgWakeupsLastWeek = calculateAverageWakeups(lastWeek)
    const wakeupsDiff = avgWakeupsThisWeek - avgWakeupsLastWeek
    
    // Calcular calidad del sueño
    const qualityThisWeek = calculateSleepQuality(thisWeek)
    const qualityLastWeek = calculateSleepQuality(lastWeek)
    const qualityDiff = qualityThisWeek - qualityLastWeek
    
    return [
      {
        title: "Tiempo total de sueño (promedio)",
        value: formatDuration(avgSleepThisWeek),
        icon: <Clock className="w-3 h-3" />,
        status: getSleepDurationStatus(avgSleepThisWeek),
        change: formatDurationChange(sleepDiff),
        iconBg: "bg-[#B7F1C0]",
      },
      {
        title: "Hora de acostarse (promedio)",
        value: avgBedtimeThisWeek,
        icon: <Moon className="w-5 h-4" />,
        status: getBedtimeConsistencyStatus(bedtimeVariation),
        change: `±${Math.round(bedtimeVariation)} min de variación`,
        iconBg: "bg-[#D4C1FF]",
      },
      {
        title: "Despertares nocturnos (promedio)",
        value: avgWakeupsThisWeek.toFixed(1),
        icon: <AlertCircle className="w-4 h-4" />,
        status: getWakeupsStatus(avgWakeupsThisWeek),
        change: wakeupsDiff === 0 ? 'Sin cambios' : `${wakeupsDiff > 0 ? '+' : ''}${wakeupsDiff.toFixed(1)} promedio anterior`,
        iconBg: "bg-[#FFE442]",
      },
      {
        title: "Calidad del sueño",
        value: `${Math.round(qualityThisWeek)}%`,
        icon: <Heart className="w-4 h-4" />,
        status: getSleepQualityStatus(qualityThisWeek),
        change: qualityDiff === 0 ? 'Sin cambios' : `${qualityDiff > 0 ? '+' : ''}${Math.round(qualityDiff)}% desde período anterior`,
        iconBg: "bg-[#FFC4C4]",
      },
    ]
  }

  // Funciones auxiliares de cálculo
  function calculateAverageSleepDuration(events: any[]): number {
    if (events.length === 0) return 0
    const totalMinutes = events.reduce((sum, event) => {
      if (event.endTime) {
        return sum + differenceInMinutes(parseISO(event.endTime), parseISO(event.startTime))
      }
      return sum
    }, 0)
    return totalMinutes / events.length / 60 // Retornar en horas
  }

  function calculateAverageBedtime(events: any[]): string {
    if (events.length === 0) return "--:--"
    const totalMinutes = events.reduce((sum, event) => {
      const date = parseISO(event.startTime)
      return sum + date.getHours() * 60 + date.getMinutes()
    }, 0)
    const avgMinutes = totalMinutes / events.length
    const hours = Math.floor(avgMinutes / 60) % 24
    const minutes = Math.round(avgMinutes % 60)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  function calculateBedtimeVariation(events: any[]): number {
    if (events.length <= 1) return 0
    const bedtimes = events.map(event => {
      const date = parseISO(event.startTime)
      return date.getHours() * 60 + date.getMinutes()
    })
    const avg = bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length
    const variance = bedtimes.reduce((sum, time) => sum + Math.pow(time - avg, 2), 0) / bedtimes.length
    return Math.sqrt(variance)
  }

  function calculateAverageWakeups(events: any[]): number {
    if (events.length === 0) return 0
    // Por ahora, basado en notas o comentarios
    const totalWakeups = events.reduce((sum, event) => {
      // Buscar en las notas menciones de despertares
      const notes = event.notes?.toLowerCase() || ''
      if (notes.includes('despertó') || notes.includes('despierta')) {
        // Intentar extraer número de veces
        const match = notes.match(/(\d+)\s*(veces|vez)/)
        return sum + (match ? parseInt(match[1]) : 1)
      }
      return sum
    }, 0)
    return totalWakeups / events.length
  }

  function calculateSleepQuality(events: any[]): number {
    if (events.length === 0) return 0
    
    let qualitySum = 0
    events.forEach(event => {
      let quality = 50 // Base
      
      // Duración del sueño (ideal 10-11 horas para niños)
      if (event.endTime) {
        const duration = differenceInMinutes(parseISO(event.endTime), parseISO(event.startTime)) / 60
        if (duration >= 9 && duration <= 12) {
          quality += 30
        } else if (duration >= 8 && duration <= 13) {
          quality += 20
        } else {
          quality += 10
        }
      }
      
      // Hora de acostarse (ideal antes de las 21:00)
      const bedtime = parseISO(event.startTime)
      const hour = bedtime.getHours()
      if (hour <= 20) {
        quality += 20
      } else if (hour <= 21) {
        quality += 10
      }
      
      qualitySum += Math.min(100, quality)
    })
    
    return qualitySum / events.length
  }

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
