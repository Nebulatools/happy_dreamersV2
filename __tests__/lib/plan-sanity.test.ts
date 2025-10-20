import { checkPlanSanityOrThrow, hasMinimumRecentEvents, validAgeInMonths, consistentIdTypesAcrossCollections } from '@/lib/plan-sanity'

jest.mock('@/lib/mongodb', () => ({
  connectToDatabase: async () => mockDb,
}))

const childId = { _oid: 'c1' } as any

const mockDb = {
  db: {
    collection: (name: string) => collections[name],
  },
} as any

const collections: Record<string, any> = {
  events: {
    countDocuments: jest.fn(async (q) => {
      const from = q.startTime.$gte
      const to = q.startTime.$lte
      return seed.events.filter((e) => e.childId === childId && e.startTime >= from && e.startTime <= to).length
    }),
    aggregate: jest.fn(() => ({ toArray: async () => [{ _id: 'sleep', count: 7 }, { _id: 'night_waking', count: 3 }] })),
    find: jest.fn(() => ({ limit: () => ({ toArray: async () => seed.events.filter((e) => e.childId === childId).slice(0, 20) }) })),
  },
  children: {
    findOne: jest.fn(async () => ({ birthdate: new Date('2024-01-01T00:00:00Z') })),
  },
  plans: {
    find: jest.fn(() => ({ limit: () => ({ toArray: async () => seed.plans.filter((p) => p.childId === childId).slice(0, 20) }) })),
  },
}

const seed = {
  events: [
    { childId, type: 'sleep', startTime: new Date('2025-01-10T10:00:00Z') },
    { childId, type: 'night_waking', startTime: new Date('2025-01-15T01:00:00Z') },
  ],
  plans: [
    { childId },
  ],
}

describe('plan-sanity kill-switch', () => {
  const now = new Date('2025-01-31T23:59:59Z')
  beforeAll(() => {
    jest.useFakeTimers()
    jest.setSystemTime(now)
  })
  afterAll(() => {
    jest.useRealTimers()
  })
  it('hasMinimumRecentEvents passes with sufficient data', async () => {
    const ok = await hasMinimumRecentEvents(childId, 30, 1, 1)
    expect(ok).toBe(true)
  })

  it('validAgeInMonths passes with valid birthdate', async () => {
    const ok = await validAgeInMonths(childId)
    expect(ok).toBe(true)
  })

  it('consistentIdTypesAcrossCollections passes for ObjectId-like values', async () => {
    const ok = await consistentIdTypesAcrossCollections(childId)
    expect(ok).toBe(true)
  })

  it('checkPlanSanityOrThrow throws when events are insufficient', async () => {
    // Make aggregate return 0 distinct types to force failure
    collections.events.aggregate.mockReturnValueOnce({ toArray: async () => [] })
    await expect(checkPlanSanityOrThrow(childId, 'u1')).rejects.toHaveProperty('status', 422)
  })
})
