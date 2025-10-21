export type Provider = 'openai' | 'azure-openai' | 'anthropic'

import { OpenAIChatLLM } from './providers/openai'

function envStr(key: string): string | undefined {
  const v = process.env[key]
  return typeof v === 'string' && v.trim() !== '' ? v : undefined
}

export function assertLLMReady(): void {
  const provider = (envStr('HD_LLM_PROVIDER') as Provider) || 'openai'
  switch (provider) {
    case 'openai': {
      const apiKey = envStr('OPENAI_API_KEY')
      // Model can default; apiKey is required
      if (!apiKey) throw new Error('llm_misconfigured')
      return
    }
    case 'azure-openai': {
      const key = envStr('AZURE_OPENAI_API_KEY')
      const endpoint = envStr('AZURE_OPENAI_ENDPOINT')
      const deployment = envStr('AZURE_OPENAI_DEPLOYMENT')
      if (!key || !endpoint || !deployment) throw new Error('llm_misconfigured')
      // Not implemented in this runtime yet; still validate envs only
      return
    }
    case 'anthropic': {
      const key = envStr('ANTHROPIC_API_KEY')
      if (!key) throw new Error('llm_misconfigured')
      // Not implemented in this runtime yet; still validate envs only
      return
    }
    default:
      throw new Error('llm_misconfigured')
  }
}

export function getLLM() {
  const provider = (envStr('HD_LLM_PROVIDER') as Provider) || 'openai'
  const model = envStr('HD_PLAN_LLM_MODEL') || 'gpt-4o-mini'

  // In test environments, return a lightweight stub to avoid env coupling.
  if (process.env.NODE_ENV === 'test') {
    return { complete: async (_: { prompt: string; temperature: number; maxTokens: number }) => '' }
  }

  if (provider === 'openai') {
    const apiKey = envStr('OPENAI_API_KEY')
    if (!apiKey) throw new Error('llm_misconfigured')
    const baseURL = envStr('HD_OPENAI_BASE_URL')
    const cfg: any = { apiKey, model }
    if (baseURL) cfg.baseURL = baseURL
    return new OpenAIChatLLM(cfg)
  }

  // Other providers are not implemented in this runtime yet
  // Validate envs similarly to assertLLMReady to surface clear error
  throw new Error('llm_misconfigured')
}
