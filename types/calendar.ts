// Tipos y utilidades compartidas para el calendario

export type CalendarViewMode = "full" | "compact"

const ADMIN_ROLES = new Set(["admin", "power", "super_admin", "administrator"])

export function getViewModeForRole(role?: string | null): CalendarViewMode {
  if (!role) return "compact"
  const normalized = role.toLowerCase()
  return ADMIN_ROLES.has(normalized) ? "full" : "compact"
}
