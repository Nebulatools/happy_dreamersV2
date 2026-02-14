# Bug Center + Sentry (Fase 1)

## Variables de entorno

Definir estas variables en producción:

```bash
NEXT_PUBLIC_BUG_CENTER_ENABLED=true
NEXT_PUBLIC_SENTRY_DSN=...
SENTRY_DSN=...
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=<git-sha>
SENTRY_ORG=...
SENTRY_PROJECT=...
SENTRY_AUTH_TOKEN=... # opcional para upload de source maps en CI
```

## Roles habilitados

- `admin`
- `professional`

Los demás roles no verán el botón de bug.

## Qué incluye la fase 1

- Botón de bug en header del dashboard.
- Modal de reporte con:
  - título y descripción
  - contexto automático (ruta, usuario, rol, viewport)
  - logs técnicos recientes (server + client)
  - copy diagnóstico
  - envío a colección `bug_reports`
- Captura de errores:
  - React Error Boundary a Sentry
  - logger (`warn`/`error`) a Sentry en producción
  - request errors en `instrumentation.ts`

## Endpoints nuevos

- `GET /api/support/bug-context`
- `POST /api/support/bug-reports`

## Colecciones usadas

- `integration_debug_logs` (lectura saneada)
- `bug_reports` (persistencia de reportes de UI)
