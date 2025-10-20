import { GET, POST, PATCH, DELETE } from '@/app/api/v2/children/route'

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
  requireRole: async (_req: Request, _roles: any) => ({ userId: '65b9a8c9f1e2d3a4b5c6d7e1', role: 'parent' }),
}))

import * as dbModule from '@/core-v3/infra/db'

describe('API v2 children', () => {
  const userId = { _oid: '65b9a8c9f1e2d3a4b5c6d7e1' } as any
  const childId = { _oid: '65b9a8c9f1e2d3a4b5c6d7e8' } as any
  const now = new Date('2025-01-31T23:59:59Z')

  const items: any[] = []
  const collections: any = {
    children: {
      countDocuments: jest.fn(async () => items.length),
      find: jest.fn(() => ({ sort: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), toArray: jest.fn(async () => items) })),
      insertOne: jest.fn(async (doc) => { items.push({ ...doc, _id: childId }); return { insertedId: childId } }),
      updateOne: jest.fn(async () => ({ matchedCount: 1, modifiedCount: 1 })),
      findOne: jest.fn(async (q) => items.find((c) => String(c._id) === String(q._id)) || { _id: childId, userId }),
      deleteOne: jest.fn(async () => ({ deletedCount: 1 })),
    },
  }
  const mockDb = { collection: (n: string) => collections[n] }

  beforeAll(() => {
    jest.useFakeTimers()
    jest.setSystemTime(now)
    jest.spyOn(dbModule, 'getDb').mockResolvedValue(mockDb as any)
  })
  afterAll(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('POST creates a child with valid ObjectId string userId', async () => {
    const body = { userId: '65b9a8c9f1e2d3a4b5c6d7e1', name: 'Luna' }
    const req: any = { url: 'http://x/api/v2/children', method: 'POST', headers: { get: () => null }, json: async () => ({ ...body }) }
    const res = await (POST as any)(req)
    const json = await res.json()
    expect(json.ok).toBe(true)
  })

  it('GET lists children (paginated)', async () => {
    const req: any = { url: 'http://x/api/v2/children?page=1&pageSize=10', method: 'GET', headers: { get: () => null } }
    const res = await (GET as any)(req)
    const json = await res.json()
    expect(json.ok).toBe(true)
  })

  it('PATCH updates child basic fields with ownership', async () => {
    const req: any = { url: 'http://x/api/v2/children', method: 'PATCH', headers: { get: () => null }, json: async () => ({ _id: '65b9a8c9f1e2d3a4b5c6d7e8', name: 'Nueva' }) }
    const res = await (PATCH as any)(req)
    const json = await res.json()
    expect(json.ok).toBe(true)
  })

  it('DELETE deletes by _id with ownership', async () => {
    const req: any = { url: 'http://x/api/v2/children', method: 'DELETE', headers: { get: () => null }, json: async () => ({ _id: '65b9a8c9f1e2d3a4b5c6d7e8' }) }
    const res = await (DELETE as any)(req)
    const json = await res.json()
    expect(json.ok).toBe(true)
  })
})
