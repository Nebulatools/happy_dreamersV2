export type EventType =
  | 'sleep'
  | 'nap'
  | 'night_waking'
  | 'wakeup'
  | 'bedtime' // legacy-compatible; not recommended for new data
  | 'feeding'
  | 'medication'
  | 'extra_activities'

export const EVENT_TYPES: EventType[] = [
  'sleep',
  'nap',
  'night_waking',
  'wakeup',
  'bedtime',
  'feeding',
  'medication',
  'extra_activities',
]

