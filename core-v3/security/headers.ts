import { NextResponse } from 'next/server'

export function corsHeaders() {
  const allowOrigin = process.env.HD_V3_CORS_ORIGIN || '*'
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  }
}

export function securityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  }
}

export function withCommonHeaders(res: NextResponse) {
  const h = { ...corsHeaders(), ...securityHeaders() }
  for (const [k, v] of Object.entries(h)) res.headers.set(k, v)
  return res
}

