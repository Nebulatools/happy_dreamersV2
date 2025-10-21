import type { ObjectId } from 'mongodb'
import { EventsRepo } from '@core-v3/infra/repos/events.repo'
import { ChildrenRepo } from '@core-v3/infra/repos/children.repo'
import { planOutputSchema, type PlanLLMOutput } from '@core-v3/domain/plan-output-schema'
import { defaultWindow } from '@core-v3/domain/plan-engine'
import { logPlan } from '@core-v3/observability/logger'
import { incPlanAborted, incPlanGenerated, incValidationFailed, observeLLMDuration } from '@core-v3/observability/metrics'

type LLMClient = {
  complete: (input: { prompt: string; temperature: number; maxTokens: number }) => Promise<string>
}

export type PlanLLMKind = 'initial' | 'event_based' | 'transcript_refinement'

export type GeneratePlanResult =
  | { ok: true; output: PlanLLMOutput; attempts: number; inference_ms: number }
  | { ok: false; error: 'insufficient_data' | 'validation_failed' | 'model_error'; reason?: string; attempts: number; inference_ms: number }

function intEnv(key: string, fallback: number): number {
  const v = Number.parseInt(String(process.env[key] || ''), 10)
  return Number.isFinite(v) && v > 0 ? v : fallback
}

function floatEnv(key: string, fallback: number): number {
  const v = Number.parseFloat(String(process.env[key] || ''))
  return Number.isFinite(v) ? v : fallback
}

function monthsBetween(a: Date, b: Date): number {
  const years = b.getUTCFullYear() - a.getUTCFullYear()
  const months = b.getUTCMonth() - a.getUTCMonth()
  const total = years * 12 + months
  if (b.getUTCDate() < a.getUTCDate()) return total - 1
  return total
}

function log(event: string, data: Record<string, unknown>) {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ scope: 'PlanLLMService', event, ...data }))
}

function buildPrompt(kind: PlanLLMKind, payload: any): string {
  const schemaHint = {
    planType: 'initial | event_based | transcript_refinement',
    title: 'string',
    summary: 'string',
    window: { from: 'ISO string', to: 'ISO string' },
    metrics: { eventCount: 'number', distinctTypes: 'number', byType: 'record', ageInMonths: 'number' },
    recommendations: [{ key: 'string', action: 'string', rationale: 'string' }],
  }
  return `Eres un asistente experto en sueño infantil.
Tarea: generar un plan v3 del tipo "${kind}" basado en el contexto provisto.

REGLAS IMPORTANTES:
- NO INVENTAR: Si los datos son insuficientes, responde exactamente con {"error":"insufficient_data","reason":"<explica causa>"}.
- Devuelve un JSON válido y STRICTO que siga este schema conceptual: ${JSON.stringify(schemaHint)}.
- No uses comentarios ni texto fuera del JSON final.
- Mantén recomendaciones prácticas, accionables y coherentes con el contexto.

Contexto:
${JSON.stringify(payload)}
`
}

export class PlanLLMService {
  private llm: LLMClient
  private temperature: number
  private maxTokens: number
  private minEvents: number
  private minTypes: number

  constructor(llm: LLMClient) {
    this.llm = llm
    this.temperature = floatEnv('HD_PLAN_LLM_TEMPERATURE', 0.2)
    this.maxTokens = intEnv('HD_PLAN_LLM_MAX_TOKENS', 2000)
    this.minEvents = intEnv('HD_PLAN_MIN_EVENTS', 10)
    this.minTypes = intEnv('HD_PLAN_MIN_DISTINCT_TYPES', 2)
  }

