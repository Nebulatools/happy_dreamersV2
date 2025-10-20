import * as builder from '@/lib/rag/plan-context-builder-v2'

jest.mock('@/src/repo/planRepo', () => ({
  planRepo: {
    findActive: jest.fn(),
    listByChild: jest.fn(),
  }
}))

import { planRepo } from '@/src/repo/planRepo'

describe('plan-context-builder-v2', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('returns explicit message when no active plan', async () => {
    ;(planRepo.findActive as jest.Mock).mockResolvedValue(null)
    const ctx = await builder.getChildPlanContext('65b9a8c9f1e2d3a4b5c6d7e8', 'u1')
    expect(ctx.toLowerCase()).toContain('no hay plan activo')
  })

  it('builds compact context with recommendations from v3 output', async () => {
    const plan = {
      planNumber: 1,
      planType: 'event_based',
      status: 'active',
      createdAt: new Date('2025-01-01T00:00:00Z'),
      output: {
        recommendations: [
          { key: 'routine', action: 'Establecer rutina nocturna', rationale: 'Consistencia circadiana' },
          { key: 'naps', action: 'Ajustar siesta de la tarde', rationale: 'Evitar sobrecansancio' },
          { key: 'lights', action: 'Reducir pantallas', rationale: 'Mejorar melatonina' },
        ],
      },
    }
    ;(planRepo.findActive as jest.Mock).mockResolvedValue(plan)
    const active = await builder.getActivePlan('65b9a8c9f1e2d3a4b5c6d7e8', 'u1')
    expect(active).toBeTruthy()
    const txt = builder.buildPlanContext(plan)
    expect(txt).toContain('⏰ Horarios')
    expect(txt).toContain('💡 Recomendaciones clave')
  })

  it('history context lists normalized statuses', async () => {
    const items = [
      { planNumber: 2, planType: 'event_based', status: 'active', createdAt: new Date('2025-01-10T00:00:00Z') },
      { planNumber: 1, planType: 'event_based', status: 'completed', createdAt: new Date('2025-01-01T00:00:00Z') },
      { planNumber: 0, planType: 'initial', status: 'superseded', createdAt: new Date('2024-12-15T00:00:00Z') },
    ]
    ;(planRepo.listByChild as jest.Mock).mockResolvedValue(items)
    const ctx = await builder.getPlanHistoryContext('65b9a8c9f1e2d3a4b5c6d7e8', 'u1', 3)
    expect(ctx).toContain('Plan 2 (active)')
    expect(ctx).toContain('Plan 1 (completed)')
    expect(ctx).toContain('Plan 0 (superseded)')
  })
})

