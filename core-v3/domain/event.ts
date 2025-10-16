export type EventType = 'sleep' | 'nap' | 'feeding' | 'medication' | 'extra_activities' | 'night_waking' | 'wake'

export interface Event {
  id: string
  childId: string
  type: EventType
  startTime: Date
  endTime?: Date
  notes?: string
}

