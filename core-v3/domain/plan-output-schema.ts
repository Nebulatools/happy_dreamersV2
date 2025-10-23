import { z } from 'zod'

const timeString = z.string().min(1)

const mealSchema = z.object({
  time: timeString,
  type: z.string().min(1),
  description: z.string().min(1),
})

const activitySchema = z.object({
  time: timeString,
  activity: z.string().min(1),
  duration: z.number().int().min(1),
  description: z.string().min(1),
})

const napSchema = z.object({
  time: timeString,
  duration: z.number().int().min(10),
  description: z.string().optional(),
})

const scheduleSchema = z.object({
  bedtime: timeString,
  wakeTime: timeString,
  meals: z.array(mealSchema).min(1),
  activities: z.array(activitySchema).default([]),
  naps: z.array(napSchema).default([]),
})

const metadataSchema = z.object({
  ragSources: z.array(z.string().min(1)).default([]),
  notes: z.string().optional(),
})

const metricsSchema = z.object({
  eventCount: z.number().int().min(0),
  distinctTypes: z.number().int().min(0),
  byType: z.record(z.string(), z.number().int().min(0)),
  ageInMonths: z.number().int().min(0).optional(),
})

export const planOutputSchema = z.object({
  planType: z.enum(['initial', 'event_based', 'transcript_refinement']),
  title: z.string().min(1),
  summary: z.string().min(1),
  schedule: scheduleSchema,
  objectives: z.array(z.string().min(1)).min(1),
  recommendations: z.array(z.string().min(1)).min(1),
  window: z.object({ from: z.string().min(1), to: z.string().min(1) }),
  metrics: metricsSchema,
  metadata: metadataSchema.optional(),
}).or(
  z.object({ error: z.literal('insufficient_data'), reason: z.string().min(1) })
)

export type PlanLLMOutput = z.infer<typeof planOutputSchema>
