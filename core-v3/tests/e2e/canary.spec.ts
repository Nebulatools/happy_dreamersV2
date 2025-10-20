import { PlanLLMService } from '@/core-v3/infra/llm/plan-llm-service'
import * as EventsRepo from '@/core-v3/infra/repos/events.repo'
import * as ChildrenRepo from '@/core-v3/infra/repos/children.repo'
import { reset as resetMetrics, snapshot, incPlanAborted } from '@/core-v3/observability/metrics'

describe('E2E Canary - Plan generation or safe abort', () => {
  const childId = { _oid: 'canary-child' } as any
  const from = new Date('2025-01-01T00:00:00Z')
  const to = new Date('2025-01-31T23:59:59Z')

  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(to)
    resetMetrics()
  })
  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('canary passes: enough events and valid JSON output', async () => {
    // Seed canary dataset (pattern known): 8 sleep + 4 night_waking = 12 events, 2 types
    jest.spyOn(EventsRepo.EventsRepo, 'countByTypes').mockResolvedValue({ sleep: 8, night_waking: 4 })
    jest.spyOn(ChildrenRepo.ChildrenRepo, 'findById').mockResolvedValue({ birthdate: new Date('2024-01-01T00:00:00Z') } as any)

    const good = JSON.stringify({
      planType: 'initial',
      title: 'Canary Plan',
      summary: 'Resumen',
      window: { from: from.toISOString(), to: to.toISOString() },
      metrics: { eventCount: 12, distinctTypes: 2, byType: { sleep: 8, night_waking: 4 }, ageInMonths: 12 },
      recommendations: [{ key: 'routine', action: 'Rutina', rationale: 'Consistencia' }],
    })
    const llm = { complete: jest.fn().mockResolvedValue(good) }
    const svc = new PlanLLMService(llm as any)
    const res = await svc.generate(childId, 'initial', { from, to })
    expect(res.ok).toBe(true)
    const m = snapshot()
    expect(Object.keys(m.counts)).toEqual(expect.arrayContaining([expect.stringContaining('plans_generated_total')]))
  })

  it('canary aborts safely when insufficient data', async () => {
    jest.spyOn(EventsRepo.EventsRepo, 'countByTypes').mockResolvedValue({ sleep: 3 })
    jest.spyOn(ChildrenRepo.ChildrenRepo, 'findById').mockResolvedValue({ birthdate: new Date('2024-12-31T00:00:00Z') } as any)
    const llm = { complete: jest.fn() }
    const svc = new PlanLLMService(llm as any)
    const res = await svc.generate(childId, 'initial', { from, to })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toBe('insufficient_data')
    const m = snapshot()
    expect(Object.keys(m.counts)).toEqual(expect.arrayContaining([expect.stringContaining('plans_aborted_total')]))
  })
})

