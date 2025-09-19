**Happy Dreamers — Auditoría de Código y Estructura (CODEX_AUDIT_HD)**

- Fecha: 2025-09-18
- Alcance: Código fuente, dependencias, estructura del repo, consistencia de nombres, duplicados, datos/DB (esquemas), configuración de build/test, seguridad básica.

**Resumen Ejecutivo**
- Se identificó una inconsistencia crítica en la capa de datos: coexistencia de dos clientes de Mongo (nativo y Mongoose) con uso mixto en endpoints. Un endpoint clave usa modelos Mongoose pero conecta con el cliente nativo, lo que puede fallar en runtime o provocar estados incoherentes.
- La build de Next ignora errores de TypeScript y ESLint, abriendo la puerta a regresiones y deuda técnica silenciosa.
- Existen dependencias probablemente no utilizadas (p.ej. bcrypt, multer, mammoth, faiss-node, kerberos, socks, mongodb-client-encryption, @mongodb-js/zstd, gcp-metadata). También hay duplicidad/confusión (bcrypt vs bcryptjs; @types/mongoose con mongoose v8).
- Hay archivos de respaldo dentro del árbol de código (”.backup”) y datos sensibles/PII en el repo (CSV y .env versionado en algún punto), riesgos de seguridad y confusión.
- Varias cadenas en español presentan problemas de codificación (mojibake), lo que afecta legibilidad y consistencia.

**Riesgos Clave (Prioridad Alta)**
- Data layer inconsistente: coexistencia de `lib/mongodb.ts` (driver nativo) y `lib/mongoose.ts` (Mongoose), con endpoints usando modelos Mongoose sin conectar Mongoose:
  - `app/api/reports/professional/route.ts` importa `dbConnect` desde `@/lib/mongodb` pero usa `ProfessionalReport`, `User`, `Child` (modelos Mongoose). `lib/mongodb` exporta un `clientPromise` (driver nativo), no una conexión Mongoose. Esto es fuente de errores de conexión y de comportamiento no determinista.
  - No se encontraron imports activos de `@/lib/mongoose`, por lo que los modelos Mongoose no tendrían conexión iniciada.
- Build relajada: `next.config.mjs` desactiva validaciones críticas
  - `eslint.ignoreDuringBuilds: true` y `typescript.ignoreBuildErrors: true` impiden que el pipeline detenga builds con problemas reales.
- Secretos y datos sensibles en repo:
  - `.env` presente en raíz. Aunque `.gitignore` contiene `.env*`, el archivo apareció en el árbol actual; si fue versionado, se recomienda rotación de credenciales y purgar historial.
  - Archivo CSV con datos: `bernardo prueba happy dreamers.csv`. Debe salir del repo y, de requerirse, moverse a almacenamiento seguro.
- Múltiples lockfiles: `package-lock.json` y `pnpm-lock.yaml` coexistentes. Debe elegirse un único package manager para evitar instalaciones inconsistentes.
- Archivos de respaldo dentro del código fuente:
  - `components/calendar/MonthLineChart.tsx.backup`
  - `app/dashboard/calendar/page.tsx.backup`
  Mantener estos archivos en el árbol de código puede causar confusión de imports o mantenimiento.

**Estructura del Proyecto (Observaciones)**
- Monorepo Next.js con App Router y TypeScript. Carpetas principales: `app/`, `components/`, `lib/`, `hooks/`, `models/`, `types/`, `scripts/`, `testing/`, `__tests__/`, `docs/`, `pruebas/`, `session-archive/`, `web-bundles/`.
- Positivos:
  - Tests presentes con Jest y React Testing Library (`__tests__`), configuración razonable y `coverageThreshold` definido.
  - Uso extendido de Zod para validación (`lib/api-middleware.ts`, varios formularios) y de alias de paths (`@/*`).
  - Modelos Mongoose con índices definidos (p.ej. `models/SleepSession.ts`), buenas prácticas de timestamps, virtuals y hooks.
