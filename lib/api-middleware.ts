import { NextResponse } from 'next/server'
import { z, ZodSchema } from 'zod'
import { requireRole } from '@/core-v3/api/rbac'
import { getRateLimiter } from '@/lib/rate-limit/adapter'
import { getUserOrIPKey } from '@/lib/rate-limit/identity'
import { applyRateLimitHeaders } from '@/lib/rate-limit/headers'
import { stdOk, stdError, sanitizeText, httpStatusFor, logApi } from '@/lib/api-utils-v2'
import { hashId } from '@/lib/observability/hash'
import { observeEndpointLatency } from '@/core-v3/observability/metrics'
import { isV2ApiEnabled } from '@/lib/flags'

export function getRequestId(req: Request): string {
  const h = req.headers.get('x-request-id') || ''
  if (h) return h
  const rid = `rid_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
  return rid
}

type V2Auth = 'public' | 'user' | 'admin'
type V2Options = {
  auth?: V2Auth
  rateLimit?: { key?: string; limit: number; windowMs: number }
  validate?: { body?: ZodSchema<any>; query?: ZodSchema<any>; params?: ZodSchema<any> }
}

type HandlerCtx = {
  req: Request
  body: any
  query: any
  params: any
  requestId: string
  userId: string
}

type HandlerV2 = (ctx: HandlerCtx) => Promise<NextResponse>

export function withApi(handler: HandlerV2, options: V2Options = {}) {
  return async (req: Request, ctx?: { params?: any }): Promise<NextResponse> => {
    const t0 = Date.now()
    const rid = getRequestId(req)
    try {
      // Strangler: block v2 endpoints unless enabled
      const url = new URL(req.url)
      if (url.pathname.startsWith('/api/v2') && !isV2ApiEnabled()) {
        return withHeaders(stdError('not_found', 'Not found', rid, 404), rid, t0)
      }
      // AuthZ
      let userId = 'anonymous'
      const auth: V2Auth = options.auth || 'public'
      if (auth !== 'public') {
        const roles = auth === 'admin' ? ['admin'] : ['admin', 'parent']
        const ar = await requireRole(req, roles as any)
        // Be safe in test envs where NextResponse can be mocked as a plain object
        const isResponse = (() => {
          try {
            return (typeof NextResponse === 'function' && ar instanceof NextResponse) || (ar && typeof (ar as any).json === 'function' && (ar as any).headers)
          } catch {
            return ar && typeof (ar as any).json === 'function' && (ar as any).headers
          }
        })()
        if (isResponse) return withHeaders(ar as any, rid, t0)
        const authResult: any = ar as any
        userId = authResult.userId
      }
      // Rate limit (distributed provider)
      let rlDecision: any = null
      if (options.rateLimit) {
        const id = getUserOrIPKey(req)
        const key = `${options.rateLimit.key || 'api_v2'}:${id}`
        const limiter = getRateLimiter()
        rlDecision = await limiter.check(key, options.rateLimit.windowMs, options.rateLimit.limit)
        if (rlDecision.limited) {
          const res429 = stdError('rate_limited', 'Too many requests', rid, 429)
          applyRateLimitHeaders(res429 as any, rlDecision)
          return withHeaders(res429, rid, t0)
        }
      }
      // Parse query/params
      const queryObj: Record<string, any> = {}
      url.searchParams.forEach((v, k) => { queryObj[k] = v })
      let body: any = undefined
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        try { body = await req.json() } catch { return withHeaders(stdError('invalid_json', 'Malformed JSON', rid, httpStatusFor('invalid_json')), rid, t0) }
      }
      // Validation
      if (options.validate?.body && typeof body !== 'undefined') {
        const parsed = options.validate.body.safeParse(sanitizeText(body))
        if (!parsed.success) return withHeaders(stdError('invalid_body', 'Invalid body', rid, httpStatusFor('invalid_body'), parsed.error.issues), rid, t0)
        body = parsed.data
      } else if (typeof body !== 'undefined') {
        body = sanitizeText(body)
      }
      let query = queryObj
      if (options.validate?.query) {
        const parsed = options.validate.query.safeParse(queryObj)
        if (!parsed.success) return withHeaders(stdError('invalid_query', 'Invalid query', rid, httpStatusFor('invalid_query'), parsed.error.issues), rid, t0)
        query = parsed.data
      }
      let params = ctx?.params || {}
      if (options.validate?.params) {
        const parsed = options.validate.params.safeParse(ctx?.params || {})
        if (!parsed.success) return withHeaders(stdError('invalid_params', 'Invalid params', rid, httpStatusFor('invalid_params'), parsed.error.issues), rid, t0)
        params = parsed.data
      }
      logApi('request', { rid, method: req.method, path: url.pathname })
      const res = await handler({ req, body, query, params, requestId: rid, userId })
      if (rlDecision) applyRateLimitHeaders(res as any, rlDecision)
      const ms = Date.now() - t0!
      try {
        observeEndpointLatency(url.pathname, ms)
      } catch {}
      const status = (res as any)?.status || 200
      const userHash = hashId(userId)
      logApi('response', { rid, method: req.method, path: url.pathname, status, latencyMs: ms, user: userHash })
      return withHeaders(res, rid, t0)
    } catch (e: any) {
      const code = e?.code || 'internal_error'
      const msg = e?.message || 'Unexpected error'
      const status = e?.status && Number.isFinite(e.status) ? e.status : httpStatusFor(code)
      return withHeaders(stdError(code, msg, rid, status), rid, t0)
    }
  }
}

function withHeaders(res: NextResponse, requestId: string, t0?: number) {
  res.headers.set('X-Request-Id', requestId)
  if (t0) res.headers.set('X-Processing-Time', String(Date.now() - t0))
  return res
}

export const schemas = { z }
