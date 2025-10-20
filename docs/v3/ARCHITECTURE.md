V3 Architecture
===============

Overview
- Pattern: Strangler. v3 lives under `core-v3/*` and toggles via `HD_V3_ENABLED` and compatibility routers under `/api/plans/*`.
- Canonical data: `events` collection. `children.events[]` is optional/derived and synchronized explicitly.
- Single DB pool: `core-v3/infra/db.ts`.
- Invariants (domain): dates are `Date` (no ISO string comparisons), ids are `ObjectId` internally, types validated with Zod.

Structure
- Domain: `core-v3/domain/*`
  - Entities and DTOs: `entities.ts`, `schemas.ts`
  - Plan Engine: `plan-engine.ts` (gates and context)
  - Plan Output Schema: `plan-output-schema.ts` (Zod)
- Infra: `core-v3/infra/*`
  - Repos (DAL): `infra/repos/*.repo.ts` (Date vs Date only)
  - LLM Service: `infra/llm/plan-llm-service.ts` (deterministic, strict JSON)
  - Sync: `infra/sync-service.ts` (drift detect/repair)
  - Indexes: `infra/indexes.ts`
- API:
  - v3 endpoints under `app/api/v3/*`
  - Compatibility routers under `app/api/plans/*` (decide v2/v3 by flags/percentage)
- Security: `core-v3/security/*` (RBAC, rate limit, sanitize)
- Observability: `core-v3/observability/*` (logger, metrics)
- Migrations: `core-v3/migrations/*` (dry-run/apply)

Plan Flows
- Plan 0 (initial)
  - Gate: sanity (min events N, min distinct types K, valid age)
  - Context: count by type in default window (30d configurable), age in months
  - LLM: temperature ~0.2, strict JSON schema, one retry if validation fails
  - Persist: create plan, mark previous as `superseded` (except refinements)

- Plan N (event_based)
  - Base: last plan by createdAt (non-refinement)
  - Gate: requires new events since base, then sanity gate
  - LLM/persist: same as Plan 0; `planNumber` increments, `planVersion=0`

- Plan N.1 (transcript_refinement)
  - Requires transcript after the base plan creation time
  - Sanity gate optional (toggle)
  - `planNumber` same as base, `planVersion` increments; does not supersede base

Sync Model (Events ←→ children.events[])
- Canonical: `events`
- Embedded: `children.events[]` kept for UI/operational needs, repaired from canonical
- Services: `detectDriftForChild`, `repairEmbeddedFromCanonical`, `syncAllChildren`
- Cron: `/api/v3/admin/sync/run` with `x-cron-secret: CRON_SECRET`; idempotent and rate-limited

Rollout and Gating
- Feature flags: `HD_V3_ENABLED`, percentage `HD_V3_PERCENT`
- Compatibility wrappers for `/api/plans/*` route to v3 by percentage; headers to force/disable per request
- Metrics: route_v3_total / route_legacy_total by endpoint; summary endpoint `/api/v3/admin/rollout/metrics`

Observability
- Logs: `PlanObs` (childId, planType, eventCount, typesCount, dateRange, ageInMonths, gateStatus)
- Metrics: plans generated/aborted, LLM durations (avg/p95), validation failures, sync drift/repairs

