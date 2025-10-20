Security
========

RBAC
- NextAuth-based; sessions required on v3 endpoints.
- Roles supported: `admin`, `parent`. See `core-v3/api/rbac.ts` for access policy.

Rate Limiting
- In-memory limiter per node process; per user/IP and per endpoint key.
- Functions: `getUserOrIPKey`, `shouldRateLimit`, `rateLimitResponse` in `core-v3/security/rate-limit.ts`.
- Applied to plan generation endpoints and admin sync routes.

Sanitized Logging
- `core-v3/security/sanitize.ts` redacts sensitive keys: passwords, tokens, secrets, CRON_SECRET, SMTP_PASS, emails, etc.
- Use `safeLog(scope, event, data)` for structured logs.

Headers & CORS
- Middleware adds security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy) to `/api/v3/*`.
- CORS allowlist configurable via `HD_V3_CORS_ORIGIN`.

Secret Management
- Provision via environment/secret stores (e.g., GitHub Secrets, provider secrets). Never commit.
- LLM keys, DB URIs, CRON_SECRET stay server-side; not exposed to clients.

Admin Endpoints
- Protected by role `admin` and rate limits.
- Cron endpoint additionally supports `x-cron-secret: CRON_SECRET`.

Testing Notes
- Unit tests may use `x-test-role`/`x-test-user-id` headers under controlled environments.

