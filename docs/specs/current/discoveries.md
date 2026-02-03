# Discoveries: Panel de Diagnóstico (Estadísticas)

Log de aprendizajes entre sesiones de Ralph Loop.

---

## Patrones Clave del Feature

### Admin-Only Access
- **Patrón**: Verificar `session.user.role === "admin"` en server component
- **Referencia**: `app/dashboard/consultas/page.tsx` líneas 46-56
- **UI bloqueada**: Mostrar mensaje de acceso denegado, no redirect

### Prerequisito Plan Activo
- **Lógica**: Query `childPlans` donde `status === "active"`
- **Referencia**: `lib/rag/plan-context-builder.ts` función `getActivePlan()`
- **UI bloqueada**: Mostrar "Selecciona un paciente con plan activo"

### Semáforo de Status (Traffic Light)
- **ok** = verde = `CheckCircle` de Lucide
- **warning** = amarillo = `AlertTriangle` de Lucide
- **alert** = rojo = `AlertCircle` de Lucide
- **Referencia**: `components/dashboard/AdminStatistics.tsx` para colores

### OpenAI Integration
- **Patrón**: Singleton con `getChatAgent()` de `lib/rag/chat-agent.ts`
- **Modelo**: GPT-4 para clasificación de alimentos
- **Fallback**: Retornar `aiClassified: false` si falla

---

## Archivos Clave Identificados

| Archivo | Propósito | Líneas Clave |
|---------|-----------|--------------|
| `app/dashboard/consultas/page.tsx` | Patrón admin-only | 46-56, 161-173 |
| `components/dashboard/AdminStatistics.tsx` | Cards semáforo | ChildAlert, DashboardMetrics |
| `lib/sleep-calculations.ts` | Helpers de cálculo | ProcessedSleepStats |
| `lib/rag/chat-agent.ts` | Patrón OpenAI | getChatAgent() |
| `lib/rag/plan-context-builder.ts` | getActivePlan() | - |

---

## Sesiones

### Session 0 - 2026-02-03

**Setup inicial**
- Implementation plan generado con 36 tareas en 14 fases
- Archivos de ejecución creados en docs/specs/current/
- Feature: Panel de Diagnóstico (Estadísticas) - ÍTEM 4
- Listo para `./ralph-loop.sh`

**Prioridades identificadas:**
1. Fase 0: Activation & Smoke Test (ruta base + admin check)
2. Fase 1-2: Tipos, constantes y reglas base
3. Fases 3-6: Motores de validación (G1-G4)
4. Fase 7-8: API + Pasante AI
5. Fases 9-13: UI completa

**Patrones a seguir:**
- Admin-only pattern de consultas/page.tsx
- Cards semáforo de AdminStatistics.tsx
- OpenAI pattern de chat-agent.ts
- Tipos exportables desde lib/diagnostic/types.ts

---

### Session 1 - 2026-02-03
**Task:** 0.1 - Crear ruta base `/dashboard/diagnosticos`
**Files:** `app/dashboard/diagnosticos/page.tsx`
**Patterns:**
- Seguí el patrón de `consultas/page.tsx` para admin-only + estado vacío
- useEffect para toast de acceso denegado + early return con Card de bloqueo
- Estado vacío con Card centrado, icono `ClipboardList` y flecha animada
**Notes:**
- El build genera 2.37 kB para la ruta
- Errores de lint pre-existentes en otros archivos (no bloqueantes)

---

### Session 2 - 2026-02-03
**Task:** 0.2 - Agregar verificacion admin-only (VERIFICADA)
**Files:** Ya implementado en `app/dashboard/diagnosticos/page.tsx`
**Patterns:**
- La tarea 0.2 fue implementada junto con 0.1 en sesión anterior
- Patrón admin-only: useEffect (líneas 17-26) + early return (líneas 29-41)
- Verificación: `session?.user.role !== "admin"` retorna Card de bloqueo
**Notes:**
- Build pasa correctamente
- Fase 0 completada, lista para Fase 1

---

