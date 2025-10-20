export function getClientIP(req: Request): string {
  const h = req.headers
  const testIp = h.get('x-test-ip')
  if (testIp) return testIp
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || '0.0.0.0'
}

export function getUserOrIPKey(req: Request): string {
  const user = req.headers.get('x-test-user-id') || ''
  const ip = getClientIP(req)
  return user || ip
}

