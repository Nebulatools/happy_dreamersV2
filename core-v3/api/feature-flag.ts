function parseBooleanEnv(value: unknown): boolean {
  const v = String(value || "").trim().toLowerCase()
  return v === "true" || v === "1" || v === "on" || v === "yes" || v === "y"
}

export function isV3Enabled(): boolean {
  // Soporta varias formas comunes de habilitar flags
  return (
    parseBooleanEnv(process.env.HD_V3_ENABLED) ||
    // fallback opcional si alguien expone el flag como público en local
    parseBooleanEnv((process as any).env?.NEXT_PUBLIC_HD_V3_ENABLED)
  )
}

/**
 * Devuelve 404 si v3 está deshabilitado. Úsalo al inicio de cada handler v3.
 */
export function routeGuard(): Response | null {
  if (!isV3Enabled()) {
    return new Response("Not Found", { status: 404 })
  }
  return null
}
