# SPEC-SPRINT: Automation Tasks Queue (Sprint 5)

**Fecha:** 2026-02-18
**Fuente:** Mira Task Queue (14 tasks exportadas 2026-02-14)
**Implementado por:** Claude Opus 4.6
**Commits:** `e2d9f70`, `ee7b683`, `6f5813f`, `b427a42`, `0e36ca2`, `7f70e75`, `bb2da29`

---

## Resumen del Sprint

Sprint enfocado en 3 areas:

1. **Mejoras al Cuestionario (Survey)** - 7 tasks de nuevos campos, reordenamientos y UX
2. **Mejoras al Panel de Diagnostico (Admin)** - 3 tasks de UI, logica y precision AI
3. **Infraestructura y Observabilidad** - Sentry, MongoDB resilience, percentiles OMS
4. **Diversificacion de Planes AI** - Vocabulario de comida en prompts

---

## Tasks del Queue de Mira

### T1: Alucinacion y lenguaje en Pasante AI
- **ID Mira:** `9bb611d9`
- **Tipo:** Bug/Refactor
- **Status:** IMPLEMENTADO (commits `6f5813f`, `b427a42`)
- **Descripcion:** El Pasante AI usaba terminologia imprecisa ("despertares tempranos" ambiguo), llamaba "Dra." a Mariana, y generaba falsos positivos de reflujo cuando el survey no lo indicaba.
- **Solucion:**
  - Ajustado prompt en `lib/diagnostic/pasante-ai-prompt.ts` para diferenciar "despertares al inicio de la noche" vs "early rising"
  - Eliminado titulo "Dra." del prompt, sustituido por "Mariana" o "Especialista en Sueno"
  - Reforzado mapeo de reflujo: si el survey no marca reflujo, el pasante NO lo menciona
  - Validacion de datos reales de solidos (reconoce "3 comidas" correctamente)
- **Archivos modificados:**
  - `lib/diagnostic/pasante-ai-prompt.ts`
  - `lib/diagnostic/rules/medical-rules.ts`
  - `app/api/admin/diagnostics/[childId]/route.ts`

### T2: UX de detalle desplegable (Acordeon)
- **ID Mira:** `5bc11180`
- **Tipo:** UI/UX
- **Status:** IMPLEMENTADO (commit `e2d9f70`)
- **Descripcion:** Las tarjetas G1-G4 del diagnostico mostraban todos los criterios planos. Se solicito UI de acordeon para expandir/colapsar el detalle de cada grupo.
- **Solucion:**
  - `DiagnosticPanelClient.tsx` ahora renderiza cada grupo G1-G4 como acordeon colapsable
  - Al expandir, muestra los sintomas/respuestas especificas que disparan alertas
  - Mantiene iconos de alerta (rojo) y aviso (amarillo) junto a cada sintoma
  - Animacion fluida de expansion
- **Archivos modificados:**
  - `app/dashboard/diagnosticos/[childId]/DiagnosticPanelClient.tsx`

### T3: Interpretacion logica - Fallbacks de Survey para Schedule Rules
- **ID Mira:** `570e444c`
- **Tipo:** Bug / Logica de Negocio
- **Status:** IMPLEMENTADO (commit `e2d9f70`)
- **Descripcion:** El dashboard de diagnostico mostraba "0/7 datos disponibles" para horarios/siestas aunque el cuestionario tenia respuestas. Las reglas G1 solo buscaban en la bitacora diaria, no en el survey.
- **Solucion:**
  - Agregados fallbacks en `schedule-rules.ts` que leen datos del survey cuando no hay eventos en bitacora
  - Campos mapeados: hora de despertar, numero de siestas, duracion de siestas
  - Si hay datos de bitacora, estos tienen prioridad; si no, se usa el survey
- **Archivos modificados:**
  - `lib/diagnostic/rules/schedule-rules.ts`

### T4: UX Writing en planes (Vocabulario de comida)
- **ID Mira:** `c6d77533`
- **Tipo:** UX Writing
- **Status:** IMPLEMENTADO (commit `e2d9f70`)
- **Descripcion:** Los planes AI generados usaban vocabulario repetitivo para comidas (siempre "desayuno", "comida", "cena"). Se pidio diversificar.
- **Solucion:**
  - Actualizado prompt de generacion de planes en `app/api/consultas/plans/route.ts`
  - Agregada instruccion de variar vocabulario: "desayuno/almuerzo", "comida/lunch", "cena/merienda", nombres de platillos
  - El AI ahora produce planes con lenguaje mas natural y variado
- **Archivos modificados:**
  - `app/api/consultas/plans/route.ts`

### T5: Buscador de pacientes rapido (A-Z, solo activos)
- **ID Mira:** `29b2e766`
- **Tipo:** Optimizacion/UI
- **Status:** IMPLEMENTADO (commit `e2d9f70`)
- **Descripcion:** El selector de pacientes en admin no estaba ordenado y mostraba pacientes inactivos.
- **Solucion:**
  - `patient-quick-selector.tsx` ahora ordena pacientes alfabeticamente (A-Z)
  - Filtro de solo pacientes activos (con plan activo o eventos recientes)
  - Busqueda mas rapida con debounce optimizado
