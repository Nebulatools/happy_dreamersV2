V3 Documentation Index
======================

Start here. The v3 backend runs in parallel (Strangler) with feature flags and compatibility routing to allow safe rollout.

IMPORTANT: LISTO PARA PRODUCCIÓN (CONDICIONADO)
- Para producción real, configurar un proveedor LLM (por ejemplo OpenAI) y validar el healthcheck: `GET /api/v3/health` debe responder `llmReady: true`.

Contents
- ARCHITECTURE.md — domain, flows Plan 0/N/N.1, sync model
- APIs.md — REST contracts, examples, rate limits
- OPERATIONS.md — runbooks: migrations, cleanup, rollout, incidents
- SECURITY.md — RBAC, rate limit, secrets, CORS/headers
- LLM.md — PlanLLMService parameters, JSON schema, telemetry

Quick Onboarding (< 1 hour)
- Prereqs: Node 20+, MongoDB URI/DB, NextAuth configured.
- Env: set in `.env.local` at repo root:
  - HD_V3_ENABLED=true
  - HD_PLAN_MIN_EVENTS=10, HD_PLAN_MIN_DISTINCT_TYPES=2, HD_PLAN_DEFAULT_WINDOW_DAYS=30
  - Optional: HD_V3_PERCENT=100 to route compat wrappers to v3
- Install & test:
  - `npm ci`
  - `npm test` (all suites should pass; canary validates plan generation pipeline or safe abort)
- Local run:
  - `npm run dev`
  - Health: GET `/api/v3/health`
  - Nota: para entorno productivo, asegúrate que `llmReady:true`.
- Generate a plan (deterministic test path):
  - Without a live LLM provider, use the canary tests: `npm test -t canary` (generates a valid JSON plan via stub).
  - With a provider wired into `PlanLLMService`, call POST `/api/v3/plans/initial` with a valid `childId` and enough data to pass the gate; see APIs.md.
