---
title: "Fix Diagnostic Data Pipeline Gaps"
type: fix
status: active
date: 2026-02-26
deepened: 2026-02-26
---

# Fix: Diagnostic Data Pipeline Gaps

## Enhancement Summary

**Deepened on:** 2026-02-26
**Review agents used:** TypeScript Reviewer, Performance Oracle, Security Sentinel, Architecture Strategist, Code Simplicity Reviewer, Pattern Recognition Specialist, Happy Dreamers Skill, Learnings Researcher

### Key Changes from Original Plan

1. **Fix 3 REVISED**: emotionalState como criterio G1 (no campo top-level) — preserva el patron CriterionResult y el alert collector lo detecta automaticamente
2. **Fix 2 REVISED**: Plan context incluido en GET route DiagnosticResult (no segundo DB query en ai-summary) — preserva separacion de capas
3. **Fix 4 SIMPLIFIED**: Sin helper `calculateDailyAverages` — inline la logica, menos abstraccion
4. **Fix 7 SIMPLIFIED**: Medicamentos/actividades — simplificado a extraccion inline en GET route + seccion en prompt (sin interfaces MedicationSummary/ActivitySummary)
5. **Fix 8 DEFERRED**: chatMessages structured — rompe G4 `evaluateRecentChanges()`, riesgo alto para valor bajo
6. **NUEVO**: 2 security blockers, 3 performance fixes, 2 bugs descubiertos por reviewers

### Scope Final: 7 Fixes Activos + 1 Deferred + Security + Performance

---

## Overview

Una auditoria completa del pipeline de datos revelo 2 bugs y 6 gaps en como la informacion fluye desde el survey, eventos y planes hacia el panel de diagnosticos y el Pasante AI. Los datos existen en la BD pero no llegan completos al sistema de analisis.

## Problem Statement

El Pasante AI (GPT-5) recibe informacion incompleta para generar sus analisis:
- **No conoce el plan activo** (solo version/status, no horarios ni objetivos)
- **No conoce el estado emocional** del nino al dormir
- **Conteo de eventos es siempre 7** (bug: pasa criteria count, no event count)
- **G3 Nutricion solo evalua HOY** (pierde 6 dias de datos)
- **Medicamentos y actividades** no llegan al AI (solo en notas free-text)
- **planVersion 0 muestra "1"** (bug: `||` en vez de `??`)
- **Naps no se comparan contra plan** (siempre usa reglas por edad)

## Proposed Solution

7 fixes activos + 1 deferred, organizados en 4 fases. Incluye security blockers y performance optimizations descubiertas por 8 review agents.

## Technical Considerations

### Archivos principales a modificar

| Archivo | Fixes |
|---------|-------|
| `lib/diagnostic/types.ts` | 1, 3, 5, 7 (type changes) |
| `app/api/admin/diagnostics/[childId]/route.ts` | 1, 2, 3, 5, 7, P1, P2, B1 (GET route) |
| `app/dashboard/diagnosticos/[childId]/DiagnosticPanelClient.tsx` | 1, 5 (client reads) |
| `lib/diagnostic/pasante-ai-prompt.ts` | 2, 3, 7 (prompt builder) |
| `app/api/admin/diagnostics/ai-summary/route.ts` | S1, S2, P3 (security + perf) |
| `lib/diagnostic/rules/nutrition-rules.ts` | 4 (7-day window) |
| `lib/diagnostic/rules/schedule-rules.ts` | 6, P2 (nap vs plan + hoist stats) |

### Archivos NUEVOS a crear

| Archivo | Proposito |
|---------|-----------|
| `lib/diagnostic/plan-formatter.ts` | Formatear plan para contexto diagnostico (NO importar de `lib/rag/`) |

### Decisiones tecnicas (REVISADAS por 8 review agents)

