// API para gestionar niños
// Permite crear, leer, actualizar y eliminar niños

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { createLogger } from "@/lib/logger"

const logger = createLogger("API:Children")

// GET /api/children - obtener todos los niños del usuario autenticado
// GET /api/children?id=123 - obtener un niño específico
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      logger.error("No hay sesión o usuario autorizado")
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const requestedUserId = searchParams.get("userId") // Para admins que quieren ver niños de otro usuario
    
    const client = await clientPromise
    const db = client.db()
    
    const isAdmin = session.user.role === "admin"
    logger.info("API Request", { userId: session.user.id, isAdmin, requestedUserId })

    // Si se proporciona un ID, obtener solo ese niño
    if (id) {
      logger.debug("Buscando niño", { childId: id })
      
      // Para admins, permitir ver cualquier niño
      const query = isAdmin 
        ? { _id: new ObjectId(id) }
        : { _id: new ObjectId(id), parentId: session.user.id }
        
      const child = await db.collection("children").findOne(query)

      if (!child) {
        logger.warn("Niño no encontrado o sin permisos", { childId: id, userId: session.user.id })
        return NextResponse.json({ error: "Niño no encontrado o no tienes permiso para verlo" }, { status: 404 })
      }

      logger.debug("Niño encontrado", { childId: id })
      
      // Asegurar que no se cachea la respuesta
      const response = NextResponse.json(child)
      response.headers.set("Cache-Control", "no-store, max-age=0")
      return response
    }
    
    // Si es admin y solicita los niños de un usuario específico
    if (isAdmin && requestedUserId) {
      logger.info("Admin solicitando niños de usuario", { requestedUserId, adminId: session.user.id })
      const children = await db.collection("children")
        .find({ parentId: requestedUserId })
        .toArray()
      
      logger.info("Niños encontrados", { count: children.length, userId: requestedUserId })
      
      // Asegurar que no se cachea la respuesta
      const response = NextResponse.json(children)
      response.headers.set("Cache-Control", "no-store, max-age=0")
      return response
    }

    // Obtener todos los niños del usuario actual
    logger.debug("Obteniendo niños del usuario", { userId: session.user.id })
    const children = await db.collection("children")
      .find({ parentId: session.user.id })
      .toArray()

    logger.info("Niños encontrados", { count: children.length, userId: session.user.id })
    
    // Asegurar que no se cachea la respuesta
    const response = NextResponse.json(children)
    response.headers.set("Cache-Control", "no-store, max-age=0")
    return response
  } catch (error) {
    logger.error("Error al obtener niños", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// POST /api/children - crear un nuevo niño con datos básicos y encuesta completa
export async function POST(request: NextRequest) {
  logger.info("POST /api/children - Iniciando solicitud")
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      logger.error("No hay sesión o usuario autorizado")
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const data = await request.json()
    logger.debug("Datos básicos recibidos", {
      firstName: data.firstName,
      lastName: data.lastName,
      birthDate: data.birthDate,
      parentId: session.user.id,
      hasSurveyData: !!data.surveyData,
    })
    
    // Validar datos básicos de forma individual (solo nombre y apellido obligatorios para pruebas)
    const missingFields = []
    if (!data.firstName) missingFields.push("firstName")
    if (!data.lastName) missingFields.push("lastName")
    
    if (missingFields.length > 0) {
      logger.error("Faltan campos requeridos", { missingFields })
      return NextResponse.json({ 
        error: "Faltan datos básicos requeridos",
        missingFields: missingFields,
      }, { status: 400 })
    }

    logger.debug("Conectando a MongoDB...")
    const client = await clientPromise
    const db = client.db()
    logger.debug("Conexión a MongoDB establecida")

    // Crear documento completo con datos básicos y encuesta
    const newChild = {
      firstName: data.firstName,
      lastName: data.lastName,
      birthDate: data.birthDate || "",
      parentId: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      // Incluir los datos de la encuesta si están presentes
      ...(data.surveyData && { surveyData: data.surveyData }),
    }

    logger.debug("Insertando nuevo documento en la colección 'children'")
    const result = await db.collection("children").insertOne(newChild)
    logger.info("Documento insertado con éxito", { childId: result.insertedId })

    // Ahora actualizamos el usuario (padre) con el ID del niño
    logger.debug("Actualizando usuario con el ID del niño", { userId })
    const userId = session.user.id
    
    // Actualizamos el usuario usando $addToSet para evitar duplicados
    // Usamos casting a any para evitar errores de TypeScript con los operadores de MongoDB
    const updateUserResult = await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: { updatedAt: new Date() },
        $addToSet: { children: result.insertedId } as any,
      }
    )
    
    logger.debug("Usuario actualizado", { updated: updateUserResult.modifiedCount > 0 })

    return NextResponse.json({
      message: "Niño registrado correctamente y vinculado al usuario",
      id: result.insertedId,
      userUpdated: updateUserResult.modifiedCount > 0,
    }, { status: 201 })
  } catch (error) {
    logger.error("Error al registrar niño", error)
    return NextResponse.json({ 
      error: "Error interno del servidor",
      message: error.message, 
    }, { status: 500 })
  }
}

// PUT /api/children/:id - actualizar un niño existente
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const data = await request.json()
    if (!data.id) {
      return NextResponse.json({ error: "Se requiere el ID del niño" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db()

    // Verificar que el niño pertenece al usuario
    const child = await db.collection("children").findOne({
      _id: new ObjectId(data.id),
      parentId: session.user.id,
    })

    if (!child) {
      return NextResponse.json({ error: "Niño no encontrado o no tienes permiso para editarlo" }, { status: 404 })
    }

    // Actualizar el niño (datos básicos, encuesta o ambos)
    const { id, ...updateData } = data

    // Añadir fecha de actualización
    updateData.updatedAt = new Date()
    
    const result = await db.collection("children").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "No se encontró el niño para actualizar" }, { status: 404 })
    }

    return NextResponse.json({ 
      message: "Información del niño actualizada correctamente",
      updated: result.modifiedCount > 0,
    })
  } catch (error) {
    logger.error("Error al actualizar niño", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// DELETE /api/children/:id - eliminar un niño
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Se requiere el ID del niño" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db()

    // Verificar que el niño pertenece al usuario
    const child = await db.collection("children").findOne({
      _id: new ObjectId(id),
      parentId: session.user.id,
    })

    if (!child) {
      return NextResponse.json({ error: "Niño no encontrado o no tienes permiso para eliminarlo" }, { status: 404 })
    }

    // Eliminar el niño
    const result = await db.collection("children").deleteOne({ _id: new ObjectId(id) })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "No se pudo eliminar el niño" }, { status: 500 })
    }

    return NextResponse.json({ message: "Niño eliminado correctamente" })
  } catch (error) {
    logger.error("Error al eliminar niño", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
