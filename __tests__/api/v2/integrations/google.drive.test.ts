import { GET as LIST } from '@/app/api/v2/integrations/google/drive/list/route'
import { GET as DOWNLOAD } from '@/app/api/v2/integrations/google/drive/download/route'

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
  requireRole: async (_req: Request, _roles: any) => ({ userId: 'u1', role: 'parent' }),
}))

describe('Google Drive v2', () => {
  it('lists only allowed types', async () => {
    const req: any = { url: 'http://x/api/v2/integrations/google/drive/list?types=application/pdf,text/plain', method: 'GET', headers: { get: () => null } }
    const res = await (LIST as any)(req)
    const j = await res.json()
    expect(j.ok).toBe(true)
    expect(j.data.items.every((it: any) => ['application/pdf', 'text/plain'].includes(it.mimeType))).toBe(true)
  })
  it('forbids download of disallowed type', async () => {
    const req: any = { url: 'http://x/api/v2/integrations/google/drive/download?fileId=f1&mimeType=image/png', method: 'GET', headers: { get: () => null } }
    const res = await (DOWNLOAD as any)(req)
    expect(res.status).toBe(403)
  })
})