1. **emotionalState como criterio G1** (no campo top-level)
   - **Original**: Campo separado en DiagnosticResult
   - **Revision**: El Architecture Strategist y Pattern Recognition coinciden: agregar como criterio `g1_emotional_state` preserva el patron CriterionResult universal. El alert collector ya lo detecta. Un campo top-level rompe la abstraccion y requiere codigo especial en cada consumidor.
   - **Impacto en scoring**: G1 pasa de 7 a 8 criterios. Fix 1 (recentEventsCount) ya no depende de criteria.length, asi que no hay conflicto.

2. **Plan context en GET route** (no en ai-summary)
   - **Original**: ai-summary hace segundo query a `child_plans`
   - **Revision**: Performance Oracle + Architecture Strategist coinciden: incluir `planScheduleSummary?: string` en DiagnosticResult desde el GET route. La route ya tiene el plan cargado. Evita segundo round-trip a BD, preserva ai-summary como funcion pura (recibe datos, genera prompt).
   - **Nuevo archivo**: `lib/diagnostic/plan-formatter.ts` — NO reusar `lib/rag/plan-context-builder.ts` (usa emojis, diferente dominio, acoplamiento cross-module).

3. **G3: Simplificar 7-day approach**
   - **Original**: Helper `calculateDailyAverages()` con logica compleja
   - **Revision**: Code Simplicity dice YAGNI al helper. Inline la logica: filtrar 7 dias, agrupar por dia, promediar. 15 lineas inline vs abstraccion prematura.
   - **Nota del Architecture Strategist**: Considerar mantener hoy-solo para G3 (compliance diaria). Pero el gap de "sin datos" cuando hay 6 dias de datos es un bug real que justifica la ventana.

4. **chatMessages: NO cambiar tipo** (DEFERRED)
   - **Original**: Cambiar `string[]` a structured array
   - **Revision**: Pattern Recognition descubrio que G4 `evaluateRecentChanges()` itera sobre `chatMessages` como strings. Cambiar el tipo rompe G4 silenciosamente. TypeScript Reviewer confirma: `buildFreeTextContext()` haria `[object Object]` si se cambia sin actualizar todos los consumidores.
   - **Decision**: DEFER. Cuando se implemente, agregar `chatMessagesStructured?: Array<{content, role, createdAt}>` como campo adicional (aditivo, no destructivo).

5. **Medicamentos/actividades: SIMPLIFICADO** (no YAGNI)
   - **Original**: Fix 7 con interfaces formales MedicationSummary[], ActivitySummary[]
   - **Revision**: El AI NECESITA saber que medicamentos recibe el nino — es el proposito core de la app. Pero simplificado: inline la agrupacion en la route, arrays tipados simples en DiagnosticResult (sin interfaces separadas). Secciones condicionales en el prompt (omitir si no hay datos).

6. **NO importar de `lib/rag/` en `lib/diagnostic/`**
   - `plan-context-builder.ts` vive en `lib/rag/` (dominio de chat/consultas). Importarlo en diagnostics crea acoplamiento cross-domain.
   - Crear `lib/diagnostic/plan-formatter.ts` con su propia funcion `formatPlanForDiagnostic()`.

---

## SECURITY BLOCKERS (implementar ANTES de cualquier fix)

> Descubiertos por Security Sentinel. Severity HIGH = blocker.

### S1 — Verificacion de ownership en ai-summary [HIGH]

**Problema**: `ai-summary/route.ts` recibe `diagnosticResult` del client via POST body y lo pasa directo a GPT-5. Un admin malicioso podria enviar datos de otro nino.

**Fix**:
```typescript
// ai-summary/route.ts — agregar al inicio del POST handler
const session = await getServerSession(authOptions)
if (!session?.user || session.user.role !== "admin") {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 })
}

// Verificar que el childId en diagnosticResult pertenece a un nino real
const child = await db.collection("children").findOne({
  _id: new ObjectId(diagnosticResult.childId)
})
if (!child) {
  return NextResponse.json({ error: "Nino no encontrado" }, { status: 404 })
}
```

### S2 — Excluir datos maternos de salud mental del prompt AI [HIGH]

**Problema**: `flattenSurveyData()` incluye `postpartumDepression`, `maternalMentalHealth` en el contexto que se envia a OpenAI. Esto es GDPR Article 9 (datos sensibles de salud de menores/madres).