### Session 2 (cont.) - 2026-02-03
**Task:** 1.1 - Crear archivo de tipos `/lib/diagnostic/types.ts`
**Files:** `lib/diagnostic/types.ts`
**Patterns:**
- StatusLevel como union type: "ok" | "warning" | "alert"
- Interfaces específicas para cada grupo extendiendo GroupValidation
- SourceType para deep linking: "survey" | "event" | "chat" | "plan" | "calculated"
- DataCompleteness para manejar campos pendientes
- Usé eslint-disable para any en ValidationInput (surveyData y events son dinámicos)
**Types creados:**
- StatusLevel, SourceType, MedicalCondition, NutritionGroup (union types)
- CriterionResult, GroupValidation, Alert (base)
- MedicalGroupValidation, NutritionGroupValidation, EnvironmentalGroupValidation (extends)
- DiagnosticResult (resultado completo)
- AgeScheduleRule, NutritionRule, MedicalIndicatorConfig (reglas)
**Notes:**
- Build pasa correctamente
- Tipos importables desde otros archivos
- Fase 1 completada

---

### Session 3 - 2026-02-03
**Task:** 2.1 - Crear constantes de horarios por edad `/lib/diagnostic/age-schedules.ts`
**Files:** `lib/diagnostic/age-schedules.ts`
**Patterns:**
- Array de AgeScheduleRule ordenado por edad ascendente
- Cada regla tiene ageMinMonths/ageMaxMonths para buscar por rango
- Valores especiales: -1 indica "variable/sin restricción" (ej: bebés <4m)
- Helper `getScheduleRuleForAge(ageMonths)` para obtener regla por edad
- Helper `getNightDurationForAge(ageMonths)` para duración de noche
- Constantes fijas: WAKE_TOLERANCE_MINUTES (15), MINIMUM_WAKE_TIME ("06:00")
**Rangos implementados:**
- 0-3m, 4-6m, 6m, 7m, 8-9m, 9-11m, 11-12m, 12m, 15-18m, 18m-2a, 2-2.5a, 2.5a, 2.9-3.3a, 3-3.5a, 3.5a+
**Notes:**
- Build pasa correctamente (errores lint son pre-existentes en otros archivos)
- Tabla basada en "Tabla Resumen de Validación G1" (SPEC-SPRINT.md líneas 398-414)
- Fase 2 iniciada (1/4 tareas completadas)

---

### Session 4 - 2026-02-03
**Task:** 2.2 - Crear constantes de requisitos nutricionales `/lib/diagnostic/nutrition-requirements.ts`
**Files:** `lib/diagnostic/nutrition-requirements.ts`
**Patterns:**
- Array NUTRITION_RULES ordenado por edad (6m, 7m, 8-9m, 9-11m, 11-12m, 12m+)
- Cada regla tiene: milkMinCount, milkMaxOz, solidMinCount, mealRequiredGroups, snackRequiredGroups
- MEAL_REQUIREMENTS separados por etapa: EARLY_STAGE (6-9m) y FULL_STAGE (9m+)
- SNACK_REQUIREMENTS: Fibra + (Grasa O Carbohidrato) - solo desde 9m
- Helper `getNutritionRuleForAge(ageMonths)` para obtener regla por edad
- Helper `validateMealGroups(groups, ageMonths, isSnack)` para validar grupos en comidas
- Helper `checkMilkLimit(totalOz, ageMonths)` para verificar límite de onzas
**Constantes exportadas:**
- ALL_NUTRITION_GROUPS: proteina, carbohidrato, grasa, fibra
- MEAL_REQUIREMENTS: EARLY_STAGE y FULL_STAGE
- SNACK_REQUIREMENTS: requisitos para snacks
- NUTRITION_RULES: array de NutritionRule por edad
- MILK_INTERVALS: horas entre tomas por edad
- RED_FLAGS: MAX_MILK_OZ_12_PLUS (16), MAX_FEEDING_GAP_HOURS (5)
**Notes:**
- Build pasa correctamente
- Errores lint son pre-existentes en otros archivos (no relacionados)
- Fase 2: 2/4 tareas completadas

---
