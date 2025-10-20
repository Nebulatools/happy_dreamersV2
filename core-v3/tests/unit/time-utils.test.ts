import { isDate, normalizeDate } from '@/core-v3/infra/date-utils'

describe('time utils and Date vs Date comparisons', () => {
  it('isDate detects valid Date objects', () => {
    expect(isDate(new Date())).toBe(true)
    expect(isDate(new Date('invalid'))).toBe(false)
    expect(isDate('2025-01-01')).toBe(false)
  })

  it('normalizeDate rejects strings and invalid inputs', () => {
    expect(normalizeDate('2025-01-01')).toBeNull()
    expect(normalizeDate(NaN)).toBeNull()
    expect(normalizeDate(1735689600000)).toBeInstanceOf(Date)
  })

  it('Date vs Date: inclusive range checks', () => {
    const from = new Date('2025-01-01T00:00:00Z')
    const to = new Date('2025-01-01T23:59:59Z')
    const inside = new Date('2025-01-01T12:00:00Z')
    const before = new Date('2024-12-31T23:59:59Z')
    const after = new Date('2025-01-02T00:00:00Z')
    expect(inside >= from && inside <= to).toBe(true)
    expect(before >= from && before <= to).toBe(false)
    expect(after >= from && after <= to).toBe(false)
  })
})

