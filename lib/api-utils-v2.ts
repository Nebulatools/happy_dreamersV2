/**
 * Sistema mejorado de utilidades API v2 para Happy Dreamers
 * Incluye mejoras de Phase 3: estandarización, validación y métricas
 */

import { NextResponse, NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createLogger } from "@/lib/logger"
import { z } from "zod"

const logger = createLogger("api-utils-v2")

// ============================================
// TIPOS Y INTERFACES
// ============================================

/**
 * Respuesta API estándar con metadata completa
 */
export interface ApiResponseV2<T = any> {
  success: boolean
  data?: T
  error?: ApiErrorDetails
  message?: string
  meta: {
    timestamp: string
    version: string
    requestId: string
    processingTime?: number
  }
  pagination?: PaginationMeta
}

/**
 * Detalles de error estructurados
 */
export interface ApiErrorDetails {
  code: string
  message: string
  type: ApiErrorType
  details?: Record<string, any>
  field?: string // Para errores de validación específicos de campo
  stack?: string // Solo en desarrollo
}

/**
 * Metadata de paginación
 */
export interface PaginationMeta {
  page: number
  pageSize: number
  totalPages: number
  totalItems: number
  hasNext: boolean
  hasPrev: boolean
}

/**
 * Tipos de error extendidos
 */
export enum ApiErrorType {
  // Errores de autenticación
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  SESSION_EXPIRED = "SESSION_EXPIRED",
  
  // Errores de recursos
  NOT_FOUND = "NOT_FOUND",
  ALREADY_EXISTS = "ALREADY_EXISTS",
  
  // Errores de validación
  BAD_REQUEST = "BAD_REQUEST",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  MISSING_FIELD = "MISSING_FIELD",
  INVALID_FORMAT = "INVALID_FORMAT",
  
  // Errores de servidor
  INTERNAL_ERROR = "INTERNAL_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
  
  // Errores de límites
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  PAYLOAD_TOO_LARGE = "PAYLOAD_TOO_LARGE",
  
  // Errores de negocio
  BUSINESS_RULE_VIOLATION = "BUSINESS_RULE_VIOLATION",
  INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",
}

/**
 * Códigos de error para cada tipo
 */
export const ERROR_CODES: Record<ApiErrorType, string> = {
  [ApiErrorType.UNAUTHORIZED]: "ERR_AUTH_001",
  [ApiErrorType.FORBIDDEN]: "ERR_AUTH_002",
  [ApiErrorType.SESSION_EXPIRED]: "ERR_AUTH_003",
  [ApiErrorType.NOT_FOUND]: "ERR_RES_001",
  [ApiErrorType.ALREADY_EXISTS]: "ERR_RES_002",
  [ApiErrorType.BAD_REQUEST]: "ERR_VAL_001",
  [ApiErrorType.VALIDATION_ERROR]: "ERR_VAL_002",
  [ApiErrorType.MISSING_FIELD]: "ERR_VAL_003",
  [ApiErrorType.INVALID_FORMAT]: "ERR_VAL_004",
  [ApiErrorType.INTERNAL_ERROR]: "ERR_SRV_001",
  [ApiErrorType.DATABASE_ERROR]: "ERR_SRV_002",
  [ApiErrorType.EXTERNAL_SERVICE_ERROR]: "ERR_SRV_003",
  [ApiErrorType.RATE_LIMIT_EXCEEDED]: "ERR_LIM_001",
  [ApiErrorType.PAYLOAD_TOO_LARGE]: "ERR_LIM_002",
  [ApiErrorType.BUSINESS_RULE_VIOLATION]: "ERR_BUS_001",
  [ApiErrorType.INSUFFICIENT_PERMISSIONS]: "ERR_BUS_002",
}

/**
 * Mensajes de error en español
 */
const ERROR_MESSAGES: Record<ApiErrorType, string> = {
  [ApiErrorType.UNAUTHORIZED]: "No autorizado. Por favor, inicia sesión.",
  [ApiErrorType.FORBIDDEN]: "No tienes permisos para realizar esta acción.",
  [ApiErrorType.SESSION_EXPIRED]: "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.",
  [ApiErrorType.NOT_FOUND]: "El recurso solicitado no fue encontrado.",
  [ApiErrorType.ALREADY_EXISTS]: "El recurso ya existe.",
  [ApiErrorType.BAD_REQUEST]: "Solicitud inválida.",
  [ApiErrorType.VALIDATION_ERROR]: "Error de validación en los datos proporcionados.",
  [ApiErrorType.MISSING_FIELD]: "Falta un campo requerido.",
  [ApiErrorType.INVALID_FORMAT]: "Formato de datos inválido.",
  [ApiErrorType.INTERNAL_ERROR]: "Error interno del servidor. Por favor, intenta más tarde.",
  [ApiErrorType.DATABASE_ERROR]: "Error en la base de datos.",
  [ApiErrorType.EXTERNAL_SERVICE_ERROR]: "Error en servicio externo.",
  [ApiErrorType.RATE_LIMIT_EXCEEDED]: "Has excedido el límite de solicitudes. Por favor, espera un momento.",
  [ApiErrorType.PAYLOAD_TOO_LARGE]: "La solicitud es demasiado grande.",
  [ApiErrorType.BUSINESS_RULE_VIOLATION]: "La operación viola una regla de negocio.",
  [ApiErrorType.INSUFFICIENT_PERMISSIONS]: "No tienes suficientes permisos para esta operación.",
}

