export type InitialEligibility = {
  canGenerate: boolean
  mode: 'survey_only' | 'events' | null
  reason?: 'insufficient_data' | 'requires_base_plan' | 'requires_transcript'
  details: {
    eventCount: number
    distinctTypes: number
    surveyComplete: boolean
    minEvents: number
    minDistinctTypes: number
    allowSurveyOnly: boolean
  }
}

export type Inputs = {
  eventCount: number
  distinctTypes: number
  surveyComplete: boolean
  minEvents: number
  minDistinctTypes: number
  allowSurveyOnly: boolean
}

export function computeInitialEligibility(i: Inputs): InitialEligibility {
  // 1) encuesta completa + flag => permitido por encuesta
  if (i.allowSurveyOnly && i.surveyComplete) {
    return {
      canGenerate: true,
      mode: 'survey_only',
      details: { ...i },
    }
  }
  // 2) suficientes eventos => permitido por eventos
  if (i.eventCount >= i.minEvents && i.distinctTypes >= i.minDistinctTypes) {
    return {
      canGenerate: true,
      mode: 'events',
      details: { ...i },
    }
  }
  // 3) insuficiente
  return {
    canGenerate: false,
    mode: null,
    reason: 'insufficient_data',
    details: { ...i },
  }
}

