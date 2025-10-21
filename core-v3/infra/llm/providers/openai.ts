/*
 Lightweight OpenAI chat provider wrapper for Plan LLM.
 - Does a single chat completion call and returns message content as string
 - No logging of API keys or full prompts
 - Converts SDK/network errors to Error('openai_error: ...') with sanitized message
*/

type OpenAIInit = { apiKey: string; model: string; baseURL?: string }

type CompleteInput = { prompt: string; temperature?: number; maxTokens?: number }

function intEnv(key: string, fallback: number): number {
  const v = Number.parseInt(String(process.env[key] || ''), 10)
  return Number.isFinite(v) && v > 0 ? v : fallback
}

function floatEnv(key: string, fallback: number): number {
  const v = Number.parseFloat(String(process.env[key] || ''))
  return Number.isFinite(v) ? v : fallback
}

function sanitizeMessage(msg: unknown, secrets: string[]): string {
  let s = typeof msg === 'string' ? msg : (msg && typeof msg === 'object' ? JSON.stringify(msg) : String(msg))
  for (const secret of secrets) {
    if (secret && typeof secret === 'string') {
      const esc = secret.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      s = s.replace(new RegExp(esc, 'g'), '[redacted]')
    }
  }
  // Trim and keep it concise
  if (s.length > 500) s = s.slice(0, 500) + '…'
  return s
}

export class OpenAIChatLLM {
  private apiKey: string
  private model: string
  private baseURL?: string
  private sdkClient: any | null

  constructor({ apiKey, model, baseURL }: OpenAIInit) {
    this.apiKey = apiKey
    this.model = model
    if (typeof baseURL === 'string') this.baseURL = baseURL
    this.sdkClient = null

    // Try to load official SDK if available
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('openai')
      const OpenAI = (mod && mod.default) ? mod.default : mod
      this.sdkClient = new OpenAI({ apiKey: this.apiKey, baseURL: this.baseURL })
    } catch {
      this.sdkClient = null
    }
  }

  async complete({ prompt, temperature, maxTokens }: CompleteInput): Promise<string> {
    const temp = typeof temperature === 'number' ? temperature : floatEnv('HD_PLAN_LLM_TEMPERATURE', 0.2)
    const maxTok = typeof maxTokens === 'number' ? maxTokens : intEnv('HD_PLAN_LLM_MAX_TOKENS', 2000)

    // Never log prompt or apiKey
    const secrets = [this.apiKey]

    try {
      if (this.sdkClient) {
        // Official SDK path
        const res = await this.sdkClient.chat.completions.create({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: temp,
          max_tokens: maxTok,
        })
        const content = res?.choices?.[0]?.message?.content
        return typeof content === 'string' ? content : ''
      }

      // Fetch fallback (Node 20+)
      const base = this.baseURL || 'https://api.openai.com/v1'
      const url = base.replace(/\/$/, '') + '/chat/completions'
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: temp,
          max_tokens: maxTok,
        }),
      })
      if (!resp.ok) {
        let detail: any = ''
        try {
          const j = await resp.json()
          detail = j?.error?.message || JSON.stringify(j)
        } catch {
          detail = await resp.text().catch(() => String(resp.status))
        }
        const msg = `HTTP ${resp.status}: ${detail}`
        throw new Error(msg)
      }
      const data: any = await resp.json()
      const content = data?.choices?.[0]?.message?.content
      return typeof content === 'string' ? content : ''
    } catch (err: any) {
      const message = sanitizeMessage(err?.message || err, secrets)
      throw new Error('openai_error: ' + message)
    }
  }
}
