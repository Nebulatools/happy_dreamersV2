import { computeInitialEligibility } from '@/core-v3/domain/eligibility'

describe('computeInitialEligibility', () => {
  it('allows survey_only when flag is true and survey is complete (no events required)', () => {
    const res = computeInitialEligibility({
      eventCount: 0,
      distinctTypes: 0,
      surveyComplete: true,
      minEvents: 10,
      minDistinctTypes: 2,
      allowSurveyOnly: true,
    })
    expect(res.canGenerate).toBe(true)
    expect(res.mode).toBe('survey_only')
    expect(res.details.surveyComplete).toBe(true)
  })

  it('allows by events when thresholds are met and survey_only is disabled', () => {
    const res = computeInitialEligibility({
      eventCount: 12,
      distinctTypes: 3,
      surveyComplete: false,
      minEvents: 10,
      minDistinctTypes: 2,
      allowSurveyOnly: false,
    })
    expect(res.canGenerate).toBe(true)
    expect(res.mode).toBe('events')
  })

  it('blocks with insufficient_data when thresholds are not met and survey incomplete', () => {
    const res = computeInitialEligibility({
      eventCount: 3,
      distinctTypes: 1,
      surveyComplete: false,
      minEvents: 10,
      minDistinctTypes: 2,
      allowSurveyOnly: true,
    })
    expect(res.canGenerate).toBe(false)
    expect(res.mode).toBeNull()
    expect(res.reason).toBe('insufficient_data')
  })
})

