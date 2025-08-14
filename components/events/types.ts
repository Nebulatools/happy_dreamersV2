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
  feedingType?: FeedingType
  babyState?: 'awake' | 'asleep'  // para tomas nocturnas
  description?: string  // para actividades extra
  createdAt?: string
  parentId?: string
}

export interface Child {
  _id: string
  firstName: string
  lastName?: string
  birthDate: string
  parentId: string
}