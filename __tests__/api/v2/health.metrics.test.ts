import { GET as HEALTH } from '@/app/api/v2/health/route'

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: any, init?: any) => ({ headers: new Map<string, string>(), json: async () => body, status: init?.status || 200 }),
  },
}))

jest.mock('@/core-v3/api/rbac', () => ({
  requireRole: async (_req: Request, _roles: any) => ({ userId: 'u', role: 'parent' }),
}))

describe('v2 health metrics exposure', () => {
  it('returns metrics snapshot when metrics=1', async () => {
    const req: any = { url: 'http://x/api/v2/health?metrics=1', method: 'GET', headers: { get: () => null } }
    const res = await (HEALTH as any)(req)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.data.metrics).toBeDefined()
    expect(json.data.metrics.counts).toBeDefined()
  })
})

