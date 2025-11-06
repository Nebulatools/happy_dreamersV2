import { Moon, Sun, Activity, AlertCircle, MessageSquare, Utensils, Pill } from "lucide-react"

export interface EventType {
  id: string
  label: string
  icon: any
  description: string
  hasEndTime: boolean
  hasSleepDelay?: boolean
  requiresDescription?: boolean
  defaultStartTime?: string
}

export const eventTypes: EventType[] = [
  {
    id: "sleep",
    label: "Dormir",
    icon: Moon,
    description: "Momento de acostar y período de sueño",
    hasEndTime: true,
    hasSleepDelay: true,
    defaultStartTime: "20:00",
  },
  {
    id: "nap", 
    label: "Siesta",
    icon: Sun,
    description: "Período de descanso diurno",
    hasEndTime: true,
    defaultStartTime: "13:00",
  },
  {
    id: "wake",
    label: "Despertar",
    icon: Sun,
    description: "Momento de despertar por la mañana",
    hasEndTime: false,
    defaultStartTime: "07:00",
  },
  {
    id: "night_waking",
    label: "Despertar nocturno",
    icon: AlertCircle,
    description: "Despertar durante la noche",
    hasEndTime: true,
    hasSleepDelay: true,
    defaultStartTime: "02:00",
  },
  {
    id: "feeding",
    label: "Alimentación",
    icon: Utensils,
    description: "Comida, biberón, lactancia",
    hasEndTime: false,
    defaultStartTime: "12:00",
  },
  {
    id: "night_feeding",
    label: "Tomas Nocturnas",
    icon: Utensils,
    description: "Alimentación durante la noche",
    hasEndTime: true,
    requiresDescription: true,
    defaultStartTime: "01:00",
  },
  {
    id: "medication",
    label: "Medicamentos",
    icon: Pill,
    description: "Administración de medicamentos",
    hasEndTime: false,
    requiresDescription: true,
    defaultStartTime: "08:00",
  },
  {
    id: "extra_activities",
    label: "Actividades Extra",
    icon: MessageSquare,
    description: "Factores del día que pueden afectar el sueño",
    hasEndTime: false,
    requiresDescription: true,
    defaultStartTime: "17:00",
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
