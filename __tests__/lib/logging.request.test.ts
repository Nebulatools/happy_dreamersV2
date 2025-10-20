import { GET as HEALTH } from '@/app/api/v2/health/route'

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: any, init?: any) => ({ headers: new Map<string, string>(), json: async () => body, status: init?.status || 200 }),
  },
}))

jest.mock('@/core-v3/api/rbac', () => ({
  requireRole: async (_req: Request, _roles: any) => ({ userId: 'u1', role: 'parent' }),
}))

describe('structured logs include correlation id and latency', () => {
  it('emits request/response logs with rid and status', async () => {
    const logs: string[] = []
    const old = console.log
    // @ts-ignore
    console.log = (s: string) => void logs.push(s)
    try {
      const req: any = { url: 'http://x/api/v2/health', method: 'GET', headers: { get: () => null } }
      const res = await (HEALTH as any)(req)
      expect(res.status).toBe(200)
      const joined = logs.join('\n')
      expect(joined).toContain('"event":"request"')
      expect(joined).toContain('"event":"response"')
      expect(joined).toMatch(/"rid":"rid_[^"]+"/)
      expect(joined).toContain('"status":200')
      expect(joined).toContain('"latencyMs"')
    } finally {
      console.log = old
    }
  })
})