/**
 * Mapeo de códigos de estado HTTP
 */
const STATUS_CODES: Record<ApiErrorType, number> = {
  [ApiErrorType.UNAUTHORIZED]: 401,
  [ApiErrorType.FORBIDDEN]: 403,
  [ApiErrorType.SESSION_EXPIRED]: 401,
  [ApiErrorType.NOT_FOUND]: 404,
  [ApiErrorType.ALREADY_EXISTS]: 409,
  [ApiErrorType.BAD_REQUEST]: 400,
  [ApiErrorType.VALIDATION_ERROR]: 422,
  [ApiErrorType.MISSING_FIELD]: 400,
  [ApiErrorType.INVALID_FORMAT]: 400,
  [ApiErrorType.INTERNAL_ERROR]: 500,
  [ApiErrorType.DATABASE_ERROR]: 500,
  [ApiErrorType.EXTERNAL_SERVICE_ERROR]: 502,
  [ApiErrorType.RATE_LIMIT_EXCEEDED]: 429,
  [ApiErrorType.PAYLOAD_TOO_LARGE]: 413,
  [ApiErrorType.BUSINESS_RULE_VIOLATION]: 422,
  [ApiErrorType.INSUFFICIENT_PERMISSIONS]: 403,
}

// ============================================
// CLASE DE ERROR MEJORADA
// ============================================

export class ApiErrorV2 extends Error {
  public code: string
  public type: ApiErrorType
  public statusCode: number
  public details?: Record<string, any>
  public field?: string
  
  constructor(
    type: ApiErrorType,
    message?: string,
    details?: Record<string, any>,
    field?: string
  ) {
    super(message || ERROR_MESSAGES[type])
    this.name = "ApiErrorV2"
    this.type = type
    this.code = ERROR_CODES[type]
    this.statusCode = STATUS_CODES[type]
    this.details = details
    this.field = field
  }
}

// ============================================
// FUNCIONES DE RESPUESTA
// ============================================

/**
 * Genera un ID único para la request
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Crea una respuesta de éxito estándar
 */
export function createSuccessResponseV2<T>(
  data: T,
  message?: string,
  pagination?: PaginationMeta,
  processingTime?: number
): NextResponse {
  const response: ApiResponseV2<T> = {
    success: true,
    data,
    message,
    meta: {
      timestamp: new Date().toISOString(),
      version: "2.0",
      requestId: generateRequestId(),
      processingTime,
    },
    pagination,
  }
  
  return NextResponse.json(response, { status: 200 })
}

/**
 * Crea una respuesta de error estándar
 */
export function createErrorResponseV2(
  error: ApiErrorV2 | Error,
  requestId?: string
): NextResponse {
  const isApiError = error instanceof ApiErrorV2
  const isDevelopment = process.env.NODE_ENV === "development"
  
  const errorDetails: ApiErrorDetails = {
    code: isApiError ? error.code : ERROR_CODES[ApiErrorType.INTERNAL_ERROR],
    message: error.message,
    type: isApiError ? error.type : ApiErrorType.INTERNAL_ERROR,
    details: isApiError ? error.details : undefined,
    field: isApiError ? error.field : undefined,
    stack: isDevelopment && !isApiError ? error.stack : undefined,
  }
  
  const response: ApiResponseV2 = {
    success: false,
    error: errorDetails,
    meta: {
      timestamp: new Date().toISOString(),
      version: "2.0",
      requestId: requestId || generateRequestId(),
    },
  }
  
  const statusCode = isApiError ? error.statusCode : 500
  
  // Log del error
  logger.error("API Error", {
    ...errorDetails,
    statusCode,
    requestId: response.meta.requestId,
  })
  
  return NextResponse.json(response, { status: statusCode })
}

// ============================================
// MIDDLEWARE Y WRAPPERS
// ============================================

/**
 * Wrapper mejorado para manejo de errores con métricas
 */
export function withErrorHandlerV2<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    const startTime = Date.now()
    const requestId = generateRequestId()
    
    try {
      // Log de inicio de request
      logger.info("API Request Started", {
        requestId,
        method: args[0]?.method || "UNKNOWN",
        url: args[0]?.url || "UNKNOWN",
      })
      
      const response = await handler(...args)
      
      // Agregar headers de tracking
      response.headers.set("X-Request-Id", requestId)
      response.headers.set("X-Processing-Time", `${Date.now() - startTime}ms`)
      
      // Log de éxito
      logger.info("API Request Completed", {
        requestId,
        processingTime: Date.now() - startTime,
        status: response.status,
      })
      
      return response
    } catch (error) {
      return createErrorResponseV2(error as Error, requestId)
    }
  }) as T
}

