// Calculo del estado de sueño actual de un niño a partir de sus eventos reales.
// Fuente unica usada por /api/children/[id]/current-sleep-state y /api/v1.

import { Db, ObjectId } from "mongodb"
import { differenceInMinutes } from "date-fns"
import { getTimePartsInTimezone, DEFAULT_TIMEZONE } from "@/lib/datetime"

export type SleepStatus = "awake" | "sleeping" | "napping" | "night_waking"

export interface SleepStateResponse {
  status: SleepStatus
  lastEventTime: string | null
  lastEventType: string | null
  lastEventId: string | null
  duration: number | null // minutos desde el último evento
}

export async function computeCurrentSleepState(
  db: Db,
  childId: string,
  opts: { now?: Date; timezone?: string } = {}
): Promise<SleepStateResponse> {
  const now = opts.now || new Date()
  const userTimeZone = opts.timezone || DEFAULT_TIMEZONE

  const activePlan = await db.collection("child_plans").findOne(
    { childId: new ObjectId(childId), status: "active" },
    { projection: { schedule: 1 } }
  )
  const schedule = activePlan?.schedule || { bedtime: "20:00", wakeTime: "07:00" }

  const queryStart = new Date(now.getTime())
  queryStart.setHours(queryStart.getHours() - 48)

  const recentEvents = await db
    .collection("events")
    .find({ childId: new ObjectId(childId), createdAt: { $gte: queryStart.toISOString() } })
    .sort({ createdAt: -1 })
    .limit(10)
    .toArray()

  const openSleepEvent = recentEvents.find(
    (e: any) => (e.eventType === "sleep" || e.eventType === "nap") && !e.endTime
  )
  const openNightWaking = recentEvents.find(
    (e: any) => e.eventType === "night_waking" && !e.endTime
  )
  const lastEvent = recentEvents[0]

  let currentStatus: SleepStatus = "awake"
  let lastEventTime: string | null = null
  let lastEventType: string | null = null
  let lastEventId: string | null = null
  let duration: number | null = null

  if (openNightWaking) {
    const eventTime = new Date(openNightWaking.startTime || openNightWaking.createdAt)
    duration = differenceInMinutes(now, eventTime)
    currentStatus = "night_waking"
    lastEventTime = openNightWaking.startTime || openNightWaking.createdAt
    lastEventType = openNightWaking.eventType
    lastEventId = openNightWaking._id.toString()
  } else if (openSleepEvent) {
    const eventTime = new Date(openSleepEvent.startTime || openSleepEvent.createdAt)
    duration = differenceInMinutes(now, eventTime)
    // El estado depende directamente del eventType
    void getTimePartsInTimezone(now, userTimeZone) // mantiene compatibilidad de contexto temporal
    currentStatus = openSleepEvent.eventType === "nap" ? "napping" : "sleeping"
    lastEventTime = openSleepEvent.startTime || openSleepEvent.createdAt
    lastEventType = openSleepEvent.eventType
    lastEventId = openSleepEvent._id.toString()
  } else if (lastEvent) {
    const eventTime = new Date(lastEvent.endTime || lastEvent.createdAt)
    duration = differenceInMinutes(now, eventTime)
    if (lastEvent.eventType === "night_waking" && !lastEvent.endTime) {
      currentStatus = "night_waking"
    } else if (lastEvent.eventType === "wake" || lastEvent.endTime) {
      currentStatus = "awake"
    }
    lastEventTime = lastEvent.endTime || lastEvent.createdAt
    lastEventType = lastEvent.eventType
    lastEventId = lastEvent._id.toString()
  }

  return { status: currentStatus, lastEventTime, lastEventType, lastEventId, duration }
}
