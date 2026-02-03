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

### Session 5 - 2026-02-03
**Task:** 2.3 - Crear constantes de indicadores medicos `/lib/diagnostic/medical-indicators.ts`
**Files:** `lib/diagnostic/medical-indicators.ts`
**Patterns:**
- 3 arrays principales: REFLUX_INDICATORS (10), APNEA_INDICATORS (12), RESTLESS_LEG_INDICATORS (6)
- Cada indicador tiene: id, name, description, condition, surveyField/eventCheck, available
- `available: false` para indicadores pendientes de sprint 4B (7 total)
- MEDICAL_ALERT_THRESHOLD = 1 (con 1 indicador ya se dispara alerta)
- SURVEY_DATA_EXPIRY_DAYS = 30 (caducidad de datos)
- Helpers: getIndicatorsForCondition(), getAvailableIndicators(), getPendingIndicators(), getAllMedicalIndicators(), isSurveyDataExpired()
- EventCheck functions para indicadores calculados de eventos (insomnio, despertares segunda parte, siestas desorganizadas)
**Lint Fix:**
- Indentación de switch/case: cambiar de 4 a 2 espacios (proyecto usa 2)
- Return type de getAllMedicalIndicators: quitar indentación de 2 en propiedades
**Notes:**
- Build pasa correctamente
- Campos de survey referenciados: líneas 74, 39, 83, 84, 90, 12/23, 80, 68, 69, 72, 73, 66, 76, 71, 109 del CSV
- Fase 2: 3/4 tareas completadas

---

### Session 6 - 2026-02-03
**Task:** 2.4 - Crear constantes ambientales `/lib/diagnostic/environmental-rules.ts`
**Files:** `lib/diagnostic/environmental-rules.ts`
**Patterns:**
- SCREEN_RULES: maxDailyMinutes (60), noScreenBeforeBedtimeHours (2)
- TEMP_RANGE: 22-25°C (fuera del rango = alerta)
- HUMIDITY_RANGE: 40-60% (pendiente Sprint 4B, available: false)
- CHANGE_KEYWORDS: 6 categorías (school, sibling, moving, family, travel, health)
- ENVIRONMENTAL_FACTORS: 7 factores con alertType (alert|warning) y available flag
- Helpers: isTemperatureInRange(), isHumidityInRange(), exceedsScreenLimit()
- detectChangeKeywords(): busca keywords en array de textos y retorna matches con categoría
- getAvailableEnvironmentalFactors() y getPendingEnvironmentalFactors()
- RECENT_EVENTS_WINDOW_DAYS (14) y RECENT_CHAT_WINDOW_DAYS (14)
**Survey Fields Referenciados:**
- Línea 87: screenTime
- Línea 102: roomTemperature
- Líneas 24-26: postpartumDepression
- Línea 106: sleepingArrangement (colecho)
- Línea 107: sharesRoom
- Línea 126: recentChanges
**Notes:**
- Build pasa correctamente
- Fase 2 COMPLETADA (4/4 tareas)
- Lista para Fase 3: Motor de Validación G1 (Horario)

---

### Session 7 - 2026-02-03
**Task:** 3.1 - Crear validador de horario `/lib/diagnostic/rules/schedule-rules.ts`
**Files:** `lib/diagnostic/rules/schedule-rules.ts`
**Patterns:**
- Motor de validación con 6 criterios: wakeMinimum, wakeDeviation, nightDuration, napCount, napDuration, bedtime
- Patrón de tolerancia progresiva: ±15min → OK, ±30min → Warning, >30min → Alert
- Funciones helpers puras: `timeToMinutes()`, `getTimeDeviationMinutes()`, `getStatusFromDeviation()`
- Usa helpers existentes de `sleep-calculations.ts`: `calculateMorningWakeTime()`, `aggregateDailySleep()`, `processSleepStatistics()`
- Usa constantes de `age-schedules.ts`: `getScheduleRuleForAge()`, `getNightDurationForAge()`, `WAKE_TOLERANCE_MINUTES`
- Interface extendida `ScheduleValidationResult` con wakeTime, nightDuration, napCount detallados
- Manejo de datos faltantes: retorna `dataAvailable: false` con status warning
**Criterios implementados:**
1. `g1_wake_minimum` - Despertar >= 6AM
2. `g1_wake_deviation` - Desviación vs plan ±15min
3. `g1_night_duration` - Duración noche vs esperada por edad (±1hr ok, ±2hr warning, >2hr alert)
4. `g1_nap_count` - Cantidad siestas vs esperada (±1 ok/warning, >1 alert)
5. `g1_nap_duration` - Duración siestas vs máximo por edad
6. `g1_bedtime` - Hora acostarse vs plan ±15min
**Notes:**
- Build pasa correctamente
- Errores lint pre-existentes no afectan este archivo
- Fase 3: 1/2 tareas completadas

---

