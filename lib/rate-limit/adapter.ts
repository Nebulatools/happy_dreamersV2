import type { RateLimiter } from './types'
import { memoryRateLimiter } from './memory'

let cached: RateLimiter | null = null

export function getRateLimiter(): RateLimiter {
  // Placeholder for distributed provider selection; defaults to memory.
  // In production, configure environment to swap implementation.
  if (cached) return cached
  // Example: if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) { cached = new UpstashLimiter(...) }
  cached = memoryRateLimiter
  return cached
}

