import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Silencia requests al endpoint HMR legacy de webpack-hot-middleware.
// Generado por el plugin de Sentry en desarrollo; Next.js 15 usa /_next/webpack-hmr.
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/__webpack_hmr") {
    return new NextResponse(null, { status: 200 })
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/__webpack_hmr"],
}
