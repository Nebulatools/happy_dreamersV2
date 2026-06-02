// API para gestionar eventos de niños (autenticada por sesion NextAuth)
// La logica nucleo vive en lib/events/event-service.ts (fuente unica de verdad),
// compartida con la API publica /api/v1/events.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import * as Sentry from "@sentry/nextjs"
import { createLogger } from "@/lib/logger"
import { ChildAccessError } from "@/lib/api/child-access"
import {
  createEvent,
  listEvents,
  updateEvent,
  patchEvent,
  deleteEvent,
  EventServiceError,
} from "@/lib/events/event-service"

const logger = createLogger("API:children:events:route")

/**
 * Mapea errores conocidos del servicio a una respuesta JSON con el status correcto.
 * Devuelve null si el error no es manejable aqui (debe re-lanzarse).
 */
function mapServiceError(error: unknown): NextResponse | null {
  if (error instanceof ChildAccessError || error instanceof EventServiceError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  return null
}

// POST /api/children/events - registrar un nuevo evento para un niño
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const data = await req.json()
    const { db } = await connectToDatabase()
    const event = await createEvent(db, session.user, data)

    return NextResponse.json(
      { message: "Evento registrado exitosamente", event },
      { status: 201 }
    )
  } catch (error: any) {
    const mapped = mapServiceError(error)
    if (mapped) return mapped
    logger.error("Error al registrar evento:", { message: error.message, stack: error.stack })
    Sentry.captureException(error)
    return NextResponse.json({ error: "Error al registrar el evento" }, { status: 500 })
  }
}

// GET /api/children/events?childId=xxx - obtener eventos de un niño específico
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const childId = req.nextUrl.searchParams.get("childId")
    if (!childId) {
      return NextResponse.json({ error: "Se requiere el ID del niño" }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const { child, events } = await listEvents(db, session.user, childId)

    return NextResponse.json({
      _id: child._id,
      firstName: child.firstName,
      lastName: child.lastName,
      events,
    })
  } catch (error: any) {
    const mapped = mapServiceError(error)
    if (mapped) return mapped
    logger.error("Error al obtener eventos:", error.message)
    Sentry.captureException(error)
    return NextResponse.json(
      { error: "Error al obtener los eventos", details: error.message },
      { status: 500 }
    )
  }
}

// PUT - Actualizar un evento existente (reemplazo completo)
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const data = await req.json()
    const { db } = await connectToDatabase()
    const updatedEvent = await updateEvent(db, session.user, data)

    return NextResponse.json(
      { message: "Evento actualizado exitosamente", event: updatedEvent },
      { status: 200 }
    )
  } catch (error: any) {
    const mapped = mapServiceError(error)
    if (mapped) return mapped
    logger.error("Error al actualizar evento:", { message: error.message, stack: error.stack })
    Sentry.captureException(error)
    return NextResponse.json({ error: "Error al actualizar el evento" }, { status: 500 })
  }
}

// PATCH - Actualizar parcialmente un evento (usado para añadir endTime)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const data = await req.json()
    const { db } = await connectToDatabase()
    await patchEvent(db, session.user, data)

    return NextResponse.json({ message: "Evento actualizado exitosamente" }, { status: 200 })
  } catch (error: any) {
    const mapped = mapServiceError(error)
    if (mapped) return mapped
    logger.error("Error al actualizar evento:", error.message)
    Sentry.captureException(error)
    return NextResponse.json({ error: "Error al actualizar el evento" }, { status: 500 })
  }
}

// DELETE - Eliminar un evento existente
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const eventId = searchParams.get("id")
    const childId = searchParams.get("childId")

    const { db } = await connectToDatabase()
    await deleteEvent(db, session.user, eventId || "", childId || "")

    return NextResponse.json({ message: "Evento eliminado exitosamente" }, { status: 200 })
  } catch (error: any) {
    const mapped = mapServiceError(error)
    if (mapped) return mapped
    logger.error("Error al eliminar evento:", { message: error.message, stack: error.stack })
    Sentry.captureException(error)
    return NextResponse.json({ error: "Error al eliminar el evento" }, { status: 500 })
  }
}