- Oportunidades de orden/consistencia:
  - Capa de datos duplicada: `lib/mongodb.ts` (driver nativo) versus `lib/mongoose.ts` (Mongoose). Decidir por UNA estrategia y alinear todos los endpoints.
  - Archivos de “experimentos/diagnóstico” y documentos extensos (`docs/`, `pruebas/`, `session-archive/`) conviene excluirlos del alcance de builds/tests y mantenerlos fuera de rutas que el bundler pueda tocar.
  - Mezcla de idiomas en nombres y comentarios (ES/EN) y mojibake en acentos (p.ej. “Cesǭrea”). Recomendar UTF-8 y convención idiomática consistente (idealmente inglés en código, español en UI/labels si aplica).

**Convenciones de Nombres**
- Componentes y archivos React: mayormente PascalCase (correcto). Rutas en `app/` con kebab/lowercase (correcto en Next). Mezcla de español/inglés en nombres de archivos y símbolos; definir guía (por ejemplo, código en inglés, textos/labels en español) y aplicarla.
- Nombres de import confusos detectados: `import dbConnect from "@/lib/mongodb"` siendo en realidad `clientPromise` (driver nativo). Debe renombrarse a `clientPromise` o `connectToDatabase` y, si se usa Mongoose, importar desde `lib/mongoose`.

**Duplicados y Archivos de Respaldo**
- Detectados:
  - `components/calendar/MonthLineChart.tsx.backup`
  - `app/dashboard/calendar/page.tsx.backup`
- Recomendación: mover a `archive/` o eliminarlos si su contenido ya está integrado. Evitar sufijos `.backup` en el árbol fuente.

**Dependencias (Auditoría y Hallazgos)**
- Duplicadas/Redundantes/Confusas:
  - `bcrypt` y `bcryptjs` simultáneamente. El código usa `bcryptjs` (`lib/auth.ts`, `models/User.ts`, endpoints de auth). `bcrypt` (nativo) no tiene usos; remover para evitar binarios innecesarios.
  - `@types/mongoose` con `mongoose@^8`. Mongoose ≥ v6 incluye types; `@types/mongoose` es innecesario y, además, apunta a v5. Remover.
  - `@types/multer` en `dependencies`. Si se usa, mover a `devDependencies`. Sin usos detectados de `multer`; considerar eliminar ambos.
- Probablemente no usadas (no se hallaron referencias en código fuente):
  - `multer`, `mammoth`, `faiss-node`, `kerberos`, `socks`, `mongodb-client-encryption`, `@mongodb-js/zstd`, `gcp-metadata`.
  - Nota: `snappy` y `@mongodb-js/zstd` son opcionales para compresión del driver; sólo mantener si se confirma su beneficio en despliegue.
- Usadas correctamente (muestras):
  - AI/LLM: `ai`, `@ai-sdk/openai`, `@langchain/*`, `@google/generative-ai` (en rutas RAG y `lib/ai-loader.ts`).
  - UI: `@radix-ui/*`, `tailwindcss`, `lucide-react`, `recharts` (gráficas), `framer-motion`.
  - PDF: `jspdf`, `html2canvas` (`lib/pdf-generator.ts`).
  - Validación: `zod`, `@hookform/resolvers`.
- Package manager: coexisten `pnpm-lock.yaml` y `package-lock.json`. Recomendar quedarse con uno (idealmente pnpm si ya se usa) y borrar/ignorar el otro.

**Base de Datos y Esquemas**
- Drivers/ORM:
  - `lib/mongodb.ts` implementa `MongoClient` con pooling y utilidades (ping/stats). Es el utilizado de forma predominante por los endpoints.
  - `lib/mongoose.ts` implementa conexión Mongoose con opciones en su mayoría obsoletas en Mongoose 8 (`useNewUrlParser`, `useUnifiedTopology`, `bufferMaxEntries`, etc.). No se encontró uso activo del conector Mongoose.
  - Modelos Mongoose presentes: `models/User.ts`, `models/Child.ts`, `models/SleepSession.ts`, `models/professional-report.ts` con índices y hooks. Si se decide seguir con driver nativo, estos modelos deben migrarse a repositorios/queries nativas y eliminarse; si se decide por Mongoose, hay que conectar correctamente y usar `lib/mongoose.ts` (limpiando opciones deprecadas).
