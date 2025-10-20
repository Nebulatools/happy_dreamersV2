import { NextResponse } from 'next/server'
import { routeGuard } from '@/core-v3/api/feature-flag'
import { initV3Infra } from '@/core-v3/infra/init'

// Fuerza runtime Node.js para acceder a process.env de forma fiable
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const blocked = routeGuard()
  if (blocked) return blocked
  await initV3Infra()
  return NextResponse.json({ ok: true, message: 'v3 up' })
}
