import React from "react"
import { useSleepData } from "@/hooks/use-sleep-data"
import { AlertCircle } from "lucide-react"
import { parseISO, differenceInMinutes, getDay } from "date-fns"

// Función para procesar despertares nocturnos por día de la semana
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
  
  // Filtrar solo eventos de tipo night_waking
  const nightWakingEvents = events.filter(event => event.eventType === 'night_waking')
  
  console.log('DEBUG - processNightWakeups eventos night_waking:', nightWakingEvents.length)
  
  // Procesar cada despertar nocturno
  nightWakingEvents.forEach(event => {
    if (!event.startTime) return
    
    const eventDate = parseISO(event.startTime)
    const dayOfWeek = getDay(eventDate)
    const dayData = weekData.find(d => d.dayIndex === dayOfWeek)
    
    if (dayData) {
      dayData.count += 1
      
      // Si tiene endTime, calcular duración real
      if (event.endTime && event.startTime) {
        const duration = differenceInMinutes(
          parseISO(event.endTime),
          parseISO(event.startTime)
        )
        dayData.duration += duration
      } else {
        dayData.duration += 45 // Duración promedio si no hay endTime
      }
      
      console.log('DEBUG - Despertar nocturno contado para día:', dayData.day)
    }
  })
  
  return weekData
}

interface NightWakeupsChartProps {
  childId: string
  dateRange?: string
}

export default function NightWakeupsChart({ childId, dateRange = "7-days" }: NightWakeupsChartProps) {
  // Usar hook centralizado CON filtro de fecha
  const { data: sleepData, loading, error } = useSleepData(childId, dateRange)

  // Calcular datos antes de los returns condicionales
  const totalWakeups = sleepData?.totalWakeups || 0
  const avgWakeupsPerNight = sleepData?.avgWakeupsPerNight || 0
  
  // Simular distribución por día de la semana (ya que los datos reales están centralizados)
  const wakeupsData = React.useMemo(() => {
    const daysData = [
      { day: 'L', dayIndex: 1, count: 0, duration: 0 },
      { day: 'M', dayIndex: 2, count: 0, duration: 0 },
      { day: 'X', dayIndex: 3, count: 0, duration: 0 },
      { day: 'J', dayIndex: 4, count: 0, duration: 0 },
      { day: 'V', dayIndex: 5, count: 0, duration: 0 },
      { day: 'S', dayIndex: 6, count: 0, duration: 0 },
      { day: 'D', dayIndex: 0, count: 0, duration: 0 },
    ]
    
    if (sleepData?.events) {
      // Procesar eventos usando la misma lógica
      const processedData = processNightWakeups(sleepData.events)
      return processedData
    }
    
    return daysData
  }, [sleepData])

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

  const maxDuration = Math.max(...wakeupsData.map(d => d.duration), 60)
  
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
      
      {/* Estadísticas - Usar datos del hook centralizado */}
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center justify-between">
          <span>Total de despertares:</span>
          <span className="font-medium text-[#FF6B6B]">
            {totalWakeups} veces
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Promedio por noche:</span>
          <span className="font-medium text-[#FF6B6B]">
            {avgWakeupsPerNight.toFixed(1)} veces
          </span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span>Evaluación:</span>
          <span className={`font-medium ${getWakeupLevel(avgWakeupsPerNight).color}`}>
            {getWakeupLevel(avgWakeupsPerNight).label}
          </span>
        </div>
      </div>
    </div>
  )
}