# Bug Center - Operaciones

## Checar Bug Reports (flujo rapido)

Cuando el usuario diga "checa el bug center" o "que reporto Mariana":

### Paso 1: Consultar MongoDB produccion
```bash
node scripts/check-bug-reports.mjs --prd
```

### Paso 2 (opcional): Buscar report especifico
```bash
node scripts/check-bug-reports.mjs <objectId>
# Busca en todas las DBs automaticamente si no lo encuentra en la principal
```

### Paso 3 (opcional): Verificar en Sentry
1. Ir a https://ezyai.sentry.io (login Google: 3zyai.pr0@gmail.com)
2. Issues > Feed > quitar filtro `is:unresolved`
3. Buscar "Bug report stored from Bug Center"
4. En Tags: feature=bug-center, role, route, requestTraceId
5. En Context: reportId para correlacionar con MongoDB

## Bases de datos

| Ambiente | DB Name | Variable Vercel |
|----------|---------|-----------------|
| Local | `jaco_db_ultimate_2025` | MONGODB_DB |
| Produccion | `happy_dreamers_prd01` | MONGODB_DB_FINAL |

CRITICO: Los bug reports de usuarios reales estan en `happy_dreamers_prd01`.
La DB local solo tiene datos de test.

## Donde llega la data

1. **MongoDB** (`happy_dreamers_prd01.bug_reports`) - Reporte completo con titulo, descripcion, logs, contexto
2. **Sentry** (ezyai org) - Mensaje info con tags para correlacion. NO usa Sentry User Feedback nativo.

## Archivos del sistema

| Archivo | Proposito |
|---------|-----------|
| `components/support/BugCenter.tsx` | UI: dialog con formulario |
| `app/api/support/bug-reports/route.ts` | API: guarda en MongoDB + envia a Sentry |
| `scripts/check-bug-reports.mjs` | Script CLI para consultar reports |

## Requisitos para que funcione

- `NEXT_PUBLIC_BUG_CENTER_ENABLED=true` en Vercel
- Rol del usuario: `admin` o `professional`