**Fix**:
```typescript
// pasante-ai-prompt.ts — agregar a buildSurveyContext()
const EXCLUDED_SURVEY_FIELDS = [
  'postpartumDepression',
  'maternalMentalHealth',
  'parentMentalHealthNotes',
  // Cualquier campo de salud mental del padre/madre
]

// Filtrar antes de enviar al AI
const filteredSurvey = Object.fromEntries(
  Object.entries(flatSurvey).filter(([key]) => !EXCLUDED_SURVEY_FIELDS.includes(key))
)
```

### S3 — Sanitizar logs de debug [MEDIUM]

**Problema**: `ai-summary/route.ts` loguea `contentPreview` y `fullResponse` que contienen datos de salud infantil.

**Fix**: Eliminar logs de `contentPreview` y `fullResponse`. Solo loguear metadata (childId, tokens usados, duration).

---

## PERFORMANCE OPTIMIZATIONS

### P1 — Paralelizar queries MongoDB con Promise.all

**Problema**: El GET route hace 4 queries secuenciales a MongoDB.

**Fix**:
```typescript
// [childId]/route.ts — cambiar de secuencial a paralelo
const [child, activePlan, events, chatMessages] = await Promise.all([
  db.collection("children").findOne({ _id: childObjectId }),
  db.collection("child_plans").findOne({ childId: childObjectId, status: "active" }),
  db.collection("events").find({ childId: childObjectId, startTime: { $gte: sevenDaysAgo } }).toArray(),
  db.collection("chatMessages").find({ /* ... */ }).toArray()
])
```

### P2 — Hoist processSleepStatistics (llamada doble)

**Problema**: `processSleepStatistics(events)` se llama en `schedule-rules.ts` linea 438 Y linea 517. Duplica calculo pesado.

**Fix**: Llamar UNA VEZ en la route, pasar resultado a G1 como parametro.

```typescript
// [childId]/route.ts
const sleepStats = processSleepStatistics(sleepEvents)
const g1Result = validateSchedule(child, events, surveyData, activePlan, sleepStats)
```

Requiere cambiar la firma de `validateSchedule` para aceptar `sleepStats` opcional.

### P3 — Mover OpenAI client a module scope

**Problema**: `ai-summary/route.ts` instancia `new OpenAI()` en cada request.

**Fix**: Mover a module scope (igual que el patron singleton de MongoDB).

```typescript
// ai-summary/route.ts — top level
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: Request) {
  // usar `openai` directamente
}
```

---

## BUGS DESCUBIERTOS POR REVIEWERS

### B1 — planVersion 0 muestra "1" (`||` vs `??`)

**Descubierto por**: Happy Dreamers Skill Agent

**Archivo**: `[childId]/route.ts`

**Problema**: `planVersion: activePlan?.planVersion || "1"` — cuando planVersion es `"0"` (plan inicial), `||` lo trata como falsy y retorna `"1"`.

**Fix**: `planVersion: activePlan?.planVersion ?? "sin plan"`

### B2 — Plan nap path incompleto

**Descubierto por**: Happy Dreamers Skill Agent

**Problema**: Fix 6 asume `plan?.schedule?.naps?.length` pero algunos planes guardan naps en `plan?.sleepRoutine?.numberOfNaps`.

**Fix**: Verificar ambas rutas:
```typescript
const planNapCount = plan?.schedule?.naps?.length
  ?? (plan?.sleepRoutine?.numberOfNaps ? Number(plan.sleepRoutine.numberOfNaps) : undefined)
```

### B3 — Survey numeroSiestas es String

**Descubierto por**: Happy Dreamers Skill Agent

**Problema**: `surveyData.numeroSiestas` viene como String del formulario. Comparaciones numericas fallan silenciosamente.

**Fix**: `Number(surveyData.numeroSiestas)` donde se use como numero.

---

## Acceptance Criteria

### Fase 0: Security + Performance (BLOCKERS)

