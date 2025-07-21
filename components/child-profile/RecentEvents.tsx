import React from 'react'
import { Sun, Moon, ChevronRight } from 'lucide-react'

interface SleepEvent {
  id: string
  type: 'sleep' | 'wake'
  timestamp: string
  date: string
}

interface RecentEventsProps {
  childId: string
}

export default function RecentEvents({ childId }: RecentEventsProps) {
  // TODO: Obtener datos reales del API
  const recentEvents: SleepEvent[] = [
    {
      id: '1',
      type: 'wake',
      timestamp: '07:15',
      date: 'Mayo 8, 2025'
    },
    {
      id: '2',
      type: 'sleep',
      timestamp: '20:30',
      date: 'Mayo 8, 2025'
    }
  ]

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'wake':
        return <Sun className="w-4 h-4" />
      case 'sleep':
        return <Moon className="w-5 h-4" />
      default:
        return <Sun className="w-4 h-4" />
    }
  }

  const getEventTitle = (type: string) => {
    switch (type) {
      case 'wake':
        return 'Despertar'
      case 'sleep':
        return 'Hora de dormir'
      default:
        return 'Evento'
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
        {recentEvents.map((event, index) => (
          <div 
            key={event.id}
            className={`p-6 flex items-center justify-between hover:bg-gray-50 transition-colors ${
              index === 0 ? '' : 'border-t border-gray-100'
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
        ))}
      </div>
    </div>
  )
}
