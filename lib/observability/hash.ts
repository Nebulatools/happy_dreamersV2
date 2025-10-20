import crypto from 'crypto'

export function hashId(input: unknown): string {
  const s = typeof (input as any)?.toHexString === 'function' ? (input as any).toHexString() : (input as any)?._oid || String(input || '')
  return crypto.createHash('sha256').update(s).digest('hex').slice(0, 16)
}