- [ ] **S1** — Verificacion de ownership en ai-summary
  - `ai-summary/route.ts`: agregar getServerSession + verificar childId existe en BD
  - Retornar 401/404 si falla

- [ ] **S2** — Excluir datos maternos del prompt AI
  - `pasante-ai-prompt.ts`: crear `EXCLUDED_SURVEY_FIELDS` array
  - Filtrar en `buildSurveyContext()` antes de formatear

- [ ] **S3** — Sanitizar logs de debug
  - `ai-summary/route.ts`: eliminar logs de contentPreview y fullResponse

- [ ] **P1** — Paralelizar queries MongoDB
  - `[childId]/route.ts`: refactorizar 4 queries a `Promise.all`

- [ ] **P2** — Hoist processSleepStatistics
  - `[childId]/route.ts`: llamar una vez, pasar a G1
  - `schedule-rules.ts`: aceptar sleepStats como parametro opcional

- [ ] **P3** — OpenAI client a module scope
  - `ai-summary/route.ts`: mover instanciacion fuera del handler

- [ ] **B1** — Fix planVersion `||` → `??`
  - `[childId]/route.ts`: cambiar `||` por `??`

### Fase 1: Type Changes + GET Route (Fixes 1, 3, 5)

- [ ] **Fix 1** — `DiagnosticResult` incluye campo `recentEventsCount: number`
  - `types.ts`: agregar campo al interface
  - `[childId]/route.ts`: popular con `events.length`
  - `DiagnosticPanelClient.tsx`: leer `diagnosticResult.recentEventsCount` en vez de `diagnosticResult.groups.G1.criteria.length`

- [ ] **Fix 3 REVISED** — emotionalState como criterio G1 `g1_emotional_state`
  - `schedule-rules.ts`: agregar criterio usando datos de `processSleepStatistics()` (ya hoisted en P2)
  - Criterio: `{ id: "g1_emotional_state", name: "Estado emocional al dormir", status, value: dominantMood, expected: "tranquilo", sourceType: "events" }`
  - G1 pasa de 7 a 8 criterios — NO afecta Fix 1 porque ya usamos `recentEventsCount`
  - `pasante-ai-prompt.ts`: el criterio ya aparece automaticamente en `buildCriteriaContext()` — no se necesita codigo adicional

- [ ] **Fix 5** — `DiagnosticResult` incluye campo `planCreatedAt`
  - `types.ts`: agregar `planCreatedAt?: string`
  - `[childId]/route.ts`: popular con `activePlan?.createdAt?.toISOString()`
  - `DiagnosticPanelClient.tsx`: leer `diagnosticResult.planCreatedAt` y pasarlo a `ProfileHeader` como `planData.startDate`

### Fase 2: Plan Context + G3 Nutrition + Medications (Fixes 2, 4, 7)

- [ ] **Fix 2 REVISED** — Plan context incluido en DiagnosticResult
  - Crear `lib/diagnostic/plan-formatter.ts`:
    ```typescript
    export function formatPlanForDiagnostic(plan: any): string {
      // Formatear schedule, objectives, naps SIN emojis
      // Retornar string plano para inyectar en prompt
    }
    ```
  - `types.ts`: agregar `planScheduleSummary?: string` a DiagnosticResult
  - `[childId]/route.ts`: llamar `formatPlanForDiagnostic(activePlan)` y popular campo
  - `pasante-ai-prompt.ts`: agregar `planScheduleSummary` a PasanteContext, agregar seccion `PLAN ACTIVO DETALLADO` al system prompt
  - Fallback: si no hay plan, campo queda undefined (omitir seccion en prompt)

- [ ] **Fix 4 SIMPLIFIED** — `nutrition-rules.ts` usa ventana de 7 dias
  - Renombrar `getTodayFeedingEvents()` → `getRecentFeedingEvents()` con filtro de 7 dias
  - Inline logica de promedio: agrupar por dia, promediar (NO crear helper separado)
  - Actualizar `validateMilkCount`: comparar promedio diario vs threshold por edad
  - Actualizar `validateSolidCount`: comparar promedio diario vs threshold por edad
  - Actualizar `validateFeedingGap`: calcular gap maximo EXCLUYENDO gaps nocturnos (22:00-07:00)
  - Mantener `validateMilkLimit` con datos de hoy (limite de oz es relevante diario)
  - Agregar criterio `g3_days_with_data`: informar cuantos de 7 dias tienen registros
  - **Cuidado UTC**: NO usar `startOfDay()`/`endOfDay()` en servidor — usar comparacion de strings ISO

