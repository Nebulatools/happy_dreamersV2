import { mapLegacyStatus } from '@/src/domain/status'

describe('legacy status mapper', () => {
  it('maps spanish statuses to modern', () => {
    expect(mapLegacyStatus('borrador')).toBe('draft')
    expect(mapLegacyStatus('activo')).toBe('active')
    expect(mapLegacyStatus('completado')).toBe('completed')
  })
  it('keeps modern statuses as-is', () => {
    expect(mapLegacyStatus('draft')).toBe('draft')
    expect(mapLegacyStatus('active')).toBe('active')
    expect(mapLegacyStatus('completed')).toBe('completed')
    expect(mapLegacyStatus('superseded')).toBe('superseded')
  })
  it('defaults to draft for unknown', () => {
    expect(mapLegacyStatus('whatever')).toBe('draft')
  })
})

