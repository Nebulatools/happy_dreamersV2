const SENSITIVE_KEYS = [
  'password', 'token', 'secret', 'apiKey', 'authorization', 'cookie', 'session',
  'email', 'phone', 'address', 'MONGODB_URI', 'OPENAI_API_KEY', 'CRON_SECRET', 'SMTP_PASS'
]

export function sanitize(value: any, depth = 0): any {
  if (depth > 4) return '[max-depth]'
  if (value == null) return value
  if (Array.isArray(value)) return value.map((v) => sanitize(v, depth + 1))
  if (typeof value === 'object') {
    const out: Record<string, any> = {}
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_KEYS.some((s) => k.toLowerCase().includes(s.toLowerCase()))) {
        out[k] = '[redacted]'
      } else {
        out[k] = sanitize(v, depth + 1)
      }
    }
    return out
  }
  return value
}

export function safeLog(scope: string, event: string, data: Record<string, unknown> = {}) {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ scope, event, ...sanitize(data) }))
}

