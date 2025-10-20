import { z } from 'zod'

export const recommendationSchema = z.object({
  key: z.string().min(1),
  action: z.string().min(1),
  rationale: z.string().min(1),
})

export const planOutputSchema = z.object({
  planType: z.enum(['initial', 'event_based', 'transcript_refinement']),
  title: z.string().min(1),
  summary: z.string().min(1),
  window: z.object({ from: z.string().min(1), to: z.string().min(1) }),
  metrics: z.object({
    eventCount: z.number().int().min(0),
    distinctTypes: z.number().int().min(0),
    byType: z.record(z.string(), z.number().int().min(0)),
    ageInMonths: z.number().int().min(0).optional(),
  }),
  recommendations: z.array(recommendationSchema).min(1),
}).or(
  z.object({ error: z.literal('insufficient_data'), reason: z.string().min(1) })
)

export type PlanLLMOutput = z.infer<typeof planOutputSchema>

