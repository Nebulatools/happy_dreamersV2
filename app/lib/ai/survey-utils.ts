export function surveyToFacts(s: any) {
  const h = s?.rutinaHabitos || s?.rutina || {}
  const alim = s?.alimentacion || {}
  const goals = s?.sleep_goals || s?.objetivos || s?.preocupaciones?.objetivoPrincipal
  return {
    bedtimeDeclared: h.horaDormir || h.horaAcostarse || null,
    bedtimeRoutine: h.rutinaAntesAcostarse || h.rutina || null,
    napsYesNo: h.haceSiestas ?? null,
    sleepLocation: h.dondeDuermeNoche || null,
    mealsDeclared: alim.horarioComidas || null,
    goals: Array.isArray(goals) ? goals : goals ? [goals] : [],
  }
}

export function weakStatsFromSurvey(facts: ReturnType<typeof surveyToFacts>) {
  return {
    avgBedtime: facts.bedtimeDeclared || '20:30',
    napStats:
      facts.napsYesNo === 'no'
        ? { count: 0, typicalTime: null, avgDuration: null }
        : { count: 1, typicalTime: '13:30', avgDuration: 90 },
    feedingStats: facts.mealsDeclared || {},
  }
}

export function prettySurveyFacts(facts: ReturnType<typeof surveyToFacts>) {
  return [
    `Rutina antes de dormir: ${facts.bedtimeRoutine ?? 'N/A'}`,
    `Hora de dormir declarada: ${facts.bedtimeDeclared ?? 'N/A'}`,
    `Siestas: ${facts.napsYesNo ?? 'N/A'}`,
    `Dónde duerme: ${facts.sleepLocation ?? 'N/A'}`,
    `Metas declaradas: ${facts.goals.join('; ') || 'N/A'}`,
    `Horarios de comida declarados: ${typeof facts.mealsDeclared === 'string' ? facts.mealsDeclared : JSON.stringify(facts.mealsDeclared) || 'N/A'}`,
  ].join('\n')
}
