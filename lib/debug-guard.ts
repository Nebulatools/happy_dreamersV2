import { NextResponse } from 'next/server'
import { requireRole } from '@/core-v3/api/rbac'
import { getClientIP } from '@/lib/rate-limit/identity'

export async function ensureDebugAccess(req: Request) {
  const isProd = process.env.NODE_ENV === 'production' || String(process.env.HD_DEBUG_TEST_PROD || '').toLowerCase() === 'true'
  const allow = String(process.env.HD_DEBUG_ALLOW || '').toLowerCase() === 'true'
  if (isProd && !allow) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  if (isProd && allow) {
    const auth = await requireRole(req, ['admin'])
    if (auth instanceof NextResponse) return auth
    const ips = String(process.env.HD_DEBUG_ALLOW_IPS || '').split(',').map((s) => s.trim()).filter(Boolean)
    if (ips.length) {
      const ip = getClientIP(req)
      if (!ips.includes(ip)) return NextResponse.json({ error: 'forbidden_ip' }, { status: 403 })
    }
  }
  return null
}
