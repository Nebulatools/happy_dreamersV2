import React from "react"
import { Sun, Moon, ChevronRight, AlertCircle } from "lucide-react"
import { useEventsCache } from "@/hooks/use-events-cache"

interface SleepEvent {
  id: string
  type: "sleep" | "wake" | "night_waking" | "nap"
  timestamp: string
  date: string
}

interface RecentEventsProps {
  childId: string
}

export default function RecentEvents({ childId }: RecentEventsProps) {
  const [recentEvents, setRecentEvents] = React.useState<SleepEvent[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const { refreshTrigger, subscribe } = useEventsCache(childId)

  // Suscribirse a invalidaciones de cache
  React.useEffect(() => {
    const unsubscribe = subscribe()
    return unsubscribe
  }, [subscribe])

  React.useEffect(() => {
    async function fetchRecentEvents() {
      try {
        setLoading(true)
        const response = await fetch(`/api/children/${childId}/events?limit=5&type=sleep,wake`)
        if (!response.ok) {
          throw new Error('Error al cargar eventos recientes')
        }
        const data = await response.json()
        
        // Formatear eventos del API al formato esperado
        const formattedEvents: SleepEvent[] = data.events?.map((event: any) => ({
          id: event._id,
          type: event.eventType as "sleep" | "wake",
          timestamp: new Date(event.startTime).toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          date: new Date(event.startTime).toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
        })) || []
        
        setRecentEvents(formattedEvents)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }

    if (childId) {
      fetchRecentEvents()
    }
  }, [childId, refreshTrigger])

  const getEventIcon = (type: string) => {
    switch (type) {
    case "wake":
      return <Sun className="w-4 h-4" />
    case "sleep":
      return <Moon className="w-5 h-4" />
    case "night_waking":
      return <AlertCircle className="w-4 h-4" />
    case "nap":
      return <Sun className="w-4 h-4" />
    default:
      return <Sun className="w-4 h-4" />
    }
  }

  const getEventTitle = (type: string) => {
    switch (type) {
    case "wake":
      return "Despertar"
    case "sleep":
      return "Hora de dormir"
    case "night_waking":
      return "Despertar nocturno"
    case "nap":
      return "Siesta"
    default:
      return "Evento"
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-xl font-semibold text-[#2F2F2F]">
          Eventos Recientes
        </h3>
      </div>

      {/* Lista de eventos */}
      <div className="divide-y divide-gray-100">
        {loading ? (
          <div className="p-6 text-center text-gray-500">
            Cargando eventos...
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-500">
            {error}
          </div>
        ) : recentEvents.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No hay eventos recientes
          </div>
        ) : (
          recentEvents.map((event, index) => (
          <div 
            key={event.id}
            className={`p-6 flex items-center justify-between hover:bg-gray-50 transition-colors ${
              index === 0 ? "" : "border-t border-gray-100"
            }`}
          >
            <div className="flex items-center space-x-4">
              {/* Ícono del evento */}
              <div className="w-10 h-10 rounded-full bg-[#F0F7FF] flex items-center justify-center">
                <div className="text-[#4A90E2]">
                  {getEventIcon(event.type)}
                </div>
              </div>

              {/* Información del evento */}
              <div>
                <h4 className="font-medium text-[#2F2F2F] mb-1">
                  {getEventTitle(event.type)}
                </h4>
                <p className="text-sm text-gray-600">
                  {event.timestamp} - {event.date}
                </p>
              </div>
            </div>

            {/* Flecha de navegación */}
            <button className="text-gray-400 hover:text-gray-600 transition-colors">
              <ChevronRight className="w-5 h-4" />
            </button>
          </div>
        ))
        )}
      </div>
    </div>
  )
}
