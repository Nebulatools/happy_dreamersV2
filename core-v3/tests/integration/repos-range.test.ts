import * as dbModule from '@/core-v3/infra/db'
import { EventsRepo } from '@/core-v3/infra/repos/events.repo'
import { PlansRepo } from '@/core-v3/infra/repos/plans.repo'
import { mockDbWithCollections } from '@/core-v3/tests/helpers/mock-db'

describe('Integration-like repos with seeded data', () => {
  const child = { _id: 'c1', birthdate: new Date('2024-01-01T00:00:00Z') }
  const childId = child._id as any
  const events = [
    { _id: 'e1', childId, type: 'sleep', startTime: new Date('2025-01-01T08:00:00Z'), createdAt: new Date(), updatedAt: new Date() },
    { _id: 'e2', childId, type: 'night_waking', startTime: new Date('2025-01-01T23:30:00Z'), createdAt: new Date(), updatedAt: new Date() },
    { _id: 'e3', childId, type: 'sleep', startTime: new Date('2025-01-02T07:50:00Z'), createdAt: new Date(), updatedAt: new Date() },
  ]

  beforeAll(() => {
    jest.spyOn(dbModule, 'getDb').mockResolvedValue(mockDbWithCollections({ events, plans: [], children: [child] }) as any)
  })

  afterAll(() => jest.restoreAllMocks())

  it('findByChildAndRange returns data within range boundaries', async () => {
    const out = await EventsRepo.findByChildAndRange(childId, new Date('2025-01-01T00:00:00Z'), new Date('2025-01-01T23:59:59Z'))
    expect(out.length).toBe(2)
  })

  it('countByTypes aggregates correctly', async () => {
    const out = await EventsRepo.countByTypes(childId, new Date('2025-01-01T00:00:00Z'), new Date('2025-01-03T00:00:00Z'))
    expect(out.sleep).toBe(2)
    expect(out.night_waking).toBe(1)
  })

  it('PlansRepo numbering helpers', async () => {
    // Using empty plans: next number starts at 0+1
    const n = await PlansRepo.getNextPlanNumber(childId)
    expect(n).toBe(0)
    const v = await PlansRepo.getNextPlanVersion(childId, 0)
    expect(v).toBe(0)
  })
})

