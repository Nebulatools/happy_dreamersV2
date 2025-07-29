import React from "react"
import { useSleepData } from "@/hooks/use-sleep-data"
import { AlertCircle } from "lucide-react"
import { parseISO, differenceInMinutes, getDay } from "date-fns"

// Función para procesar despertares nocturnos reales por día de la semana
// USANDO LA MISMA LÓGICA QUE calculateAverageWakeups EN SleepMetricsGrid
function processNightWakeups(events: any[]) {
  // Inicializar datos por día de la semana (Lunes=1, Domingo=0)
  const weekData = [
    { day: 'L', dayIndex: 1, count: 0, duration: 0 }, // Lunes
    { day: 'M', dayIndex: 2, count: 0, duration: 0 }, // Martes
    { day: 'X', dayIndex: 3, count: 0, duration: 0 }, // Miércoles
    { day: 'J', dayIndex: 4, count: 0, duration: 0 }, // Jueves
    { day: 'V', dayIndex: 5, count: 0, duration: 0 }, // Viernes
    { day: 'S', dayIndex: 6, count: 0, duration: 0 }, // Sábado
    { day: 'D', dayIndex: 0, count: 0, duration: 0 }, // Domingo
  ]
  
  if (!events || events.length === 0) return weekData
  
  // COPIAR EXACTAMENTE LA LÓGICA DE calculateAverageWakeups
  const sortedEvents = events.sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )
  
  console.log('DEBUG - processNightWakeups eventos ordenados:', sortedEvents.length)
  
  for (let i = 0; i < sortedEvents.length; i++) {
    const currentEvent = sortedEvents[i]
    
    // Si es evento de dormir (bedtime o sleep)
    if (['bedtime', 'sleep', 'dormir'].includes(currentEvent.eventType)) {
      const sleepStartTime = new Date(currentEvent.startTime)
      let sessionWakeups = 0
      
      console.log('DEBUG - Procesando sleep event:', currentEvent.eventType, sleepStartTime.toLocaleString())
      
      // Buscar eventos wake después de este sleep
      for (let j = i + 1; j < sortedEvents.length; j++) {
        const nextEvent = sortedEvents[j]
        const nextEventTime = new Date(nextEvent.startTime)
        
        console.log('DEBUG - Revisando siguiente evento:', nextEvent.eventType, nextEventTime.toLocaleString())
        
        // Si es el siguiente día y es otro evento de dormir, terminar sesión
        if (['bedtime', 'sleep', 'dormir'].includes(nextEvent.eventType) && 
            nextEventTime.getDate() !== sleepStartTime.getDate()) {
          break
        }
        
        // Contar eventos wake como despertares nocturnos
        if (nextEvent.eventType === 'wake') {
          const wakeHour = nextEventTime.getHours()
          const wakeDuration = Math.abs(nextEventTime.getTime() - sleepStartTime.getTime()) / (1000 * 60 * 60)
          
          console.log('DEBUG - Wake encontrado:', {
            sleepStart: sleepStartTime.toLocaleString(),
            wakeTime: nextEventTime.toLocaleString(),
            wakeHour: wakeHour,
            duration: wakeDuration,
            isNighttime: (wakeHour >= 0 && wakeHour <= 6) || wakeHour >= 23,
            isValidDuration: wakeDuration > 0.5 && wakeDuration < 8
          })
          
          // MISMA LÓGICA QUE calculateAverageWakeups
          const isNighttime = (wakeHour >= 0 && wakeHour <= 6) || wakeHour >= 23
          const isValidDuration = wakeDuration > 0.5 && wakeDuration < 8
          
          if (isNighttime && isValidDuration) {
            // Obtener día de la semana del evento wake
            const dayOfWeek = getDay(nextEventTime)
            const dayData = weekData.find(d => d.dayIndex === dayOfWeek)
            
            if (dayData) {
              dayData.count += 1
              dayData.duration += 45 // Duración promedio
              console.log('DEBUG - ¡Despertar nocturno contado para día:', dayData.day)
            }
          } else {
            console.log('DEBUG - Wake ignorado (no es madrugada o es despertar final)')
          }
        }
      }
    }
  }
  
  return weekData
}

interface NightWakeupsChartProps {
  childId: string
  dateRange?: string
}

