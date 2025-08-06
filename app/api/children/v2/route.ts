/**
 * Ejemplo de API endpoint migrado al sistema v2
 * Endpoint: /api/children/v2
 * 
 * Demuestra el uso del nuevo sistema de respuestas estandarizadas
 */

import { NextRequest } from "next/server"
import { z } from "zod"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { createLogger } from "@/lib/logger"
import {
  withErrorHandlerV2,
  createSuccessResponseV2,
  requireAuthV2,
  ApiErrorV2,
  ApiErrorType,
  validateMongoIdV2,
  parsePaginationParams,
  createPaginationMeta,
  commonSchemas,
} from "@/lib/api-utils-v2"
import {
  createApiMiddleware,
  postMiddleware,
  schemas,
} from "@/lib/api-middleware"
import { calculateAge } from "@/lib/date-utils"
import type { Child } from "@/types/models"

const logger = createLogger("API:Children:V2")

// ============================================
// SCHEMAS DE VALIDACIÓN
// ============================================

// Schema para crear un niño
const createChildSchema = z.object({
  firstName: z.string().min(1, "El nombre es requerido").max(50),
  lastName: z.string().min(1, "El apellido es requerido").max(50),
  birthDate: z.string().refine((date) => {
    const d = new Date(date)
    return d instanceof Date && !isNaN(d.getTime()) && d < new Date()
  }, "Fecha de nacimiento inválida"),
  gender: z.enum(["male", "female", "other"]).optional(),
  notes: z.string().max(500).optional(),
})

// Schema para query params del GET
const getChildrenQuerySchema = schemas.pagination.extend({
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  search: z.string().max(100).optional(),
  minAge: z.coerce.number().min(0).optional(),
  maxAge: z.coerce.number().max(18).optional(),
})

// ============================================
// MIDDLEWARE CONFIGURADO
// ============================================

const getMiddleware = createApiMiddleware({
  allowedMethods: ["GET"],
  validateQuery: getChildrenQuerySchema,
  rateLimitConfig: {
    enabled: true,
    limit: 100,
    windowMs: 60000,
  },
})

const postMiddlewareConfig = postMiddleware(createChildSchema)

// ============================================
// HANDLERS
// ============================================

/**
 * GET /api/children/v2 - Obtener niños con paginación y filtros
 */
export const GET = withErrorHandlerV2(async (request: NextRequest) => {
  const startTime = Date.now()
  
  // 1. Validar request y autenticación
  const { query } = await getMiddleware(request)
  const session = await requireAuthV2()
  
  const isAdmin = session.user.role === "admin"
  const { page, pageSize, skip, userId, search, minAge, maxAge } = query
  
  logger.info("Fetching children", { 
    userId: session.user.id, 
    isAdmin, 
    filters: { userId, search, minAge, maxAge },
    pagination: { page, pageSize }
  })
  
  // 2. Conectar a base de datos
  const client = await clientPromise
  const db = client.db()
  
  // 3. Construir query
  const targetUserId = isAdmin && userId ? userId : session.user.id
  const baseQuery: any = { parentId: targetUserId }
  
  // Agregar filtros de búsqueda
  if (search) {
    baseQuery.$or = [
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } },
    ]
  }
  
  // 4. Ejecutar queries en paralelo
  const [children, totalCount] = await Promise.all([
    db.collection("children")
      .find(baseQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .toArray(),
    db.collection("children").countDocuments(baseQuery)
  ])
  
  // 5. Procesar resultados
  const processedChildren = children.map(child => {
    const age = calculateAge(child.birthDate)
    
    // Aplicar filtros de edad post-query
    if (minAge !== undefined && age < minAge) return null
    if (maxAge !== undefined && age > maxAge) return null
    
    return {
      id: child._id.toString(),
      firstName: child.firstName,
      lastName: child.lastName,
      birthDate: child.birthDate,
      age,
      gender: child.gender,
      avatar: child.avatar,
      notes: child.notes,
      parentId: child.parentId,
      surveyCompleted: !!child.surveyData,
      createdAt: child.createdAt,
      updatedAt: child.updatedAt,
    }
  }).filter(Boolean)
  
  // 6. Crear metadata de paginación
  const paginationMeta = createPaginationMeta(page, pageSize, totalCount)
  
  // 7. Log de éxito
  logger.info("Children fetched successfully", {
    count: processedChildren.length,
    totalCount,
    processingTime: Date.now() - startTime,
  })
  
  // 8. Retornar respuesta estandarizada
  return createSuccessResponseV2(
    processedChildren,
    "Niños obtenidos exitosamente",
    paginationMeta,
    Date.now() - startTime
  )
})

