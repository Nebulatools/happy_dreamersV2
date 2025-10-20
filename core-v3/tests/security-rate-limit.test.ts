import { shouldRateLimit } from '@/core-v3/security/rate-limit'

describe('rate limiter', () => {
  it('limits after N requests within window', () => {
    const opt = { key: 'test', limit: 2, windowMs: 1000 }
    const id = 'u1'
    const r1 = shouldRateLimit(id, opt)
    expect(r1.limited).toBe(false)
    const r2 = shouldRateLimit(id, opt)
    expect(r2.limited).toBe(false)
    const r3 = shouldRateLimit(id, opt)
    expect(r3.limited).toBe(true)
  })
})

