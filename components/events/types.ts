// Tipos TypeScript para el sistema de eventos

export type EventType = 'sleep' | 'wake' | 'nap' | 'night_waking' | 'feeding' | 'medication' | 'extra_activities' | 'note'

export type EmotionalState = 'tranquilo' | 'inquieto' | 'irritable' | 'neutral'

export type FeedingType = 'breast' | 'bottle' | 'solids'

export interface EventData {
  _id?: string
  childId: string
  eventType: EventType
  startTime: string  // ISO 8601
  endTime?: string   // ISO 8601
  emotionalState?: EmotionalState
  notes?: string
  sleepDelay?: number  // minutos para dormirse
  // Campos específicos para alimentación
  feedingType?: FeedingType
  feedingAmount?: number  // cantidad en ml (líquidos) o gr (sólidos)
  feedingDuration?: number  // duración en minutos
  babyState?: 'awake' | 'asleep'  // para tomas nocturnas
  feedingNotes?: string  // notas específicas de alimentación
  description?: string  // para actividades extra
  fromSimpleMode?: boolean  // Flag para indicar si el evento fue creado en modo simple
  createdAt?: string
  parentId?: string
}

// Interface específica para el modal de alimentación
export interface FeedingModalData {
  feedingType: FeedingType
  feedingAmount: number
  feedingDuration: number
  babyState: 'awake' | 'asleep'
  feedingNotes: string
}

export interface Child {
  _id: string
  firstName: string
  lastName?: string
  birthDate: string
  parentId: string
}