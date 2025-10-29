import { getViewModeForRole } from '@/types/calendar'

describe('getViewModeForRole', () => {
  it('returns compact when role is undefined', () => {
    expect(getViewModeForRole()).toBe('compact')
  })

  it('returns compact for non-admin roles', () => {
    expect(getViewModeForRole('parent')).toBe('compact')
    expect(getViewModeForRole('coach')).toBe('compact')
  })

  it('returns full for admin-like roles ignoring casing', () => {
    expect(getViewModeForRole('admin')).toBe('full')
    expect(getViewModeForRole('POWER')).toBe('full')
  })
})
