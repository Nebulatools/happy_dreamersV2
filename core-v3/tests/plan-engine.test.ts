import { canGenerateInitial, canGenerateProgression, collectPlanContext, setTranscriptResolver } from '@/core-v3/domain/plan-engine'
import * as EventsRepo from '@/core-v3/infra/repos/events.repo'
import * as PlansRepo from '@/core-v3/infra/repos/plans.repo'
import * as ChildrenRepo from '@/core-v3/infra/repos/children.repo'

describe('PlanEngine v3', () => {
  const childId = { _oid: 'child1' } as any
  const now = new Date('2025-01-15T12:00:00Z')

  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(now)
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('collectPlanContext logs range, counts and age', async () => {
    jest.spyOn(EventsRepo.EventsRepo, 'countByTypes').mockResolvedValue({ sleep: 7, night_waking: 3 })
    jest.spyOn(ChildrenRepo.ChildrenRepo, 'findById').mockResolvedValue({ birthdate: new Date('2024-01-10T00:00:00Z') } as any)
    const from = new Date('2024-12-16T12:00:00Z')
    const ctx = await collectPlanContext(childId, { from, to: now })
    expect(ctx.eventCount).toBe(10)
    expect(ctx.distinctTypes).toBe(2)
    expect(typeof ctx.ageInMonths).toBe('number')
  })

  it('canGenerateInitial fails when not enough events', async () => {
    jest.spyOn(EventsRepo.EventsRepo, 'countByTypes').mockResolvedValue({ sleep: 5 })
    jest.spyOn(ChildrenRepo.ChildrenRepo, 'findById').mockResolvedValue({ birthdate: new Date('2024-01-01T00:00:00Z') } as any)
    const res = await canGenerateInitial(childId)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason).toBe('not_enough_events')
  })

  it('canGenerateProgression denies when no new events since base plan', async () => {
    jest.spyOn(PlansRepo.PlansRepo, 'getById').mockResolvedValue({ _id: 'p1', createdAt: new Date('2025-01-10T00:00:00Z') } as any)
    jest.spyOn(EventsRepo.EventsRepo, 'countByTypes').mockResolvedValue({})
    jest.spyOn(ChildrenRepo.ChildrenRepo, 'findById').mockResolvedValue({ birthdate: new Date('2024-01-01T00:00:00Z') } as any)
    const res = await canGenerateProgression(childId, 'p1')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason).toBe('no_new_events_since_base_plan')
  })

  it('canGenerateProgression passes with enough new events and types', async () => {
    jest.spyOn(PlansRepo.PlansRepo, 'getById').mockResolvedValue({ _id: 'p1', createdAt: new Date('2025-01-10T00:00:00Z') } as any)
    jest.spyOn(EventsRepo.EventsRepo, 'countByTypes').mockResolvedValue({ sleep: 7, night_waking: 3 })
    jest.spyOn(ChildrenRepo.ChildrenRepo, 'findById').mockResolvedValue({ birthdate: new Date('2024-01-01T00:00:00Z') } as any)
    const res = await canGenerateProgression(childId, 'p1')
    expect(res.ok).toBe(true)
  })

  it('canRefine enforces transcript after base plan', async () => {
    jest.spyOn(PlansRepo.PlansRepo, 'getById').mockResolvedValue({ _id: 'p1', createdAt: new Date('2025-01-10T00:00:00Z') } as any)
    setTranscriptResolver(async (id) => (id === 't1' ? new Date('2025-01-09T00:00:00Z') : new Date('2025-01-12T00:00:00Z')))
    jest.spyOn(EventsRepo.EventsRepo, 'countByTypes').mockResolvedValue({})
    jest.spyOn(ChildrenRepo.ChildrenRepo, 'findById').mockResolvedValue({ birthdate: new Date('2024-01-01T00:00:00Z') } as any)
    const fail = await (await import('@/core-v3/domain/plan-engine')).canRefine(childId, 'p1', 't1')
    expect(fail.ok).toBe(false)
    const ok = await (await import('@/core-v3/domain/plan-engine')).canRefine(childId, 'p1', 't2')
    expect(ok.ok).toBe(true)
  })
})

