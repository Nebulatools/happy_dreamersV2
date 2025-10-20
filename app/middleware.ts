import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { corsHeaders, securityHeaders } from '@/core-v3/security/headers'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (!pathname.startsWith('/api/v3/')) return NextResponse.next()

  // CORS preflight
  if (req.method === 'OPTIONS') {
    const res = new NextResponse(null, { status: 204 })
    for (const [k, v] of Object.entries({ ...corsHeaders(), ...securityHeaders() })) res.headers.set(k, v)
    return res
  }

  const res = NextResponse.next()
  for (const [k, v] of Object.entries({ ...corsHeaders(), ...securityHeaders() })) res.headers.set(k, v)
  return res
}

export const config = {
  matcher: ['/api/v3/:path*'],
}

