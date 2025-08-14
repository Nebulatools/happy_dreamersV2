// Endpoint para obtener el estado actual de sueño basado en eventos reales
// Determina si el niño está dormido, despierto, en siesta, etc.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { differenceInMinutes } from "date-fns"

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { db } = await connectToDatabase()
    const { id: childId } = await params

    // Verificar permisos
    const child = await db.collection("children").findOne({
      _id: new ObjectId(childId),
      $or: [
        { parentId: session.user.id },
        { parentId: new ObjectId(session.user.id) }
      ]
    })

    if (!child && session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

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

    // Obtener los eventos del niño desde el documento del niño
    const childDoc = await db.collection("children").findOne(
      { _id: new ObjectId(childId) },
      { projection: { events: 1 } }
    )
    
    // Obtener los últimos eventos del día
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()
    
    // Filtrar y ordenar eventos del día
    const recentEvents = (childDoc?.events || [])
      .filter((e: any) => e.createdAt >= todayISO)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)

    // Buscar el último evento sin endTime (evento abierto)
    const openEvent = recentEvents.find(e => 
      (e.eventType === 'sleep' || e.eventType === 'nap') && !e.endTime
    )

    // Buscar el último evento de cualquier tipo
    const lastEvent = recentEvents[0]

    // Determinar el estado actual
    let currentStatus: SleepStatus = 'awake'
    let lastEventTime = null
    let lastEventType = null
    let lastEventId = null
    let duration = null

    if (openEvent) {
      // Hay un evento de sueño abierto
      const now = new Date()
      const eventTime = new Date(openEvent.startTime || openEvent.createdAt)
      duration = differenceInMinutes(now, eventTime)
      
      // Determinar si es siesta o sueño nocturno basado en el plan
      const currentHour = now.getHours()
      const bedtimeHour = parseInt(schedule.bedtime.split(':')[0])
      const wakeTimeHour = parseInt(schedule.wakeTime.split(':')[0])
      
      // Es horario nocturno si estamos después de bedtime o antes de wakeTime
      const isNightTime = currentHour >= bedtimeHour || currentHour < wakeTimeHour
      
      currentStatus = openEvent.eventType === 'nap' ? 'napping' : 
                     isNightTime ? 'sleeping' : 'napping'
      
      lastEventTime = openEvent.startTime || openEvent.createdAt
      lastEventType = openEvent.eventType
      lastEventId = openEvent._id
      
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
      lastEventId = lastEvent._id
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