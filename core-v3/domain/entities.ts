import type { ObjectId } from 'mongodb'

// Enumerations
export const PlanType = {
  initial: 'initial',
  event_based: 'event_based',
  transcript_refinement: 'transcript_refinement',
} as const
export type PlanType = typeof PlanType[keyof typeof PlanType]

export const SleepEventType = {
  sleep: 'sleep',
  nap: 'nap',
  night_waking: 'night_waking',
  wake: 'wake',
} as const
export type SleepEventType = typeof SleepEventType[keyof typeof SleepEventType]

// Domain Entities (internas) — invariantes fuertes, sin nulls ambiguos
export interface ChildEntity {
  _id: ObjectId
  userId: ObjectId
  name: string
  // Zona horaria IANA para normalización (ej: "America/Mexico_City")
  tz?: string
  birthdate?: Date
  createdAt: Date
  updatedAt: Date
}

export interface EventEntityBase {
  _id: ObjectId
  childId: ObjectId
  type: SleepEventType
  startTime: Date
  endTime?: Date
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface SleepEventEntity extends EventEntityBase {
  type: typeof SleepEventType.sleep | typeof SleepEventType.nap | typeof SleepEventType.wake | typeof SleepEventType.night_waking
  // Sólo aplica para type === 'sleep'
  sleepDelay?: number // minutos [0..180]
}

export interface PlanEntity {
  _id: ObjectId
  childId: ObjectId
  planType: PlanType
  title?: string
  content?: unknown
  createdAt: Date
  updatedAt: Date
}

// DTOs (borde/API) — IDs como strings (ObjectId) y fechas como Date
export interface ChildDTO {
  id?: string
  userId: string
  name: string
  tz?: string
  birthdate?: Date
  createdAt: Date
  updatedAt: Date
}

export interface EventDTO {
  id?: string
  childId: string
  type: SleepEventType
  startTime: Date
  endTime?: Date
  notes?: string
  // Sólo para type === 'sleep'
  sleepDelay?: number
  createdAt: Date
  updatedAt: Date
}

export interface PlanDTO {
  id?: string
  childId: string
  planType: PlanType
  title?: string
  content?: unknown
  createdAt: Date
  updatedAt: Date
}
