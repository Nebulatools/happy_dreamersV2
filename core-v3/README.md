# Core v3 (Strangler Pattern)

Objetivo: introducir una capa v3 paralela y segura sin romper producción, usando el patrón Strangler. Todo el código v3 vive en `core-v3/` y se activa gradualmente mediante la variable de entorno `HD_V3_ENABLED`.

## Árbol

```
core-v3/
  api/               # Handlers y helpers de enrutamiento v3
  domain/            # Entidades puras (TypeScript), sin dependencias de infraestructura
  infra/             # Acceso a datos (DAL), mappers, conexión DB única, índices
  migrations/        # Scripts de migración/saneamiento (Node)
  observability/     # Logger estructurado y métricas
  security/          # RBAC, rate limiting, validaciones
  tests/             # Unit / integration (incluye guardas de estilos v3)
  tsconfig.json      # Config aislada para compilar v3
```

## Activación por Feature Flag

- `HD_V3_ENABLED=false` (por defecto): la app sigue funcionando como hoy; los endpoints v3 devuelven 404.
- `HD_V3_ENABLED=true`: los endpoints v3 expuestos responden y pueden usarse para pruebas y adopción gradual.

Helper principal: `core-v3/api/feature-flag.ts` con `isV3Enabled()` y `routeGuard()`.

## Endpoints

- Salud v3: `GET /api/v3/health` → responde `{"ok": true, "message": "v3 up"}` cuando `HD_V3_ENABLED=true` y 404 en caso contrario.

## Decisiones de diseño

- Strangler: v2 y v3 conviven; se redirigen endpoints a v3 de forma selectiva y reversible.
- Single Source of Truth de DB en v3: conexión y repositorios únicos en `core-v3/infra/`.
- Prohibido comparar fechas como string en v3. Las comparaciones deben ser `Date` vs `Date` (tests básicos lo validan).

## Dominio v3: Entidades e Invariantes

Archivos clave:

- `core-v3/domain/entities.ts`: Entidades internas (Child, Event, Plan) con invariantes fuertes.
- `core-v3/domain/schemas.ts`: Esquemas Zod (DTO) para validar payloads en el borde (API).

Invariantes y Verdades del dominio:

- IDs internos como `ObjectId` (Mongo). En el borde/API se reciben como `string` de 24 hex y el DAL los convierte a `ObjectId`.
- Fechas internas siempre `Date`. En el borde se rechazan strings ISO; el caller debe entregar `Date` ya normalizadas.
- `Event.childId: ObjectId`, `Plan.childId: ObjectId`.
- `Event.startTime: Date`, `Event.endTime?: Date` y si existe, `endTime > startTime`.
- Unificación de sueño: `sleep` con `sleepDelay` (0..180 min) y `night_waking` como interrupciones; `bedtime` eliminado.
- `sleepDelay` sólo permitido para eventos `type = 'sleep'`.
- `Plan.planType ∈ { initial, event_based, transcript_refinement }`.

Supuestos operativos:

- Zona horaria IANA opcional por Child (`tz`), usada para normalizar vistas; persistimos `Date` UTC.
- Redondeo mínimo a minuto (si aplica) ocurre en la capa de aplicación antes del guardado.
- `createdAt`/`updatedAt` son obligatorias y siempre `Date`.

## Scripts NPM

- `npm run v3:build` → Compila `core-v3/` con TypeScript (outDir `core-v3/dist`).
- `npm run v3:lint` → Lint de `core-v3/`.
- `npm run v3:migrate` → Ejecuta placeholder de migraciones (no destructivo).
- `npm run v3:seed:canario` → Carga semillas mínimas de prueba.

## Cómo habilitar v3 por endpoint

1) Crea un handler en `core-v3/api/` (p. ej. `plans/get-plan.ts`).
2) Enruta desde Next a ese handler exportándolo en `app/api/v3/.../route.ts`.
3) Envuelve la respuesta con `routeGuard()` para respetar `HD_V3_ENABLED`.

## Pruebas

`core-v3/tests/date-guard.test.ts` realiza una verificación estática simple para asegurar que no haya comparaciones de fechas como strings dentro de `core-v3/`.

`core-v3/tests/domain-schemas.test.ts` valida:

- Rechazo de fechas como string; aceptación de `Date` válidas.
- Rechazo explícito si `childId` no es un ObjectId válido (24 hex).
- Invariante `endTime > startTime`.
- `sleepDelay` sólo para eventos con `type = 'sleep'`.
