// Endpoint para obtener el estado actual de sueño basado en eventos reales.
// La logica vive en lib/events/sleep-state.ts (compartida con /api/v1).

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { resolveChildAccess, ChildAccessError } from "@/lib/api/child-access"
import { DEFAULT_TIMEZONE } from "@/lib/datetime"
import { computeCurrentSleepState } from "@/lib/events/sleep-state"

export type { SleepStatus } from "@/lib/events/sleep-state"

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

    try {
      await resolveChildAccess(db, session.user, childId, "canViewEvents")
    } catch (error) {
      if (error instanceof ChildAccessError) {
        return NextResponse.json({ error: error.message }, { status: error.status })
      }
      throw error
    }

    const userTimeZone = session.user.timezone || DEFAULT_TIMEZONE

    // En desarrollo, permitir tiempo simulado via header X-Dev-Time
    const devTimeHeader = req.headers.get("X-Dev-Time")
    const now =
      process.env.NODE_ENV === "development" && devTimeHeader
        ? new Date(devTimeHeader)
        : new Date()

    const response = await computeCurrentSleepState(db, childId, { now, timezone: userTimeZone })
    return NextResponse.json(response)
  } catch (error) {
    console.error("Error obteniendo estado de sueño:", error)
    return NextResponse.json({ error: "Error al obtener el estado" }, { status: 500 })
  }
}
