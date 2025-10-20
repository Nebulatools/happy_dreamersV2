import { z } from 'zod'

export const initialPlanBody = z.object({
  childId: z.string().regex(/^[a-f\d]{24}$/i, 'invalid childId'),
})

export const progressionPlanBody = z.object({
  childId: z.string().regex(/^[a-f\d]{24}$/i, 'invalid childId'),
  afterPlanId: z.string().regex(/^[a-f\d]{24}$/i, 'invalid afterPlanId'),
})

export const refinementPlanBody = z.object({
  childId: z.string().regex(/^[a-f\d]{24}$/i, 'invalid childId'),
  basePlanId: z.string().regex(/^[a-f\d]{24}$/i, 'invalid basePlanId'),
  transcriptId: z.string().min(1),
})

export const getPlanParams = z.object({ planId: z.string().regex(/^[a-f\d]{24}$/i, 'invalid planId') })
export const getLatestParams = z.object({ childId: z.string().regex(/^[a-f\d]{24}$/i, 'invalid childId') })