- Inconsistencias de tipos y campos:
  - Mezcla de `string` y `Date` para fechas/horas (p.ej., `types/models.ts` usa `birthDate: string`, `SleepSession` usa `Date`). Estandarizar a `Date`/ISO en almacenamiento y normalizar en el borde de la API con Zod.
  - Claves foráneas como `childId`, `userId` alternan entre `string` y `ObjectId` en tipos. Definir una convención clara (usar `ObjectId` en DB y cast controlado en DTOs).
- Índices:
  - `SleepSessionSchema.index({ childId: 1, startTime: -1 })` y otros: correcto. Si se migra al driver nativo, replicar `createIndexes` en scripts de migración.

**Auditoría de Base de Datos (dump/happy-dreamers)**
- Fuente: `dump/happy-dreamers/*.metadata.json` (mongodump; ServerVersion 8.0.13).
- Colecciones detectadas:
  - `users` (con índice único en `email`).
  - `children`.
  - `userChildAccess`.
  - `pendingInvitations`.
  - `events`.
  - `childplans` y `child_plans` (nombres duplicados del mismo dominio, ver abajo).
  - `sleepPlans` (tercer nombre para “planes”, inconsistente con los dos anteriores).
  - `consultation_reports`, `consultation_transcripts`.
  - `documents_metadata`.
  - `vector_documents`.
  - `notificationlogs`.
  - `surveys`.

- Observaciones y hallazgos:
  - Duplicidad/convergencia de dominios “planes”:
    - Existen tres colecciones que aparentan representar planes: `childplans`, `child_plans` y `sleepPlans`.
    - Recomendación: unificar en una sola colección canónica, p.ej. `child_plans` (snake_case) o `plans`, con un campo `type`/`category` para distinguir subtipos si aplica. Migrar datos de las otras y crear vistas/aliases temporales si se requiere compatibilidad.
  - Convenciones de nombres inconsistentes:
    - Mezcla snake_case y camelCase: `userChildAccess`, `pendingInvitations`, `notificationlogs` (este último además sin separador), mientras que otras usan snake_case (`consultation_reports`).
    - Recomendación: adoptar snake_case consistente para colecciones: `user_child_access`, `pending_invitations`, `notification_logs`, `documents_metadata` (ya ok), `vector_documents` (ok).
  - Índices insuficientes:
    - La mayoría de colecciones sólo tienen índice por `_id`. Sólo `users` tiene `email_1` único. Esto no es acorde al patrón de consultas del código.
    - Recomendaciones de índices (mínimos):
      - `events`: `{ childId: 1, startTime: -1 }` compuesto; `{ userId: 1, startTime: -1 }`; `{ type: 1, startTime: -1 }` si se filtra por tipo; considerar índice parcial por tipos frecuentes.
      - `children`: `{ parentId: 1, _id: 1 }`; `{ 'sharedWith': 1 }` (si se consulta por accesos compartidos, quizá con `sharedWith.$**` o índice multikey).
      - `user_child_access` (o su nombre actual): índice compuesto único `{ userId: 1, childId: 1 }` para evitar duplicados; índices separados `{ childId: 1 }`, `{ userId: 1 }` para listados.
      - `pending_invitations`: `{ childId: 1 }`, `{ email: 1 }`, y opcional TTL en `expiresAt` si aplica.
      - `consultation_reports`: `{ childId: 1, updatedAt: -1 }`, `{ professionalId: 1, status: 1, updatedAt: -1 }`, `{ userId: 1, 'privacy.parentCanView': 1 }`.
      - `consultation_transcripts`: `{ childId: 1, createdAt: -1 }`, `{ reportId: 1 }` si se relaciona.
      - `documents_metadata`: `{ driveFileId: 1 }` (único), `{ userId: 1, createdAt: -1 }`, `{ childId: 1, createdAt: -1 }`.
      - `vector_documents`: índice vectorial/Atlas Search según uso (embedding field). Validar que el índice de búsqueda (Atlas Search/Vector) exista en el cluster; mongodump no siempre incluye esa definición.
      - `surveys`: `{ childId: 1, createdAt: -1 }`.
      - `notification_logs`: `{ userId: 1, createdAt: -1 }`; considerar TTL en `createdAt` para retención limitada.
      - `users`: mantener `{ email: 1 }` único; agregar `{ role: 1 }` si se filtra.
  - Integridad de referencias:
    - Alinear tipos a `ObjectId` para `childId`, `userId`, `professionalId` en todas las colecciones. Validar/corregir documentos existentes que contengan cadenas en vez de `ObjectId`.
  - Políticas de retención:
    - `notificationlogs` y quizá `consultation_transcripts` pueden beneficiarse de índices TTL si existe un SLA de retención.
  - Cohesión de nombres vs código:
    - El modelo `ProfessionalReport` (Mongoose) mapea semánticamente a `consultation_reports`. Alinear nombres entre código y colección para evitar confusión (p.ej. `professional_reports`).