export default function NightWakeupsChart({ childId, dateRange = "7-days" }: NightWakeupsChartProps) {
  const [allEvents, setAllEvents] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Cargar TODOS los eventos (incluyendo wake) igual que SleepMetricsGrid
  React.useEffect(() => {
    async function fetchEvents() {
      if (!childId) return
      
      try {
        setLoading(true)
        const response = await fetch(`/api/children/events?childId=${childId}`)
        
        if (!response.ok) {
          throw new Error('Error al cargar eventos')
        }
        
        const data = await response.json()
        const events = data.events || []
        
        // Filtrar TODOS los tipos de eventos necesarios (igual que SleepMetricsGrid)
        const filteredEvents = events.filter((e: any) => {
          return ['sleep', 'nap', 'wake', 'dormir', 'bedtime'].includes(e.eventType)
        })
        
        console.log('DEBUG - NightWakeupsChart eventos cargados:', filteredEvents.length)
        console.log('DEBUG - Tipos encontrados:', [...new Set(filteredEvents.map((e: any) => e.eventType))])
        
        setAllEvents(filteredEvents)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [childId])

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#2F2F2F]">
            Despertares nocturnos
          </h3>
          <AlertCircle className="w-5 h-5 text-[#FF6B6B]" />
        </div>
        <div className="h-64 flex items-center justify-center text-gray-500">
          <p>Cargando datos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#2F2F2F]">
            Despertares nocturnos
          </h3>
          <AlertCircle className="w-5 h-5 text-[#FF6B6B]" />
        </div>
        <div className="h-64 flex items-center justify-center text-red-500">
          <p>Error al cargar datos</p>
        </div>
      </div>
    )
  }

  // Calcular datos reales de despertares por día de la semana
  const daysOfWeek = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
  
  // Procesar eventos reales para obtener despertares por día
  const wakeupsData = processNightWakeups(allEvents)
  
  console.log('DEBUG - Wakeups data por día:', wakeupsData)
  console.log('DEBUG - Total eventos para procesar:', allEvents.length)
  
  const maxDuration = Math.max(...wakeupsData.map(d => d.duration), 60) // Mínimo 1 hora para escala
  
  const getWakeupLevel = (avg: number) => {
    if (avg < 1) return { label: 'Excelente', color: 'text-green-600' }
    if (avg <= 2) return { label: 'Normal', color: 'text-blue-600' }
    if (avg <= 3) return { label: 'Frecuente', color: 'text-yellow-600' }
    return { label: 'Muy frecuente', color: 'text-red-600' }
  }

  // Removido: level ya no se usa, se calcula dinámicamente en las estadísticas

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-[#2F2F2F]">
          Despertares nocturnos
        </h3>
        <AlertCircle className="w-5 h-5 text-[#FF6B6B]" />
      </div>
      
      {/* Gráfico de barras por día */}
      <div className="h-64 flex items-end justify-center space-x-2 mb-4">
        {wakeupsData.map((dayData) => {
          // Altura basada en duración del despertar (más tiempo despierto = barra más alta)
          const height = maxDuration > 0 ? (dayData.duration / maxDuration) * 180 : 0
          return (
            <div key={dayData.day} className="flex flex-col items-center">
              <div className="w-8 bg-gray-100 rounded-t-sm relative" style={{ height: '180px' }}>
                <div 
                  className={`w-full rounded-t-sm absolute bottom-0 transition-all duration-1000 ${
                    dayData.count > 0 
                      ? 'bg-gradient-to-t from-[#FF6B6B] to-[#FF8E8E]' 
                      : 'bg-gray-200'
                  }`}
                  style={{ height: `${height}px` }}
                />
              </div>
              <p className="mt-2 text-xs font-medium text-gray-600">{dayData.day}</p>
              <p className="text-xs text-gray-400">
                {dayData.count > 0 ? dayData.count : '0'}
              </p>
            </div>
          )
        })}
      </div>
      
      {/* Estadísticas */}
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center justify-between">
          <span>Total de despertares:</span>
          <span className="font-medium text-[#FF6B6B]">
            {wakeupsData.reduce((sum, day) => sum + day.count, 0)} veces
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Promedio por noche:</span>
          <span className="font-medium text-[#FF6B6B]">
            {(wakeupsData.reduce((sum, day) => sum + day.count, 0) / 7).toFixed(1)} veces
          </span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span>Evaluación:</span>
          <span className={`font-medium ${getWakeupLevel(wakeupsData.reduce((sum, day) => sum + day.count, 0) / 7).color}`}>
            {getWakeupLevel(wakeupsData.reduce((sum, day) => sum + day.count, 0) / 7).label}
          </span>
        </div>
      </div>
    </div>
  )
}