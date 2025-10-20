import { NextResponse } from 'next/server'
import type { RateLimitDecision } from './types'

export function applyRateLimitHeaders(res: NextResponse | any, d: RateLimitDecision) {
  try {
    res.headers.set('X-RateLimit-Limit', String(d.limit))
    res.headers.set('X-RateLimit-Remaining', String(d.remaining))
    res.headers.set('X-RateLimit-Reset', String(Math.ceil(d.resetAt / 1000)))
    if (d.limited) {
      const retry = Math.max(0, Math.ceil((d.resetAt - Date.now()) / 1000))
      res.headers.set('Retry-After', String(retry))
    }
  } catch {
    // headers may be mocked; ignore errors in tests
  }
  return res
}