/**
 * POST /api/children/v2 - Crear un nuevo niño
 */
export const POST = withErrorHandlerV2(async (request: NextRequest) => {
  const startTime = Date.now()
  
  // 1. Validar request y autenticación
  const { body } = await postMiddlewareConfig(request)
  const session = await requireAuthV2()
  
  logger.info("Creating new child", { 
    userId: session.user.id,
    childData: { ...body, birthDate: "[REDACTED]" }
  })
  
  // 2. Validaciones de negocio
  const birthDate = new Date(body.birthDate)
  const age = calculateAge(body.birthDate)
  
  if (age > 18) {
    throw new ApiErrorV2(
      ApiErrorType.BUSINESS_RULE_VIOLATION,
      "La edad del niño no puede ser mayor a 18 años",
      { age }
    )
  }
  
  // 3. Conectar a base de datos
  const client = await clientPromise
  const db = client.db()
  
  // 4. Verificar duplicados
  const existingChild = await db.collection("children").findOne({
    parentId: session.user.id,
    firstName: body.firstName,
    lastName: body.lastName,
    birthDate: body.birthDate,
  })
  
  if (existingChild) {
    throw new ApiErrorV2(
      ApiErrorType.ALREADY_EXISTS,
      "Ya existe un niño con estos datos",
      { 
        firstName: body.firstName,
        lastName: body.lastName,
      }
    )
  }
  
  // 5. Crear el niño
  const newChild: Partial<Child> = {
    ...body,
    parentId: session.user.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    avatar: null,
    surveyData: null,
  }
  
  const result = await db.collection("children").insertOne(newChild as any)
  
  if (!result.insertedId) {
    throw new ApiErrorV2(
      ApiErrorType.DATABASE_ERROR,
      "No se pudo crear el niño"
    )
  }
  
  // 6. Actualizar el usuario para agregar el ID del niño
  await db.collection("users").updateOne(
    { _id: new ObjectId(session.user.id) },
    { $push: { children: result.insertedId } }
  )
  
  // 7. Obtener el documento creado
  const createdChild = await db.collection("children").findOne({
    _id: result.insertedId
  })
  
  if (!createdChild) {
    throw new ApiErrorV2(
      ApiErrorType.INTERNAL_ERROR,
      "Error al recuperar el niño creado"
    )
  }
  
  // 8. Preparar respuesta
  const responseData = {
    id: createdChild._id.toString(),
    firstName: createdChild.firstName,
    lastName: createdChild.lastName,
    birthDate: createdChild.birthDate,
    age: calculateAge(createdChild.birthDate),
    gender: createdChild.gender,
    notes: createdChild.notes,
    parentId: createdChild.parentId,
    createdAt: createdChild.createdAt,
    updatedAt: createdChild.updatedAt,
  }
  
  logger.info("Child created successfully", {
    childId: responseData.id,
    processingTime: Date.now() - startTime,
  })
  
  // 9. Retornar respuesta estandarizada
  return createSuccessResponseV2(
    responseData,
    "Niño creado exitosamente",
    undefined,
    Date.now() - startTime
  )
})

/**
 * Ejemplo de endpoint con múltiples validaciones y middlewares personalizados
 */
export const PATCH = withErrorHandlerV2(async (request: NextRequest) => {
  // Ejemplo de middleware personalizado con múltiples validaciones
  const middleware = createApiMiddleware({
    allowedMethods: ["PATCH"],
    validateBody: z.object({
      firstName: z.string().min(1).max(50).optional(),
      lastName: z.string().min(1).max(50).optional(),
      notes: z.string().max(500).optional(),
      gender: z.enum(["male", "female", "other"]).optional(),
    }).refine(data => Object.keys(data).length > 0, {
      message: "Debes proporcionar al menos un campo para actualizar"
    }),
    validateQuery: z.object({
      childId: commonSchemas.mongoId,
    }),
    sanitizeHtml: true,
    maxBodySize: 512 * 1024, // 512KB
    customValidators: [
      // Validador personalizado para verificar permisos especiales
      async (req) => {
        const { searchParams } = new URL(req.url)
        const childId = searchParams.get("childId")
        
        if (childId && childId.startsWith("000")) {
          throw new ApiErrorV2(
            ApiErrorType.FORBIDDEN,
            "No se pueden editar niños del sistema"
          )
        }
      }
    ],
    rateLimitConfig: {
      enabled: true,
      limit: 30,
      windowMs: 60000,
    },
  })
  
  const { body, query } = await middleware(request)
  const session = await requireAuthV2()
  
  // ... resto de la lógica de actualización ...
  
  return createSuccessResponseV2(
    { updated: true },
    "Niño actualizado exitosamente"
  )
})