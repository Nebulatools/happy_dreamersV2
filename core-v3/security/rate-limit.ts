type Bucket = { count: number; resetAt: number }
const store: Map<string, Bucket> = new Map()

export type RateLimitOptions = { key: string; limit: number; windowMs: number }

export function getClientIP(req: Request): string {
  const h = req.headers
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || '0.0.0.0'
}

export function getUserOrIPKey(req: Request): string {
  const user = req.headers.get('x-test-user-id') || ''
  const ip = getClientIP(req)
  return user || ip
}

export function shouldRateLimit(identity: string, opt: RateLimitOptions): { limited: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const id = `${opt.key}:${identity}`
  const cur = store.get(id)
  if (!cur || cur.resetAt <= now) {
    const b = { count: 1, resetAt: now + opt.windowMs }
    store.set(id, b)
    return { limited: false, remaining: opt.limit - 1, resetAt: b.resetAt }
  }
  cur.count += 1
  if (cur.count > opt.limit) {
    return { limited: true, remaining: 0, resetAt: cur.resetAt }
  }
  return { limited: false, remaining: opt.limit - cur.count, resetAt: cur.resetAt }
}

export function rateLimitResponse(resetAt: number) {
  // Import on demand to avoid Next runtime during unit tests
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { NextResponse } = require('next/server') as { NextResponse: any }
  const res = NextResponse.json({ error: 'rate_limited', retryAfterMs: Math.max(resetAt - Date.now(), 0) }, { status: 429 })
  res.headers.set('Retry-After', String(Math.ceil((resetAt - Date.now()) / 1000)))
  return res
}
