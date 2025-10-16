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

