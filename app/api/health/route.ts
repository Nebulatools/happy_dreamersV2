// Endpoint de salud liviano para UptimeBot / health checks
// NO conecta a MongoDB para evitar cold start timeouts innecesarios

import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
}
