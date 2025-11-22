// Endpoint para obtener el estado actual de sueño basado en eventos reales
// Determina si el niño está dormido, despierto, en siesta, etc.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { differenceInMinutes } from "date-fns"
import { resolveChildAccess, ChildAccessError } from "@/lib/api/child-access"
import { getTimePartsInTimeZone, startOfDayUTCForTZ } from "@/lib/timezone"

export type SleepStatus = 'awake' | 'sleeping' | 'napping' | 'night_waking'

interface SleepStateResponse {
  status: SleepStatus
  lastEventTime: string | null
  lastEventType: string | null
  lastEventId: string | null
  duration: number | null // minutos desde el último evento
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { db } = await connectToDatabase()
    const { id: childId } = params

    try {
      await resolveChildAccess(db, session.user, childId, "canViewEvents")
    } catch (error) {
      if (error instanceof ChildAccessError) {
        return NextResponse.json({ error: error.message }, { status: error.status })
      }
      throw error
    }

    // Obtener timezone del usuario
    const userDoc = await db.collection("users").findOne(
      { _id: new ObjectId(session.user.id) },
      { projection: { timezone: 1 } }
    )
    const userTimeZone = userDoc?.timezone || "America/Monterrey"

    // Obtener el plan activo para contexto temporal
    const activePlan = await db.collection("child_plans").findOne(
      { 
        childId: new ObjectId(childId),
        status: "active"
      },
      { 
        projection: { 
          schedule: 1 
        } 
      }
    )

    const schedule = activePlan?.schedule || {
      bedtime: "20:00",
      wakeTime: "07:00"
    }

    // Obtener los eventos del niño desde la colección 'events' (fuente de verdad)
    const startOfToday = startOfDayUTCForTZ(new Date(), userTimeZone)

    // Obtener los últimos eventos del día desde la colección 'events'
    const recentEvents = await db.collection("events")
      .find({
        childId: new ObjectId(childId),
        createdAt: { $gte: startOfToday.toISOString() }
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray()

    // Buscar el último evento sin endTime (evento abierto)
    const openSleepEvent = recentEvents.find(e => 
      (e.eventType === 'sleep' || e.eventType === 'nap') && !e.endTime
    )
    
    // Buscar despertar nocturno abierto
    const openNightWaking = recentEvents.find(e => 
      e.eventType === 'night_waking' && !e.endTime
    )

    // Buscar el último evento de cualquier tipo
    const lastEvent = recentEvents[0]

    // Determinar el estado actual
    let currentStatus: SleepStatus = 'awake'
    let lastEventTime = null
    let lastEventType = null
    let lastEventId = null
    let duration = null

    if (openNightWaking) {
      // Hay un despertar nocturno activo
      const now = new Date()
      const eventTime = new Date(openNightWaking.startTime || openNightWaking.createdAt)
      duration = differenceInMinutes(now, eventTime)
      
      currentStatus = 'night_waking'
      lastEventTime = openNightWaking.startTime || openNightWaking.createdAt
      lastEventType = openNightWaking.eventType
      lastEventId = openNightWaking._id.toString()
      
    } else if (openSleepEvent) {
      // Hay un evento de sueño abierto
      const now = new Date()
      const eventTime = new Date(openSleepEvent.startTime || openSleepEvent.createdAt)
      duration = differenceInMinutes(now, eventTime)
      
      // SOLUCIÓN: Si el evento es 'sleep', SIEMPRE es 'sleeping'
      // Si el evento es 'nap', SIEMPRE es 'napping'
      const parts = getTimePartsInTimeZone(now, userTimeZone)
      const currentHour = parts.hours
      const bedtimeHour = parseInt(schedule.bedtime.split(':')[0])
      const wakeTimeHour = parseInt(schedule.wakeTime.split(':')[0])
      
      // Es horario nocturno si estamos después de bedtime o antes de wakeTime
      const isNightTime = currentHour >= bedtimeHour || currentHour < wakeTimeHour
      
      console.log('[DEBUG current-sleep-state]', {
        eventType: openSleepEvent.eventType,
        currentHour,
        bedtimeHour,
        wakeTimeHour,
        isNightTime
      })
      
      // CORRECCIÓN: Usar directamente el eventType
      currentStatus = openSleepEvent.eventType === 'nap' ? 'napping' : 'sleeping'

      lastEventTime = openSleepEvent.startTime || openSleepEvent.createdAt
      lastEventType = openSleepEvent.eventType
      lastEventId = openSleepEvent._id.toString()
      
    } else if (lastEvent) {
      // No hay evento abierto, usar el último evento
      const now = new Date()
      const eventTime = new Date(lastEvent.endTime || lastEvent.createdAt)
      duration = differenceInMinutes(now, eventTime)
      
      if (lastEvent.eventType === 'night_waking' && !lastEvent.endTime) {
        currentStatus = 'night_waking'
      } else if (lastEvent.eventType === 'wake' || lastEvent.endTime) {
        currentStatus = 'awake'
      }

      lastEventTime = lastEvent.endTime || lastEvent.createdAt
      lastEventType = lastEvent.eventType
      lastEventId = lastEvent._id.toString()
    }

    const response: SleepStateResponse = {
      status: currentStatus,
      lastEventTime,
      lastEventType,
      lastEventId,
      duration
    }

    return NextResponse.json(response)
    
  } catch (error) {
    console.error("Error obteniendo estado de sueño:", error)
    return NextResponse.json(
      { error: "Error al obtener el estado" },
      { status: 500 }
    )
  }
}
