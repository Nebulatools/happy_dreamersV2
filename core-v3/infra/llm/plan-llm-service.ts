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

type GenerateOptions = {
  allowSurveyOnly?: boolean
  surveyData?: Record<string, unknown> | null
  surveyComplete?: boolean
  extraContext?: Record<string, unknown>
}

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

function sanitizeSurveyData(input: unknown, depth = 0): Record<string, unknown> | undefined {
  if (!input || typeof input !== 'object' || depth > 4) return undefined
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (value === undefined || value === null) continue
    if (typeof value === 'function') continue
    if (Array.isArray(value)) {
      out[key] = value
        .slice(0, 50)
        .map((item) => {
          if (item === null || item === undefined) return null
          if (typeof item === 'object') return sanitizeSurveyData(item, depth + 1)
          if (typeof item === 'string') return item.slice(0, 500)
          return item
        })
    } else if (typeof value === 'object') {
      const nested = sanitizeSurveyData(value, depth + 1)
      if (nested && Object.keys(nested).length > 0) out[key] = nested
    } else if (typeof value === 'string') {
      out[key] = value.slice(0, 1000)
    } else {
      out[key] = value
    }
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function buildPrompt(kind: PlanLLMKind, payload: any): string {
  const schemaHint = {
    planType: 'initial | event_based | transcript_refinement',
    title: 'string',
    summary: 'string (2-3 oraciones máximo)',
    schedule: {
      bedtime: 'HH:MM',
      wakeTime: 'HH:MM',
      meals: [{ time: 'HH:MM', type: 'desayuno|comida|cena|snack', description: 'string' }],
      activities: [{ time: 'HH:MM', activity: 'string', duration: 'minutos', description: 'string' }],
      naps: [{ time: 'HH:MM', duration: 'minutos', description: 'string opcional' }],
    },
    objectives: ['string'],
    recommendations: ['string'],
    window: { from: 'ISO string', to: 'ISO string' },
    metrics: { eventCount: 'number', distinctTypes: 'number', byType: 'record', ageInMonths: 'number' },
    metadata: { ragSources: ['string'], notes: 'string opcional' },
  }
  return `Eres un asesor experto en sueño infantil.
Debes generar un plan "${kind}" siguiendo exactamente el esquema indicado.

Reglas:
- Si la información es insuficiente responde EXACTAMENTE {"error":"insufficient_data","reason":"<causa>"}.
- Si hay datos suficientes, responde con un JSON estrictamente válido que cumpla el siguiente esquema: ${JSON.stringify(schemaHint)}.
- Usa horarios en formato 24h HH:MM y mantén actividades realistas para la edad.
- Las recomendaciones deben ser concretas, accionables y alineadas con la encuesta y métricas.
- No escribas texto adicional fuera del JSON.

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

  async generate(childId: ObjectId, kind: PlanLLMKind, window = defaultWindow(), options: GenerateOptions = {}): Promise<GeneratePlanResult> {
    const t0 = Date.now()
    const { from, to } = window
    // Build context
    const byType = await EventsRepo.countByTypes(childId, from, to)
    const eventCount = Object.values(byType).reduce((a, b) => a + b, 0)
    const distinctTypes = Object.keys(byType).length
    const child = await ChildrenRepo.findById(childId)
    const ageInMonths = child?.birthdate instanceof Date ? monthsBetween(child.birthdate as Date, to) : undefined
    const surveyDataFromOptions = options.surveyData ?? (child && typeof (child as any)?.surveyData === 'object' ? (child as any).surveyData : undefined)
    const sanitizedSurvey = sanitizeSurveyData(surveyDataFromOptions)
    const context: Record<string, unknown> = {
      childId: String(childId),
      window: { from: from.toISOString(), to: to.toISOString() },
      byType,
      eventCount,
      distinctTypes,
      ageInMonths,
    }
    if (sanitizedSurvey) context.surveyData = sanitizedSurvey
    if (options.extraContext) context.extra = options.extraContext
    context.flags = {
      allowSurveyOnly: options.allowSurveyOnly === true,
      surveyComplete: options.surveyComplete === true,
      eventsAvailable: eventCount > 0,
    }
    log('context_built', { childId: String(childId), eventCount, distinctTypes, ageInMonths, surveyIncluded: !!sanitizedSurvey, surveyComplete: options.surveyComplete === true })
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
    const gateFailed = eventCount < this.minEvents || distinctTypes < this.minTypes || typeof ageInMonths !== 'number' || ageInMonths < 0
    const allowSurveyBypass = kind === 'initial' && options.allowSurveyOnly === true
    if (gateFailed && !allowSurveyBypass) {
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
    if (gateFailed && allowSurveyBypass) {
      logPlan('gate_bypassed', {
        childId: String(childId),
        planType: kind,
        reason: 'survey_only',
        eventCount,
        typesCount: distinctTypes,
      })
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
