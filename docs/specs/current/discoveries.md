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

### Session 12 - 2026-02-03
**Task:** 5.2 - Crear clasificador AI de alimentos `/lib/diagnostic/ai-food-classifier.ts`
**Files:** `lib/diagnostic/ai-food-classifier.ts` (nuevo, ~185 líneas)
**Patterns:**
- Sigue el patrón singleton de `chat-agent.ts` con clase + getter `getFoodClassifier()`
- Clase `FoodClassifier` con método `classifyFood(feedingNotes)` → `NutritionClassification`
- Método `classifyBatch(feedingNotesArray)` para procesar múltiples notas en paralelo
- Prompt especializado en español para clasificar alimentos en 4 grupos: proteina, carbohidrato, grasa, fibra
- Respuesta JSON estructurada: `{"groups": [...], "confidence": 0.85}`
- Temperatura baja (0.2) para respuestas consistentes, max_tokens 100 para respuestas cortas
- Fallback robusto: si OpenAI falla, retorna `aiClassified: false` sin lanzar error
- Validación de respuesta: filtra grupos inválidos, clampea confidence entre 0-1
**Exports públicos:**
- `FoodClassifier` - Clase principal
- `getFoodClassifier()` - Singleton getter
- `classifyFood(feedingNotes)` - Helper directo
- `classifyFoodBatch(feedingNotesArray)` - Helper batch
**Notes:**
- Build pasa correctamente
- Fase 5: 2/3 tareas completadas
- Próxima: 5.3 - Endpoint de clasificación `/api/admin/diagnostics/classify-food/route.ts`

---

### Session 13 - 2026-02-03
**Task:** 5.3 - Crear endpoint de clasificación `/api/admin/diagnostics/classify-food/route.ts`
**Files:** `app/api/admin/diagnostics/classify-food/route.ts` (nuevo, ~80 líneas)
**Patterns:**
- Sigue el patrón admin-only de `consultas/analyze/route.ts`
- Verificación de sesión: `session?.user?.role !== "admin"` → 401
- Validación de input: `feedingNotes` debe ser string no vacío
- Usa `classifyFood()` helper de `ai-food-classifier.ts`
- Logger estructurado con `createLogger("API:admin:diagnostics:classify-food")`
- Respuesta simplificada: `{ nutritionGroups, aiClassified, confidence }` (sin rawText)
**API Contract:**
- POST /api/admin/diagnostics/classify-food
- Body: `{ feedingNotes: string }`
- Response OK: `{ nutritionGroups: string[], aiClassified: boolean, confidence?: number }`
- Response 400: `{ error: "feedingNotes debe ser un string" }`
- Response 401: `{ error: "No autorizado" }`
- Response 500: `{ error: "Error interno del servidor" }`
**Notes:**
- Build pasa correctamente
- Endpoint compilado en `/api/admin/diagnostics/classify-food` (304 B)
- Errores lint pre-existentes en otros archivos (no bloqueantes)
- Fase 5 COMPLETADA (3/3 tareas)
- Lista para Fase 6: Motor de Validación G4 (Ambiental)

---

### Session 14 - 2026-02-03
**Task:** 6.1 + 6.2 - Crear validador ambiental y detector de keywords
**Files:** `lib/diagnostic/rules/environmental-rules.ts` (nuevo, ~505 líneas)
**Patterns:**
- Sigue el patrón de medical-rules.ts: interface de Input, helpers privados, función principal
- Evalúa 7 factores: screenTime, temperature, humidity, postpartumDepression, cosleeping, roomSharing, recentChanges
- Cada factor tiene su propia función evaluadora que retorna CriterionResult
- El detector de keywords (`detectChangeKeywords`) ya existía en `environmental-rules.ts` (constantes) desde sesión 6
- Motor importa y usa `detectChangeKeywords` en `evaluateRecentChanges()` para buscar en notas y chats
**Factores evaluados:**
1. `g4_screen_time` - Tiempo de pantalla vs límite 60 min/día
2. `g4_temperature` - Temperatura vs rango 22-25°C
3. `g4_humidity` - Humedad vs rango 40-60% (pendiente Sprint 4B)
4. `g4_postpartum_depression` - Indicadores de depresión post-parto
5. `g4_cosleeping` - Colecho detectado en arreglo de sueño
6. `g4_room_sharing` - Comparte cuarto con otros
7. `g4_recent_changes` - Cambios importantes en notas/chat (usa detectChangeKeywords)
**Helpers públicos:**
- `validateEnvironmentalFactors(input)` - Validación completa → EnvironmentalGroupValidation
- `detectChangeKeywords` (re-exportado) - Buscar keywords en textos
- `getEnvironmentalFactorCounts()` - Conteo de factores disponibles/pendientes
**Notes:**
- Build pasa correctamente
- Tarea 6.2 ya estaba implementada en constantes (detectChangeKeywords)
- Fase 6 COMPLETADA (2/2 tareas)
- Lista para Fase 7: API de Diagnóstico

