// GET /api/v1/openapi.json - sirve el contrato OpenAPI (publico, sin auth).
// Util para que clientes (ej: Yose) generen su cliente automaticamente.

import { NextResponse } from "next/server"
import { openApiSpec } from "@/lib/api/openapi-spec"

export async function GET() {
  return NextResponse.json(openApiSpec, {
    headers: { "Cache-Control": "public, max-age=300" },
  })
}
