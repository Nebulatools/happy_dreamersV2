/**
 * Middleware de validación y procesamiento para API Routes
 * Proporciona validación, sanitización y transformación de datos
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ApiErrorV2, ApiErrorType, checkRateLimitV2 } from "./api-utils-v2"
import { createLogger } from "./logger"

const logger = createLogger("api-middleware")

// ============================================
// TIPOS
// ============================================

export interface MiddlewareOptions {
  rateLimitConfig?: {
    enabled: boolean
    limit?: number
    windowMs?: number
    identifier?: (req: NextRequest) => string
  }
  validateBody?: z.ZodSchema
  validateQuery?: z.ZodSchema
  validateParams?: z.ZodSchema
  sanitizeHtml?: boolean
  maxBodySize?: number
  allowedMethods?: string[]
  requireAuth?: boolean
  requireRoles?: string[]
  customValidators?: Array<(req: NextRequest) => Promise<void> | void>
}

// ============================================
// SANITIZACIÓN
// ============================================

/**
 * Sanitiza strings HTML para prevenir XSS
 * Versión simple sin dependencias externas
 */
function sanitizeHtmlString(str: string): string {
  // Escapar caracteres HTML peligrosos
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
}

/**
 * Sanitiza recursivamente objetos
 */
function sanitizeObject(obj: any): any {
  if (typeof obj === "string") {
    return sanitizeHtmlString(obj)
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject)
  }
  
  if (obj && typeof obj === "object") {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value)
    }
    return sanitized
  }
  
  return obj
}

// ============================================
// VALIDADORES
// ============================================

/**
 * Valida el método HTTP
 */
async function validateMethod(
  request: NextRequest, 
  allowedMethods: string[]
): Promise<void> {
  if (!allowedMethods.includes(request.method)) {
    throw new ApiErrorV2(
      ApiErrorType.BAD_REQUEST,
      `Método ${request.method} no permitido. Métodos permitidos: ${allowedMethods.join(", ")}`,
      { allowedMethods, receivedMethod: request.method }
    )
  }
}

/**
 * Valida el tamaño del body
 */
async function validateBodySize(
  request: NextRequest,
  maxSize: number
): Promise<void> {
  const contentLength = request.headers.get("content-length")
  
  if (contentLength && parseInt(contentLength) > maxSize) {
    throw new ApiErrorV2(
      ApiErrorType.PAYLOAD_TOO_LARGE,
      `El tamaño del request excede el límite de ${maxSize} bytes`,
      { maxSize, receivedSize: parseInt(contentLength) }
    )
  }
}

/**
 * Valida y parsea el body con schema Zod
 */
async function validateBody(
  request: NextRequest,
  schema: z.ZodSchema,
  sanitize: boolean
): Promise<any> {
  try {
    const body = await request.json()
    const dataToValidate = sanitize ? sanitizeObject(body) : body
    return schema.parse(dataToValidate)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]
      throw new ApiErrorV2(
        ApiErrorType.VALIDATION_ERROR,
        `Error en campo ${firstError.path.join(".")}: ${firstError.message}`,
        { errors: error.format() },
        firstError.path.join(".")
      )
    }
    throw new ApiErrorV2(
      ApiErrorType.BAD_REQUEST,
      "El body del request es inválido"
    )
  }
}

/**
 * Valida query parameters
 */
function validateQuery(
  request: NextRequest,
  schema: z.ZodSchema
): any {
  const { searchParams } = new URL(request.url)
  const params = Object.fromEntries(searchParams.entries())
  
  try {
    return schema.parse(params)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]
      throw new ApiErrorV2(
        ApiErrorType.VALIDATION_ERROR,
        `Parámetro de query inválido ${firstError.path.join(".")}: ${firstError.message}`,
        { errors: error.format() }
      )
    }
    throw error
  }
}

// ============================================
// MIDDLEWARE PRINCIPAL
// ============================================

/**
 * Crea un middleware con las opciones especificadas
 */
