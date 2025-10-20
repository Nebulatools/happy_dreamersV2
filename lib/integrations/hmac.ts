import crypto from 'crypto'

export type VerifyResult = { ok: true } | { ok: false; code: string; status: number }

export function safeTimingEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

export function hmacSha256Base64(secret: string, message: string): string {
  return crypto.createHmac('sha256', secret).update(message).digest('base64')
}

export interface ReplayStore {
  has(key: string): boolean
  put(key: string, ttlMs: number): void
}

export class MemoryReplayStore implements ReplayStore {
  private store = new Map<string, number>()
  has(key: string): boolean {
    const exp = this.store.get(key)
    if (!exp) return false
    if (Date.now() > exp) {
      this.store.delete(key)
      return false
    }
    return true
  }
  put(key: string, ttlMs: number): void {
    this.store.set(key, Date.now() + ttlMs)
  }
}

export function verifyWebhookSignature(secret: string, timestamp: string, rawBody: string, provided: string, maxSkewSec = 300, replay: ReplayStore): VerifyResult {
  const now = Math.floor(Date.now() / 1000)
  const ts = Number(timestamp)
  if (!Number.isFinite(ts)) return { ok: false, code: 'invalid_timestamp', status: 400 }
  if (Math.abs(now - ts) > maxSkewSec) return { ok: false, code: 'timestamp_skew', status: 401 }
  const toSign = `${timestamp}.${rawBody}`
  const expected = hmacSha256Base64(secret, toSign)
  if (!safeTimingEqual(expected, provided)) return { ok: false, code: 'invalid_signature', status: 401 }
  const replayKey = `wh:${timestamp}:${expected}`
  if (replay.has(replayKey)) return { ok: false, code: 'replay_detected', status: 409 }
  replay.put(replayKey, maxSkewSec * 1000)
  return { ok: true }
}

