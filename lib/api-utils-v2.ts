import { NextResponse } from 'next/server'
import { safeLog } from '@/core-v3/security/sanitize'

export type StdError = { code: string; message: string; details?: unknown }
export type StdMeta = Record<string, unknown>

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
  }
  return map[code] || 500
}

export function logApi(event: string, data: Record<string, unknown>) {
  safeLog('api_v2', event, data)
}
