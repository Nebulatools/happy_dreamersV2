import { GET, POST } from '@/app/api/v2/children/[childId]/plans/route'
import { PUT as APPLY } from '@/app/api/v2/children/[childId]/plans/[planId]/apply/route'
import { PUT as COMPLETE } from '@/app/api/v2/children/[childId]/plans/[planId]/complete/route'
import { PUT as SUPERSEDE } from '@/app/api/v2/children/[childId]/plans/[planId]/supersede/route'

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

type Doc = Record<string, any>

describe('API v2 plans', () => {
  const childHex = '65b9a8c9f1e2d3a4b5c6d7e8'
  const childId = { _oid: childHex } as any
  let seq = 0
  const makeHex = () => (String((++seq).toString(16)).padStart(24, '0'))
  const makeIdObj = (hex?: string) => ({ _oid: hex || makeHex() })

  const data: Doc[] = []
  const plansCol = {
    find: jest.fn((q: any) => {
      const arr = data.filter((d) => {
        const cidOk = !q.childId || String(d.childId._oid || d.childId) === String(q.childId._oid || q.childId)
        if (!cidOk) return false
        if (q.status && q.status.$in) {
          return q.status.$in.includes(d.status)
        }
        return true
      })
      let sorted: Doc[] = arr
      const api = {
        sort: (s: Record<string, 1 | -1>) => {
          const [[k, dir]] = Object.entries(s) as [string, 1 | -1][]
          sorted = [...arr].sort((a, b) => (a[k] > b[k] ? (dir as number) : (-(dir as number))))
          return api
        },
        limit: (_n: number) => api,
        next: async () => sorted[0] || null,
        toArray: async () => sorted,
      }
      return api
    }),
    insertOne: jest.fn(async (doc: any) => {
      const assigned = { ...doc, _id: makeIdObj() }
      data.push(assigned)
      return { insertedId: assigned._id }
    }),
    updateOne: jest.fn(async (filter: any, update: any) => {
      const idx = data.findIndex(
        (d) => String(d._id._oid) === String(filter._id._oid || filter._id) && String(d.childId._oid) === String(filter.childId._oid || filter.childId)
      )
      if (idx === -1) return { matchedCount: 0, modifiedCount: 0 }
      const set = update.$set || {}
      const before = JSON.stringify(data[idx])
      data[idx] = { ...data[idx], ...set }
      const after = JSON.stringify(data[idx])
      return { matchedCount: 1, modifiedCount: before === after ? 0 : 1 }
    }),
    updateMany: jest.fn(async (filter: any, update: any) => {
      let count = 0
      const set = update.$set || {}
      data.forEach((d, i) => {
        const sameChild = String(d.childId._oid) === String(filter.childId._oid || filter.childId)
        const notId = !filter._id || String(d._id._oid) !== String(filter._id.$ne?._oid || filter._id.$ne)
        const statusOk = !filter.status || (filter.status.$in && filter.status.$in.includes(d.status))
        if (sameChild && notId && statusOk) {
          const before = JSON.stringify(data[i])
          data[i] = { ...data[i], ...set }
          const after = JSON.stringify(data[i])
          if (before !== after) count++
        }
      })
      return { matchedCount: count, modifiedCount: count }
    }),
  }
  const collections: any = { plans: plansCol }
  const mockDb = { collection: (n: string) => collections[n] }

  beforeEach(() => {
    data.length = 0
    seq = 0
  })

  beforeAll(() => {
    jest.spyOn(dbModule, 'getDb').mockResolvedValue(mockDb as any)
  })

  afterAll(() => {
    jest.restoreAllMocks()
  })

  it('POST creates a draft plan', async () => {
    const req: any = { url: `http://x/api/v2/children/${childHex}/plans`, method: 'POST', headers: { get: () => null }, json: async () => ({ planType: 'initial' }) }
    const res = await (POST as any)(req, { params: { childId: childHex } })
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(data.length).toBe(1)
    expect(data[0].status).toBe('draft')
  })

  it('GET returns list and active normalized (legacy activo)', async () => {
    // Seed legacy active
    data.push({ _id: makeIdObj(), childId, userId: { _oid: 'u1' }, planType: 'initial', planNumber: 0, planVersion: 0, status: 'activo', createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01') })
    const req: any = { url: `http://x/api/v2/children/${childHex}/plans`, method: 'GET', headers: { get: () => null } }
    const res = await (GET as any)(req, { params: { childId: childHex } })
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.data.items.length).toBe(1)
    expect(json.data.items[0].status).toBe('active')
    expect(json.data.active.status).toBe('active')
  })

  it('PUT apply activates target and completes previous active; idempotent', async () => {
    // previous active
    const prevHex = makeHex(); const prevId = makeIdObj(prevHex)
    data.push({ _id: prevId, childId, userId: { _oid: 'u1' }, planType: 'initial', planNumber: 0, planVersion: 0, status: 'active', createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01') })
    // target draft
    const targetHex = makeHex(); const targetId = makeIdObj(targetHex)
    data.push({ _id: targetId, childId, userId: { _oid: 'u1' }, planType: 'initial', planNumber: 1, planVersion: 0, status: 'draft', createdAt: new Date('2024-01-02'), updatedAt: new Date('2024-01-02') })

    const req: any = { url: `http://x/api/v2/children/${childHex}/plans/${String(targetId._oid)}/apply`, method: 'PUT', headers: { get: () => null }, json: async () => ({}) }
    const res = await (APPLY as any)(req, { params: { childId: childHex, planId: targetHex } })
    const json = await res.json()
    // eslint-disable-next-line no-console
    console.log('APPLY json:', json)
    expect(json.ok).toBe(true)
    // Verify statuses
    const statuses = data.map((d) => d.status)
    expect(statuses.includes('active')).toBe(true)
    expect(statuses.filter((s) => s === 'active').length).toBe(1)
    expect(data.find((d) => d._id._oid === prevId._oid)?.status).toBe('completed')
    expect(data.find((d) => d._id._oid === targetId._oid)?.status).toBe('active')

    // Idempotent second apply
    const res2 = await (APPLY as any)(req, { params: { childId: childHex, planId: targetHex } })
    const json2 = await res2.json()
    expect(json2.ok).toBe(true)
    expect(data.find((d) => d._id._oid === prevId._oid)?.status).toBe('completed')
    expect(data.find((d) => d._id._oid === targetId._oid)?.status).toBe('active')
  })

  it('PUT complete marks plan as completed (idempotent)', async () => {
    const idHex = makeHex(); const id = makeIdObj(idHex)
    data.push({ _id: id, childId, userId: { _oid: 'u1' }, planType: 'initial', planNumber: 0, planVersion: 0, status: 'draft', createdAt: new Date(), updatedAt: new Date() })
    const req: any = { url: `http://x/api/v2/children/${childHex}/plans/${String(id._oid)}/complete`, method: 'PUT', headers: { get: () => null }, json: async () => ({}) }
    const res = await (COMPLETE as any)(req, { params: { childId: childHex, planId: idHex } })
    const json = await res.json()
    // eslint-disable-next-line no-console
    console.log('COMPLETE json:', json)
    expect(json.ok).toBe(true)
    expect(data.find((d) => d._id._oid === id._oid)?.status).toBe('completed')
    // second time idempotent
    await (COMPLETE as any)(req, { params: { childId: childHex, planId: idHex } })
    expect(data.find((d) => d._id._oid === id._oid)?.status).toBe('completed')
  })

  it('PUT supersede marks plan as superseded (idempotent)', async () => {
    const idHex2 = makeHex(); const id2 = makeIdObj(idHex2)
    data.push({ _id: id2, childId, userId: { _oid: 'u1' }, planType: 'initial', planNumber: 2, planVersion: 0, status: 'completed', createdAt: new Date(), updatedAt: new Date() })
    const req: any = { url: `http://x/api/v2/children/${childHex}/plans/${String(id2._oid)}/supersede`, method: 'PUT', headers: { get: () => null }, json: async () => ({}) }
    const res = await (SUPERSEDE as any)(req, { params: { childId: childHex, planId: idHex2 } })
    const json = await res.json()
    // eslint-disable-next-line no-console
    console.log('SUPERSEDE json:', json)
    expect(json.ok).toBe(true)
    expect(data.find((d) => d._id._oid === id2._oid)?.status).toBe('superseded')
    // idempotent
    await (SUPERSEDE as any)(req, { params: { childId: childHex, planId: idHex2 } })
    expect(data.find((d) => d._id._oid === id2._oid)?.status).toBe('superseded')
  })
})
