import { subDays, parseISO } from "date-fns"

export interface PlanPolicy {
  napTransition: {
    isTransitionWindow: boolean
    recommendedStepMinutes: number // tamaño de ajuste recomendado
    note: string
  }
  nightWeaning: {
    isActive: boolean
    shiftEarlierMinutesPerStep: number
    increaseBottleOzPerStep: number
    stepEveryDays: number
    note: string
  }
  summary: string
}

export function getAgeInMonths(birthDate?: string | Date | null): number | null {
  if (!birthDate) return null
  const d = typeof birthDate === "string" ? new Date(birthDate) : birthDate
  if (isNaN(d.getTime())) return null
  const diffMs = Date.now() - d.getTime()
  const months = diffMs / (1000 * 60 * 60 * 24 * 30.44)
  return Math.floor(months)
}

export function derivePlanPolicy(params: { ageInMonths: number | null; events?: any[]; schedule?: any }): PlanPolicy {
  const { ageInMonths, events = [] } = params

  // Detectar uso reciente de night_feeding (últimos 7 días)
  const weekAgo = subDays(new Date(), 7)
  const hasRecentNightFeeding = events.some((e: any) => {
    if (e.eventType !== "night_feeding" || !e.startTime) return false
    const dt = parseISO(e.startTime)
    return dt >= weekAgo
  })

  // Nap transition window: 15–18 meses
  const isTransitionWindow = ageInMonths != null && ageInMonths >= 15 && ageInMonths <= 18

  const napRecommendedStep = isTransitionWindow ? 10 : 30 // minutos por ajuste
  const napNote = isTransitionWindow
    ? "En la transición de 2→1 siestas (15–18 meses), hacer cambios graduales de 10–15 min cada 3–4 días."
    : "En general, puedes ajustar bloques de 30 min de una sola vez si el niño lo tolera."

  const nightWeaningActive = !!hasRecentNightFeeding
  const nightWeaningNote = "Para destete nocturno: mover la toma gradualmente más temprano y aumentar la cantidad de manera paulatina."

  const policy: PlanPolicy = {
    napTransition: {
      isTransitionWindow,
      recommendedStepMinutes: napRecommendedStep,
      note: napNote,
    },
    nightWeaning: {
      isActive: nightWeaningActive,
      shiftEarlierMinutesPerStep: 15,
      increaseBottleOzPerStep: 1,
      stepEveryDays: 3,
      note: nightWeaningNote,
    },
    summary: `${napNote} ${nightWeaningNote}`,
  }

  return policy
}

