// Utilidades para manejo de API en Happy Dreamers
// Funciones compartidas para manejo de errores y respuestas

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createLogger } from "@/lib/logger"

const logger = createLogger("api-utils")

// Tipos para respuestas de API
export interface ApiResponse<T = any> {
  data?: T
  error?: string
  message?: string
  success: boolean
}

// Tipos de error comunes
export enum ApiErrorType {
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  BAD_REQUEST = "BAD_REQUEST",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
}

// Mensajes de error en español
const ERROR_MESSAGES: Record<ApiErrorType, string> = {
  [ApiErrorType.UNAUTHORIZED]: "No autorizado. Por favor, inicia sesión.",
  [ApiErrorType.FORBIDDEN]: "No tienes permisos para realizar esta acción.",
  [ApiErrorType.NOT_FOUND]: "Recurso no encontrado.",
  [ApiErrorType.BAD_REQUEST]: "Solicitud inválida.",
  [ApiErrorType.INTERNAL_ERROR]: "Error interno del servidor.",
  [ApiErrorType.VALIDATION_ERROR]: "Error de validación.",
}

/**
 * Wrapper para manejo de errores en API routes
 * @param handler - Función del handler de la API
 * @returns Función wrapped con manejo de errores
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args)
    } catch (error) {
      logger.error("Error en API:", error)
      
      // Si es un error conocido de API
      if (error instanceof ApiError) {
        return createErrorResponse(error.type, error.message, error.statusCode)
      }
      
      // Error genérico
      return createErrorResponse(
        ApiErrorType.INTERNAL_ERROR,
        ERROR_MESSAGES[ApiErrorType.INTERNAL_ERROR],
        500
      )
    }
  }) as T
}

/**
 * Clase para errores de API personalizados
 */
export class ApiError extends Error {
  constructor(
    public type: ApiErrorType,
    public message: string,
    public statusCode: number
  ) {
    super(message)
    this.name = "ApiError"
  }
}

/**
 * Crea una respuesta de éxito estándar
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  status = 200
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
    } as ApiResponse<T>,
    { status }
  )
}

/**
 * Crea una respuesta de error estándar
 */
export function createErrorResponse(
  type: ApiErrorType,
  message?: string,
  status = 400
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: type,
      message: message || ERROR_MESSAGES[type],
    } as ApiResponse,
    { status }
  )
}

/**
 * Verifica que el usuario esté autenticado
 * @throws ApiError si no está autenticado
 */
export async function requireAuth() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    throw new ApiError(
      ApiErrorType.UNAUTHORIZED,
      ERROR_MESSAGES[ApiErrorType.UNAUTHORIZED],
      401
    )
  }
  
  return session
}

/**
 * Verifica que el usuario tenga un rol específico
 * @throws ApiError si no tiene el rol requerido
 */
export async function requireRole(role: string) {
  const session = await requireAuth()
  
  if (session.user.role !== role) {
    throw new ApiError(
      ApiErrorType.FORBIDDEN,
      ERROR_MESSAGES[ApiErrorType.FORBIDDEN],
      403
    )
  }
  
  return session
}

/**
 * Valida el ID de MongoDB
 */
export function validateMongoId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id)
}

/**
 * Extrae y valida parámetros de la request
 */
export async function getRequestData<T>(request: Request): Promise<T> {
  try {
    const data = await request.json()
    return data as T
  } catch (error) {
    throw new ApiError(
      ApiErrorType.BAD_REQUEST,
      "Datos de solicitud inválidos",
      400
    )
  }
}