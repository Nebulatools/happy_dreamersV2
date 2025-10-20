import { POST as ZOOM_WEBHOOK } from '@/app/api/v2/integrations/zoom/webhook/route'
import { POST as REPROCESS } from '@/app/api/v2/integrations/zoom/reprocess-transcript/route'

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

import * as dbModule from '@/core-v3/infra/db'
import { hmacSha256Base64 } from '@/lib/integrations/hmac'

describe('Zoom webhook v2', () => {
  const secret = 's3cret'
  const childHex = '65b9a8c9f1e2d3a4b5c6d7e8'
  const userHex = '65b9a8c9f1e2d3a4b5c6d7e1'
  const now = Math.floor(Date.now() / 1000)

  const collections: any = {
    zoom_sessions: {
      insertOne: jest.fn(async (doc) => ({ insertedId: { _oid: 'z1' } })),
      findOne: jest.fn(async (q) => ({ _id: q._id, childId: { _oid: childHex }, userId: { _oid: userHex } })),
      updateOne: jest.fn(async () => ({ matchedCount: 1, modifiedCount: 1 })),
      find: jest.fn(() => ({ sort: jest.fn().mockReturnThis(), toArray: jest.fn().mockResolvedValue([]) })),
    },
    consultation_reports: {
      insertOne: jest.fn(async (doc) => ({ insertedId: { _oid: 'r1' } })),
    },
  }
  const mockDb = { collection: (n: string) => collections[n] }

  beforeAll(() => {
    jest.spyOn(dbModule, 'getDb').mockResolvedValue(mockDb as any)
    process.env.HD_ZOOM_WEBHOOK_SECRET = secret
  })

  afterAll(() => {
    jest.restoreAllMocks()
    delete process.env.HD_ZOOM_WEBHOOK_SECRET
  })

  it('rejects invalid signature with 401', async () => {
    const payload = { payload: { object: { id: 'm1', childId: childHex, userId: userHex } } }
    const raw = JSON.stringify(payload)
    const req: any = {
      method: 'POST',
      url: 'http://x/api/v2/integrations/zoom/webhook',
      headers: { get: (k: string) => (k === 'x-zm-timestamp' ? String(now) : (k === 'x-zm-signature' ? 'bad' : null)) },
      text: async () => raw,
    }
    const res = await (ZOOM_WEBHOOK as any)(req)
    expect(res.status).toBe(401)
  })

  it('accepts valid webhook and inserts session with normalized status', async () => {
    const payload = { payload: { object: { id: 'm1', childId: childHex, userId: userHex } } }
    const raw = JSON.stringify(payload)
    const sig = hmacSha256Base64(secret, `${now}.${raw}`)
    const req: any = {
      method: 'POST',
      url: 'http://x/api/v2/integrations/zoom/webhook',
      headers: { get: (k: string) => (k === 'x-zm-timestamp' ? String(now) : (k === 'x-zm-signature' ? sig : null)) },
      text: async () => raw,
    }
    const res = await (ZOOM_WEBHOOK as any)(req)
    expect(res.status).toBe(200)
    expect(collections.zoom_sessions.insertOne).toHaveBeenCalled()
  })

  it('reprocess transcript links reportId', async () => {
    const body = { sessionId: childHex }
    const req: any = { url: 'http://x/api/v2/integrations/zoom/reprocess-transcript', method: 'POST', headers: { get: () => null }, json: async () => ({ sessionId: childHex }) }
    const res = await (REPROCESS as any)(req)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.data.reportId).toBeDefined()
  })
})

