V3 APIs
=======

Flags and Auth
- `HD_V3_ENABLED=true` must be set to enable v3 endpoints; otherwise they 404.
- RBAC: all v3 endpoints require `admin` or `parent` role (NextAuth session). See SECURITY.md.
- Rate limits apply; 429 returns `{ error: 'rate_limited', retryAfterMs }`.

Compatibility Routers (Strangler)
- Prefer these entry points for rollout; they route to v3 by `HD_V3_PERCENT`:
  - POST `/api/plans/initial` → v3 `/api/v3/plans/initial`
  - POST `/api/plans/progression` → v3 `/api/v3/plans/progression`
  - POST `/api/plans/refinement` → v3 `/api/v3/plans/refinement`
  - GET `/api/plans/:planId` → v3 `/api/v3/plans/:planId`
  - GET `/api/plans/child/:childId/latest` → v3 `/api/v3/plans/child/:childId/latest`
- Overrides per request:
  - Force v3: `x-force-v3: 1`
  - Force legacy: `x-disable-v3: 1`

Endpoints (v3)
1) POST `/api/v3/plans/initial`
- Body: `{ childId: "<24 hex>" }`
- Validations: Zod; gate: min events/types and age; rate limit 5/min/user
- Responses:
  - 200 `{ ok: true, planId, planNumber: 0, planVersion: 0, output, sourceData }`
  - 400 `{ error: 'gate_failed', reason, context }` or `{ error: 'invalid_body' }`
  - 502 `{ error: 'insufficient_data' | 'validation_failed' | 'model_error' }` (LLM path)

2) POST `/api/v3/plans/progression`
- Body: `{ childId: "<24 hex>", afterPlanId: "<24 hex>" }`
- Gate: requires new events since base, then sanity; rate limit 5/min/user
- Response: 200/400/502 similar to above; `planNumber` increments, `planVersion=0`

3) POST `/api/v3/plans/refinement`
- Body: `{ childId: "<24 hex>", basePlanId: "<24 hex>", transcriptId: "string" }`
- Gate: transcript created after base plan; optional sanity; rate limit 8/min/user
- Response: 200/400/502; `planNumber` = base, `planVersion` increments

4) GET `/api/v3/plans/:planId`
- Response: `{ ok: true, plan }` or `{ error: 'not_found' }`

5) GET `/api/v3/plans/child/:childId/latest`
- Response: `{ ok: true, plan }` or `{ error: 'not_found' }`

Admin Sync (v3)
- GET `/api/v3/admin/sync/children` → drift list for all children (admin only)
- POST `/api/v3/admin/sync/child/:childId/verify` → drift report (admin only)
- POST `/api/v3/admin/sync/child/:childId/repair` → repair embedded from canonical (admin only)
- POST `/api/v3/admin/sync/run` → full sync (admin or header `x-cron-secret: CRON_SECRET`)

Rollout Metrics (v3)
- GET `/api/v3/admin/rollout/metrics` → counts of `route_v3_total`/`route_legacy_total` and LLM p95

Examples (curl)
Note: These require an authenticated session cookie (NextAuth). For manual testing, login first and include cookies.

Initial Plan
```
curl -X POST http://localhost:3000/api/plans/initial \
  -H 'Content-Type: application/json' \
  -H 'x-force-v3: 1' \
  --cookie 'next-auth.session-token=...' \
  -d '{ "childId": "65b9a8c9f1e2d3a4b5c6d7e8" }'
```

Latest Plan
```
curl -X GET http://localhost:3000/api/plans/child/65b9a8c9f1e2d3a4b5c6d7e8/latest \
  -H 'x-force-v3: 1' \
  --cookie 'next-auth.session-token=...'
```

Contracts (Zod)
- Request schemas in `core-v3/api/schemas/plans.ts`
- LLM output schema in `core-v3/domain/plan-output-schema.ts`