  async generate(childId: ObjectId, kind: PlanLLMKind, window = defaultWindow()): Promise<GeneratePlanResult> {
    const t0 = Date.now()
    const { from, to } = window
    // Build context
    const byType = await EventsRepo.countByTypes(childId, from, to)
    const eventCount = Object.values(byType).reduce((a, b) => a + b, 0)
    const distinctTypes = Object.keys(byType).length
    const child = await ChildrenRepo.findById(childId)
    const ageInMonths = child?.birthdate instanceof Date ? monthsBetween(child.birthdate as Date, to) : undefined
    const context = { childId: String(childId), window: { from: from.toISOString(), to: to.toISOString() }, byType, eventCount, distinctTypes, ageInMonths }
    log('context_built', { childId: String(childId), eventCount, distinctTypes, ageInMonths })
    const ctxLog: any = {
      childId: String(childId),
      planType: kind,
      eventCount,
      typesCount: distinctTypes,
      dateRange: { from: from.toISOString(), to: to.toISOString() },
      gateStatus: 'passed',
      ragSources: [],
    }
    if (typeof ageInMonths === 'number') ctxLog.ageInMonths = ageInMonths
    logPlan('context', ctxLog)

    // Sanity gate
    if (eventCount < this.minEvents || distinctTypes < this.minTypes || typeof ageInMonths !== 'number' || ageInMonths < 0) {
      const t1 = Date.now()
      const reason = eventCount < this.minEvents
        ? 'not_enough_events'
        : distinctTypes < this.minTypes
          ? 'not_enough_distinct_types'
          : 'invalid_age'
      log('gate_denied', { reason, eventCount, distinctTypes, ageInMonths })
      const denyLog: any = {
        childId: String(childId),
        planType: kind,
        eventCount,
        typesCount: distinctTypes,
        dateRange: { from: from.toISOString(), to: to.toISOString() },
        gateStatus: 'failed',
        reason,
      }
      if (typeof ageInMonths === 'number') denyLog.ageInMonths = ageInMonths
      logPlan('gate_denied', denyLog)
      incPlanAborted(kind, reason)
      return { ok: false, error: 'insufficient_data', reason, attempts: 0, inference_ms: t1 - t0 }
    }

    // Build prompt and call LLM
    const prompt = buildPrompt(kind, context)
    const attempts: string[] = []
    // Inference start (no prompt or raw outputs logged)
    logPlan('inference_start', { childId: String(childId), planType: kind, model: process.env.HD_PLAN_LLM_MODEL, provider: process.env.HD_LLM_PROVIDER })

    const infer = async (retry: boolean): Promise<PlanLLMOutput | null> => {
      const p = retry ? `${prompt}\n\nCorrige el JSON: debe cumplir el esquema y ser válido estrictamente.` : prompt
      let raw: string
      try {
        raw = await this.llm.complete({ prompt: p, temperature: this.temperature, maxTokens: this.maxTokens })
      } catch (e: any) {
        log('model_error', { message: e?.message })
        return null
      }
      attempts.push(raw)
      try {
        const parsed = JSON.parse(raw)
        const out = planOutputSchema.parse(parsed)
        return out
      } catch (e: any) {
        log('validation_error', { retry, message: e?.message })
        incValidationFailed()
        return null
      }
    }

    const first = await infer(false)
    if (first) {
      const t1 = Date.now()
      logPlan('inference_end', { childId: String(childId), planType: kind, attempts: 1, ms: t1 - t0 })
      log('success', { attempts: 1, ms: t1 - t0 })
      observeLLMDuration(t1 - t0)
      incPlanGenerated(kind)
      return { ok: true, output: first, attempts: 1, inference_ms: t1 - t0 }
    }
    const second = await infer(true)
    const t2 = Date.now()
    if (second) {
      logPlan('inference_end', { childId: String(childId), planType: kind, attempts: 2, ms: t2 - t0 })
      log('success', { attempts: 2, ms: t2 - t0 })
      observeLLMDuration(t2 - t0)
      incPlanGenerated(kind)
      return { ok: true, output: second, attempts: 2, inference_ms: t2 - t0 }
    }
    logPlan('inference_end', { childId: String(childId), planType: kind, attempts: attempts.length, ms: t2 - t0 })
    log('abort', { reason: 'validation_failed', attempts: attempts.length, ms: t2 - t0 })
    incPlanAborted(kind, 'validation_failed')
    return { ok: false, error: 'validation_failed', attempts: attempts.length, inference_ms: t2 - t0 }
  }
}