export function createApiMiddleware(options: MiddlewareOptions = {}) {
  return async function middleware(
    request: NextRequest,
    context?: any
  ): Promise<{
    body?: any
    query?: any
    params?: any
    session?: any
  }> {
    const result: any = {}
    
    try {
      // 1. Validar método HTTP
      if (options.allowedMethods) {
        await validateMethod(request, options.allowedMethods)
      }
      
      // 2. Rate limiting
      if (options.rateLimitConfig?.enabled) {
        const identifier = options.rateLimitConfig.identifier
          ? options.rateLimitConfig.identifier(request)
          : request.headers.get("x-forwarded-for") || "anonymous"
          
        await checkRateLimitV2(
          identifier,
          options.rateLimitConfig.limit,
          options.rateLimitConfig.windowMs
        )
      }
      
      // 3. Validar tamaño del body
      if (options.maxBodySize && request.method !== "GET") {
        await validateBodySize(request, options.maxBodySize)
      }
      
      // 4. Validar y parsear body
      if (options.validateBody && request.method !== "GET") {
        result.body = await validateBody(
          request,
          options.validateBody,
          options.sanitizeHtml || false
        )
      }
      
      // 5. Validar query parameters
      if (options.validateQuery) {
        result.query = validateQuery(request, options.validateQuery)
      }
      
      // 6. Validar route parameters
      if (options.validateParams && context?.params) {
        try {
          result.params = options.validateParams.parse(context.params)
        } catch (error) {
          if (error instanceof z.ZodError) {
            const firstError = error.errors[0]
            throw new ApiErrorV2(
              ApiErrorType.VALIDATION_ERROR,
              `Parámetro de ruta inválido: ${firstError.message}`,
              { errors: error.format() }
            )
          }
          throw error
        }
      }
      
      // 7. Validadores personalizados
      if (options.customValidators) {
        for (const validator of options.customValidators) {
          await validator(request)
        }
      }
      
      // 8. Log de validación exitosa
      logger.debug("Request validation successful", {
        method: request.method,
        url: request.url,
        hasBody: !!result.body,
        hasQuery: !!result.query,
        hasParams: !!result.params,
      })
      
      return result
      
    } catch (error) {
      // Re-lanzar el error para que sea manejado por el error handler
      throw error
    }
  }
}

// ============================================
// MIDDLEWARES PRE-CONFIGURADOS
// ============================================

/**
 * Middleware para endpoints GET estándar
 */
export const getMiddleware = createApiMiddleware({
  allowedMethods: ["GET"],
  rateLimitConfig: {
    enabled: true,
    limit: 100,
    windowMs: 60000,
  },
})

/**
 * Middleware para endpoints POST estándar
 */
export const postMiddleware = (bodySchema: z.ZodSchema) => 
  createApiMiddleware({
    allowedMethods: ["POST"],
    validateBody: bodySchema,
    sanitizeHtml: true,
    maxBodySize: 1024 * 1024, // 1MB
    rateLimitConfig: {
      enabled: true,
      limit: 50,
      windowMs: 60000,
    },
  })

/**
 * Middleware para endpoints PUT/PATCH estándar
 */
export const updateMiddleware = (bodySchema: z.ZodSchema) =>
  createApiMiddleware({
    allowedMethods: ["PUT", "PATCH"],
    validateBody: bodySchema,
    sanitizeHtml: true,
    maxBodySize: 1024 * 1024, // 1MB
    rateLimitConfig: {
      enabled: true,
      limit: 50,
      windowMs: 60000,
    },
  })

/**
 * Middleware para endpoints DELETE estándar
 */
export const deleteMiddleware = createApiMiddleware({
  allowedMethods: ["DELETE"],
  rateLimitConfig: {
    enabled: true,
    limit: 30,
    windowMs: 60000,
  },
})

// ============================================
// SCHEMAS DE VALIDACIÓN COMUNES
// ============================================

export const schemas = {
  // Esquema para IDs de MongoDB
  mongoId: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID inválido"),
  }),
  
  // Esquema para paginación
  pagination: z.object({
    page: z.coerce.number().min(1).default(1),
    pageSize: z.coerce.number().min(1).max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  }),
  
  // Esquema para filtros de fecha
  dateFilter: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
  
  // Esquema para búsqueda
  search: z.object({
    q: z.string().min(1).max(100).optional(),
    fields: z.array(z.string()).optional(),
  }),
}

// ============================================
// UTILIDADES HELPER
// ============================================

/**
 * Combina múltiples middlewares
 */
export function combineMiddlewares(
  ...middlewares: Array<ReturnType<typeof createApiMiddleware>>
) {
  return async function combinedMiddleware(
    request: NextRequest,
    context?: any
  ) {
    const results: any = {}
    
    for (const middleware of middlewares) {
      const result = await middleware(request, context)
      Object.assign(results, result)
    }
    
    return results
  }
}

/**
 * Crea un validador personalizado
 */
export function createCustomValidator(
  name: string,
  validator: (req: NextRequest) => Promise<void> | void
) {
  return async function namedValidator(req: NextRequest) {
    logger.debug(`Running custom validator: ${name}`)
    await validator(req)
  }
}