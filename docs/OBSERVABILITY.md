Observability (v2)

Overview
- Structured logs for API v2 with correlation id and latency
- Simple in‑memory metrics for counters and endpoint latency
- Pluggable adapters for APM/export (console by default)

Logging
- Correlation: `X-Request-Id` header; also included in structured logs under `rid`
- Fields: `rid`, `method`, `path`, `status`, `latencyMs`, `user` (hashed)
- Redaction: `safeLog()` sanitizes known sensitive keys; do not log tokens/PII
- Plan generation logs include: `eventCount`, `distinctTypes`, `ageInMonths`, window `from/to`

Metrics
- Counters: `plans_generated_total{planType}`, `plans_aborted_total{planType,reason}`, `plan_validation_failed_total`, `rag_context_hits_total`, `rag_context_misses_total`
- Endpoint latency: observed per route with count/avg/p95
- LLM durations: count/avg/p95

Health Endpoint
- `GET /api/v2/health?metrics=1` returns a JSON snapshot:
  `{ counts: {...}, llm_durations: {count,avg,p95}, endpoint_latency: { "/api/v2/...": {count,avg,p95} } }`

APM/Export
- Default console logger via `safeLog()`
- Adapters can be added to `core-v3/observability/*` to export to a metrics system or APM; wrap sensitive data with `sanitize()` and hash ids as needed

PII Policy
- Never log raw emails, tokens, addresses, or content. Use `hashId()` for user/child identifiers.
- Avoid logging raw transcripts; prefer derived counts/statistics.

