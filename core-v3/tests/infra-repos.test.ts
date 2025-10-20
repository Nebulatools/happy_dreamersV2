/**
 * Tests con MongoDB mockeado para validar lógica de repos (consultas Date vs Date, índices).
 */
import * as dbModule from '@/core-v3/infra/db'
import { ensureIndexes } from '@/core-v3/infra/indexes'
import { EventsRepo } from '@/core-v3/infra/repos/events.repo'
import { PlansRepo } from '@/core-v3/infra/repos/plans.repo'
import { ChildrenRepo } from '@/core-v3/infra/repos/children.repo'

type MockCollection = {
  find: jest.Mock
  aggregate: jest.Mock
  insertMany: jest.Mock
  findOne: jest.Mock
  updateOne: jest.Mock
  createIndexes: jest.Mock
}

const mockCollection = (): MockCollection => ({
  find: jest.fn(() => ({ sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), next: jest.fn(), toArray: jest.fn().mockResolvedValue([]) })),
  aggregate: jest.fn(() => ({ toArray: jest.fn().mockResolvedValue([]) })),
  insertMany: jest.fn(async (docs) => ({ insertedCount: docs.length })),
  findOne: jest.fn(async () => null),
  updateOne: jest.fn(async () => ({ matchedCount: 0, upsertedId: { _id: 'mock' } })),
  createIndexes: jest.fn(async () => undefined as unknown as any),
})

function mockDb(collections: Record<string, ReturnType<typeof mockCollection>>) {
  return {
    collection: (name: string) => collections[name],
  } as any
}

describe('infra repos & indexes', () => {
  const eventsCol = mockCollection()
  const plansCol = mockCollection()
  const childrenCol = mockCollection()

  beforeAll(() => {
    jest.spyOn(dbModule, 'getDb').mockResolvedValue(mockDb({ events: eventsCol as any, plans: plansCol as any, children: childrenCol as any }))
  })

  afterAll(() => jest.restoreAllMocks())

  it('ensureIndexes creates required indexes', async () => {
    await ensureIndexes()
    expect(eventsCol.createIndexes).toHaveBeenCalled()
    expect(plansCol.createIndexes).toHaveBeenCalled()
  })

  it('EventsRepo.findByChildAndRange enforces Date vs Date and builds query', async () => {
    const childId = { _oid: 'fake' } as any
    await EventsRepo.findByChildAndRange(childId, new Date('2024-01-01T00:00:00Z'), new Date('2024-01-31T23:59:59Z'))
    expect(eventsCol.find).toHaveBeenCalledWith({ childId, startTime: { $gte: expect.any(Date), $lte: expect.any(Date) } })
    // invalid input should throw
    await expect(EventsRepo.findByChildAndRange(childId, '2024-01-01' as any, new Date())).rejects.toThrow()
  })

  it('EventsRepo.countByTypes aggregates counts by type', async () => {
    eventsCol.aggregate.mockReturnValueOnce({ toArray: jest.fn().mockResolvedValue([{ _id: 'sleep', count: 2 }, { _id: 'night_waking', count: 1 }]) })
    const out = await EventsRepo.countByTypes({ _oid: 'c' } as any, new Date('2024-01-01'), new Date('2024-02-01'))
    expect(out.sleep).toBe(2)
    expect(out.night_waking).toBe(1)
  })

  it('EventsRepo.insertManyValidated checks invariants', async () => {
    const childId = { _oid: 'a' } as any
    const now = new Date('2024-10-10T10:00:00Z')
    const events = [
      { childId, type: 'sleep', startTime: now, sleepDelay: 10, createdAt: now, updatedAt: now },
      { childId, type: 'night_waking', startTime: now, createdAt: now, updatedAt: now },
    ] as any
    const res = await EventsRepo.insertManyValidated(events)
    expect(res.insertedCount).toBe(2)
    // invalid: endTime <= startTime
    await expect(EventsRepo.insertManyValidated([{ childId, type: 'sleep', startTime: now, endTime: new Date('2024-10-10T09:59:00Z'), createdAt: now, updatedAt: now }] as any)).rejects.toThrow()
    // invalid: sleepDelay on night_waking
    await expect(EventsRepo.insertManyValidated([{ childId, type: 'night_waking', startTime: now, sleepDelay: 10, createdAt: now, updatedAt: now }] as any)).rejects.toThrow()
  })

  it('PlansRepo.findLatestByCreatedAt sorts by createdAt desc', async () => {
    const nextMock = jest.fn().mockResolvedValue(null)
    plansCol.find.mockReturnValueOnce({ sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), next: nextMock })
    await PlansRepo.findLatestByCreatedAt({ _oid: 'p' } as any)
    expect(plansCol.find).toHaveBeenCalledWith({ childId: expect.any(Object) })
  })

  it('ChildrenRepo methods run without throwing', async () => {
    await ChildrenRepo.findById({ _oid: 'c1' } as any)
    await ChildrenRepo.upsert({ _id: { _oid: 'c2' } as any, name: 'Luna' } as any)
    await ChildrenRepo.listEventsOperational({ _oid: 'c3' } as any)
    expect(childrenCol.findOne).toHaveBeenCalled()
  })
})
