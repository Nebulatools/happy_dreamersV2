// Formateador de plan para contexto diagnostico
// NO importar de lib/rag/ — dominio separado, sin emojis

/**
 * Formatea un plan activo como texto plano para inyectar en el prompt del Pasante AI.
 * Extrae horarios, objetivos y estructura del plan sin emojis.
 *
 * @param plan - Documento del plan de child_plans
 * @returns String formateado o undefined si no hay datos relevantes
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatPlanForDiagnostic(plan: Record<string, any>): string | undefined {
  if (!plan) return undefined

  const lines: string[] = []

  // Version y fecha
  const version = plan.planNumber ?? plan.planVersion ?? "?"
  lines.push(`- Version del plan: ${version}`)

  if (plan.createdAt) {
    const date = new Date(plan.createdAt).toLocaleDateString("es-MX")
    lines.push(`- Fecha de creacion: ${date}`)
  }

  // Horarios del schedule
  const schedule = plan.schedule
  if (schedule) {
    if (schedule.wakeTime) lines.push(`- Hora de despertar: ${schedule.wakeTime}`)
    if (schedule.bedtime) lines.push(`- Hora de acostarse: ${schedule.bedtime}`)

    // Siestas
    if (Array.isArray(schedule.naps) && schedule.naps.length > 0) {
      lines.push(`- Siestas prescritas: ${schedule.naps.length}`)
      for (const nap of schedule.naps) {
        const napTime = nap.time || nap.startTime || "?"
        const napDuration = nap.duration || nap.maxDuration || "?"
        lines.push(`  - ${napTime} (~${napDuration} min)`)
      }
    }

    // Ventanas de vigilia
    if (Array.isArray(schedule.wakeWindows) && schedule.wakeWindows.length > 0) {
      lines.push(`- Ventanas de vigilia: ${schedule.wakeWindows.map((w: number) => w + "h").join(", ")}`)
    }
  }

  // Fallback: sleepRoutine (formato alternativo de plan)
  const routine = plan.sleepRoutine
  if (routine && !schedule) {
    if (routine.wakeTime) lines.push(`- Hora de despertar: ${routine.wakeTime}`)
    if (routine.bedtime) lines.push(`- Hora de acostarse: ${routine.bedtime}`)
    if (routine.numberOfNaps) lines.push(`- Siestas prescritas: ${routine.numberOfNaps}`)
  }

  // Objetivos
  if (plan.objectives && typeof plan.objectives === "string") {
    lines.push(`- Objetivos: ${plan.objectives}`)
  }
  if (Array.isArray(plan.objectives)) {
    lines.push(`- Objetivos:`)
    for (const obj of plan.objectives) {
      lines.push(`  - ${typeof obj === "string" ? obj : obj.description || obj.text || JSON.stringify(obj)}`)
    }
  }

  // Notas del plan
  if (plan.notes && typeof plan.notes === "string") {
    lines.push(`- Notas: ${plan.notes}`)
  }

  // Si no hay informacion util, retornar undefined
  if (lines.length <= 1) return undefined

  return lines.join("\n")
}
