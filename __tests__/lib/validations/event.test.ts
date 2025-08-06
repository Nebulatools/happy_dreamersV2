import { 
  eventFormSchema, 
  isValidEventDate, 
  isValidEventDuration,
  defaultEventFormValues 
} from '@/lib/validations/event'

describe('Event Validations', () => {
  describe('eventFormSchema', () => {
    it('should validate complete event form data', () => {
      const validData = {
        eventType: 'sleep',
        emotionalState: 'calm',
        startTime: '2024-01-15T20:00',
        endTime: '2024-01-16T07:00',
        duration: 11,
        notes: 'Durmió bien',
        sleepDelay: 15,
        nightWakingCount: 0,
        extraActivities: [],
      }
      
      const result = eventFormSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should require eventType and emotionalState', () => {
      const invalidData = {
        startTime: '2024-01-15T20:00',
      }
      
      const result = eventFormSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ path: ['eventType'] }),
            expect.objectContaining({ path: ['emotionalState'] }),
          ])
        )
      }
    })

    it('should validate that endTime is after startTime', () => {
      const invalidData = {
        eventType: 'sleep',
        emotionalState: 'calm',
        startTime: '2024-01-15T20:00',
        endTime: '2024-01-15T19:00', // Before start time
      }
      
      const result = eventFormSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['endTime'])
        expect(result.error.errors[0].message).toContain('posterior')
      }
    })

    it('should validate duration matches calculated time', () => {
      const invalidData = {
        eventType: 'sleep',
        emotionalState: 'calm',
        startTime: '2024-01-15T20:00',
        endTime: '2024-01-15T22:00', // 2 hours
        duration: 5, // Wrong duration
      }
      
      const result = eventFormSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['duration'])
        expect(result.error.errors[0].message).toContain('no coincide')
      }
    })

    it('should allow valid duration with small tolerance', () => {
      const validData = {
        eventType: 'sleep',
        emotionalState: 'calm',
        startTime: '2024-01-15T20:00',
        endTime: '2024-01-15T22:05', // 2.083 hours
        duration: 2, // Close enough (within 0.1 tolerance)
      }
      
      const result = eventFormSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate optional fields', () => {
      const dataWithOptionals = {
        eventType: 'sleep',
        emotionalState: 'calm',
        startTime: '2024-01-15T20:00',
        notes: '', // Empty string is valid
        sleepDelay: 0, // Zero is valid
        nightWakingCount: 0,
        extraActivities: [],
      }
      
      const result = eventFormSchema.safeParse(dataWithOptionals)
      expect(result.success).toBe(true)
    })

    it('should enforce limits on numeric fields', () => {
      const invalidData = {
        eventType: 'sleep',
        emotionalState: 'calm',
        startTime: '2024-01-15T20:00',
        duration: 25, // > 24 hours
        sleepDelay: 200, // > 180 minutes
        nightWakingCount: 15, // > 10
      }
      
      const result = eventFormSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('isValidEventDate', () => {
    beforeEach(() => {
      // Mock current date for consistent testing
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-01-15T12:00:00'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should accept dates within the last 30 days', () => {
      const validDates = [
        new Date('2024-01-15T10:00:00'), // Today
        new Date('2024-01-14T10:00:00'), // Yesterday
        new Date('2024-01-01T10:00:00'), // 14 days ago
        new Date('2023-12-16T10:00:00'), // 30 days ago
      ]
      
      validDates.forEach(date => {
        expect(isValidEventDate(date)).toBe(true)
      })
    })

    it('should reject future dates', () => {
      const futureDate = new Date('2024-01-16T10:00:00')
      expect(isValidEventDate(futureDate)).toBe(false)
    })

    it('should reject dates older than 30 days', () => {
      const oldDate = new Date('2023-12-15T10:00:00') // 31 days ago
      expect(isValidEventDate(oldDate)).toBe(false)
    })
  })

  describe('isValidEventDuration', () => {
    it('should validate sleep duration (max 14 hours)', () => {
      expect(isValidEventDuration(8, 'sleep')).toBe(true)
      expect(isValidEventDuration(14, 'sleep')).toBe(true)
      expect(isValidEventDuration(15, 'sleep')).toBe(false)
    })

    it('should validate nap duration (max 4 hours)', () => {
      expect(isValidEventDuration(2, 'nap')).toBe(true)
      expect(isValidEventDuration(4, 'nap')).toBe(true)
      expect(isValidEventDuration(5, 'nap')).toBe(false)
    })

    it('should validate wake duration (max 24 hours)', () => {
      expect(isValidEventDuration(12, 'wake')).toBe(true)
      expect(isValidEventDuration(24, 'wake')).toBe(true)
      expect(isValidEventDuration(25, 'wake')).toBe(false)
    })

    it('should validate night_waking duration (max 3 hours)', () => {
      expect(isValidEventDuration(1, 'night_waking')).toBe(true)
      expect(isValidEventDuration(3, 'night_waking')).toBe(true)
      expect(isValidEventDuration(4, 'night_waking')).toBe(false)
    })

    it('should reject negative durations', () => {
      expect(isValidEventDuration(-1, 'sleep')).toBe(false)
      expect(isValidEventDuration(-0.5, 'nap')).toBe(false)
    })

    it('should handle unknown event types', () => {
      expect(isValidEventDuration(10, 'unknown')).toBe(true)
      expect(isValidEventDuration(25, 'unknown')).toBe(false) // Default max is 24
    })
  })

  describe('defaultEventFormValues', () => {
    it('should provide correct default values', () => {
      expect(defaultEventFormValues).toEqual({
        eventType: '',
        emotionalState: '',
        notes: '',
        sleepDelay: 0,
        nightWakingCount: 0,
        extraActivities: [],
      })
    })
  })
})