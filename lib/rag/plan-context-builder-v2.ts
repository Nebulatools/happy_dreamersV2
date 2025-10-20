import { planRepo } from '@/src/repo/planRepo'
import { toObjectId, isObjectIdHex } from '@/src/domain/object-id'

type AnyPlan = Record<string, any>

export async function getActivePlan(childId: string, _userId: string): Promise<AnyPlan | null> {
  const id = isObjectIdHex(childId) ? toObjectId(childId) : (childId as unknown as any)
  const plan = await planRepo.findActive(id)
  return plan as any
}

export function buildPlanContext(plan: AnyPlan): string {
  if (!plan) return ''
  const lines: string[] = []
  lines.push('=== PLAN ACTUAL (v2) ===')
  const pn = typeof plan.planNumber !== 'undefined' ? String(plan.planNumber) : 'N/A'
  const pt = plan.planType || 'unknown'
  lines.push(`Plan: ${pn} • Tipo: ${pt}`)
  if (plan.planVersion != null) lines.push(`Versión: ${String(plan.planVersion)}`)

  // Objetivos (si existen)
  if (Array.isArray(plan.objectives) && plan.objectives.length) {
    const objs = plan.objectives.slice(0, 3)
    lines.push('🎯 Objetivos:')
    for (const o of objs) lines.push(`- ${String(o)}`)
  }

  // Horarios (si existen). No inventar: si no hay, indicarlo explícitamente
  const sch = plan.schedule || {}
  const parts: string[] = []
  if (sch.bedtime) parts.push(`Dormir: ${sch.bedtime}`)
  if (sch.wakeTime) parts.push(`Despertar: ${sch.wakeTime}`)
  if (Array.isArray(sch.naps) && sch.naps.length) parts.push(`Siestas: ${sch.naps.length}`)
  if (parts.length) {
    lines.push('⏰ Horarios: ' + parts.join(' • '))
  } else {
    lines.push('⏰ Horarios: no definidos en el plan')
  }

  // Recomendaciones (priorizar top 2-3)
  let recs: string[] = []
  if (Array.isArray(plan.recommendations) && plan.recommendations.length) {
    recs = plan.recommendations.map((r: any) => String(r))
  } else if (plan.output?.recommendations && Array.isArray(plan.output.recommendations)) {
    // v3 LLM output: { key, action, rationale }
    recs = plan.output.recommendations.map((r: any) => (r?.action ? `${r.action} — ${r.rationale || ''}`.trim() : String(r))).filter(Boolean)
  }
  if (recs.length) {
    lines.push('💡 Recomendaciones clave:')
    for (const r of recs.slice(0, 3)) lines.push(`- ${r}`)
  }

  lines.push('=== FIN PLAN ACTUAL ===')
  return lines.join('\n')
}

export async function getPlanHistoryContext(childId: string, _userId: string, limit = 3): Promise<string> {
  const id = isObjectIdHex(childId) ? toObjectId(childId) : (childId as unknown as any)
  const items = await planRepo.listByChild(id)
  if (!items.length) return 'No hay planes registrados para este niño.'
  const pick = items.slice(0, limit)
  const lines: string[] = []
  lines.push('=== HISTORIAL DE PLANES (v2) ===')
  for (const p of pick) {
    const created = p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt || '')
    lines.push(`• Plan ${String(p.planNumber)} (${p.status}) • Tipo: ${p.planType} • ${created}`)
  }
  lines.push('=== FIN HISTORIAL ===')
  return lines.join('\n')
}

export async function getChildPlanContext(childId: string, userId: string): Promise<string> {
  const plan = await getActivePlan(childId, userId)
  if (!plan) return 'No hay plan activo para este niño.'
  return buildPlanContext(plan)
}

