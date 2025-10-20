import { z } from 'zod'
import { zObjectIdString } from './object-id'
import { EVENT_TYPES } from './event-types'
import { mapLegacyStatus } from './status'

export const zObjectId = z.custom<any>((v) => typeof v === 'object' && v !== null, { message: 'ObjectId expected' })

export const userApiSchema = z.object({
  _id: zObjectId.optional(),
  email: z.string().email(),
  name: z.string().optional(),
  role: z.enum(['admin', 'parent']),
})

export const childApiSchema = z.object({
  _id: zObjectId.optional(),
  userId: zObjectIdString(z),
  name: z.string().min(1),
  birthdate: z.date().optional(),
  tz: z.string().optional(),
})

export const eventApiSchema = z.object({
  _id: zObjectId.optional(),
  childId: zObjectIdString(z),
  type: z.enum(EVENT_TYPES as [string, ...string[]]),
  startTime: z.date(),
  endTime: z.date().optional(),
  sleepDelay: z.number().int().min(0).max(180).optional(),
  notes: z.string().optional(),
})

export const childPlanApiSchema = z.object({
  _id: zObjectId.optional(),
  childId: zObjectIdString(z),
  userId: zObjectIdString(z),
  planType: z.enum(['initial', 'event_based', 'transcript_refinement']),
  planNumber: z.number().int().min(0).default(0),
  planVersion: z.number().int().min(0).default(0),
  status: z
    .string()
    .transform((s) => mapLegacyStatus(s)),
  output: z.unknown().optional(),
  sourceData: z.unknown().optional(),
})

export const consultationReportApiSchema = z.object({
  _id: zObjectId.optional(),
  childId: zObjectIdString(z),
  userId: zObjectIdString(z),
  planId: zObjectIdString(z).optional(),
  summary: z.string().min(1),
})

export const consultationSessionApiSchema = z.object({
  _id: zObjectId.optional(),
  childId: zObjectIdString(z),
  userId: zObjectIdString(z),
  reportId: zObjectIdString(z).optional(),
  startedAt: z.date(),
  endedAt: z.date().optional(),
})

