import { planRepo } from '@/src/repo/planRepo'
import * as dbModule from '@/core-v3/infra/db'

describe('planRepo unit (ids/dates/states)', () => {
  const childId = { _oid: 'c1' } as any
  const pActive = { _id: { _oid: 'p1' }, childId, status: 'activo', createdAt: new Date('2025-01-02') }
  const pCompleted = { _id: { _oid: 'p0' }, childId, status: 'completed', createdAt: new Date('2025-01-01') }
  const data: any[] = []

  const plans = {
    find: jest.fn((q: any) => {
      const qcid = (q.childId && (q.childId._oid || (typeof q.childId.toHexString === 'function' ? q.childId.toHexString() : String(q.childId))))
      const arr = data.filter((d) => String(d.childId._oid) === String(qcid) && (!q.status || (q.status.$in || []).includes(d.status)))
      let sorted = arr
      const api = {
        sort: (s: any) => { const [[k, dir]] = Object.entries(s) as [string, 1 | -1][]; sorted = [...arr].sort((a, b) => (a[k] > b[k] ? (dir as number) : (-(dir as number)))); return api },
        toArray: async () => sorted,
        limit: (_n: number) => api,
        next: async () => sorted[0] || null,
      }
      return api
    }),
    insertOne: jest.fn(async (doc) => { data.push({ ...doc }); return { insertedId: doc._id || { _oid: 'np' } } }),
    updateMany: jest.fn(async (filter, update) => { let c = 0; data.forEach((d) => { const cid = (filter.childId && (filter.childId._oid || (typeof filter.childId.toHexString === 'function' ? filter.childId.toHexString() : String(filter.childId)))); if (String(d.childId._oid) === String(cid) && (!filter._id || String(d._id._oid) !== String(filter._id.$ne)) && (filter.status?.$in ? filter.status.$in.includes(d.status) : true)) { const before = JSON.stringify(d); Object.assign(d, update.$set); if (before !== JSON.stringify(d)) c++ } }); return { matchedCount: c, modifiedCount: c } }),
    updateOne: jest.fn(async (filter, update) => { const cid = (filter.childId && (filter.childId._oid || (typeof filter.childId.toHexString === 'function' ? filter.childId.toHexString() : String(filter.childId)))); const fid = (filter._id && (filter._id._oid || (typeof filter._id.toHexString === 'function' ? filter._id.toHexString() : String(filter._id)))); const d = data.find((x) => String(x._id._oid) === String(fid) && String(x.childId._oid) === String(cid)); if (!d) return { matchedCount: 0, modifiedCount: 0 }; const before = JSON.stringify(d); Object.assign(d, update.$set); return { matchedCount: 1, modifiedCount: before === JSON.stringify(d) ? 0 : 1 } }),
  }
  const mockDb = { collection: (n: string) => (n === 'plans' ? plans : ({} as any)) }

  beforeEach(() => {
    data.length = 0
    data.push(pActive, pCompleted)
    jest.spyOn(dbModule, 'getDb').mockResolvedValue(mockDb as any)
  })

  afterEach(() => jest.restoreAllMocks())

  it('findActive normalizes legacy status', async () => {
    const active = await planRepo.findActive(childId)
    expect(active?.status).toBe('active')
  })

  it('listByChild normalizes statuses', async () => {
    const list = await planRepo.listByChild(childId)
    expect(list.map((p) => p.status)).toEqual(['active', 'completed'])
  })

  it('applyPlan ensures only one active', async () => {
    // create target
    const target = { _id: { _oid: 'p2' }, childId, status: 'draft', createdAt: new Date('2025-01-03') }
    data.push(target)
    const res = await planRepo.applyPlan(childId, target._id)
    expect(res.activated).toBeGreaterThanOrEqual(0)
    const actives = data.filter((d) => d.status === 'active')
    expect(actives.length).toBe(1)
  })
})
