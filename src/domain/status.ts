export type PlanStatus = 'draft' | 'active' | 'completed' | 'superseded'

const legacyToModern: Record<string, PlanStatus> = {
  borrador: 'draft',
  activo: 'active',
  completado: 'completed',
  // otros mapeos si aparecen
}

const modernToLegacy: Record<PlanStatus, string> = {
  draft: 'borrador',
  active: 'activo',
  completed: 'completado',
  superseded: 'superseded',
}

export function mapLegacyStatus(input: string): PlanStatus {
  const k = String(input || '').toLowerCase()
  return legacyToModern[k] || (['draft', 'active', 'completed', 'superseded'].includes(k) ? (k as PlanStatus) : 'draft')
}

export function mapToLegacyStatus(input: PlanStatus): string {
  return modernToLegacy[input] || input
}

