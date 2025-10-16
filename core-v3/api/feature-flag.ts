export function isV3Enabled(): boolean {
  return String(process.env.HD_V3_ENABLED || '').toLowerCase() === 'true'
}

/**
 * Devuelve 404 si v3 está deshabilitado. Úsalo al inicio de cada handler v3.
 */
export function routeGuard(): Response | null {
  if (!isV3Enabled()) {
    return new Response('Not Found', { status: 404 })
  }
  return null
}

