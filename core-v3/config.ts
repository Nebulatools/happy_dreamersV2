import { z } from 'zod'

export type Provider = 'openai' | 'azure-openai' | 'anthropic'

const schema = z
  .object({
    MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
    MONGODB_DB: z.string().min(1, 'MONGODB_DB is required'),
    CRON_SECRET: z.string().min(1, 'CRON_SECRET is required'),
    HD_LLM_PROVIDER: z
      .enum(['openai', 'azure-openai', 'anthropic'])
      .optional()
      .default('openai'),
    OPENAI_API_KEY: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    const provider = val.HD_LLM_PROVIDER || 'openai'
    if (provider === 'openai' && !val.OPENAI_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['OPENAI_API_KEY'],
        message: 'OPENAI_API_KEY is required when HD_LLM_PROVIDER=openai',
      })
    }
  })

export type AppConfig = {
  mongodbUri: string
  mongodbDb: string
  cronSecret: string
  llmProvider: Provider
  openaiApiKey?: string
}

export function getConfig(): AppConfig {
  // Read env at call time so tests can mock process.env safely.
  const parsed = schema.safeParse({
    MONGODB_URI: process.env.MONGODB_URI,
    MONGODB_DB: process.env.MONGODB_DB,
    CRON_SECRET: process.env.CRON_SECRET,
    HD_LLM_PROVIDER: process.env.HD_LLM_PROVIDER as any,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  })

  if (!parsed.success) {
    // Build a descriptive message aggregating issues
    const msg = parsed.error.issues
      .map((i) => `${i.path.join('.') || 'env'}: ${i.message}`)
      .join('; ')
    throw new Error(`config_invalid: ${msg}`)
  }

  const env = parsed.data
  return {
    mongodbUri: env.MONGODB_URI,
    mongodbDb: env.MONGODB_DB,
    cronSecret: env.CRON_SECRET,
    llmProvider: env.HD_LLM_PROVIDER,
    openaiApiKey: env.OPENAI_API_KEY,
  }
}

