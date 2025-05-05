// API para gestionar eventos de niños
// Permite registrar eventos para un niño específico

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

// POST /api/children/events - registrar un nuevo evento para un niño
export async function POST(req: NextRequest) {
  try {
    // Verificar la sesión del usuario
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      console.error("No hay sesión de usuario activa")
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener datos del cuerpo de la solicitud
    const data = await req.json()
    console.log("Datos recibidos:", data)

    // Validar que se proporcionen los campos requeridos
    if (!data.childId || !data.eventType) {
      console.error("Faltan campos requeridos", { data })
      return NextResponse.json(
        { error: "Se requieren childId y eventType" },
        { status: 400 }
      )
    }

    // Conectar a la base de datos
    const { db } = await connectToDatabase()
    console.log("Conectado a MongoDB")

    // Verificar que el niño exista y pertenezca al usuario
    const child = await db.collection("children").findOne({
      _id: new ObjectId(data.childId),
      parentId: session.user.id
    })

    if (!child) {
      console.error("Niño no encontrado o no pertenece al usuario")
      return NextResponse.json(
        { error: "Niño no encontrado o no pertenece al usuario" },
        { status: 404 }
      )
    }

    // Crear el objeto de evento con ID único
    const event = {
      _id: new ObjectId().toString(), // Generar un ID único para el evento
      eventType: data.eventType,
      emotionalState: data.emotionalState || "neutral",
      startTime: data.startTime,
      endTime: data.endTime || null,
      notes: data.notes || "",
      createdAt: new Date().toISOString()
    }

    console.log("Evento a registrar:", event)

    // Actualizar el documento del niño para agregar el evento
    // Usamos Object.assign para resolver el error de tipo con $push
    const result = await db.collection("children").updateOne(
      { _id: new ObjectId(data.childId) },
      { $push: { events: event } as any }
    )

    console.log("Resultado de la operación:", result)

    if (result.modifiedCount === 0) {
      console.error("No se pudo registrar el evento")
      return NextResponse.json(
        { error: "No se pudo registrar el evento" },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: "Evento registrado exitosamente", event },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Error al registrar evento:", error.message, error.stack)
    return NextResponse.json(
      { error: "Error al registrar el evento" },
      { status: 500 }
    )
  }
}

// GET /api/children/events?childId=xxx - obtener eventos de un niño específico
export async function GET(req: NextRequest) {
  try {
    // Verificar la sesión del usuario
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      console.error("No hay sesión de usuario activa")
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener el ID del niño de los parámetros de consulta
    const searchParams = req.nextUrl.searchParams
    const childId = searchParams.get("childId")

    if (!childId) {
      return NextResponse.json(
        { error: "Se requiere el ID del niño" },
        { status: 400 }
      )
    }

    // Conectar a la base de datos
    const { db } = await connectToDatabase()

    // Buscar el niño y verificar que pertenezca al usuario
    const child = await db.collection("children").findOne({
      _id: new ObjectId(childId),
      parentId: session.user.id
    })

    if (!child) {
      return NextResponse.json(
        { error: "Niño no encontrado o no pertenece al usuario" },
        { status: 404 }
      )
    }

    // Devolver los detalles del niño, incluyendo sus eventos
    return NextResponse.json({
      _id: child._id,
      firstName: child.firstName,
      lastName: child.lastName,
      events: child.events || []
    })
  } catch (error: any) {
    console.error("Error al obtener eventos:", error.message)
    return NextResponse.json(
      { error: "Error al obtener los eventos" },
      { status: 500 }
    )
  }
}

// PUT - Actualizar un evento existente
export async function PUT(req: NextRequest) {
  try {
    // Verificar la sesión del usuario
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      console.error("No hay sesión de usuario activa")
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener datos del cuerpo de la solicitud
    const data = await req.json()
    console.log("Datos recibidos para actualización:", data)

    // Validar que se proporcionen los campos requeridos
    if (!data.id || !data.childId || !data.eventType) {
      console.error("Faltan campos requeridos", { data })
      return NextResponse.json(
        { error: "Se requieren id, childId y eventType" },
        { status: 400 }
      )
    }

    // Conectar a la base de datos
    const { db } = await connectToDatabase()
    console.log("Conectado a MongoDB")

    // Verificar que el niño exista y pertenezca al usuario
    const child = await db.collection("children").findOne({
      _id: new ObjectId(data.childId),
      parentId: session.user.id
    })

    if (!child) {
      console.error("Niño no encontrado o no pertenece al usuario")
      return NextResponse.json(
        { error: "Niño no encontrado o no pertenece al usuario" },
        { status: 404 }
      )
    }

    // Crear el objeto de evento actualizado
    const updatedEvent = {
      _id: data.id,
      eventType: data.eventType,
      emotionalState: data.emotionalState || "neutral",
      startTime: data.startTime,
      endTime: data.endTime || null,
      notes: data.notes || "",
      createdAt: data.createdAt || new Date().toISOString()
    }

    console.log("Evento a actualizar:", updatedEvent)

    // Actualizar el evento específico en el array de eventos del niño
    const result = await db.collection("children").updateOne(
      { 
        _id: new ObjectId(data.childId),
        "events._id": data.id
      },
      { $set: { "events.$": updatedEvent } }
    )

    console.log("Resultado de la actualización:", result)

    if (result.matchedCount === 0) {
      console.error("Evento no encontrado")
      return NextResponse.json(
        { error: "Evento no encontrado" },
        { status: 404 }
      )
    }

    if (result.modifiedCount === 0) {
      console.error("No se realizaron cambios en el evento")
      return NextResponse.json(
        { message: "No se realizaron cambios en el evento" },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { message: "Evento actualizado exitosamente", event: updatedEvent },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error al actualizar evento:", error.message, error.stack)
    return NextResponse.json(
      { error: "Error al actualizar el evento" },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar un evento existente
export async function DELETE(req: NextRequest) {
  try {
    // Verificar la sesión del usuario
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      console.error("No hay sesión de usuario activa")
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener el ID del evento de los parámetros de consulta
    const searchParams = req.nextUrl.searchParams
    const eventId = searchParams.get("id")

    if (!eventId) {
      return NextResponse.json(
        { error: "Se requiere el ID del evento" },
        { status: 400 }
      )
    }

    // Conectar a la base de datos
    const { db } = await connectToDatabase()
    console.log("Conectado a MongoDB")

    // Encontrar y eliminar el evento del array de eventos del niño
    const result = await db.collection("children").updateOne(
      { 
        parentId: session.user.id,
        "events._id": eventId 
      },
      { $pull: { events: { _id: eventId } } as any }
    )

    console.log("Resultado de la eliminación:", result)

    if (result.matchedCount === 0) {
      console.error("Evento no encontrado o no pertenece al usuario")
      return NextResponse.json(
        { error: "Evento no encontrado o no pertenece al usuario" },
        { status: 404 }
      )
    }

    if (result.modifiedCount === 0) {
      console.error("No se pudo eliminar el evento")
      return NextResponse.json(
        { error: "No se pudo eliminar el evento" },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: "Evento eliminado exitosamente" },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error al eliminar evento:", error.message, error.stack)
    return NextResponse.json(
      { error: "Error al eliminar el evento" },
      { status: 500 }
    )
  }
} 