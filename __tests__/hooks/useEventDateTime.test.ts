import { renderHook } from '@testing-library/react'
import { useEventDateTime } from '@/hooks/useEventDateTime'

describe('useEventDateTime', () => {
  describe('getCurrentDateTimeISO', () => {
    it('should format current date in ISO format for datetime-local input', () => {
      const { result } = renderHook(() => useEventDateTime())
      const dateISO = result.current.getCurrentDateTimeISO()
      
      // Verificar formato: YYYY-MM-DDTHH:MM
      expect(dateISO).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
      
      // Verificar que es una fecha válida
      const date = new Date(dateISO)
      expect(date).toBeInstanceOf(Date)
      expect(date.getTime()).not.toBeNaN()
    })

    it('should round minutes to nearest 10', () => {
      const { result } = renderHook(() => useEventDateTime())
      const dateISO = result.current.getCurrentDateTimeISO()
      const minutes = parseInt(dateISO.split(':')[1])
      
      expect(minutes % 10).toBe(0)
    })
  })

  describe('getDateTimeISO', () => {
    it('should format specific date correctly', () => {
      const { result } = renderHook(() => useEventDateTime())
      const testDate = new Date('2024-01-15T14:37:00')
      const dateISO = result.current.getDateTimeISO(testDate)
      
      expect(dateISO).toBe('2024-01-15T14:40') // Minutos redondeados a 40
    })

    it('should handle edge cases for minute rounding', () => {
      const { result } = renderHook(() => useEventDateTime())
      
      // Test various minute values
      const testCases = [
        { input: new Date('2024-01-15T14:05:00'), expected: '2024-01-15T14:10' },
        { input: new Date('2024-01-15T14:14:00'), expected: '2024-01-15T14:10' },
        { input: new Date('2024-01-15T14:15:00'), expected: '2024-01-15T14:20' },
        { input: new Date('2024-01-15T14:25:00'), expected: '2024-01-15T14:30' },
        { input: new Date('2024-01-15T14:55:00'), expected: '2024-01-15T15:00' },
      ]
      
      testCases.forEach(({ input, expected }) => {
        expect(result.current.getDateTimeISO(input)).toBe(expected)
      })
    })
  })

  describe('getEventTypeByTime', () => {
    it('should return correct event type based on hour', () => {
      const { result } = renderHook(() => useEventDateTime())
      
      const testCases = [
        { hour: 20, expected: 'sleep' },     // 8 PM
        { hour: 2, expected: 'sleep' },      // 2 AM
        { hour: 6, expected: 'wake' },       // 6 AM
        { hour: 14, expected: 'nap' },       // 2 PM
        { hour: 11, expected: 'sleep' },     // 11 AM (default)
      ]
      
      testCases.forEach(({ hour, expected }) => {
        const date = new Date()
        date.setHours(hour, 0, 0, 0)
        expect(result.current.getEventTypeByTime(date)).toBe(expected)
      })
    })
  })

  describe('calculateDuration', () => {
    it('should calculate duration correctly', () => {
      const { result } = renderHook(() => useEventDateTime())
      
      const testCases = [
        {
          start: '2024-01-15T20:00',
          end: '2024-01-16T07:30',
          expected: 11.5
        },
        {
          start: '2024-01-15T14:00',
          end: '2024-01-15T16:15',
          expected: 2.5 // Redondeado a 0.5 horas
        },
        {
          start: '2024-01-15T10:00',
          end: '2024-01-15T10:00',
          expected: 0
        },
      ]
      
      testCases.forEach(({ start, end, expected }) => {
        expect(result.current.calculateDuration(start, end)).toBe(expected)
      })
    })

    it('should return 0 for invalid inputs', () => {
      const { result } = renderHook(() => useEventDateTime())
      
      expect(result.current.calculateDuration('', '2024-01-15T10:00')).toBe(0)
      expect(result.current.calculateDuration('2024-01-15T10:00', '')).toBe(0)
      expect(result.current.calculateDuration('', '')).toBe(0)
    })

    it('should handle negative durations', () => {
      const { result } = renderHook(() => useEventDateTime())
      
      // End time antes que start time
      const duration = result.current.calculateDuration(
        '2024-01-15T10:00',
        '2024-01-15T08:00'
      )
      
      expect(duration).toBe(0) // Should return 0, not negative
    })
  })

  describe('getDefaultEndTime', () => {
    it('should return time 1 hour after start time', () => {
      const { result } = renderHook(() => useEventDateTime())
      
      const startTime = '2024-01-15T20:00'
      const endTime = result.current.getDefaultEndTime(startTime)
      
      expect(endTime).toBe('2024-01-15T21:00')
    })

    it('should handle day boundary correctly', () => {
      const { result } = renderHook(() => useEventDateTime())
      
      const startTime = '2024-01-15T23:30'
      const endTime = result.current.getDefaultEndTime(startTime)
      
      expect(endTime).toBe('2024-01-16T00:30')
    })

    it('should round minutes in result', () => {
      const { result } = renderHook(() => useEventDateTime())
      
      const startTime = '2024-01-15T20:15'
      const endTime = result.current.getDefaultEndTime(startTime)
      
      // Start: 20:15, +1 hour = 21:15, rounded to 21:20
      expect(endTime).toBe('2024-01-15T21:20')
    })
  })
})