- **Archivos modificados:**
  - `components/dashboard/patient-quick-selector.tsx`

### T6: Cambiar orden de preguntas (Siestas antes de Viajes)
- **ID Mira:** `00b195ab`
- **Tipo:** Refactor
- **Status:** IMPLEMENTADO (commit `e2d9f70`)
- **Descripcion:** En el survey, las preguntas 28 (viajes) y 29 (siestas) estaban en orden incorrecto. Las siestas deben ir antes.
- **Solucion:**
  - Intercambiado orden en `RoutineHabitsStep.tsx`: siestas ahora aparece primero, viajes despues
  - Mantenida compatibilidad con datos existentes (los campos no cambian, solo el orden visual)
- **Archivos modificados:**
  - `components/survey/steps/RoutineHabitsStep.tsx`

### T7: Hora de despertar en rango (from/to)
- **ID Mira:** `1f00642a`
- **Tipo:** Feature
- **Status:** IMPLEMENTADO (commit `e2d9f70`)
- **Descripcion:** La pregunta de hora de despertar solo permitia un valor unico. Se necesita rango (desde/hasta) para captar variabilidad.
- **Solucion:**
  - Cambiado campo unico por dos campos: `wakeTimeFrom` y `wakeTimeTo`
  - UI con dos selectores de hora lado a lado
  - Compatibilidad: si solo hay un valor (legacy), se usa como ambos extremos
- **Archivos modificados:**
  - `components/survey/steps/RoutineHabitsStep.tsx`
  - `types/models.ts`

### T8: Agregar opcion "luz mercurial" en oscuridad
- **ID Mira:** `22e2bd70`
- **Tipo:** Feature
- **Status:** IMPLEMENTADO (commit `e2d9f70`)
- **Descripcion:** En la pregunta sobre oscuridad del cuarto, faltaba la opcion "Luz mercurial" (comun en Mexico).
- **Solucion:**
  - Agregada opcion "Luz mercurial" al campo de tipo de luz en `RoutineHabitsStep.tsx`
- **Archivos modificados:**
  - `components/survey/steps/RoutineHabitsStep.tsx`

### T9: Reestructurar seccion de ferritina
- **ID Mira:** `ebcf6216`
- **Tipo:** Feature/Refactor
- **Status:** IMPLEMENTADO (commit `e2d9f70`)
- **Descripcion:** La pregunta de ferritina tenia sesgo diagnostico (preguntaba "tiene ferritina baja?"). Se necesita redisenar como pregunta neutral y condicional.
- **Solucion:**
  - Rediseñado flujo: primero pregunta "Le han hecho estudios de ferritina?" (si/no)
  - Si responde "si", aparece campo numerico para el valor en ng/mL
  - Eliminado sesgo: ya no pregunta si es "baja", el sistema evalua el umbral (<50)
- **Archivos modificados:**
  - `components/survey/steps/HealthDevStep.tsx`
  - `types/models.ts`

### T10: Preguntas de salud nuevas
- **ID Mira:** `d1814f55`
- **Tipo:** Feature
- **Status:** IMPLEMENTADO (commit `e2d9f70`)
- **Descripcion:** Agregar preguntas sobre otros doctores que atienden al nino y estudios medicos realizados.
- **Solucion:**
  - Agregados campos: "Otros doctores que lo atienden" (texto libre)
  - "Estudios medicos realizados" (texto libre)
  - Campos condicionales: solo aparecen si responde "si" a la pregunta padre
- **Archivos modificados:**
  - `components/survey/steps/HealthDevStep.tsx`
  - `types/models.ts`

### T11: Preguntas de lactancia nuevas
- **ID Mira:** `35e9f464`
- **Tipo:** Feature
- **Status:** IMPLEMENTADO (commit `e2d9f70`)
- **Descripcion:** Agregar preguntas especificas de lactancia materna al cuestionario.
- **Solucion:**
  - 4 campos nuevos de lactancia:
    - Frecuencia de lactancia nocturna
    - Duracion promedio de toma
    - Tipo de lactancia (exclusiva/mixta/formula)
    - Edad de inicio de formula (si aplica)
  - Campos condicionales segun tipo de alimentacion
- **Archivos modificados:**
  - `components/survey/steps/ChildHistoryStep.tsx`
  - `components/survey/steps/FamilyInfoStep.tsx`
  - `types/models.ts`

### T12: Scroll hijacking en inputs numericos
- **ID Mira:** `7ed7163b`
- **Tipo:** Bug
- **Status:** IMPLEMENTADO (commit `e2d9f70`)
- **Descripcion:** Los inputs numericos del survey (edad, peso, talla, ferritina) capturaban el scroll del mouse/trackpad, causando que al intentar scrollear la pagina, el valor del input cambiara involuntariamente.
- **Solucion:**
  - Agregado componente `SurveySection` que aplica `onWheel={(e) => e.currentTarget.blur()}` a todos los inputs type="number"
  - Aplicado globalmente a todos los steps del survey
  - Tambien se agrego `inputMode="decimal"` para mejor UX en movil