- [ ] **Fix 7 SIMPLIFIED** — Medicamentos y actividades llegan al Pasante AI
  - `[childId]/route.ts`: extraer medication events y activity events del array de events ya cargado
  - Inline la agrupacion (NO crear interfaces MedicationSummary/ActivitySummary):
    ```typescript
    // Inline en la route — agrupar medicamentos por nombre
    const medicationEvents = events.filter(e => e.eventType === "medication")
    const medicationMap = new Map<string, { count: number; lastDose: string; lastTime: string }>()
    for (const e of medicationEvents) {
      const existing = medicationMap.get(e.medicationName) || { count: 0, lastDose: "", lastTime: "" }
      existing.count++
      existing.lastDose = e.medicationDose || existing.lastDose
      existing.lastTime = e.startTime > existing.lastTime ? e.startTime : existing.lastTime
      medicationMap.set(e.medicationName, existing)
    }

    // Mismo patron para actividades
    const activityEvents = events.filter(e => e.eventType === "extra_activities")
    ```
  - `types.ts`: agregar a DiagnosticResult:
    ```typescript
    medicationSummary?: Array<{ name: string; count: number; lastDose: string; lastTime: string }>
    activitySummary?: Array<{ description: string; count: number; avgDurationMin: number }>
    ```
  - `pasante-ai-prompt.ts`: agregar seccion `MEDICAMENTOS REGISTRADOS (7 dias)` y `ACTIVIDADES REGISTRADAS (7 dias)` al prompt
  - Si no hay medicamentos/actividades, omitir seccion (no enviar array vacio)

### Fase 3: G1 Nap vs Plan (Fix 6)

- [ ] **Fix 6** — `schedule-rules.ts` compara siestas contra plan cuando existe
  - `validateNapCount`: si plan tiene naps, comparar contra plan
  - **Verificar ambas rutas de nap**: `plan?.schedule?.naps?.length` ?? `plan?.sleepRoutine?.numberOfNaps` (B2)
  - **Convertir String a Number**: `Number(surveyData.numeroSiestas)` (B3)
  - `validateNapDuration`: si plan tiene naps con duracion, comparar promedio actual vs prescrito
  - Mantener reglas por edad como fallback cuando no hay plan o plan no tiene naps
  - `sourceType` de los criterios debe cambiar a `"plan"` cuando se usa el plan

### DEFERRED (no implementar ahora)

- [ ] **Fix 8 DEFERRED** — chatMessages structured
  - **Razon**: Rompe G4 `evaluateRecentChanges()` que itera chatMessages como strings. Riesgo alto para valor bajo.
  - **Cuando implementar**: Agregar `chatMessagesStructured?` como campo ADICIONAL (aditivo), nunca reemplazar `chatMessages: string[]`.

---

## Verificacion Pre-Implementacion

Antes de empezar, verificar en MongoDB:

```javascript
// Verificar estructura de plan.schedule.naps vs sleepRoutine.numberOfNaps
db.child_plans.findOne({ status: "active" }, { "schedule.naps": 1, "sleepRoutine.numberOfNaps": 1 })

// Verificar que planVersion "0" existe (para confirmar bug B1)
db.child_plans.findOne({ planVersion: "0" })

// Verificar tipo de numeroSiestas en survey (String vs Number)
db.children.findOne({}, { "surveyData.spipilaStep.numeroSiestas": 1 })
```

## System-Wide Impact

