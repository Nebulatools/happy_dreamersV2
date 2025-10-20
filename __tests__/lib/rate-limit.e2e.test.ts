import { GET as HEALTH } from '@/app/api/v2/health/route'

jest.mock('@/core-v3/api/rbac', () => ({
  requireRole: async (_req: Request, _roles: any) => ({ userId: 'u', role: 'parent' }),
}))

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: any, init?: any) => ({
      headers: new Map<string, string>(),
      json: async () => body,
      status: init?.status || 200,
    }),
  },
}))

describe('distributed rate limit middleware', () => {
  it('returns 429 after exceeding limit', async () => {
    const mkReq = (): any => ({ url: 'http://x/api/v2/health', method: 'GET', headers: { get: (k: string) => (k === 'x-test-user-id' ? 'rl-user' : null) } })
    let last: any
    // v2 health is configured with limit 30 per minute
    for (let i = 0; i < 31; i++) {
      last = await (HEALTH as any)(mkReq())
    }
    expect(last.status).toBe(429)
    // Check rate limit headers presence
    expect(last.headers.get('X-RateLimit-Limit')).toBe('30')
    expect(last.headers.get('X-RateLimit-Remaining')).toBe('0')
    expect(last.headers.get('Retry-After')).toBeDefined()
  })
})
