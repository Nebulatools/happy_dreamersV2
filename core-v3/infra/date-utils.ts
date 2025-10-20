export function isDate(v: unknown): v is Date {
  return v instanceof Date && !isNaN(v.getTime())
}

export function normalizeDate(v: unknown): Date | null {
  if (v instanceof Date && !isNaN(v.getTime())) return v
  if (typeof v === 'number') {
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d
  }
  // Evitar parseISO: si viene string, que lo convierta el adaptador de entrada
  return null
}

