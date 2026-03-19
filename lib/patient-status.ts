// Clasificacion de status de pacientes (computado, no almacenado)
// Patron "derived state": se calcula en cada lectura, no se guarda en MongoDB

export type PatientStatus = "active" | "inactive" | "archived"

export interface PatientStatusInput {
  archived?: boolean
  hasActivePlan: boolean
  lastEventDate: Date | null
  childCreatedAt: Date
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000

/**
 * Calcula el status de un paciente basado en reglas clinicas:
 * - archived === true → "archived" (manual, prioridad maxima)
 * - hasActivePlan → "active"
 * - lastEvent < 30 dias → "active"
 * - childCreatedAt < 14 dias → "active" (gracia para nuevos)
 * - else → "inactive"
 */
export function computePatientStatus(input: PatientStatusInput): PatientStatus {
  if (input.archived) return "archived"
  if (input.hasActivePlan) return "active"

  const now = Date.now()

  if (input.lastEventDate && (now - input.lastEventDate.getTime()) < THIRTY_DAYS_MS) {
    return "active"
  }

  if ((now - input.childCreatedAt.getTime()) < FOURTEEN_DAYS_MS) {
    return "active"
  }

  return "inactive"
}

// --- Ordenamiento por prioridad para la tab "Activos" ---

export interface PatientSortInput {
  childId: string
  triageSeverity?: "critical" | "warning"
  hasActivePlan: boolean
  lastEventDate: Date | null
  childName: string
}

/**
 * Ordena pacientes por prioridad clinica:
 * 1. Alertas de triage (critical > warning > sin alerta)
 * 2. Sin plan activo primero (necesitan atencion)
 * 3. Actividad mas reciente primero
 * 4. Alfabetico como fallback
 */
export function sortByPatientPriority(patients: PatientSortInput[]): PatientSortInput[] {
  return [...patients].sort((a, b) => {
    // 1. Severidad de triage
    const severityOrder = { critical: 0, warning: 1 }
    const sevA = a.triageSeverity ? severityOrder[a.triageSeverity] : 2
    const sevB = b.triageSeverity ? severityOrder[b.triageSeverity] : 2
    if (sevA !== sevB) return sevA - sevB

    // 2. Sin plan primero (necesitan atencion)
    if (a.hasActivePlan !== b.hasActivePlan) {
      return a.hasActivePlan ? 1 : -1
    }

    // 3. Actividad mas reciente primero
    const dateA = a.lastEventDate?.getTime() ?? 0
    const dateB = b.lastEventDate?.getTime() ?? 0
    if (dateA !== dateB) return dateB - dateA

    // 4. Alfabetico
    return a.childName.localeCompare(b.childName, "es")
  })
}
