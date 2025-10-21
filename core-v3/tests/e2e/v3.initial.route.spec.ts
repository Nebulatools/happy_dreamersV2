let POST: any

jest.mock('next/server', () => {
  class NR {
    static json(body: any, init?: any) {
      return { headers: new Map<string, string>(), json: async () => body, status: init?.status || 200 }
    }
  }
  return { NextResponse: NR }
})

jest.mock('@/core-v3/api/rbac', () => ({
  requireRole: async (_req: Request, _roles: any) => ({ userId: 'u1', role: 'parent' }),
}))

// Mock LLM provider to avoid network/keys
jest.mock('@/core-v3/infra/llm', () => ({
  getLLM: () => ({
    complete: async () => JSON.stringify({
      planType: 'initial',
      title: 'Plan V3',
      summary: 'Resumen',
      window: { from: new Date('2025-01-01T00:00:00Z').toISOString(), to: new Date('2025-01-31T23:59:59Z').toISOString() },
      metrics: { eventCount: 12, distinctTypes: 2, byType: { sleep: 8, night_waking: 4 }, ageInMonths: 12 },
      recommendations: [{ key: 'routine', action: 'Rutina', rationale: 'Consistencia' }],
    })
  }),
}))

import * as dbV3 from '@/core-v3/infra/db'
import { planOutputSchema } from '@/core-v3/domain/plan-output-schema'
import { EventsRepo } from '@/core-v3/infra/repos/events.repo'
import { ChildrenRepo } from '@/core-v3/infra/repos/children.repo'
// Mock mongodb ObjectId to avoid ESM parse issues in tests
jest.mock('mongodb', () => ({
  ObjectId: function ObjectId(hex: string) { return { _oid: hex } },
}))

describe('v3 initial plan route - ok and insufficient data paths', () => {
  const childHex = '65b9a8c9f1e2d3a4b5c6d7e8'
  const childId = { _oid: childHex } as any

  const data: { plans: any[] } = { plans: [] }
  const mkId = (n: number) => ({ _oid: String(n).padStart(24, '0') })

  const plans = {
    find: jest.fn((q) => {
      const arr = data.plans.filter((p) => String(p.childId._oid) === String(q.childId))
      let sorted = arr
      const api = {
        sort: (_s: any) => api,
        limit: (_n: number) => api,
        next: async () => sorted[0] || null,
        toArray: async () => sorted,
      }
      return api
    }),
    insertOne: jest.fn(async (doc) => { const assigned = { ...doc, _id: mkId(data.plans.length + 1) }; data.plans.push(assigned); return { insertedId: assigned._id } }),
    updateMany: jest.fn(async () => ({ matchedCount: data.plans.length, modifiedCount: data.plans.length })),
    findOne: jest.fn(async (q) => data.plans.find((p) => String(p._id._oid) === String(q._id)) || null),
  }
  const collections: any = { plans }
  const mockDb = { collection: (n: string) => collections[n] }

  beforeEach(() => {
    process.env.HD_V3_ENABLED = 'true'
    process.env.HD_PLAN_MIN_EVENTS = '1'
    process.env.HD_PLAN_MIN_DISTINCT_TYPES = '1'
    data.plans.length = 0
    jest.useFakeTimers(); jest.setSystemTime(new Date('2025-01-31T23:59:59Z'))
    jest.spyOn(dbV3, 'getDb').mockResolvedValue(mockDb as any)
    jest.spyOn(ChildrenRepo, 'findById').mockResolvedValue({ birthdate: new Date('2024-01-01T00:00:00Z') } as any)
    // Lazy import route after mocks
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    POST = require('@/app/api/v3/plans/initial/route').POST
  })

  afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks() })

  it('returns ok:true with valid output when gate passes', async () => {
    jest.spyOn(EventsRepo, 'countByTypes').mockResolvedValue({ sleep: 8, night_waking: 4 } as any)
    const req: any = { url: 'http://x/api/v3/plans/initial', method: 'POST', headers: { get: () => null }, json: async () => ({ childId: childHex }) }
    const res = await (POST as any)(req)
    const j = await res.json()
    expect(j.ok).toBe(true)
    // Validate LLM output conforms to schema
    expect(() => planOutputSchema.parse(j.output)).not.toThrow()
  })

  it('returns gate_failed when no events (semantics respected)', async () => {
    jest.spyOn(EventsRepo, 'countByTypes').mockResolvedValue({} as any)
    const req: any = { url: 'http://x/api/v3/plans/initial', method: 'POST', headers: { get: () => null }, json: async () => ({ childId: childHex }) }
    const res = await (POST as any)(req)
    const j = await res.json()
    expect(j.error === 'gate_failed' || j.error === 'insufficient_data').toBe(true)
  })
})
