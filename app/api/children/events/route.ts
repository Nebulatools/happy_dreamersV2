// API para gestionar eventos de niños
// Permite registrar eventos para un niño específico

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

import { createLogger } from "@/lib/logger"

const logger = createLogger("API:children:events:route")


// POST /api/children/events - registrar un nuevo evento para un niño
export async function POST(req: NextRequest) {
  try {
    // Verificar la sesión del usuario
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      logger.error("No hay sesión de usuario activa")
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener datos del cuerpo de la solicitud
    const data = await req.json()
    logger.info("Datos recibidos:", data)

    // Validar que se proporcionen los campos requeridos
    if (!data.childId || !data.eventType) {
      logger.error("Faltan campos requeridos", { data })
      return NextResponse.json(
        { error: "Se requieren childId y eventType" },
        { status: 400 }
      )
    }

    // Conectar a la base de datos
    const { db } = await connectToDatabase()
    logger.info("Conectado a MongoDB")

    // Verificar si el usuario es administrador
    const isAdmin = session.user.role === "admin"
    
    // Verificar que el niño exista y pertenezca al usuario (o sea admin)
    const query = isAdmin 
      ? { _id: new ObjectId(data.childId) }
      : { _id: new ObjectId(data.childId), parentId: session.user.id }
    
    const child = await db.collection("children").findOne(query)

    if (!child) {
      logger.error("Niño no encontrado o no tienes permiso")
      return NextResponse.json(
        { error: "Niño no encontrado o no tienes permiso para registrar eventos" },
        { status: 404 }
      )
    }

    // Validación específica para actividades extra
    if (data.eventType === "extra_activities" && (!data.description || data.description.length < 10)) {
      logger.error("Descripción requerida para actividades extra")
      return NextResponse.json(
        { error: "La descripción es requerida para actividades extra (mínimo 10 caracteres)" },
        { status: 400 }
      )
    }

    // Crear el objeto de evento con ID único
    const event: any = {
      _id: new ObjectId().toString(), // Generar un ID único para el evento
      childId: data.childId,
      eventType: data.eventType,
      emotionalState: data.emotionalState || "neutral",
      notes: data.notes || "",
      description: data.description || null, // Campo para actividades extra
      duration: data.duration || null,
      sleepDelay: data.sleepDelay || null,
      createdAt: new Date().toISOString(),
    }
    
    // Solo agregar startTime si está presente
    if (data.startTime) {
      event.startTime = data.startTime
    }
    
    // Solo agregar endTime si está presente
    if (data.endTime) {
      event.endTime = data.endTime
    }

    logger.info("Evento a registrar:", event)

    // Actualizar el documento del niño para agregar el evento
    // Usamos Object.assign para resolver el error de tipo con $push
    const result = await db.collection("children").updateOne(
      { _id: new ObjectId(data.childId) },
      { $push: { events: event } as any }
    )

    logger.info("Resultado de la operación:", result)

    if (result.modifiedCount === 0) {
      logger.error("No se pudo registrar el evento")
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
    logger.error("Error al registrar evento:", error.message, error.stack)
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
      logger.error("No hay sesión de usuario activa")
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
    
    // Verificar si el usuario es administrador
    const isAdmin = session.user.role === "admin"
    logger.info(`Usuario: ${session.user.id}, Es admin: ${isAdmin}, Solicitando niño: ${childId}`)

    // Buscar el niño
    // Para admins, permitir acceso a cualquier niño sin verificar el parentId
    const query = isAdmin 
      ? { _id: new ObjectId(childId) }
      : { _id: new ObjectId(childId), parentId: session.user.id }
      
    logger.info("Query para buscar niño:", JSON.stringify(query))
    
    const child = await db.collection("children").findOne(query)

    if (!child) {
      logger.info(`Niño con ID ${childId} no encontrado o no accesible para usuario ${session.user.id}`)
      return NextResponse.json(
        { error: "Niño no encontrado o no tienes permiso para ver sus eventos" },
        { status: 404 }
      )
    }

    logger.info(`Niño encontrado: ${child.firstName} ${child.lastName}, devolviendo eventos`)
    
    // Devolver los detalles del niño, incluyendo sus eventos
    return NextResponse.json({
      _id: child._id,
      firstName: child.firstName,
      lastName: child.lastName,
      events: child.events || [],
    })
  } catch (error: any) {
    logger.error("Error al obtener eventos:", error.message)
    return NextResponse.json(
      { error: "Error al obtener los eventos", details: error.message },
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
      logger.error("No hay sesión de usuario activa")
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener datos del cuerpo de la solicitud
    const data = await req.json()
    logger.info("Datos recibidos para actualización:", data)

    // Validar que se proporcionen los campos requeridos
    if (!data.id || !data.childId || !data.eventType) {
      logger.error("Faltan campos requeridos", { data })
      return NextResponse.json(
        { error: "Se requieren id, childId y eventType" },
        { status: 400 }
      )
    }

    // Conectar a la base de datos
    const { db } = await connectToDatabase()
    logger.info("Conectado a MongoDB")

    // Verificar si el usuario es administrador
    const isAdmin = session.user.role === "admin"
    
    // Verificar que el niño exista y pertenezca al usuario (o sea admin)
    const query = isAdmin 
      ? { _id: new ObjectId(data.childId) }
      : { _id: new ObjectId(data.childId), parentId: session.user.id }
    
    const child = await db.collection("children").findOne(query)

    if (!child) {
      logger.error("Niño no encontrado o no tienes permiso")
      return NextResponse.json(
        { error: "Niño no encontrado o no tienes permiso para actualizar eventos" },
        { status: 404 }
      )
    }

    // Crear el objeto de evento actualizado
    const updatedEvent = {
      _id: data.id,
      childId: data.childId,
      eventType: data.eventType,
      emotionalState: data.emotionalState || "neutral",
      startTime: data.startTime,
      endTime: data.endTime || null,
      notes: data.notes || "",
      createdAt: data.createdAt || new Date().toISOString(),
    }

    logger.info("Evento a actualizar:", updatedEvent)

    // Actualizar el evento específico en el array de eventos del niño
    const result = await db.collection("children").updateOne(
      { 
        _id: new ObjectId(data.childId),
        "events._id": data.id,
      },
      { $set: { "events.$": updatedEvent } }
    )

    logger.info("Resultado de la actualización:", result)

    if (result.matchedCount === 0) {
      logger.error("Evento no encontrado")
      return NextResponse.json(
        { error: "Evento no encontrado" },
        { status: 404 }
      )
    }

    if (result.modifiedCount === 0) {
      logger.error("No se realizaron cambios en el evento")
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
    logger.error("Error al actualizar evento:", error.message, error.stack)
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
      logger.error("No hay sesión de usuario activa")
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener el ID del evento de los parámetros de consulta
    const searchParams = req.nextUrl.searchParams
    const eventId = searchParams.get("id")
    const childId = searchParams.get("childId")

    if (!eventId) {
      return NextResponse.json(
        { error: "Se requiere el ID del evento" },
        { status: 400 }
      )
    }
    
    if (!childId) {
      return NextResponse.json(
        { error: "Se requiere el ID del niño" },
        { status: 400 }
      )
    }

    // Conectar a la base de datos
    const { db } = await connectToDatabase()
    logger.info("Conectado a MongoDB")
    
    // Verificar si el usuario es administrador
    const isAdmin = session.user.role === "admin"
    
    // Verificar que el niño exista y pertenezca al usuario (o sea admin)
    const query = isAdmin 
      ? { _id: new ObjectId(childId) }
      : { _id: new ObjectId(childId), parentId: session.user.id }
    
    const child = await db.collection("children").findOne(query)
    
    if (!child) {
      logger.error("Niño no encontrado o no tienes permiso")
      return NextResponse.json(
        { error: "Niño no encontrado o no tienes permiso para eliminar eventos" },
        { status: 404 }
      )
    }

    // Encontrar y eliminar el evento del array de eventos del niño
    const result = await db.collection("children").updateOne(
      { _id: new ObjectId(childId) },
      { $pull: { events: { _id: eventId } } as any }
    )

    logger.info("Resultado de la eliminación:", result)

    if (result.matchedCount === 0) {
      logger.error("Niño no encontrado")
      return NextResponse.json(
        { error: "Niño no encontrado" },
        { status: 404 }
      )
    }

    if (result.modifiedCount === 0) {
      logger.error("No se pudo eliminar el evento o no existe")
      return NextResponse.json(
        { error: "No se pudo eliminar el evento o no existe" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { message: "Evento eliminado exitosamente" },
      { status: 200 }
    )
  } catch (error: any) {
    logger.error("Error al eliminar evento:", error.message, error.stack)
    return NextResponse.json(
      { error: "Error al eliminar el evento" },
      { status: 500 }
    )
  }
} 