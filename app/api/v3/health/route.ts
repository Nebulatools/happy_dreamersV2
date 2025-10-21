import { NextResponse } from 'next/server'
import { routeGuard } from '@/core-v3/api/feature-flag'
import { initV3Infra } from '@/core-v3/infra/init'
import { assertLLMReady } from '@/core-v3/infra/llm'

// Fuerza runtime Node.js para acceder a process.env de forma fiable
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const blocked = routeGuard()
  if (blocked) return blocked
  await initV3Infra()
  try {
    assertLLMReady()
    return NextResponse.json({ ok: true, message: 'v3 up', llmReady: true })
  } catch (e: any) {
    if (e && e.message === 'llm_misconfigured') {
      return NextResponse.json({ ok: true, message: 'v3 up', llmReady: false, reason: 'llm_misconfigured' })
    }
    return NextResponse.json({ ok: true, message: 'v3 up', llmReady: false })
  }
}