// ============================================
// VALIDACIÓN
// ============================================

/**
 * Valida datos de request con schema Zod
 */
export async function validateRequestData<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<T> {
  try {
    const data = await request.json()
    const validated = schema.parse(data)
    return validated
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]
      throw new ApiErrorV2(
        ApiErrorType.VALIDATION_ERROR,
        `Error en ${firstError.path.join(".")}: ${firstError.message}`,
        { errors: error.errors },
        firstError.path.join(".")
      )
    }
    throw new ApiErrorV2(ApiErrorType.BAD_REQUEST, "Datos de solicitud inválidos")
  }
}

/**
 * Valida parámetros de query
 */
export function validateQueryParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): T {
  try {
    const params = Object.fromEntries(searchParams.entries())
    return schema.parse(params)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]
      throw new ApiErrorV2(
        ApiErrorType.VALIDATION_ERROR,
        `Parámetro inválido ${firstError.path.join(".")}: ${firstError.message}`,
        { errors: error.errors }
      )
    }
    throw new ApiErrorV2(ApiErrorType.BAD_REQUEST, "Parámetros de consulta inválidos")
  }
}

// ============================================
// AUTENTICACIÓN Y AUTORIZACIÓN
// ============================================

/**
 * Verifica autenticación con mejor manejo de errores
 */
export async function requireAuthV2() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    throw new ApiErrorV2(ApiErrorType.UNAUTHORIZED)
  }
  
  // Verificar si la sesión ha expirado
  if (session.expires && new Date(session.expires) < new Date()) {
    throw new ApiErrorV2(ApiErrorType.SESSION_EXPIRED)
  }
  
  return session
}

/**
 * Verifica rol específico
 */
export async function requireRoleV2(roles: string | string[]) {
  const session = await requireAuthV2()
  const allowedRoles = Array.isArray(roles) ? roles : [roles]
  
  if (!allowedRoles.includes(session.user.role)) {
    throw new ApiErrorV2(
      ApiErrorType.INSUFFICIENT_PERMISSIONS,
      `Se requiere uno de los siguientes roles: ${allowedRoles.join(", ")}`,
      { requiredRoles: allowedRoles, userRole: session.user.role }
    )
  }
  
  return session
}

// ============================================
// UTILIDADES
// ============================================

/**
 * Valida ObjectId de MongoDB mejorado
 */
export function validateMongoIdV2(id: string, fieldName = "id"): void {
  if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
    throw new ApiErrorV2(
      ApiErrorType.INVALID_FORMAT,
      `El ${fieldName} proporcionado no es válido`,
      { field: fieldName, value: id },
      fieldName
    )
  }
}

/**
 * Crea metadata de paginación
 */
export function createPaginationMeta(
  page: number,
  pageSize: number,
  totalItems: number
): PaginationMeta {
  const totalPages = Math.ceil(totalItems / pageSize)
  
  return {
    page,
    pageSize,
    totalPages,
    totalItems,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  }
}

/**
 * Parsea parámetros de paginación con valores por defecto
 */
export function parsePaginationParams(searchParams: URLSearchParams): {
  page: number
  pageSize: number
  skip: number
} {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20")))
  const skip = (page - 1) * pageSize
  
  return { page, pageSize, skip }
}

// ============================================
// RATE LIMITING (básico)
// ============================================

const requestCounts = new Map<string, { count: number; resetTime: number }>()

/**
 * Verifica límite de rate básico en memoria
 */
export async function checkRateLimitV2(
  identifier: string,
  limit = 100,
  windowMs = 60000 // 1 minuto
): Promise<void> {
  const now = Date.now()
  const record = requestCounts.get(identifier)
  
  if (!record || record.resetTime < now) {
    requestCounts.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    })
    return
  }
  
  if (record.count >= limit) {
    throw new ApiErrorV2(
      ApiErrorType.RATE_LIMIT_EXCEEDED,
      `Límite de ${limit} solicitudes por minuto excedido`,
      { 
        limit, 
        resetTime: new Date(record.resetTime).toISOString(),
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      }
    )
  }
  
  record.count++
}

// ============================================
// SCHEMAS DE VALIDACIÓN COMUNES
// ============================================

export const commonSchemas = {
  // ID de MongoDB
  mongoId: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID inválido"),
  
  // Paginación
  pagination: z.object({
    page: z.coerce.number().min(1).default(1),
    pageSize: z.coerce.number().min(1).max(100).default(20),
  }),
  
  // Rango de fechas
  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
  
  // Ordenamiento
  sorting: z.object({
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  }),
}

// ============================================
// EXPORTAR TODO PARA COMPATIBILIDAD
// ============================================

// Re-exportar funciones originales para compatibilidad
export { 
  requireAuth,
  requireRole,
  validateMongoId,
  getRequestData,
  withErrorHandler,
  createSuccessResponse,
  createErrorResponse,
  ApiError,
  type ApiResponse,
} from "./api-utils"