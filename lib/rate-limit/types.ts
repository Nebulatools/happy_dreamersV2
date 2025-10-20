export type RateLimitDecision = {
  limited: boolean
  remaining: number
  resetAt: number
  limit: number
}

export interface RateLimiter {
  check(key: string, windowMs: number, limit: number): Promise<RateLimitDecision>
}

