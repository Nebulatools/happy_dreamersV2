// API para gestionar niños
// Permite crear, leer, actualizar y eliminar niños

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { createLogger } from "@/lib/logger"
import { 
  withErrorHandler, 
  requireAuth, 
  createSuccessResponse, 
  createErrorResponse,
  ApiErrorType,
  ApiError,
  validateMongoId,
  getRequestData
} from "@/lib/api-utils"
import { calculateAge } from "@/lib/date-utils"
import type { Child } from "@/types/models"
import { checkUserAccess, getAccessibleChildren } from "@/lib/db/user-child-access"

const logger = createLogger("API:Children")

const serializeChild = (child: Child | any) => {
  const surveyData = child?.surveyData
    ? {
        ...child.surveyData,
        completed:
          child.surveyData.completed ??
          (!!child.surveyData.completedAt && child.surveyData.isPartial !== true),
        lastUpdated: child.surveyData.lastUpdated ?? (child.surveyUpdatedAt || child.updatedAt || child.createdAt),
      }
    : undefined

  return {
    ...child,
    _id: child?._id?.toString?.() ?? child?._id,
    parentId: child?.parentId?.toString?.() ?? child?.parentId,
    ...(surveyData && { surveyData }),
  }
}

// GET /api/children - obtener todos los niños del usuario autenticado
// GET /api/children?id=123 - obtener un niño específico
export const GET = withErrorHandler(async (request: NextRequest) => {
  const session = await requireAuth()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  const requestedUserId = searchParams.get("userId") // Para admins que quieren ver niños de otro usuario

  const { db } = await connectToDatabase()
  
  const isAdmin = session.user.role === "admin"
  logger.info("API Request", { userId: session.user.id, isAdmin, requestedUserId })

  // Si se proporciona un ID, obtener solo ese niño
  if (id) {
    if (!validateMongoId(id)) {
      throw new ApiError(ApiErrorType.BAD_REQUEST, "ID de niño inválido", 400)
    }
    
    logger.debug("Buscando niño", { childId: id })
    
    if (!isAdmin) {
      const accessResult = await checkUserAccess(session.user.id, id)
      if (!accessResult.hasAccess) {
        logger.warn("Acceso denegado al niño para usuario", { childId: id, userId: session.user.id })
        throw new ApiError(ApiErrorType.NOT_FOUND, "Niño no encontrado o no tienes permiso para verlo", 404)
      }
    }

    const child = await db.collection<Child>("children").findOne({ _id: new ObjectId(id) })

    if (!child) {
      logger.warn("Niño no encontrado o sin permisos", { childId: id, userId: session.user.id })
      throw new ApiError(ApiErrorType.NOT_FOUND, "Niño no encontrado o no tienes permiso para verlo", 404)
    }

    // Serializar datos correctamente (incluye flags de survey)
    const childData = serializeChild(child)
    
    // Asegurar que no se cachea la respuesta
    const response = createSuccessResponse(childData)
    response.headers.set("Cache-Control", "no-store, max-age=0")
    return response
  }
    
  // Si es admin y solicita los niños de un usuario específico
  if (isAdmin && requestedUserId) {
    logger.info("Admin solicitando niños de usuario", { requestedUserId, adminId: session.user.id })
    const children = await db.collection<Child>("children")
      .find({ parentId: new ObjectId(requestedUserId) })
      .toArray()
    
    logger.info("Niños encontrados", { count: children.length, userId: requestedUserId })
    
    const response = createSuccessResponse({ children: children.map(serializeChild), success: true })
    response.headers.set("Cache-Control", "no-store, max-age=0")
    return response
  }

  // Para usuarios normales, incluir niños propios y compartidos
  if (!isAdmin) {
    logger.debug("Obteniendo niños accesibles para usuario", { userId: session.user.id })
    const accessibleChildren = await getAccessibleChildren(session.user.id)
    logger.info("Niños accesibles encontrados", { count: accessibleChildren.length, userId: session.user.id })

    const serialized = accessibleChildren.map(serializeChild)

    const response = createSuccessResponse({ children: serialized, success: true })
    response.headers.set("Cache-Control", "no-store, max-age=0")
    return response
  }

  // Para admins sin filtro, devolver todos los niños
  const children = await db.collection<Child>("children")
    .find({})
    .toArray()

  logger.info("Admin obtuvo todos los niños", { count: children.length })

  const response = createSuccessResponse({ children: children.map(serializeChild), success: true })
  response.headers.set("Cache-Control", "no-store, max-age=0")
  return response
})

// POST /api/children - crear un nuevo niño con datos básicos y encuesta completa
export const POST = withErrorHandler(async (request: NextRequest) => {
  logger.info("POST /api/children - Iniciando solicitud")
  const session = await requireAuth()

  const data = await getRequestData<Partial<Child> & { surveyData?: any }>(request)
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
    throw new ApiError(
      ApiErrorType.VALIDATION_ERROR,
      "Faltan datos básicos requeridos",
      400
    )
  }

  logger.debug("Conectando a MongoDB...")
  const { db } = await connectToDatabase()
  logger.debug("Conexión a MongoDB establecida")

  // Crear documento completo con datos básicos y encuesta
  const newChild: Omit<Child, '_id'> = {
    firstName: data.firstName!,
    lastName: data.lastName!,
    birthDate: data.birthDate || "",
    parentId: new ObjectId(session.user.id),
    createdAt: new Date(),
    updatedAt: new Date(),
    // Incluir los datos de la encuesta si están presentes
    ...(data.surveyData && { surveyData: data.surveyData }),
  }

    logger.debug("Insertando nuevo documento en la colección 'children'")
    const result = await db.collection("children").insertOne(newChild)
    logger.info("Documento insertado con éxito", { childId: result.insertedId })

    // Ahora actualizamos el usuario (padre) con el ID del niño
    const userId = session.user.id
    logger.debug("Actualizando usuario con el ID del niño", { userId })
    
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
})

// PUT /api/children/:id - actualizar un niño existente
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const session = await requireAuth()
  const data = await getRequestData<Partial<Child> & { id: string }>(request)
  
  if (!data.id) {
    throw new ApiError(ApiErrorType.BAD_REQUEST, "Se requiere el ID del niño", 400)
  }
  
  if (!validateMongoId(data.id)) {
    throw new ApiError(ApiErrorType.BAD_REQUEST, "ID de niño inválido", 400)
  }

  const { db } = await connectToDatabase()

  // Verificar que el niño pertenece al usuario
  const child = await db.collection<Child>("children").findOne({
    _id: new ObjectId(data.id),
    parentId: new ObjectId(session.user.id),
  })

  if (!child) {
    throw new ApiError(
      ApiErrorType.NOT_FOUND,
      "Niño no encontrado o no tienes permiso para editarlo",
      404
    )
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
    throw new ApiError(
      ApiErrorType.NOT_FOUND,
      "No se encontró el niño para actualizar",
      404
    )
  }

  return createSuccessResponse({
    message: "Información del niño actualizada correctamente",
    updated: result.modifiedCount > 0,
  })
})

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

    const { db } = await connectToDatabase()

    // Verificar que el niño pertenece al usuario
    const child = await db.collection("children").findOne({
      _id: new ObjectId(id),
      parentId: new ObjectId(session.user.id),
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
