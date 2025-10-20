import type { RateLimiter, RateLimitDecision } from './types'

type Bucket = { count: number; resetAt: number; limit: number }

export class MemoryRateLimiter implements RateLimiter {
  private store = new Map<string, Bucket>()

  async check(key: string, windowMs: number, limit: number): Promise<RateLimitDecision> {
    const now = Date.now()
    const cur = this.store.get(key)
    if (!cur || cur.resetAt <= now) {
      const resetAt = now + windowMs
      this.store.set(key, { count: 1, resetAt, limit })
      return { limited: false, remaining: Math.max(0, limit - 1), resetAt, limit }
    }
    cur.count += 1
    if (cur.count > limit) return { limited: true, remaining: 0, resetAt: cur.resetAt, limit: cur.limit }
    return { limited: false, remaining: Math.max(0, limit - cur.count), resetAt: cur.resetAt, limit: cur.limit }
  }
}

export const memoryRateLimiter = new MemoryRateLimiter()

