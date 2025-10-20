import { z } from 'zod'
import { PlanType, SleepEventType } from './entities'

// ObjectId string (24 hex)
export const objectIdString = z
  .string()
  .regex(/^[a-f\d]{24}$/i, { message: 'Invalid ObjectId string' })

// Enumerations
export const planTypeSchema = z.nativeEnum(
  Object.assign({}, PlanType) as unknown as Record<string, string>
)

export const sleepEventTypeSchema = z.nativeEnum(
  Object.assign({}, SleepEventType) as unknown as Record<string, string>
)

// Common fields
const requiredDates = {
  createdAt: z.date({ required_error: 'createdAt is required and must be Date' }),
  updatedAt: z.date({ required_error: 'updatedAt is required and must be Date' }),
}

// Child DTO schema (API)
export const childDTOSchema = z.object({
  id: objectIdString.optional(),
  userId: objectIdString,
  name: z.string().min(1),
  tz: z.string().optional(),
  birthdate: z.date().optional(),
  ...requiredDates,
})

// Event DTO schema (API)
export const eventDTOSchema = z
  .object({
    id: objectIdString.optional(),
    childId: objectIdString,
    type: sleepEventTypeSchema,
    startTime: z.date({ required_error: 'startTime must be a Date' }),
    endTime: z.date().optional(),
    notes: z.string().optional(),
    sleepDelay: z.number().int().min(0).max(180).optional(),
    ...requiredDates,
  })
  .superRefine((data, ctx) => {
    // Invariante: endTime > startTime cuando aplique
    if (data.endTime && !(data.endTime > data.startTime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'endTime must be greater than startTime',
        path: ['endTime'],
      })
    }

    // Invariante: sleepDelay sólo aplica para type === 'sleep'
    if (data.sleepDelay !== undefined && data.type !== SleepEventType.sleep) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'sleepDelay is only allowed for type "sleep"',
        path: ['sleepDelay'],
      })
    }
  })

// Plan DTO schema (API)
export const planDTOSchema = z.object({
  id: objectIdString.optional(),
  childId: objectIdString,
  planType: planTypeSchema,
  title: z.string().optional(),
  content: z.unknown().optional(),
  ...requiredDates,
})

export type ChildDTO = z.infer<typeof childDTOSchema>
export type EventDTO = z.infer<typeof eventDTOSchema>
export type PlanDTO = z.infer<typeof planDTOSchema>