---

### Session 15 - 2026-02-03
**Task:** 7.1 - Crear endpoint principal `/api/admin/diagnostics/[childId]/route.ts`
**Files:** `app/api/admin/diagnostics/[childId]/route.ts` (nuevo, ~220 líneas)
**Patterns:**
- Sigue el patrón admin-only de `consultas/analyze/route.ts`
- Verificación de sesión + role admin (líneas 27-30)
- Prerequisito plan activo: query a `child_plans` con `status: "active"` (líneas 71-85)
- Obtiene eventos de últimos 7 días y chat messages de últimos 14 días
- Ejecuta los 4 motores de validación secuencialmente:
  1. `validateSchedule(events, plan, childAgeMonths)` → G1
  2. `validateMedicalIndicators(surveyData, events)` → G2
  3. `validateNutrition(events, childAgeMonths)` → G3
  4. `validateEnvironmentalFactors(surveyData, eventNotes, chatTexts)` → G4
- Recolecta alertas de todos los criterios con status alert/warning
- Calcula overallStatus: alert si cualquier grupo tiene alert, warning si tiene warning
- Logger estructurado con `createLogger("API:admin:diagnostics")`
**API Contract:**
- GET /api/admin/diagnostics/[childId]
- Response OK: DiagnosticResult completo
- Response 400: `{ error: "Este nino no tiene un plan activo", code: "NO_ACTIVE_PLAN" }`
- Response 401: `{ error: "No autorizado" }`
- Response 404: `{ error: "Nino no encontrado" }`
- Response 500: `{ error: "Error interno del servidor" }`
**Lint Fix:**
- Línea larga (131 chars) separada en múltiples líneas (collectAlerts interface)
**Notes:**
- Build pasa correctamente
- Endpoint compilado en `/api/admin/diagnostics/[childId]` (306 B)
- Fase 7: 1/2 tareas completadas
- Próxima: 7.2 - Agregar lógica de prerequisito (plan activo) - YA IMPLEMENTADA

---

### Session 16 - 2026-02-03
**Task:** 8.1 - Crear prompt del Pasante AI `/lib/diagnostic/pasante-ai-prompt.ts`
**Files:** `lib/diagnostic/pasante-ai-prompt.ts` (nuevo, ~195 líneas)
**Patterns:**
- Sigue el patrón de `sleep-coach-personality.ts` con función `getPasanteSystemPrompt(context)`
- Interface `PasanteContext` estructura los datos del niño y diagnóstico
- Helper `buildDiagnosticContext()` formatea las alertas de los 4 grupos para el prompt
- Configuración exportada `PASANTE_AI_CONFIG` centraliza model, maxTokens, temperature
- Restricciones explícitas: NO recomendaciones médicas, NO ajustes específicos del plan
- SI permite: describir situación, sugerir que la doctora "considere revisar" algo
- Ejemplo de buena respuesta incluido en el prompt para guiar formato
**Exports públicos:**
- `PasanteContext` - Interface del contexto
- `getPasanteSystemPrompt(context)` - Genera system prompt completo
- `getPasanteUserPrompt(additionalContext?)` - Genera user prompt
- `PASANTE_AI_CONFIG` - Configuración OpenAI (gpt-4, 400 tokens, temp 0.7)
**Notes:**
- Build pasa correctamente
- Errores lint pre-existentes en otros archivos (no relacionados)
- Fase 8: 1/2 tareas completadas
- Próxima: 8.2 - Crear endpoint `/api/admin/diagnostics/ai-summary/route.ts`

---

