// Helpers de formato/etiquetas para el asistente flotante (espejo del _hd.ts de Yose).

import { getTimePartsInTimezone, getTimezoneOffset, DEFAULT_TIMEZONE } from "@/lib/datetime"

/** Formatea un offset en minutos a "+HH:mm" / "-HH:mm". */
function formatOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? "+" : "-"
  const abs = Math.abs(offsetMinutes)
  const hh = String(Math.floor(abs / 60)).padStart(2, "0")
  const mm = String(abs % 60).padStart(2, "0")
  return `${sign}${hh}:${mm}`
}

/**
 * Construye un timestamp ISO con el offset CORRECTO de la timezone del usuario,
 * a partir de una fecha (YYYY-MM-DD) y hora (HH:mm) de pared. Server-safe:
 * NO depende de la timezone del servidor (a diferencia de buildLocalDate).
 */
export function isoFromWallClock(dateStr: string, timeStr: string, timezone?: string): string {
  const tz = timezone || DEFAULT_TIMEZONE
  const [hRaw = "0", mRaw = "0"] = (timeStr || "").split(":")
  const hh = String(parseInt(hRaw, 10) || 0).padStart(2, "0")
  const mm = String(parseInt(mRaw, 10) || 0).padStart(2, "0")
  const date = (dateStr || "").trim()
  // Instante de referencia (la hora de pared como si fuera UTC) para obtener el offset de la tz.
  const ref = new Date(`${date}T${hh}:${mm}:00.000Z`)
  const offsetStr = formatOffset(getTimezoneOffset(ref, tz))
  return `${date}T${hh}:${mm}:00.000${offsetStr}`
}

export const EVENT_LABELS: Record<string, string> = {
  sleep: "sueño nocturno",
  nap: "siesta",
  wake: "despertar matutino",
  night_waking: "despertar nocturno",
  feeding: "alimentación",
  medication: "medicamento",
  extra_activities: "actividad",
  note: "nota",
}

export function labelES(eventType?: string): string {
  return (eventType && EVENT_LABELS[eventType]) || eventType || "evento"
}

export const EMOTIONAL_STATES = ["tranquilo", "inquieto", "alterado", "neutral"] as const
export const FEEDING_TYPES = ["breast", "bottle", "solids"] as const
export const BABY_STATES = ["awake", "asleep"] as const

/** Limita un número a [min,max]; devuelve undefined si no es número. */
export function clampNum(v: unknown, min: number, max: number): number | undefined {
  if (typeof v !== "number" || Number.isNaN(v)) return undefined
  return Math.min(Math.max(v, min), max)
}

/** Fecha/hora actual en la timezone del usuario, para que el LLM resuelva "anoche", "ayer", etc. */
export function nowContext(timezone?: string): { dateStr: string; timeStr: string; pretty: string } {
  const tz = timezone || DEFAULT_TIMEZONE
  const p = getTimePartsInTimezone(new Date(), tz)
  const pad = (n: number) => String(n).padStart(2, "0")
  const dateStr = `${p.year}-${pad(p.month)}-${pad(p.day)}`
  const timeStr = `${pad(p.hours)}:${pad(p.minutes)}`
  return { dateStr, timeStr, pretty: `${dateStr} ${timeStr} (${tz})` }
}

/** Formatea una hora ISO a "8:30 p.m." en es-MX dentro de la timezone. */
export function timeES(iso?: string | null, timezone?: string): string {
  if (!iso) return ""
  try {
    return new Intl.DateTimeFormat("es-MX", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: timezone || DEFAULT_TIMEZONE,
    }).format(new Date(iso))
  } catch {
    return ""
  }
}

export function rangeES(start?: string | null, end?: string | null, timezone?: string): string {
  const a = timeES(start, timezone)
  const b = timeES(end, timezone)
  if (a && b) return `${a}–${b}`
  return a || b || ""
}
