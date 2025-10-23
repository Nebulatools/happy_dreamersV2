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
      summary: 'Resumen breve del plan.',
      schedule: {
        bedtime: '20:00',
        wakeTime: '07:00',
        meals: [
          { time: '08:00', type: 'desayuno', description: 'Desayuno equilibrado con proteína y fruta.' },
        ],
        activities: [
          { time: '16:00', activity: 'Juego tranquilo', duration: 30, description: 'Juego de mesa o lectura relajante.' },
        ],
        naps: [
          { time: '13:00', duration: 60, description: 'Siesta en cuarto oscuro con ruido blanco.' },
        ],
      },
      objectives: ['Consolidar rutina de sueño estable.'],
      recommendations: ['Implementar rutina relajante antes de dormir.'],
      window: { from: from.toISOString(), to: to.toISOString() },
      metrics: { eventCount: 10, distinctTypes: 2, byType: { sleep: 7, night_waking: 3 }, ageInMonths: 12 },
      metadata: { ragSources: ['sleep-basics'] },
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
      summary: 'Plan basado en eventos recientes.',
      schedule: {
        bedtime: '20:30',
        wakeTime: '06:45',
        meals: [
          { time: '08:00', type: 'desayuno', description: 'Desayuno con proteína y carbohidratos complejos.' },
        ],
        activities: [
          { time: '17:00', activity: 'Actividad física ligera', duration: 20, description: 'Juego exterior o caminata suave.' },
        ],
        naps: [],
      },
      objectives: ['Ajustar ventanas de sueño tras nuevos eventos.'],
      recommendations: ['Registrar eventos nocturnos para evaluar progreso.'],
      window: { from: from.toISOString(), to: to.toISOString() },
      metrics: { eventCount: 10, distinctTypes: 2, byType: { sleep: 7, night_waking: 3 }, ageInMonths: 12 },
      metadata: { ragSources: ['events-analysis'] },
    })
    const llm = { complete: jest.fn().mockResolvedValueOnce(bad).mockResolvedValueOnce(good) }
    const svc = new PlanLLMService(llm as any)
    const res = await svc.generate(childId, 'event_based', { from, to })
    expect(res.ok).toBe(true)
    expect(llm.complete).toHaveBeenCalledTimes(2)
  })
})