### Session 17 - 2026-02-03
**Task:** 8.2 - Crear endpoint de resumen AI `/api/admin/diagnostics/ai-summary/route.ts`
**Files:** `app/api/admin/diagnostics/ai-summary/route.ts` (nuevo, ~155 líneas)
**Patterns:**
- Sigue el patrón admin-only de `classify-food/route.ts`
- POST endpoint con body estructurado (AISummaryRequestBody interface)
- Usa getPasanteSystemPrompt() y getPasanteUserPrompt() del prompt module
- Usa PASANTE_AI_CONFIG para configuración de OpenAI (gpt-4, 400 tokens, temp 0.7)
- Instancia OpenAI directamente (no singleton) para on-demand summary
- Validación de campos requeridos: childId, childName, childAgeMonths, diagnosticResult
- Campos opcionales con defaults: planVersion="1", planStatus="active", recentEventsCount=0, surveyDataAvailable=false
- Manejo de errores específico para API key (status 503)
**API Contract:**
- POST /api/admin/diagnostics/ai-summary
- Body: AISummaryRequestBody (childId, childName, childAgeMonths, planVersion?, planStatus?, diagnosticResult, recentEventsCount?, surveyDataAvailable?, additionalContext?)
- Response OK: `{ aiSummary: string }`
- Response 400: `{ error: "campo es requerido" }`
- Response 401: `{ error: "No autorizado" }`
- Response 500: `{ error: "Error interno del servidor" }`
- Response 503: `{ error: "Error de configuracion del servicio AI" }`
**Notes:**
- Build pasa correctamente
- Endpoint compilado en `/api/admin/diagnostics/ai-summary` (308 B)
- Fase 8 COMPLETADA (2/2 tareas)
- Lista para Fase 9: UI - Componentes Base

---

### Session 18 - 2026-02-03
**Task:** 9.1, 9.2, 9.3 - Crear componentes UI base (ProfileHeader, StatusIndicator, ValidationGroupCard)
**Files:**
- `components/diagnostic/ProfileHeader.tsx` (ya existía de sesión anterior)
- `components/diagnostic/StatusIndicator.tsx` (nuevo, ~150 líneas)
- `components/diagnostic/ValidationGroupCard.tsx` (nuevo, ~210 líneas)
**Patterns:**
- **StatusIndicator**: Dos variantes - icono solo y badge con fondo circular
- **ValidationGroupCard**: Borde lateral coloreado + ordenamiento por severidad
- **Responsividad**: flex-col sm:flex-row para layout móvil/desktop
- **Props tipadas**: Uso de interfaces de `lib/diagnostic/types.ts`
- **Criterios clickeables**: callback `onCriterionClick` para abrir modal
- **Límite de visibilidad**: máx 5 criterios visibles, "+N más" si hay más
- **DataCompleteness**: indicador de porcentaje y lista de campos pendientes
**Notes:**
- Build pasa correctamente
- ProfileHeader ya existía (implementado en sesión no documentada)
- StatusIndicator y ValidationGroupCard creados en esta sesión
- Fase 9 COMPLETADA (3/3 tareas)
- Lista para Fase 10: UI - Grupos de Validación

---

### Session 19 - 2026-02-03
**Task:** 10.1 - Crear G1ScheduleValidation `/components/diagnostic/ValidationGroups/G1ScheduleValidation.tsx`
**Files:** `components/diagnostic/ValidationGroups/G1ScheduleValidation.tsx` (nuevo, ~50 líneas)
**Patterns:**
- Carpeta ValidationGroups creada para agrupar los 4 componentes de validación
- G1ScheduleValidation es un wrapper simple sobre ValidationGroupCard
- Usa icono Clock de Lucide para identificar visualmente el grupo de Horario
- Props tipadas: `{ validation: GroupValidation, onCriterionClick?, className? }`
- No contiene lógica extra, delega todo a ValidationGroupCard
- Documenta los 7 criterios que evalúa G1 en JSDoc para referencia
**Notes:**
- Build pasa correctamente
- Errores lint pre-existentes en otros archivos (no relacionados)
- Fase 10: 1/4 tareas completadas
- Próxima: 10.2 - Crear G2MedicalValidation

---

### Session 20 - 2026-02-03
**Task:** 10.2 - Crear G2MedicalValidation `/components/diagnostic/ValidationGroups/G2MedicalValidation.tsx`
**Files:** `components/diagnostic/ValidationGroups/G2MedicalValidation.tsx` (nuevo, ~155 líneas)
**Patterns:**
- A diferencia de G1, G2 NO es un simple wrapper sobre ValidationGroupCard
- G2 tiene estructura adicional: sección de resumen por condición médica
- Usa `MedicalGroupValidation` (extends GroupValidation) con campos específicos:
  - `indicators` agrupados por condición (reflujo, apnea, restless_leg)
  - `detectedCount` por condición
  - `pendingCount` por condición
- Componente auxiliar `ConditionSummary` muestra:
  - Icono de alerta (rojo) o check (verde) según detectado > 0
  - Badge "X detectados" si hay indicadores positivos
  - Badge "Y pendientes" si hay datos faltantes
