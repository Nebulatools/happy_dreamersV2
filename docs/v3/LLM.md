LLM Service (Plan Generation)
=============================

Service
- `core-v3/infra/llm/plan-llm-service.ts` exports `PlanLLMService` with:
  - `generate(childId, kind, window)` → deterministic pipeline with gates and telemetry.
  - Strict JSON output validated by `core-v3/domain/plan-output-schema.ts` (Zod).
  - One automatic retry with correction prompt if validation fails.

Parameters
- Defaults (override via env):
  - `HD_PLAN_LLM_TEMPERATURE` (default 0.2)
  - `HD_PLAN_LLM_MAX_TOKENS` (default 2000)
  - `HD_PLAN_MIN_EVENTS`, `HD_PLAN_MIN_DISTINCT_TYPES`, `HD_PLAN_DEFAULT_WINDOW_DAYS`
- Non-invention clause in prompt: if data is insufficient, reply with `{ "error": "insufficient_data", "reason": "..." }`.

Schema
- Success shape:
  - `{ planType, title, summary, window: { from, to }, metrics: { eventCount, distinctTypes, byType, ageInMonths? }, recommendations: [{ key, action, rationale }] }`
- Failure shape: `{ error: 'insufficient_data', reason }`
- Validated by `planOutputSchema`.

Telemetry
- Logs (`PlanLLMService`): `context_built`, `gate_denied`, `success`, `validation_error`, `abort`.
- Metrics: `plans_generated_total`, `plans_aborted_total`, `plan_validation_failed_total`, and LLM durations (avg/p95 in snapshot).

RAG and Guardrails
- Context includes aggregated counts in a time window and age in months.
- Keep RAG inputs bounded and redacted; never include PII.
- The non-invention clause and schema validation guard against hallucinations.

Provider Integration
- `PlanLLMService` expects an object with `complete({ prompt, temperature, maxTokens }): Promise<string>`.
- Example (pseudo):
```
const llm = { complete: async ({ prompt, temperature, maxTokens }) => {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature,
    max_tokens: maxTokens,
  })
  return res.choices[0].message.content || '{}'
}}
```
- Wire this into the v3 plan endpoints before production use.

Production Note
- LISTO PARA PRODUCCIÓN (CONDICIONADO): Para producción real, configura el proveedor LLM (p. ej., OpenAI con `OPENAI_API_KEY`) y valida `GET /api/v3/health` → `llmReady:true`.
