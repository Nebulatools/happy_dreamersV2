import { differenceInMinutes, parseISO } from "date-fns"

export function getNightSleepDurationsHours(events: any[]): number[] {
  if (!events || events.length === 0) return []
  const sorted = [...events]
    .filter(e => e.startTime && e.eventType)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

  const durations: number[] = []

  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i]
    if (!["sleep", "bedtime", "dormir"].includes(e.eventType)) continue
    const start = parseISO(e.startTime)
    const hour = start.getHours()
    // Nocturno solo
    if (!(hour >= 18 || hour <= 6)) continue

    // Buscar siguiente wake en <= 18h
    let wake: Date | null = null
    for (let j = i + 1; j < sorted.length; j++) {
      const n = sorted[j]
      const t = parseISO(n.startTime)
      const diff = t.getTime() - start.getTime()
      if (diff > 18 * 60 * 60 * 1000) break
      if (n.eventType === "wake") { wake = t; break }
      if (["sleep", "bedtime", "dormir"].includes(n.eventType)) {
        const nh = t.getHours()
        if (nh >= 18 || nh <= 6) break
      }
    }

    let minutes: number | null = null
    if (wake) {
      const rawDelay = typeof e.sleepDelay === "number" ? e.sleepDelay : 0
      const delay = Math.min(Math.max(rawDelay, 0), 180)
      const actualStart = new Date(start.getTime() + delay * 60 * 1000)
      minutes = differenceInMinutes(wake, actualStart)
      if (minutes < 0) minutes += 24 * 60
    }

    if (!wake) {
      // fallback reciente: asumir 8h menos delay
      const rawDelay = typeof e.sleepDelay === "number" ? e.sleepDelay : 0
      const delay = Math.min(Math.max(rawDelay, 0), 180)
      minutes = 8 * 60 - delay
    }

    if (minutes && minutes >= 120 && minutes <= 960) {
      durations.push(minutes / 60)
    }
  }
  return durations
}

export function getNocturnalBedtimes(events: any[]): Date[] {
  return (events || [])
    .filter(e => e.startTime && ["sleep", "bedtime", "dormir"].includes(e.eventType))
    .map(e => parseISO(e.startTime))
    .filter(d => d.getHours() >= 18 || d.getHours() <= 6)
}

export function getInferredWakeTimes(events: any[]): Date[] {
  if (!events || events.length === 0) return []
  const sorted = [...events]
    .filter(e => e.startTime)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  const wakes: Date[] = []
  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i]
    if (!["sleep", "bedtime", "dormir"].includes(e.eventType)) continue
    if (e.endTime) {
      wakes.push(parseISO(e.endTime))
      continue
    }
    for (let j = i + 1; j < sorted.length; j++) {
      const n = sorted[j]
      if (n.eventType === "wake") { wakes.push(parseISO(n.startTime)); break }
      if (["sleep", "bedtime", "dormir"].includes(n.eventType)) break
    }
  }
  return wakes
}

export function toNocturnalMinutesWithWrap(dates: Date[]): number[] {
  return dates.map(d => {
    let m = d.getHours() * 60 + d.getMinutes()
    if (m < 6 * 60) m += 24 * 60 // madrugadas a 24–30h
    return m
  })
}

