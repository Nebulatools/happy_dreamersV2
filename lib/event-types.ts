import { Moon, Sun, Activity } from "lucide-react"

export interface EventType {
  id: string
  label: string
  icon: any
  description: string
  hasEndTime: boolean
  hasSleepDelay?: boolean
}

export const eventTypes: EventType[] = [
  {
    id: "sleep",
    label: "Dormir",
    icon: Moon,
    description: "Momento de acostar y período de sueño",
    hasEndTime: false,
    hasSleepDelay: true,
  },
  {
    id: "nap", 
    label: "Siesta",
    icon: Sun,
    description: "Período de descanso diurno",
    hasEndTime: true,
  },
  {
    id: "wake",
    label: "Despertar",
    icon: Sun,
    description: "Momento de despertar",
    hasEndTime: false,
  },
  {
    id: "activity",
    label: "Actividad física",
    icon: Activity,
    description: "Actividad física o juego",
    hasEndTime: true,
  },
]

// Función auxiliar para determinar si un tipo de evento necesita hora de fin
export function eventTypeHasEndTime(eventType: string): boolean {
  const type = eventTypes.find(t => t.id === eventType)
  return type?.hasEndTime ?? false
}

// Función auxiliar para obtener la información de un tipo de evento
export function getEventType(eventTypeId: string): EventType | undefined {
  return eventTypes.find(t => t.id === eventTypeId)
}