import { NextRequest, NextResponse } from 'next/server'
import { MemoryReplayStore, verifyWebhookSignature } from '@/lib/integrations/hmac'
import { getDb } from '@/core-v3/infra/db'
import { toObjectId, isObjectIdHex } from '@/src/domain/object-id'

const replay = new MemoryReplayStore()

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function sanitizeObj(obj: any) {
  if (!obj || typeof obj !== 'object') return obj
  const out: any = {}
  for (const [k, v] of Object.entries(obj)) {
    if (k.toLowerCase().includes('token') || k.toLowerCase().includes('secret')) continue
    out[k] = v
  }
  return out
}

export async function POST(req: NextRequest) {
  const secret = process.env.ZOOM_WEBHOOK_SECRET || process.env.HD_ZOOM_WEBHOOK_SECRET || ''
  if (!secret) return NextResponse.json({ ok: false, error: { code: 'not_configured', message: 'Webhook secret missing' } }, { status: 500 })
  const sig = req.headers.get('x-zm-signature') || req.headers.get('x-zoom-signature') || ''
  const ts = req.headers.get('x-zm-timestamp') || req.headers.get('x-zoom-timestamp') || ''
  const raw = await req.text()
  const ver = verifyWebhookSignature(secret, ts, raw, sig, 300, replay)
  if (!ver.ok) return NextResponse.json({ ok: false, error: { code: ver.code, message: 'Invalid webhook' } }, { status: ver.status })
  let body: any
  try { body = JSON.parse(raw) } catch { return NextResponse.json({ ok: false, error: { code: 'invalid_json', message: 'Malformed JSON' } }, { status: 400 }) }

  // Normalize minimal fields for session ingestion
  const object = body?.payload?.object || {}
  const meetingId = String(object.id || object.uuid || body?.payload?.id || '')
  const childHex = String(object.childId || '')
  const userHex = String(object.userId || '')
  const childId = isObjectIdHex(childHex) ? toObjectId(childHex) : undefined
  const userId = isObjectIdHex(userHex) ? toObjectId(userHex) : undefined
  const status = childId ? 'ingested' : 'unlinked'
  const reason = childId ? undefined : 'missing_childId'
  const db = await getDb()
  const now = new Date()
  await db.collection('zoom_sessions').insertOne({ meetingId, childId, userId, status, reason, createdAt: now, updatedAt: now, raw: sanitizeObj(object) })
  return NextResponse.json({ ok: true })
}

