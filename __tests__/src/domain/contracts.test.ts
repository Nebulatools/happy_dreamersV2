import { z } from 'zod'
import { childApiSchema, childPlanApiSchema } from '@/src/domain/schemas'
import { mapLegacyStatus, mapToLegacyStatus } from '@/src/domain/status'

describe('Data contract - ObjectId + status mapping', () => {
  it('rejects non-hex parentId (userId) strings and accepts valid ones', () => {
    const bad = { userId: 'not-an-oid', name: 'Luna' }
    expect(() => childApiSchema.parse(bad as any)).toThrow()

    const good = { userId: '65b9a8c9f1e2d3a4b5c6d7e8', name: 'Luna' }
    const res = childApiSchema.parse(good)
    expect(typeof (res as any).userId).toBe('object')
  })

  it('maps legacy statuses to modern', () => {
    expect(mapLegacyStatus('borrador')).toBe('draft')
    expect(mapLegacyStatus('activo')).toBe('active')
    expect(mapLegacyStatus('completado')).toBe('completed')
    expect(mapToLegacyStatus('active')).toBe('activo')
  })

  it('childPlanApiSchema transforms status and ids', () => {
    const input = {
      childId: '65b9a8c9f1e2d3a4b5c6d7e8',
      userId: '65b9a8c9f1e2d3a4b5c6d7e9',
      planType: 'initial',
      status: 'activo',
    }
    const parsed = childPlanApiSchema.parse(input)
    expect(typeof parsed.childId).toBe('object')
    expect(parsed.status).toBe('active')
  })
})

