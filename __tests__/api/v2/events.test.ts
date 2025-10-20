import { GET, POST, DELETE } from '@/app/api/v2/events/route'

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

describe('API v2 events', () => {
  const childId = '65b9a8c9f1e2d3a4b5c6d7e8'
  const oid = { _oid: childId } as any
  const now = new Date('2025-01-31T23:59:59Z')

  const collections: any = {
    events: {
      find: jest.fn(() => ({ sort: jest.fn().mockReturnThis(), toArray: jest.fn().mockResolvedValue([]) })),
      insertOne: jest.fn(async (doc) => ({ insertedId: { _oid: 'e1' } })),
      deleteOne: jest.fn(async () => ({ deletedCount: 1 })),
    },
    children: {
      updateOne: jest.fn(async () => ({})),
      updateMany: jest.fn(async () => ({})),
      findOne: jest.fn(async () => ({ events: [] })),
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

  it('POST accepts ObjectId string childId and dates', async () => {
    const body = {
      childId,
      type: 'sleep',
      startTime: now.toISOString(),
      notes: 'hola',
    }
    const req: any = { url: 'http://x/api/v2/events', method: 'POST', headers: { get: () => null }, json: async () => ({ ...body, startTime: new Date(body.startTime) }) }
    const res = await (POST as any)(req)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(collections.events.insertOne).toHaveBeenCalled()
  })

  it('POST accepts ISO string for startTime (coerced)', async () => {
    const body = {
      childId,
      type: 'sleep',
      startTime: now.toISOString(),
      notes: 'hola',
    }
    const req: any = { url: 'http://x/api/v2/events', method: 'POST', headers: { get: () => null }, json: async () => ({ ...body }) }
    const res = await (POST as any)(req)
    const json = await res.json()
    expect(json.ok).toBe(true)
  })

  it('GET enforces query and returns list', async () => {
    collections.events.find.mockReturnValueOnce({ sort: jest.fn().mockReturnThis(), toArray: jest.fn().mockResolvedValue([{ _id: { _oid: 'e1' }, childId: oid, type: 'sleep', startTime: now }]) })
    const req: any = { url: `http://x/api/v2/events?childId=${childId}`, method: 'GET', headers: { get: () => null } }
    const res = await (GET as any)(req)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.data.items.length).toBe(1)
  })

  it('DELETE deletes by _id', async () => {
    const req: any = { url: 'http://x/api/v2/events', method: 'DELETE', headers: { get: () => null }, json: async () => ({ _id: childId }) }
    const res = await (DELETE as any)(req)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.data.deleted).toBe(1)
  })
})