- Acciones propuestas sobre la base de datos:
  1) Estandarizar nombres de colecciones (snake_case) y consolidar “planes” en una sola colección. Preparar script de migración (rename + copy + backfill) con verificación de contaje.
  2) Crear índices compuestos de acuerdo a patrones de consulta (ver arriba). Documentar en `docs/DATABASE.md` y automatizar con un script `scripts/create-indexes.ts`.
  3) Auditar tipos de campos `*_Id` y fechas; migrar a `ObjectId` y `Date` coherentes. Añadir validaciones en API (Zod) y validaciones a nivel de BD si procede.
  4) Definir y aplicar políticas de retención (TTL) para logs y transcripciones si el negocio lo permite.
  5) Validar en el cluster la existencia de índices de Vector/Atlas Search para `vector_documents` y mantener su definición versionada (JSON de índice) en `infra/` o `docs/`.

**Validación, Seguridad y Configuración**
- Validación:
  - Zod se usa activamente en formularios y en `lib/api-middleware.ts`. Sólo algunos endpoints (p.ej. `app/api/children/v2/route.ts`) usan el middleware. Recomendar estandarizar: todos los endpoints deberían validar body/query/params.
- Seguridad de headers/config:
  - `vercel.json` incluye headers seguros y límites de funciones. Bien.
  - `next.config.mjs` añade `Permissions-Policy` vía Vercel; revisar consistencia entre ambos mecanismos.
- Gestión de secretos:
  - `.env` en raíz y potencialmente versionado en algún momento. Rotar claves, mover a `.env.local` y asegurar exclusión. Confirmar que nunca se desplieguen secretos no cifrados en logs/tests.
- Datos sensibles:
  - `bernardo prueba happy dreamers.csv` en raíz. Remover del repo y almacenar en ubicación segura.

**Testing y CI**
- Jest configurado con `next/jest`, `jsdom` y umbrales de cobertura 80%. Positivo.
- Recomendación:
  - Añadir workflow de CI que ejecute: `npm run lint:strict`, `npm run type-check`, `npm run test:ci` y build. Desactivar `ignoreDuringBuilds` e `ignoreBuildErrors` para producción/CI.
  - Tests de integración para endpoints críticos (auth, eventos, reports) con fixtures de datos.

**Problemas de Codificación (Encoding)**
- Se observan múltiples cadenas con caracteres corruptos (mojibake) en español: ejemplos en `models/*`, `components/*`, `lib/event-types.ts` (p.ej., “Cesǭrea”, “Biber��n”). Estandarizar a UTF-8 sin BOM y revisar el editor/commit encoding.

**Recomendaciones Accionables (Plan por Fases)**

- Fase 0 (0–1 día) — Hotfixes críticos
  - Corregir `app/api/reports/professional/route.ts` para que conecte con Mongoose si se mantendrán modelos Mongoose: `import dbConnect from '@/lib/mongoose'` y asegurar `await dbConnect()`. Alternativamente, migrar este endpoint a driver nativo de Mongo y dejar de usar modelos Mongoose.
  - Eliminar dependencias claramente no usadas: `bcrypt`, `@types/mongoose`, `multer`, `@types/multer` (si no se usa), `mammoth`, `faiss-node`, `kerberos`, `socks`, `mongodb-client-encryption`, `@mongodb-js/zstd`, `gcp-metadata` (validar cada una antes de remover si hay usos indirectos/infra).
  - Elegir un package manager (recom.: pnpm) y borrar el lockfile del otro (`package-lock.json`). Ajustar README/scripts si aplica.
  - Mover/eliminar archivos `.backup` del árbol fuente.
  - Remover `bernardo prueba happy dreamers.csv` del repo (y de la historia si contiene PII). Confirmar borrado seguro.
  - Revisar `.env` y rotar secretos si hubo exposición.