- **Archivos modificados:**
  - `components/survey/SurveySection.tsx` (nuevo)
  - `components/survey/steps/PhysicalActivityStep.tsx`

### T13: Percentiles de peso y talla con tablas OMS
- **ID Mira:** `5e34972d`
- **Tipo:** Bug/Feature
- **Status:** IMPLEMENTADO (commit `e2d9f70`)
- **Descripcion:** Los percentiles de peso y talla se calculaban con formulas aproximadas. Se requieren tablas oficiales OMS/WHO con metodo LMS.
- **Solucion:**
  - Implementadas tablas LMS oficiales de la OMS para peso (0-60 meses, ninos y ninas)
  - Implementadas tablas LMS oficiales de la OMS para talla (0-60 meses, ninos y ninas)
  - Calculo con metodo LMS: `Z = ((X/M)^L - 1) / (L * S)`
  - Conversion a percentil con funcion de distribucion normal acumulada
- **Archivos modificados:**
  - `lib/growth/weight-percentile.ts` (reescrito)
  - `lib/growth/height-percentile.ts` (nuevo)

### T14: Error pantalla Diagnosticos
- **ID Mira:** `174cae20`
- **Tipo:** Bug
- **Status:** SIN DESCRIPCION en queue - Posiblemente cubierto por fixes previos
- **Notas:** Esta task no tenia descripcion en el export de Mira. Puede referirse al error de `useSession()` que ya fue corregido en sprints anteriores.

---

## Cambios de Infraestructura (No en queue de Mira)

### FIX: MongoDB timeouts en cold starts
- **Commit:** `0e36ca2`
- **Problema:** Sentry capturaba `MongoServerSelectionError` con timeout de 5s durante cold starts de Vercel
- **Solucion:** Aumentar timeouts a 15s + retry logic (2 intentos) en `connectToDatabase()`
- **Archivo:** `lib/mongodb.ts`

### FEAT: Sentry captureException en 40 catch blocks
- **Commit:** `7f70e75`
- **Problema:** 40 bloques catch tragaban errores silenciosamente sin reportar a Sentry
- **Solucion:** Agregar `Sentry.captureException()` en todos los catch blocks criticos
- **Archivos:** 8 archivos de API routes y libs

### FIX: Sentry DSN hardcoded fallback
- **Commit:** `bb2da29`
- **Problema:** `NEXT_PUBLIC_SENTRY_DSN` no se bakeaba en el build de Vercel
- **Solucion:** Hardcodear DSN como fallback (los DSN de Sentry son publicos)
- **Archivos:** `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`

### TEST: 79 unit tests para tasks implementadas
- **Commit:** `ee7b683`
- **Cobertura:**
  - `patient-selector-logic.test.ts` - 165 lineas (ordenamiento A-Z, filtro activos)
  - `schedule-rules-fallbacks.test.ts` - 510 lineas (fallbacks de survey para G1)
  - `percentiles.test.ts` - 270 lineas (tablas OMS peso y talla)
  - `plans-ux-writing.test.ts` - 114 lineas (vocabulario diversificado)

---

## Mapeo Task -> Commits -> Archivos

| Task | Commit | Archivos Principales |
|------|--------|---------------------|
| T1 Pasante AI | `6f5813f`, `b427a42` | pasante-ai-prompt.ts, medical-rules.ts, nutrition-rules.ts |
| T2 Acordeon | `e2d9f70` | DiagnosticPanelClient.tsx |
| T3 Schedule fallbacks | `e2d9f70` | schedule-rules.ts |
| T4 UX Writing planes | `e2d9f70` | plans/route.ts |
| T5 Buscador pacientes | `e2d9f70` | patient-quick-selector.tsx |
| T6 Orden preguntas | `e2d9f70` | RoutineHabitsStep.tsx |
| T7 Wake time rango | `e2d9f70` | RoutineHabitsStep.tsx, models.ts |
| T8 Luz mercurial | `e2d9f70` | RoutineHabitsStep.tsx |
| T9 Ferritina neutral | `e2d9f70` | HealthDevStep.tsx, models.ts |
| T10 Preguntas salud | `e2d9f70` | HealthDevStep.tsx, models.ts |
| T11 Preguntas lactancia | `e2d9f70` | ChildHistoryStep.tsx, FamilyInfoStep.tsx, models.ts |
| T12 Scroll hijacking | `e2d9f70` | SurveySection.tsx, PhysicalActivityStep.tsx |
| T13 Percentiles OMS | `e2d9f70` | weight-percentile.ts, height-percentile.ts |
| Infra MongoDB | `0e36ca2` | mongodb.ts |
| Infra Sentry | `7f70e75`, `bb2da29` | 11 archivos |
| Tests | `ee7b683` | 4 archivos de test |

---

## Credenciales de Testing

| Rol | Email | Password |
|-----|-------|----------|
| Admin | mariana@admin.com | password |
| Usuario/Padre | eljulius@nebulastudios.io | juls0925 |