- Icono: `Stethoscope` de Lucide para identificar el grupo Médico
- Colores por condición: reflujo=naranja, apnea=púrpura, restless_leg=azul
**Notes:**
- Build pasa correctamente
- Errores lint pre-existentes en otros archivos (no relacionados)
- Fase 10: 2/4 tareas completadas
- Próxima: 10.3 - Crear G3NutritionValidation

---

### Session 21 - 2026-02-03
**Task:** 10.3 - Crear G3NutritionValidation `/components/diagnostic/ValidationGroups/G3NutritionValidation.tsx`
**Files:** `components/diagnostic/ValidationGroups/G3NutritionValidation.tsx` (nuevo, ~215 líneas)
**Patterns:**
- Estructura similar a G2: NO es simple wrapper, tiene UI adicional específica del dominio
- Usa `NutritionGroupValidation` (extends GroupValidation) con campos específicos:
  - `milkFeedings` { count, required, status }
  - `solidFeedings` { count, required, status }
  - `nutritionGroupsCovered` y `nutritionGroupsRequired` (arrays de NutritionGroup)
  - `aiClassifications` (array de NutritionClassification)
- Componente auxiliar `FeedingSummary` para leche y sólidos:
  - Muestra count/required con icono de check/alert
  - Badge "Faltan N" si no alcanza el mínimo
- Componente auxiliar `NutritionGroupsGrid` para grupos nutricionales:
  - Grid de badges coloreados por grupo (proteína=rojo, carbohidrato=ámbar, grasa=amarillo, fibra=verde)
  - Badges con border dashed para grupos requeridos pero faltantes
  - Mensaje "Faltan: X, Y" al final si hay faltantes
- Iconos: `Utensils` principal, `Milk` para leche, `Salad` para sólidos
**Notes:**
- Build pasa correctamente
- Errores lint pre-existentes en otros archivos (no relacionados)
- Fase 10: 3/4 tareas completadas
- Próxima: 10.4 - Crear G4EnvironmentalValidation

---

### Session 22 - 2026-02-03
**Task:** 10.4 - Crear G4EnvironmentalValidation `/components/diagnostic/ValidationGroups/G4EnvironmentalValidation.tsx`
**Files:** `components/diagnostic/ValidationGroups/G4EnvironmentalValidation.tsx` (nuevo, ~310 líneas)
**Patterns:**
- Estructura más compleja que G1/G2/G3: tiene 3 secciones visuales diferenciadas
- Usa `EnvironmentalGroupValidation` (extends GroupValidation) con campos específicos:
  - `detectedKeywords` array de strings de cambios detectados
  - `factors` objeto con 7 CriterionResult (screenTime, temperature, humidity, etc.)
- Componente auxiliar `FactorSummary` para cada factor ambiental:
  - Iconos específicos por factor (Tv, Thermometer, Droplets, Baby, Users, etc.)
  - Estado "Pendiente" con border dashed para datos no disponibles (ej: humidity Sprint 4B)
  - Click handler para abrir modal de detalle
- Componente auxiliar `KeywordsDetected` para mostrar cambios recientes:
  - Grid de badges coloreados por categoría (school=azul, sibling=rosa, moving=naranja, etc.)
  - Mensaje verde "No se detectaron cambios" si array vacío
  - Agrupación visual de keywords por categoría inferida del texto
- Componente auxiliar `FactorStatusSummary` para header:
  - Conteo rápido: "X OK, Y alertas, Z pendientes"
- Ordenamiento de factores: alertas → warnings → ok → pendientes
- Iconos: `Cloud` principal, iconos específicos por cada factor
**Notes:**
- Build pasa correctamente
- Errores lint pre-existentes en otros archivos (no relacionados)
- Fase 10 COMPLETADA (4/4 tareas)
- Lista para Fase 11: UI - Modal y Deep Linking

---

