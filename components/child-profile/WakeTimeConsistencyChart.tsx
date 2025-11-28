import React from "react"
import { Sun, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useSleepData } from "@/hooks/use-sleep-data"
import { useEventsCache } from "@/hooks/use-events-cache"

interface WakeTimeConsistencyChartProps {
  childId: string
  dateRange?: string
}

export default function WakeTimeConsistencyChart({ 
  childId, 
  dateRange = "7-days", 
}: WakeTimeConsistencyChartProps) {
  const { refreshTrigger, subscribe } = useEventsCache(childId)
  const { data: sleepData, loading, error } = useSleepData(childId, dateRange)

  // Suscribirse a invalidaciones de cache
  React.useEffect(() => {
    const unsubscribe = subscribe()
    return unsubscribe
  }, [subscribe])

  // Función para obtener el estado de consistencia de la hora de despertar
  const getWakeTimeConsistencyStatus = (avgWakeTime: string): { 
    label: string; 
    variant: "good" | "consistent" | "average" | "poor";
    description: string;
  } => {
    if (avgWakeTime === "--:--") {
      return { 
        label: "Sin datos", 
        variant: "poor",
        description: "No hay suficientes datos de despertar",
      }
    }

    // Extraer la hora para análisis (asumiendo formato HH:MM)
    const [hours, minutes] = avgWakeTime.split(":").map(Number)
    const wakeTimeInMinutes = hours * 60 + minutes

    // Evaluar consistencia basada en horarios ideales para niños
    // 6:00-7:30 AM = Ideal
    // 5:30-6:00 AM o 7:30-8:30 AM = Bueno
    // 5:00-5:30 AM o 8:30-9:00 AM = Aceptable
    // Antes de 5:00 AM o después de 9:00 AM = Necesita ajuste

    if (wakeTimeInMinutes >= 6 * 60 && wakeTimeInMinutes <= 7.5 * 60) { // 6:00-7:30
      return { 
        label: "Ideal", 
        variant: "good",
        description: "Hora de despertar ideal para niños",
      }
    } else if (
      (wakeTimeInMinutes >= 5.5 * 60 && wakeTimeInMinutes < 6 * 60) || // 5:30-6:00
      (wakeTimeInMinutes > 7.5 * 60 && wakeTimeInMinutes <= 8.5 * 60)   // 7:30-8:30
    ) {
      return { 
        label: "Bueno", 
        variant: "consistent",
        description: "Hora de despertar dentro de rango saludable",
      }
    } else if (
      (wakeTimeInMinutes >= 5 * 60 && wakeTimeInMinutes < 5.5 * 60) ||  // 5:00-5:30
      (wakeTimeInMinutes > 8.5 * 60 && wakeTimeInMinutes <= 9 * 60)     // 8:30-9:00
    ) {
      return { 
        label: "Aceptable", 
        variant: "average",
        description: "Podría beneficiarse de ajustes graduales",
      }
    } else {
      return { 
        label: "Necesita ajuste", 
        variant: "poor",
        description: "Considerar ajustar rutina de sueño",
      }
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden p-6">
        <div className="flex justify-center items-center h-32">
          <p className="text-gray-500">Cargando datos de despertar...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden p-6">
        <div className="flex justify-center items-center h-32">
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    )
  }

  if (!sleepData) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden p-6">
        <div className="flex justify-center items-center h-32">
          <p className="text-gray-500">No hay datos disponibles</p>
        </div>
      </div>
    )
  }

  const wakeTimeStatus = getWakeTimeConsistencyStatus(sleepData.avgWakeTime)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.02] cursor-pointer">
      {/* Badge de destacado */}
      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 px-4 py-2 border-b border-orange-100">
        <div className="flex items-center justify-center">
          <Badge 
            variant="secondary" 
            className="bg-gradient-to-r from-orange-400 to-yellow-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-sm"
          >
            🌅 Métrica Prioritaria
          </Badge>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          {/* Información de la métrica */}
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-2 leading-tight font-medium">
              Hora de despertar (promedio)
            </p>
            <p className="text-5xl font-extrabold text-[#2F2F2F] leading-none mb-2">
              {sleepData.avgWakeTime}
            </p>
            <p className="text-sm text-gray-500 leading-relaxed">
              {wakeTimeStatus.description}
            </p>
          </div>
          
          {/* Icono */}
          <div className="bg-gradient-to-br from-orange-100 to-yellow-100 rounded-2xl w-16 h-16 flex items-center justify-center ml-4 shadow-inner">
            <Sun className="w-7 h-7 text-orange-500" />
          </div>
        </div>
        
        {/* Badge de estado */}
        <div className="flex items-center justify-between">
          <Badge 
            variant={
              wakeTimeStatus.variant === "good" ? "secondary" :
                wakeTimeStatus.variant === "consistent" ? "secondary" :
                  wakeTimeStatus.variant === "average" ? "secondary" :
                    "destructive"
            }
            className={`
              text-xs font-medium px-3 py-2 rounded-full shadow-sm transition-colors
              ${wakeTimeStatus.variant === "good" ? "bg-green-100 text-green-800 border-green-200" :
      wakeTimeStatus.variant === "consistent" ? "bg-blue-100 text-blue-800 border-blue-200" :
        wakeTimeStatus.variant === "average" ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
          "bg-red-100 text-red-800 border-red-200"}
            `}
          >
            {wakeTimeStatus.label}
          </Badge>
          
          <div className="flex items-center text-xs text-gray-500">
            <Clock className="w-3 h-3 mr-1" />
            Últimos {dateRange === "7-days" ? "7 días" : dateRange === "30-days" ? "30 días" : dateRange}
          </div>
        </div>
      </div>
    </div>
  )
}