import { PlanLLMService } from '@/core-v3/infra/llm/plan-llm-service'
import * as EventsRepo from '@/core-v3/infra/repos/events.repo'
import * as ChildrenRepo from '@/core-v3/infra/repos/children.repo'

describe('PlanLLMService v3', () => {
  const childId = { _oid: 'c1' } as any
  const from = new Date('2025-01-01T00:00:00Z')
  const to = new Date('2025-01-31T23:59:59Z')

  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(to)
  })
  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('returns insufficient_data without calling LLM when gate fails', async () => {
    jest.spyOn(EventsRepo.EventsRepo, 'countByTypes').mockResolvedValue({ sleep: 3 })
    jest.spyOn(ChildrenRepo.ChildrenRepo, 'findById').mockResolvedValue({ birthdate: new Date('2024-12-31T00:00:00Z') } as any)
    const llm = { complete: jest.fn() }
    const svc = new PlanLLMService(llm as any)
    const res = await svc.generate(childId, 'initial', { from, to })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toBe('insufficient_data')
    expect(llm.complete).not.toHaveBeenCalled()
  })

  it('valid JSON on first try passes', async () => {
    jest.spyOn(EventsRepo.EventsRepo, 'countByTypes').mockResolvedValue({ sleep: 7, night_waking: 3 })
    jest.spyOn(ChildrenRepo.ChildrenRepo, 'findById').mockResolvedValue({ birthdate: new Date('2024-01-01T00:00:00Z') } as any)
    const good = JSON.stringify({
      planType: 'initial',
      title: 'Plan de Sueño',
      summary: 'Resumen',
      window: { from: from.toISOString(), to: to.toISOString() },
      metrics: { eventCount: 10, distinctTypes: 2, byType: { sleep: 7, night_waking: 3 }, ageInMonths: 12 },
      recommendations: [{ key: 'sleep-window', action: 'Dormir temprano', rationale: 'Mejora la calidad del sueño' }],
    })
    const llm = { complete: jest.fn().mockResolvedValue(good) }
    const svc = new PlanLLMService(llm as any)
    const res = await svc.generate(childId, 'initial', { from, to })
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.output).toBeTruthy()
    expect(llm.complete).toHaveBeenCalledTimes(1)
  })

  it('invalid then valid JSON triggers one retry and succeeds', async () => {
    jest.spyOn(EventsRepo.EventsRepo, 'countByTypes').mockResolvedValue({ sleep: 7, night_waking: 3 })
    jest.spyOn(ChildrenRepo.ChildrenRepo, 'findById').mockResolvedValue({ birthdate: new Date('2024-01-01T00:00:00Z') } as any)
    const bad = 'not json'
    const good = JSON.stringify({
      planType: 'event_based',
      title: 'Plan N',
      summary: 'Resumen',
      window: { from: from.toISOString(), to: to.toISOString() },
      metrics: { eventCount: 10, distinctTypes: 2, byType: { sleep: 7, night_waking: 3 }, ageInMonths: 12 },
      recommendations: [{ key: 'routine', action: 'Rutina consistente', rationale: 'Regulariza el ciclo de sueño' }],
    })
    const llm = { complete: jest.fn().mockResolvedValueOnce(bad).mockResolvedValueOnce(good) }
    const svc = new PlanLLMService(llm as any)
    const res = await svc.generate(childId, 'event_based', { from, to })
    expect(res.ok).toBe(true)
    expect(llm.complete).toHaveBeenCalledTimes(2)
  })
})