### Session 23 - 2026-02-03
**Task:** 11.1 - Crear AlertDetailModal `/components/diagnostic/Modals/AlertDetailModal.tsx`
**Files:** `components/diagnostic/Modals/AlertDetailModal.tsx` (nuevo, ~210 líneas)
**Patterns:**
- Usa Dialog de shadcn/ui (DialogContent, DialogHeader, DialogTitle, DialogDescription)
- Carpeta Modals creada para organizar modales del diagnóstico
- Lista scrolleable de criterios con overflow-y-auto y max-h-[80vh]
- Ordenamiento por severidad: alert → warning → ok
- Colores de fondo por status: red-50, yellow-50, gray-50
- StatusIndicator reutilizado para iconos de semáforo
**Deep Linking implementado:**
- `survey`: `/dashboard/children/[id]?tab=survey&field=X`
- `event`: `/dashboard/calendar?eventId=X&childId=Y`
- `chat`: `/dashboard/assistant?childId=X`
- `plan`: `/dashboard/planes?childId=X`
- `calculated`: sin link (datos derivados)
**Iconos por fuente:**
- survey: FileText
- event: Calendar
- chat: MessageSquare
- plan: ClipboardList
**Notes:**
- Build pasa correctamente
- Modal responsivo con max-w-md sm:max-w-lg
- Fase 11: 1/2 tareas completadas
- Próxima: 11.2 - Implementar deep linking en criterios (YA IMPLEMENTADO en este modal)

---

### Session 24 - 2026-02-03
**Task:** 12.1 + 12.2 - Crear PasanteAISection y CTAs
**Files:**
- `components/diagnostic/AIAnalysis/PasanteAISection.tsx` (nuevo, ~175 líneas)
- `components/diagnostic/DiagnosticCTAs.tsx` (nuevo, ~110 líneas)
**Patterns:**
- **On-demand AI**: Análisis se solicita solo cuando el usuario hace click en "Analizar"
- **RequestState machine**: idle → loading → success|error (patrón de estados de petición)
- **Query params navigation**: CTAs usan URLSearchParams para pasar contexto a /dashboard/consultas
- **Retry pattern**: Botón "Reintentar" en estado error y "Regenerar" en estado success
- **Gradient background**: Card usa bg-gradient-to-br para diferenciar visualmente del resto
**PasanteAISection exports:**
- `PasanteAISection` - Componente principal con botón Analizar y área de resultado
- Props: childId, childName, childAgeMonths, diagnosticResult, planVersion?, planStatus?
**DiagnosticCTAs exports:**
- `EditPlanButton` - Navega a /dashboard/consultas?tab=plan&childId=X
- `GenerateNewPlanButton` - Navega a /dashboard/consultas?tab=analysis&action=new-plan
- `DiagnosticCTAs` - Agrupa ambos botones en fila responsiva
**Navegación de CTAs:**
- EditPlan: `/dashboard/consultas?childId=X&tab=plan&planId=Y`
- GenerateNewPlan: `/dashboard/consultas?childId=X&tab=analysis&action=new-plan`
**Notes:**
- Build pasa correctamente
- Carpeta AIAnalysis creada para organizar componentes de AI
- Fase 12 COMPLETADA (2/2 tareas)
- Lista para Fase 13: Página Completa

---

### Session 25 - 2026-02-03
**Task:** 13.1, 13.2, 13.3 - Fase 13 Página Completa (DiagnosticPanelClient, page.tsx, lista de niños)
**Files:**
- `app/dashboard/diagnosticos/[childId]/DiagnosticPanelClient.tsx` (nuevo, ~310 líneas)
- `app/dashboard/diagnosticos/[childId]/page.tsx` (nuevo, ~95 líneas)
- `app/dashboard/diagnosticos/page.tsx` (actualizado, ~255 líneas)
**Patterns:**
- **ViewState Machine**: Estados loading → error → blocked → success con renders condicionales
- **Server + Client Split**: page.tsx (server) verifica sesión, DiagnosticPanelClient (client) maneja interacción
- **Blocked State**: Caso especial cuando niño no tiene plan activo, muestra datos básicos + mensaje
- **Grid 2x2**: `grid grid-cols-1 lg:grid-cols-2 gap-6` para ValidationGroups en desktop
- **Next.js 15 Async Params**: `const { childId } = await params` obligatorio en server components
- **Modal Handler**: `handleCriterionClick(criterion, groupTitle)` centraliza apertura del modal de detalle
- **Lista de Niños**: Cards clickeables con badge de "Plan activo"/"Sin plan" y navegación programática
**Arquitectura:**
```
/dashboard/diagnosticos/           → page.tsx (lista de niños, client)
/dashboard/diagnosticos/[childId]/ → page.tsx (server) + DiagnosticPanelClient.tsx (client)
```
**Build Output:**
- `/dashboard/diagnosticos` - 5.65 kB
- `/dashboard/diagnosticos/[childId]` - 13.7 kB
**Notes:**
- Build pasa correctamente
- Errores lint son pre-existentes en otros archivos
- Fase 13 COMPLETADA (3/3 tareas)
- Lista para Fase 14: Integración Final

---
