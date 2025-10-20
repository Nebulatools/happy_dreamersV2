import { eventDTOSchema, planDTOSchema, childDTOSchema } from '@/core-v3/domain/schemas'

describe('domain schemas (DTO validation)', () => {
  const validId = '65b9a8c9f1e2d3a4b5c6d7e8'

  it('rejects date strings and accepts Date objects for EventDTO', () => {
    const bad = {
      childId: validId,
      type: 'sleep',
      startTime: '2024-10-14T10:00:00.000Z', // string should be rejected
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    expect(() => eventDTOSchema.parse(bad as any)).toThrow()

    const good = {
      childId: validId,
      type: 'sleep',
      startTime: new Date('2024-10-14T10:00:00.000Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    expect(() => eventDTOSchema.parse(good)).not.toThrow()
  })

  it('rejects invalid ObjectId strings', () => {
    const bad = {
      childId: 'not-an-objectid',
      type: 'sleep',
      startTime: new Date('2024-10-14T10:00:00.000Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    expect(() => eventDTOSchema.parse(bad as any)).toThrow()
  })

  it('enforces endTime > startTime when endTime exists', () => {
    const invalid = {
      childId: validId,
      type: 'sleep',
      startTime: new Date('2024-10-14T10:00:00.000Z'),
      endTime: new Date('2024-10-14T09:59:00.000Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    expect(() => eventDTOSchema.parse(invalid as any)).toThrow()

    const valid = {
      childId: validId,
      type: 'sleep',
      startTime: new Date('2024-10-14T10:00:00.000Z'),
      endTime: new Date('2024-10-14T10:10:00.000Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    expect(() => eventDTOSchema.parse(valid)).not.toThrow()
  })

  it('allows sleepDelay only when type === "sleep"', () => {
    const bad = {
      childId: validId,
      type: 'night_waking',
      startTime: new Date('2024-10-14T10:00:00.000Z'),
      sleepDelay: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    expect(() => eventDTOSchema.parse(bad as any)).toThrow()

    const good = {
      childId: validId,
      type: 'sleep',
      startTime: new Date('2024-10-14T10:00:00.000Z'),
      sleepDelay: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    expect(() => eventDTOSchema.parse(good)).not.toThrow()
  })

  it('validates ChildDTO and PlanDTO happy paths', () => {
    const child = {
      userId: validId,
      name: 'Luna',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    expect(() => childDTOSchema.parse(child)).not.toThrow()

    const plan = {
      childId: validId,
      planType: 'initial',
      title: 'Initial Sleep Plan',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    expect(() => planDTOSchema.parse(plan)).not.toThrow()
  })
})