- **Interaction graph**: GET diagnostic route → G1-G4 validators → DiagnosticResult → Client → POST ai-summary → GPT-5. Los cambios en types.ts cascadean a todos los consumidores.
- **Error propagation**: Plan formatter falla → campo queda undefined → AI funciona sin plan (graceful). Security check falla → 401/404 (hard stop, correcto).
- **State lifecycle risks**: Ningun cambio persiste estado nuevo. Solo se modifica que datos se leen y como se formatean.
- **API surface parity**: El GET route retorna mas campos pero mantiene backward compat (campos nuevos son opcionales).
- **G1 scoring change**: Pasa de 7 a 8 criterios. Cualquier UI que muestre "X de Y criterios" se actualiza automaticamente.

## Dependencies & Risks

| Riesgo | Mitigacion |
|--------|------------|
| `processSleepStatistics` firma cambia (P2) | Parametro opcional con default — backward compat |
| G1 pasa de 7 a 8 criterios (Fix 3) | UI usa `.criteria.length` dinamicamente — se adapta solo |
| Plan sin `schedule.naps` NI `sleepRoutine` (plan viejo) | Fallback a reglas por edad si ambos undefined/empty |
| `numeroSiestas` como String (B3) | `Number()` en cada uso, con fallback a NaN check |
| UTC timezone en G3 7-day filter (Fix 4) | Usar comparacion ISO string, NO `startOfDay()`/`endOfDay()` |
| `buildPlanContext()` de lib/rag tiene emojis | NO importar — crear `lib/diagnostic/plan-formatter.ts` propio |
| Fix 8 deferred rompe expectativa de chat timestamps en AI | Aceptable: el AI funciona bien sin timestamps de chat |

## Success Metrics

- El Pasante AI genera analisis que referencian el plan activo especificamente
- `recentEventsCount` muestra el numero real de eventos (no siempre 7)
- G3 no muestra "sin datos" si hay eventos de alimentacion en los ultimos 7 dias
- Estados emocionales aparecen como alertas en G1 cuando el patron es negativo
- Medicamentos registrados (ej. melatonina, ibuprofeno) aparecen como seccion estructurada en el analisis del AI
- Actividades registradas aparecen con frecuencia y duracion promedio en el analisis
- `planVersion: "0"` se muestra correctamente (no como "1")
- ai-summary verifica ownership antes de generar (security)
- Datos de salud mental materna NO aparecen en prompts de OpenAI (GDPR)
- GET route responde mas rapido con Promise.all (medible en logs)

## Sources & References

### Internal References
- Diagnostic API: `app/api/admin/diagnostics/[childId]/route.ts`
- AI Summary API: `app/api/admin/diagnostics/ai-summary/route.ts`
- Prompt builder: `lib/diagnostic/pasante-ai-prompt.ts`
- Types: `lib/diagnostic/types.ts`
- Plan context builder (NO reusar): `lib/rag/plan-context-builder.ts`
- G1 rules: `lib/diagnostic/rules/schedule-rules.ts`
- G3 rules: `lib/diagnostic/rules/nutrition-rules.ts`
- Sleep calculations: `lib/sleep-calculations.ts`
- Client component: `app/dashboard/diagnosticos/[childId]/DiagnosticPanelClient.tsx`
- AI section component: `components/diagnostic/AIAnalysis/PasanteAISection.tsx`

### Review Agent Findings (Key Insights)
- **TypeScript Reviewer**: `buildFreeTextContext()` haria `[object Object]` si chatMessages cambia de tipo → Fix 8 DEFERRED
- **Performance Oracle**: Segundo DB query en ai-summary innecesario, Promise.all para queries paralelas
- **Security Sentinel**: 2 HIGH findings — ownership verification + GDPR maternal health data
- **Architecture Strategist**: emotionalState como G1 criterio, plan en GET route, NO cross-domain imports
- **Code Simplicity**: DEFER Fix 7+8, inline logica de G3 averages
- **Pattern Recognition**: CriterionResult pattern universal, chatMessages string[] requerido por G4
- **Happy Dreamers Skill**: UTC bugs, planVersion `||` vs `??`, plan nap dual path, survey String types
- **Learnings**: useSession pattern ya correcto en DiagnosticPanelClient, no crear nuevos eventTypes
