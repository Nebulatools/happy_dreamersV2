import { NextResponse } from 'next/server'
import { safeLog } from '@/core-v3/security/sanitize'
import { z } from 'zod'

export type StdError = { code: string; message: string; details?: unknown }
export type StdMeta = Record<string, unknown>

// -----------------------------
// Sanitization helpers
// -----------------------------
export function sanitizeText(input: unknown): unknown {
  if (typeof input === 'string') {
    // remove HTML tags and trim
    return input.replace(/<[^>]*>/g, '').trim()
  }
  // Preserve Date instances and other non-plain objects (e.g., ObjectId-like)
  if (input instanceof Date) return input
  if (Array.isArray(input)) return input.map((v) => sanitizeText(v))
  if (input && typeof input === 'object') {
    // Only sanitize plain objects; leave class instances intact
    const proto = Object.getPrototypeOf(input)
    const isPlain = proto === Object.prototype || proto === null
    if (!isPlain) return input
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(input as any)) out[k] = sanitizeText(v)
    return out
  }
  return input
}

export function stdOk<T>(data: T, requestId: string, meta?: StdMeta) {
  const body = { ok: true, data, error: null, meta: meta || {} }
  const res = NextResponse.json(body)
  res.headers.set('X-Request-Id', requestId)
  return res
}

export function stdError(code: string, message: string, requestId: string, status: number, details?: unknown) {
  const err: StdError = { code, message }
  if (typeof details !== 'undefined') err.details = details
  const body = { ok: false, data: null, error: err, meta: {} }
  const res = NextResponse.json(body, { status })
  res.headers.set('X-Request-Id', requestId)
  return res
}

export function httpStatusFor(code: string): number {
  const map: Record<string, number> = {
    invalid_json: 400,
    invalid_body: 400,
    invalid_query: 400,
    invalid_params: 400,
    unauthorized: 401,
    forbidden: 403,
    not_found: 404,
    rate_limited: 429,
    internal_error: 500,
    validation_error: 400,
  }
  return map[code] || 500
}

export function logApi(event: string, data: Record<string, unknown>) {
  safeLog('api_v2', event, data)
}

// -----------------------------
// V2 API Error System (lightweight)
// -----------------------------
export enum ApiErrorType {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  DATABASE_ERROR = 'DATABASE_ERROR',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  BAD_REQUEST = 'BAD_REQUEST',
}

function statusForType(t: ApiErrorType): number {
  switch (t) {
    case ApiErrorType.UNAUTHORIZED:
      return 401
    case ApiErrorType.FORBIDDEN:
      return 403
    case ApiErrorType.NOT_FOUND:
      return 404
    case ApiErrorType.VALIDATION_ERROR:
    case ApiErrorType.BUSINESS_RULE_VIOLATION:
    case ApiErrorType.BAD_REQUEST:
      return 400
    case ApiErrorType.RATE_LIMIT_EXCEEDED:
      return 429
    case ApiErrorType.DATABASE_ERROR:
    case ApiErrorType.INTERNAL_ERROR:
    default:
      return 500
  }
}

export class ApiErrorV2 extends Error {
  constructor(
    public type: ApiErrorType,
    message: string,
    public details?: unknown,
    public field?: string,
    public status?: number
  ) {
    super(message)
    this.name = 'ApiErrorV2'
    if (!this.status) this.status = statusForType(type)
  }
}

// -----------------------------
// V2 Success/Error responses
// -----------------------------
export function createSuccessResponseV2<T>(
  data: T,
  message?: string,
  pagination?: {
    page: number
    pageSize: number
    totalPages: number
    totalItems: number
    hasNext: boolean
    hasPrev: boolean
  },
  processingTime?: number
) {
  const body: any = {
    success: true,
    data,
    message,
    meta: {
      timestamp: new Date().toISOString(),
      version: '2',
    },
  }
  if (typeof processingTime === 'number') body.meta.processingTime = processingTime
  if (pagination) body.pagination = pagination
  return NextResponse.json(body)
}

export function createErrorResponseV2(
  type: ApiErrorType,
  message: string,
  requestId: string,
  details?: unknown,
  field?: string
) {
  const status = statusForType(type)
  const body = {
    success: false,
    data: null,
    error: {
      code: type,
      type,
      message,
      details,
      field,
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: '2',
      requestId,
    },
  }
  const res = NextResponse.json(body, { status })
  res.headers.set('X-Request-Id', requestId)
  return res
}

function genRequestId() {
  return `req_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`
}

export function withErrorHandlerV2<T extends (req: Request, ctx?: any) => Promise<NextResponse>>(
  handler: T
): (req: Request, ctx?: any) => Promise<NextResponse> {
  return (async (req: Request, ctx?: any) => {
    const t0 = Date.now()
    const rid = req.headers.get('x-request-id') || genRequestId()
    try {
      const res = await handler(req, ctx as any)
      // Attach tracking headers
      try {
        res.headers.set('X-Request-Id', rid)
        res.headers.set('X-Processing-Time', String(Date.now() - t0))
        res.headers.set('X-Api-Version', 'v2')
      } catch {}
      return res
    } catch (e: any) {
      if (e instanceof ApiErrorV2) {
        return createErrorResponseV2(e.type, e.message, rid, e.details, e.field)
      }
      const code = e?.code || 'INTERNAL_ERROR'
      const type = (Object.values(ApiErrorType) as string[]).includes(code) ? (code as ApiErrorType) : ApiErrorType.INTERNAL_ERROR
      const msg = e?.message || 'Error interno del servidor'
      return createErrorResponseV2(type, msg, rid)
    }
  })
}

// -----------------------------
// Auth helpers
// -----------------------------
export async function requireAuthV2() {
  // Avoid static ESM imports for test environments; load lazily
  const { getServerSession } = await import('next-auth')
  const { authOptions } = await import('@/lib/auth')
  const session: any = await getServerSession(authOptions as any)
  if (!session?.user?.id) {
    throw new ApiErrorV2(ApiErrorType.UNAUTHORIZED, 'No autorizado')
  }
  return session
}

// -----------------------------
// Common schemas and pagination helpers
// -----------------------------
export const commonSchemas = {
  mongoId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID de MongoDB inválido'),
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
  dateRange: z
    .object({
      start: z.string().datetime().optional(),
      end: z.string().datetime().optional(),
    })
    .refine((r) => {
      if (!r.start || !r.end) return true
      return new Date(r.start) <= new Date(r.end)
    }, 'Rango de fechas inválido'),
  sorting: z.object({
    sortBy: z.string().max(64).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
}

export function validateMongoIdV2(id: string) {
  return /^[0-9a-fA-F]{24}$/.test(id)
}

export function parsePaginationParams(input: URLSearchParams | Record<string, any>) {
  const get = (k: string) => (input instanceof URLSearchParams ? input.get(k) : input?.[k])
  const page = Math.max(1, Number.parseInt(String(get('page') ?? '1'), 10) || 1)
  const pageSizeRaw = Number.parseInt(String(get('pageSize') ?? '20'), 10)
  const pageSize = Math.min(100, Math.max(1, pageSizeRaw || 20))
  const skip = (page - 1) * pageSize
  return { page, pageSize, skip }
}

export function createPaginationMeta(page: number, pageSize: number, totalItems: number) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  return {
    page,
    pageSize,
    totalPages,
    totalItems,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  }
}
