import { NextResponse } from 'next/server'
import { routeGuard } from '@/core-v3/api/feature-flag'

export async function GET() {
  const blocked = routeGuard()
  if (blocked) return blocked

  return NextResponse.json({ ok: true, message: 'v3 up' })
}

