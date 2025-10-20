import type { ObjectId } from 'mongodb'
import type { EventType } from './event-types'
import type { PlanStatus } from './status'

export interface User {
  _id: ObjectId
  email: string
  name?: string
  role: 'admin' | 'parent'
  createdAt: Date
  updatedAt: Date
}

export interface Child {
  _id: ObjectId
  userId: ObjectId // parent
  name: string
  birthdate?: Date
  tz?: string
  createdAt: Date
  updatedAt: Date
}

export interface Event {
  _id: ObjectId
  childId: ObjectId
  type: EventType
  startTime: Date
  endTime?: Date
  sleepDelay?: number
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface ChildPlan {
  _id: ObjectId
  childId: ObjectId
  userId: ObjectId // author/owner
  planType: 'initial' | 'event_based' | 'transcript_refinement'
  planNumber: number
  planVersion: number
  status: PlanStatus
  output?: unknown
  sourceData?: unknown
  createdAt: Date
  updatedAt: Date
}

export interface ConsultationReport {
  _id: ObjectId
  childId: ObjectId
  userId: ObjectId
  planId?: ObjectId
  summary: string
  createdAt: Date
  updatedAt: Date
}

export interface ConsultationSession {
  _id: ObjectId
  childId: ObjectId
  userId: ObjectId
  reportId?: ObjectId
  startedAt: Date
  endedAt?: Date
  createdAt: Date
  updatedAt: Date
}