### Session 8 - 2026-02-03
**Task:** 3.2 - Agregar lógica de ventanas de sueño
**Files:** `lib/diagnostic/rules/schedule-rules.ts`
**Patterns:**
- Día lógico: 4:00 AM a 3:59 AM del siguiente día (para manejar eventos de madrugada)
- Funciones añadidas:
  - `extractTimeFromEvent()` - Extrae hora de evento ISO
  - `getDayEvents()` - Obtiene eventos de un día lógico ordenados
  - `calculateDayWindows()` - Calcula gaps entre wake→nap→sleep
  - `compareWindows()` - Compara ventanas reales vs esperadas
  - `validateSleepWindows()` - Criterio completo de validación
  - `parseWindowsFromValue()` - Parsea ventanas del formato "1.5h, 2.0h"
- Tolerancia de ventanas: ±0.5h = OK, ±1h = Warning, >1h = Alert
- Se agregan al array de criterios existentes (ahora 7 criterios en G1)
- Interface `ScheduleValidationResult` extendida con `sleepWindows`
**Criterio implementado:**
7. `g1_sleep_windows` - Ventanas de vigilia vs esperadas por edad
**Notes:**
- Build pasa correctamente
- Fase 3 COMPLETADA (2/2 tareas)
- Lista para Fase 4: Motor de Validación G2 (Médico)

---

### Session 9 - 2026-02-03
**Task:** 4.1 - Crear validador médico `/lib/diagnostic/rules/medical-rules.ts`
**Files:** `lib/diagnostic/rules/medical-rules.ts`
**Patterns:**
- Función principal `validateMedicalIndicators(input)` retorna `MedicalGroupValidation`
- Evalúa 3 condiciones: reflujo (10 indicadores), apnea (12), restless_leg (6)
- Indicadores híbridos: surveyField (datos del survey) o eventCheck (función evaluadora de eventos)
- Función `evaluateIndicator()` detecta valores truthy con lógica flexible:
  - Booleans: true = detectado
  - Strings: no vacío y no en ["no", "ninguno", "none", "nunca", "false", "0"]
  - Numbers: > 0
- MEDICAL_ALERT_THRESHOLD = 1: con 1 indicador detectado ya es alerta
- Status progresivo: ok → warning (muchos pendientes) → alert (indicador detectado)
- `conditionToCriteria()` convierte evaluación a CriterionResult para UI
- Helper público `getMedicalIndicatorCounts()` para mostrar "X de Y disponibles"
**Interfaces usadas:**
- MedicalValidationInput: surveyData + events
- ConditionEvaluation: resultado intermedio por condición
- MedicalGroupValidation: resultado final con indicadores agrupados
**Notes:**
- Build pasa correctamente
- Fase 4: 1/2 tareas completadas
- Próxima tarea 4.2: Agregar contador de datos pendientes (dataCompleteness)

---

### Session 10 - 2026-02-03
**Task:** 4.2 - Agregar contador de datos pendientes (dataCompleteness)
**Files:** `lib/diagnostic/rules/medical-rules.ts` (ya implementado en sesión 9)
**Patterns:**
- La tarea 4.2 fue implementada junto con 4.1 en la sesión anterior
- `calculateMedicalDataCompleteness()` (líneas 181-200) ya retorna { available, total, pending[] }
- `validateMedicalIndicators()` ya incluye dataCompleteness en el resultado (línea 274)
- El resumen ya menciona datos pendientes: "X datos pendientes de recolectar"
**Verificación:**
- Build pasa correctamente
- dataCompleteness.pending contiene nombres de indicadores no disponibles
**Notes:**
- Fase 4 COMPLETADA (2/2 tareas)
- Lista para Fase 5: Motor de Validación G3 (Alimentación)

---

### Session 11 - 2026-02-03
**Task:** 5.1 - Crear validador de alimentación `/lib/diagnostic/rules/nutrition-rules.ts`
**Files:** `lib/diagnostic/rules/nutrition-rules.ts` (nuevo, 363 líneas)
**Patterns:**
- Sigue el patrón de schedule-rules.ts y medical-rules.ts
- Input: `NutritionValidationInput { events, childAgeMonths, aiClassifications? }`
- Output: `NutritionGroupValidation` con 5 criterios evaluados
- Usa helpers existentes de nutrition-requirements.ts
- `getTodayFeedingEvents()` - Filtra eventos de feeding del día actual
- `countMilkFeedings()` y `countSolidFeedings()` - Separa breast/bottle de solids
**Criterios implementados:**
1. `g3_milk_count` - Conteo tomas de leche vs requerido por edad
2. `g3_milk_limit` - Límite de onzas (solo 12+ meses, máx 16 oz)
3. `g3_solid_count` - Conteo comidas sólidas vs requerido
4. `g3_feeding_gap` - Intervalo máximo entre comidas (máx 5 hrs)
5. `g3_nutrition_groups` - Grupos nutricionales cubiertos (requiere AI)
**Helpers públicos:**
- `validateNutrition(input)` - Validación completa
- `getNutritionSummary(events, age)` - Resumen de conteos
- `validateSingleMeal(groups, age, isSnack)` - Validar una comida
**Notes:**
- Build pasa correctamente
- Fase 5: 1/3 tareas completadas
- Próxima: 5.2 - Clasificador AI de alimentos

---
