let GENERATE: any
let APPLY: any

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: any, init?: any) => ({ headers: new Map<string, string>(), json: async () => body, status: init?.status || 200 }),
  },
}))

jest.mock('@/core-v3/api/rbac', () => ({
  requireRole: async (_req: Request, _roles: any) => ({ userId: 'u1', role: 'parent' }),
}))

// Mock LLM
jest.mock('@/core-v3/infra/llm/plan-llm-service', () => ({
  PlanLLMService: class { async generate(_c: any, kind: any, window: any) { return { ok: true, output: { planType: kind, title: 'T', summary: 'S', window: { from: window.from.toISOString(), to: window.to.toISOString() }, metrics: { eventCount: 12, distinctTypes: 2, byType: { sleep: 8, night_waking: 4 } }, recommendations: [{ key: 'r', action: 'a', rationale: 'x' }] }, attempts: 1, inference_ms: 10 } } },
}))

import * as dbV3 from '@/core-v3/infra/db'

jest.mock('@/lib/mongodb', () => ({
  connectToDatabase: async () => ({ db: mockDb }),
}))
jest.mock('@/lib/plan-sanity', () => ({
  checkPlanSanityOrThrow: async () => true,
}))
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockDb: any = {}

describe('v2 generate initial plan -> draft and apply', () => {
  const childHex = '65b9a8c9f1e2d3a4b5c6d7e8'
  const childId = { _oid: childHex } as any
  const data = { events: [] as any[], plans: [] as any[] }
  const plans = {
    find: jest.fn((q) => {
      const arr = data.plans.filter((p) => String(p.childId._oid) === String(q.childId?._id || q.childId) && (q.planType?.$ne ? p.planType !== q.planType.$ne : true) && (q.planNumber != null ? p.planNumber === q.planNumber : true))
      let sorted = arr
      const api = {
        sort: (s: any) => { const [[k, dir]] = Object.entries(s) as [string, 1 | -1][]; sorted = [...arr].sort((a, b) => (a[k] > b[k] ? (dir as number) : (-(dir as number)))); return api },
        limit: (_n: number) => api,
        next: async () => sorted[0] || null,
        toArray: async () => sorted,
      }
      return api
    }),
    insertOne: jest.fn(async (doc) => { const assigned = { ...doc, _id: { _oid: String(data.plans.length + 1).padStart(24, '0') } }; data.plans.push(assigned); return { insertedId: assigned._id } }),
    updateMany: jest.fn(async (filter, update) => { let c = 0; data.plans.forEach((p, i) => { if (String(p.childId._oid) === String(filter.childId) && (!filter._id || String(p._id._oid) !== String(filter._id.$ne)) && (filter.status?.$in ? filter.status.$in.includes(p.status) : true)) { const before = JSON.stringify(data.plans[i]); data.plans[i] = { ...p, ...update.$set }; if (before !== JSON.stringify(data.plans[i])) c++ } }); return { matchedCount: c, modifiedCount: c } }),
    updateOne: jest.fn(async (filter, update) => { const p = data.plans.find((x) => String(x._id._oid) === String(filter._id) && String(x.childId._oid) === String(filter.childId)); if (!p) return { matchedCount: 0, modifiedCount: 0 }; const before = JSON.stringify(p); Object.assign(p, update.$set); return { matchedCount: 1, modifiedCount: before === JSON.stringify(p) ? 0 : 1 } }),
    findOne: jest.fn(async (q) => data.plans.find((p) => String(p._id._oid) === String(q._id)) || null),
  }
  const events = {
    countDocuments: jest.fn(async (q) => { const qcid = (q.childId && (q.childId._oid || (typeof q.childId.toHexString === 'function' ? q.childId.toHexString() : String(q.childId)))); return data.events.filter((e) => String(e.childId._oid) === String(qcid) && e.startTime >= q.startTime.$gte && e.startTime <= q.startTime.$lte).length }),
    aggregate: jest.fn(() => ({ toArray: async () => [{ _id: 'sleep', count: 8 }, { _id: 'night_waking', count: 4 }] })),
    find: jest.fn((q) => ({ limit: (_n: number) => ({ toArray: async () => { const qcid = (q.childId && (q.childId._oid || (typeof q.childId.toHexString === 'function' ? q.childId.toHexString() : String(q.childId)))); return data.events.filter((e) => String(e.childId._oid) === String(qcid)).slice(0, 20) } }) })),
  }
  const children = { findOne: jest.fn(async () => ({ birthdate: new Date('2024-01-01T00:00:00Z') })) }
  const collections: any = { plans, events, children }
  const mockDb = { collection: (n: string) => collections[n] }

  beforeEach(() => {
    process.env.HD_PLAN_MIN_EVENTS = '1'
    process.env.HD_PLAN_MIN_DISTINCT_TYPES = '1'
    data.events.length = 0
    data.plans.length = 0
    const now = new Date('2025-01-31T23:59:59Z')
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    for (let i = 0; i < 12; i++) data.events.push({ childId, type: i % 3 ? 'sleep' : 'night_waking', startTime: new Date(from.getTime() + i * 1000) })
    jest.useFakeTimers(); jest.setSystemTime(now)
    ;(mockDb as any).collection = (n: string) => collections[n]
    jest.spyOn(dbV3, 'getDb').mockResolvedValue(mockDb as any)
    // Lazy import routes after mocks to avoid ESM issues
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    GENERATE = require('@/app/api/v2/children/[childId]/plans/generate/route').POST
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    APPLY = require('@/app/api/v2/children/[childId]/plans/[planId]/apply/route').PUT
  })

  afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks() })
  

  it('generates initial draft and applies to unique active', async () => {
    const genReq: any = { url: `http://x/api/v2/children/${childHex}/plans/generate`, method: 'POST', headers: { get: () => null }, json: async () => ({ planType: 'initial' }) }
    const genRes = await (GENERATE as any)(genReq, { params: { childId: childHex } })
    const j = await genRes.json()
    expect(j.ok).toBe(true)
    expect(data.plans[0].status).toBe('draft')
    expect(data.plans[0].planNumber).toBe(0)
    expect(data.plans[0].planVersion).toBe(0)
    const pid = data.plans[0]._id._oid

    const applyReq: any = { url: `http://x/api/v2/children/${childHex}/plans/${pid}/apply`, method: 'PUT', headers: { get: () => null }, json: async () => ({}) }
    const applyRes = await (APPLY as any)(applyReq, { params: { childId: childHex, planId: pid } })
    const aj = await applyRes.json()
    expect(aj.ok).toBe(true)
    expect(typeof aj.data.activated).toBe('number')
  })
})
