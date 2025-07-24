// API para gestionar eventos
// Permite crear, leer, actualizar y eliminar eventos

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"

import { createLogger } from "@/lib/logger"

const logger = createLogger("API:events:route")


// GET: Obtener eventos
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const childId = searchParams.get("childId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    // Conectar a la base de datos
    const { db } = await connectToDatabase()

    // Construir la consulta
    const query: any = {}

    // Si es un usuario con rol "parent", solo puede ver sus propios hijos
    if (session.user.role === "parent") {
      query.parentId = session.user.id
    }

    // Si se especifica un ID de niño
    if (childId) {
      query.childId = childId
    }

    // Si se especifica un rango de fechas
    if (startDate && endDate) {
      query.startTime = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      }
    }

    // Obtener los eventos
    const events = await db.collection("events").find(query).sort({ startTime: -1 }).toArray()

    return NextResponse.json(events)
  } catch (error) {
    logger.error("Error al obtener eventos:", error)
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 })
  }
}

// POST: Crear un nuevo evento
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 })
    }

    const data = await req.json()

    // Validar los datos
    if (!data.childId || !data.eventType || !data.startTime) {
      return NextResponse.json({ message: "Faltan datos requeridos" }, { status: 400 })
    }

    // Conectar a la base de datos
    const { db } = await connectToDatabase()

    // Crear el evento
    const result = await db.collection("events").insertOne({
      ...data,
      parentId: session.user.id,
      createdAt: new Date(),
    })

    return NextResponse.json(
      {
        message: "Evento creado correctamente",
        eventId: result.insertedId,
      },
      { status: 201 },
    )
  } catch (error) {
    logger.error("Error al crear evento:", error)
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 })
  }
}

// PUT: Actualizar un evento existente
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 })
    }

    const data = await req.json()

    // Validar los datos
    if (!data.id) {
      return NextResponse.json({ message: "Falta el ID del evento" }, { status: 400 })
    }

    // Conectar a la base de datos
    const { db } = await connectToDatabase()

    // Verificar que el evento pertenece al usuario o es admin
    const event = await db.collection("events").findOne({ _id: data.id })

    if (!event) {
      return NextResponse.json({ message: "Evento no encontrado" }, { status: 404 })
    }

    if (event.parentId !== session.user.id && session.user.role !== "admin") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 })
    }

    // Actualizar el evento
    const { id, ...updateData } = data
    await db.collection("events").updateOne(
      { _id: id },
      {
        $set: {
          ...updateData,
          updatedAt: new Date(),
        },
      },
    )

    return NextResponse.json({ message: "Evento actualizado correctamente" })
  } catch (error) {
    logger.error("Error al actualizar evento:", error)
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 })
  }
}

// DELETE: Eliminar un evento
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ message: "Falta el ID del evento" }, { status: 400 })
    }

    // Conectar a la base de datos
    const { db } = await connectToDatabase()

    // Verificar que el evento pertenece al usuario o es admin
    const event = await db.collection("events").findOne({ _id: id })

    if (!event) {
      return NextResponse.json({ message: "Evento no encontrado" }, { status: 404 })
    }

    if (event.parentId !== session.user.id && session.user.role !== "admin") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 })
    }

    // Eliminar el evento
    await db.collection("events").deleteOne({ _id: id })

    return NextResponse.json({ message: "Evento eliminado correctamente" })
  } catch (error) {
    logger.error("Error al eliminar evento:", error)
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 })
  }
}
