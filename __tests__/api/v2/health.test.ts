jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: any, init?: any) => ({
      headers: new Map<string, string>(),
      json: async () => body,
      status: init?.status || 200,
    }),
  },
}))
jest.mock('@/core-v3/api/rbac', () => ({
  requireRole: async (_req: Request, _roles: any) => ({ userId: 'u1', role: 'admin' }),
}))

const { GET } = require('@/app/api/v2/health/route')

describe('API v2 health - standard contract', () => {
  it('returns ok true, standard shape, and headers', async () => {
    const req = { url: 'http://localhost/api/v2/health', method: 'GET', headers: { get: (_k: string) => null } }
    const res = await (GET as any)(req as any)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.data.status).toBe('ok')
    expect(json.error).toBeNull()
  })
})
