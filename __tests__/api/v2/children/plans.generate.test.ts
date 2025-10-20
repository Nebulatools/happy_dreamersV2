import { POST as GENERATE } from '@/app/api/v2/children/[childId]/plans/generate/route'
import { PUT as APPLY } from '@/app/api/v2/children/[childId]/plans/[planId]/apply/route'

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

// Mock LLM service to return a valid plan JSON deterministically
jest.mock('@/core-v3/infra/llm/plan-llm-service', () => {
  const original = jest.requireActual('@/core-v3/infra/llm/plan-llm-service')
  return {
    ...original,
    PlanLLMService: class {
      async generate(_childId: any, kind: any, window: any) {
        const out = {
          planType: kind,
          title: 'Draft Plan',
          summary: 'Resumen',
          window: { from: window.from.toISOString(), to: window.to.toISOString() },
          metrics: { eventCount: 12, distinctTypes: 2, byType: { sleep: 8, night_waking: 4 }, ageInMonths: 12 },
          recommendations: [{ key: 'routine', action: 'Rutina', rationale: 'Consistencia' }],
        }
        return { ok: true, output: out, attempts: 1, inference_ms: 10 }
      }
    },
  }
})

import * as dbV3 from '@/core-v3/infra/db'

let __mockLegacyDB: any
jest.mock('@/lib/mongodb', () => ({
  connectToDatabase: async () => __mockLegacyDB,
}))

describe('API v2 - generate plan and apply (canary dataset)', () => {
  const childHex = '65b9a8c9f1e2d3a4b5c6d7e8'
  const childId = { _oid: childHex } as any

  const data: { events: any[]; plans: any[]; children: any[] } = { events: [], plans: [], children: [] }
  const mkId = (n: number) => ({ _oid: String(n).padStart(24, '0') })

  const collections: any = {
    events: {
      countDocuments: jest.fn(async (q) => {
        const qid = q.childId?._oid || q.childId
        return data.events.filter((e) => String(e.childId._oid) === String(qid) && e.startTime >= q.startTime.$gte && e.startTime <= q.startTime.$lte).length
      }),
      aggregate: jest.fn((_p) => ({ toArray: async () => [{ _id: 'sleep', count: 8 }, { _id: 'night_waking', count: 4 }] })),
      find: jest.fn((q) => {
        const arr = data.events.filter((e) => String(e.childId._oid) === String(q.childId))
        return { limit: (_n: number) => ({ toArray: async () => arr.slice(0, 20) }) }
      }),
    },
    children: { findOne: jest.fn(async () => ({ birthdate: new Date('2024-01-01T00:00:00Z') })) },
    plans: {
      find: jest.fn((q) => {
        const arr = data.plans.filter((p) => String(p.childId._oid) === String(q.childId?._id || q.childId) && (q.planType ? (q.planType.$ne ? p.planType !== q.planType.$ne : p.planType === q.planType) : true) && (q.planNumber != null ? p.planNumber === q.planNumber : true))
        let sorted = arr
        const api = {
          sort: (s: any) => { const [[k, dir]] = Object.entries(s) as [string, 1 | -1][]; sorted = [...arr].sort((a, b) => (a[k] > b[k] ? (dir as number) : (-(dir as number)))); return api },
          limit: (_n: number) => api,
          next: async () => sorted[0] || null,
          toArray: async () => sorted,
        }
        return api
      }),
      insertOne: jest.fn(async (doc) => { const assigned = { ...doc, _id: mkId(data.plans.length + 1) }; data.plans.push(assigned); return { insertedId: assigned._id } }),
      updateMany: jest.fn(async (filter, update) => { let c = 0; for (const p of data.plans) { if (String(p.childId._oid) === String(filter.childId) && (!filter._id || String(p._id._oid) !== String(filter._id.$ne)) && (!filter.status || filter.status.$in.includes(p.status))) { const before = JSON.stringify(p); Object.assign(p, update.$set); if (before !== JSON.stringify(p)) c++ } } return { matchedCount: c, modifiedCount: c } }),
      updateOne: jest.fn(async (filter, update) => { const p = data.plans.find((x) => String(x._id._oid) === String(filter._id) && String(x.childId._oid) === String(filter.childId)); if (!p) return { matchedCount: 0, modifiedCount: 0 }; const before = JSON.stringify(p); Object.assign(p, update.$set); return { matchedCount: 1, modifiedCount: before === JSON.stringify(p) ? 0 : 1 } }),
      findOne: jest.fn(async (q) => data.plans.find((p) => String(p._id._oid) === String(q._id)) || null),
    },
  }
  const mockDb = { collection: (n: string) => collections[n] }

  beforeEach(() => {
    data.events.length = 0
    data.plans.length = 0
    data.children.length = 0
    // Seed canary: 12 events, 2 tipos dentro de ventana por defecto
    const now = new Date('2025-01-31T23:59:59Z')
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    for (let i = 0; i < 8; i++) data.events.push({ childId, type: 'sleep', startTime: new Date(from.getTime() + i * 1000) })
    for (let i = 0; i < 4; i++) data.events.push({ childId, type: 'night_waking', startTime: new Date(from.getTime() + (i + 10) * 1000) })
    jest.useFakeTimers()
    jest.setSystemTime(now)
    __mockLegacyDB = { db: mockDb }
    jest.spyOn(dbV3, 'getDb').mockResolvedValue(mockDb as any)
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('generates a draft event_based plan and can apply it', async () => {
    const reqGen: any = { url: `http://x/api/v2/children/${childHex}/plans/generate`, method: 'POST', headers: { get: () => null }, json: async () => ({ planType: 'event_based' }) }
    const resGen = await (GENERATE as any)(reqGen, { params: { childId: childHex } })
    const jsonGen = await resGen.json()
    // eslint-disable-next-line no-console
    console.log('GENERATE json:', jsonGen)
    expect(jsonGen.ok).toBe(true)
    const newId = data.plans[0]?._id
    expect(newId).toBeTruthy()
    expect(data.plans[0].status).toBe('draft')

    // Apply and ensure becomes active (no prev active)
    const reqApply: any = { url: `http://x/api/v2/children/${childHex}/plans/${String(newId._oid)}/apply`, method: 'PUT', headers: { get: () => null }, json: async () => ({}) }
    const resApply = await (APPLY as any)(reqApply, { params: { childId: childHex, planId: String(newId._oid) } })
    const jsonApply = await resApply.json()
    expect(jsonApply.ok).toBe(true)
  })
})
