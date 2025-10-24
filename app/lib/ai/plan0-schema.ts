export type Plan0AI = {
  schedule: {
    bedtime: string
    wakeTime: string
    meals: { time: string; type: 'desayuno' | 'almuerzo' | 'merienda' | 'cena'; description: string }[]
    activities: { time: string; activity: string; duration: number; description?: string }[]
    naps: { time: string; duration: number; description?: string }[]
  }
  objectives: string[]
  recommendations: string[]
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const ensureTime = (value: any, fallback: string) => (typeof value === 'string' && TIME_RE.test(value) ? value : fallback)

export function normalizeAIPlan(raw: any): Plan0AI {
  const obj = raw ?? {}
  const schedule = obj.schedule ?? {}
  const meals = Array.isArray(schedule.meals) ? schedule.meals : []
  const activities = Array.isArray(schedule.activities) ? schedule.activities : []
  const naps = Array.isArray(schedule.naps) ? schedule.naps : []

  return {
    schedule: {
      bedtime: ensureTime(schedule.bedtime, '20:30'),
      wakeTime: ensureTime(schedule.wakeTime, '07:00'),
      meals: meals.map((m: any) => ({
        time: ensureTime(m?.time, '07:30'),
        type: (m?.type ?? 'desayuno') as Plan0AI['schedule']['meals'][number]['type'],
        description: String(m?.description ?? '').trim() || '—',
      })),
      activities: activities.map((a: any) => ({
        time: ensureTime(a?.time, '17:00'),
        activity: String(a?.activity ?? 'actividad'),
        duration: Number.isFinite(a?.duration) ? clamp(Math.trunc(a.duration), 5, 180) : 30,
        description: String(a?.description ?? '').trim() || undefined,
      })),
      naps: naps.map((n: any) => ({
        time: ensureTime(n?.time, '14:00'),
        duration: Number.isFinite(n?.duration) ? clamp(Math.trunc(n.duration), 20, 180) : 90,
        description: String(n?.description ?? '').trim() || undefined,
      })),
    },
    objectives:
      Array.isArray(obj.objectives) && obj.objectives.length
        ? obj.objectives.map((item: any) => String(item))
        : ['Establecer una rutina de sueño consistente.'],
    recommendations:
      Array.isArray(obj.recommendations) && obj.recommendations.length
        ? obj.recommendations.map((item: any) => String(item))
        : [
            'Implementar una rutina relajante 20–30 minutos antes de dormir.',
            'Evitar pantallas al menos 60 minutos antes de acostarse.',
          ],
  }
}