- Fase 1 (1–3 días) — Consolidación de arquitectura
  - Decidir estrategia de acceso a datos: Mongoose vs driver nativo.
    - Si Mongoose: usar `lib/mongoose.ts` en TODOS los endpoints que accedan a DB, eliminar `lib/mongodb.ts`, y actualizar opciones de conexión quitando flags deprecadas (Mongoose 8).
    - Si driver nativo: remover modelos Mongoose y convertir consultas a repositorios/servicios nativos, incluyendo creación de índices con scripts.
  - Habilitar validaciones de build: en `next.config.mjs` poner `ignoreDuringBuilds: false` y `ignoreBuildErrors: false` (al menos en producción/CI).
  - Añadir middleware de validación (Zod) a todos los endpoints con esquemas específicos por ruta.
  - Normalizar encoding UTF-8 y corregir textos con caracteres dañados.

- Fase 2 (1–2 semanas) — Calidad y robustez
  - Revisar y documentar esquema de datos canónico en `docs/DATABASE.md` actualizado según la capa elegida (tipos, índices, relaciones, migraciones).
  - Añadir pruebas de integración para rutas de negocio principales (niños, eventos, planes, reports) con datos semilla.
  - Estandarizar convención de nombres (idioma, casing, sufijos/prefijos), y crear `CONTRIBUTING.md`/`CODING_STANDARDS.md`.
  - Incorporar auditoría de dependencias y pruning en CI (p.ej., `pnpm dedupe`, `pnpm prune`, `npm audit` según el manager), con aprobación para upgrades mayores.

**Detalle de Evidencias (rutas relevantes)**
- Data layer
  - Uso de driver nativo: múltiples rutas importan `@/lib/mongodb` (p.ej. `app/api/children/route.ts`, `app/api/rag/chat/route.ts`, `lib/auth.ts`).
  - Endpoint con Mongoose + cliente nativo (inconsistente): `app/api/reports/professional/route.ts`.
  - Modelos Mongoose: `models/User.ts`, `models/Child.ts`, `models/SleepSession.ts`, `models/professional-report.ts`.
- Backups/duplicados
  - `components/calendar/MonthLineChart.tsx.backup`
  - `app/dashboard/calendar/page.tsx.backup`
- Configuración build relajada
  - `next.config.mjs` con `eslint.ignoreDuringBuilds: true` y `typescript.ignoreBuildErrors: true`.
- Dependencias duplicadas/no usadas (ejemplos): definidas en `package.json`; usos de `bcryptjs` sí existen (no de `bcrypt`). `multer`, `mammoth`, `faiss-node`, `kerberos`, `socks`, `mongodb-client-encryption`, `@mongodb-js/zstd`, `gcp-metadata` sin referencias en código.
- Datos sensibles
  - `.env` presente en raíz.
  - CSV de datos: `bernardo prueba happy dreamers.csv`.
- Encoding con mojibake
  - Cadenas afectadas en `models/*`, `components/*`, `lib/event-types.ts`, etc.

**Checklist sugerido para la primera iteración**
- [ ] Corregir capa de datos en `app/api/reports/professional/route.ts` (elegir Mongoose vs driver nativo y aplicar consistentemente).
- [ ] Rehabilitar validaciones de build (TS/ESLint) en CI/prod.
- [ ] Limpiar dependencias no usadas y duplicadas (con PR dedicado).
- [ ] Unificar package manager y lockfile.
- [ ] Mover/eliminar backups `.backup` del árbol de código.
- [ ] Remover archivos con PII y rotar secretos si hubo exposición.
- [ ] Normalizar encoding a UTF-8 y arreglar textos corruptos.
- [ ] Documentar la guía de estilos/nombres y la arquitectura de datos elegida.

— Fin del reporte —
