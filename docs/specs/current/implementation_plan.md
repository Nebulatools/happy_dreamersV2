# Implementation Plan: Panel de Diagnostico (Estadisticas)

Generado desde: `docs/plans/2026-02-03-feat-diagnostic-panel-estadisticas-plan.md`
Fecha: 2026-02-03

---

## Credenciales de Testing

| Rol | Email | Password |
|-----|-------|----------|
| Admin | mariana@admin.com | password |
| Padre | eljulius@nebulastudios.io | juls0925 |

---

## Fase 0: Activation & Smoke Test

- [x] **0.1** Crear ruta base `/dashboard/diagnosticos`
  - Output: Pagina accesible en `/dashboard/diagnosticos`
  - Comportamiento: Muestra "Panel de Diagnostico - Selecciona un paciente" con icono
  - Referencia: ver `app/dashboard/consultas/page.tsx` lineas 325-352 (estado vacio)

- [x] **0.2** Agregar verificacion admin-only
  - Input: session.user.role
  - Output: Redirige a dashboard si no es admin
  - Referencia: ver `app/dashboard/consultas/page.tsx` lineas 46-56, 161-173

Validacion Fase 0:
• `npm run build` pasa
• Pagina accesible en `/dashboard/diagnosticos`
• Usuarios no-admin ven mensaje de acceso denegado

---

## Fase 1: Tipos e Interfaces

- [x] **1.1** Crear archivo de tipos `/lib/diagnostic/types.ts`
  - Output: Interfaces DiagnosticResult, GroupValidation, CriterionResult, Alert, NutritionClassification
  - Comportamiento: Exporta StatusLevel, SourceType, MedicalCondition, NutritionGroup
  - Referencia: ver `types/models.ts` para patron de interfaces

Validacion Fase 1:
• Build pasa sin errores de TypeScript
• Tipos importables desde otros archivos

---

## Fase 2: Constantes y Reglas Base

- [x] **2.1** Crear constantes de horarios por edad `/lib/diagnostic/age-schedules.ts`
  - Output: Objeto AGE_SCHEDULE_RULES indexado por rango de edad
  - Comportamiento: Contiene siestas, ventanas, limites, pre-bedtime por edad
  - Referencia: ver SPEC-SPRINT.md tabla "Tabla Resumen de Validacion G1"

- [x] **2.2** Crear constantes de requisitos nutricionales `/lib/diagnostic/nutrition-requirements.ts`
  - Output: Objeto NUTRITION_RULES por rango de edad
  - Comportamiento: Contiene lecheMin, solidosRegla, gruposRequeridos
  - Referencia: ver SPEC-SPRINT.md seccion G3 "Requisitos por Edad"

- [x] **2.3** Crear constantes de indicadores medicos `/lib/diagnostic/medical-indicators.ts`
  - Output: Arrays REFLUX_INDICATORS, APNEA_INDICATORS, RESTLESS_LEG_INDICATORS
  - Comportamiento: Cada indicador tiene { name, surveyField, available, description }
  - Referencia: ver SPEC-SPRINT.md seccion G2 tablas de indicadores

- [x] **2.4** Crear constantes ambientales `/lib/diagnostic/environmental-rules.ts`
  - Output: Constantes de umbrales y arrays de keywords
  - Comportamiento: SCREEN_RULES, TEMP_RANGE, HUMIDITY_RANGE, CHANGE_KEYWORDS
  - Referencia: ver SPEC-SPRINT.md seccion G4

Validacion Fase 2:
• Build pasa
• Constantes exportables e importables
• No hay magic numbers en el codigo

---

## Fase 3: Motor de Validacion G1 (Horario)

- [x] **3.1** Crear validador de horario `/lib/diagnostic/rules/schedule-rules.ts`
  - Input: { events, plan, childAgeMonths }
  - Output: GroupValidation con array de CriterionResult
  - Comportamiento: Valida despertar +-15min, limite 6AM, duracion noche, siestas
  - Referencia: usar helpers de `lib/sleep-calculations.ts`

- [x] **3.2** Agregar logica de ventanas de sueno
  - Input: eventos del dia, edad del nino
  - Output: CriterionResult para cada ventana evaluada
  - Comportamiento: Calcula gaps entre wake/sleep, compara con AGE_SCHEDULE_RULES

Validacion Fase 3:
• Build pasa
• Funcion retorna GroupValidation valido

---

## Fase 4: Motor de Validacion G2 (Medico)

- [x] **4.1** Crear validador medico `/lib/diagnostic/rules/medical-rules.ts`
  - Input: { surveyData, events }
  - Output: GroupValidation con indicadores agrupados por condicion
  - Comportamiento: Evalua reflujo, apnea, restless leg (1 indicador = alerta)
  - Referencia: usar optional chaining para campos que no existen en survey

- [x] **4.2** Agregar contador de datos pendientes
  - Input: indicadores medicos evaluados
  - Output: dataCompleteness { available, total, pending[] }
  - Comportamiento: Cuenta indicadores con dataAvailable: false

Validacion Fase 4:
• Build pasa
• Datos faltantes reportados en dataCompleteness.pending

---

## Fase 5: Motor de Validacion G3 (Alimentacion)

- [x] **5.1** Crear validador de alimentacion `/lib/diagnostic/rules/nutrition-rules.ts`
  - Input: { feedingEvents, childAgeMonths }
  - Output: GroupValidation con frecuencia y grupos nutricionales
  - Comportamiento: Valida tomas de leche, solidos, grupos segun edad

- [x] **5.2** Crear clasificador AI de alimentos `/lib/diagnostic/ai-food-classifier.ts`
  - Input: feedingNotes (texto libre)
  - Output: { nutritionGroups[], aiClassified, confidence }
  - Comportamiento: Usa OpenAI GPT-4, fallback a aiClassified:false si falla
  - Referencia: ver `lib/rag/chat-agent.ts` para patron OpenAI

- [x] **5.3** Crear endpoint de clasificacion `/api/admin/diagnostics/classify-food/route.ts`
  - Input: POST { feedingNotes }
  - Output: JSON { nutritionGroups, aiClassified, confidence }
  - Comportamiento: Llama ai-food-classifier, maneja errores, admin-only

Validacion Fase 5:
• Build pasa
• Endpoint responde con clasificacion o fallback

---

## Fase 6: Motor de Validacion G4 (Ambiental)

- [ ] **6.1** Crear validador ambiental `/lib/diagnostic/rules/environmental-rules.ts`
  - Input: { surveyData, recentEventNotes, chatMessages }
  - Output: GroupValidation con factores ambientales evaluados
  - Comportamiento: Valida pantallas, temperatura, depresion, colecho, cambios

- [ ] **6.2** Implementar detector de keywords
  - Input: array de strings (notas de eventos + chats ultimos 14 dias)
  - Output: string[] de keywords detectadas
  - Comportamiento: Busqueda simple case-insensitive de CHANGE_KEYWORDS

Validacion Fase 6:
• Build pasa
• Keywords detectadas en texto de prueba

---

## Fase 7: API de Diagnostico

- [ ] **7.1** Crear endpoint principal `/api/admin/diagnostics/[childId]/route.ts`
  - Input: GET con childId en params
  - Output: DiagnosticResult completo con los 4 grupos
  - Comportamiento: Verifica admin, verifica plan activo, ejecuta 4 validadores
  - Referencia: ver `app/api/consultas/analyze/route.ts` para patron admin

- [ ] **7.2** Agregar logica de prerequisito (plan activo)
  - Input: childId
  - Output: 400 con mensaje si no hay plan activo
  - Comportamiento: Query childPlans donde status === "active"
  - Referencia: ver `lib/rag/plan-context-builder.ts` getActivePlan()

Validacion Fase 7:
• Build pasa
• Endpoint retorna 401 para no-admin
• Endpoint retorna 400 sin plan activo
• Endpoint retorna DiagnosticResult con plan activo

---

## Fase 8: Pasante AI

- [ ] **8.1** Crear prompt del Pasante AI `/lib/diagnostic/pasante-ai-prompt.ts`
  - Output: Funcion getPasanteSystemPrompt(context) que retorna string
  - Comportamiento: Prompt descriptivo + recomendaciones generales, NO medicas
  - Referencia: ver `lib/rag/sleep-coach-personality.ts` para patron

- [ ] **8.2** Crear endpoint de resumen AI `/api/admin/diagnostics/ai-summary/route.ts`
  - Input: POST { childId, diagnosticResult }
  - Output: { aiSummary: string }
  - Comportamiento: On-demand, usa GPT-4, max_tokens 400
  - Referencia: ver `lib/rag/chat-agent.ts` para patron OpenAI

Validacion Fase 8:
• Build pasa
• Endpoint genera resumen coherente en espanol

---

## Fase 9: UI - Componentes Base

- [ ] **9.1** Crear componente ProfileHeader `/components/diagnostic/ProfileHeader.tsx`
  - Props: { child, plan, surveyData }
  - Render: Card con nombre, edad, plan vigente, alertas criticas visibles
  - Referencia: ver `components/dashboard/AdminStatistics.tsx` Cards

- [ ] **9.2** Crear componente StatusIndicator `/components/diagnostic/StatusIndicator.tsx`
  - Props: { status: StatusLevel, showLabel?, size? }
  - Render: Icono CheckCircle/AlertTriangle/AlertCircle con color
  - Comportamiento: ok=verde, warning=amarillo, alert=rojo

- [ ] **9.3** Crear componente generico ValidationGroupCard `/components/diagnostic/ValidationGroupCard.tsx`
  - Props: { title, icon, status, criteria[], dataCompleteness?, onCriterionClick }
  - Render: Card con header, lista de criterios, mensaje de datos pendientes
  - Referencia: ver pattern de Cards en AdminStatistics.tsx

Validacion Fase 9:
• Build pasa
• Componentes renderizan sin errores

---

## Fase 10: UI - Grupos de Validacion

- [ ] **10.1** Crear G1ScheduleValidation `/components/diagnostic/ValidationGroups/G1ScheduleValidation.tsx`
  - Props: { validation: GroupValidation, onCriterionClick }
  - Render: Usa ValidationGroupCard con icono Clock
  - Comportamiento: Muestra criterios de horario con status individual

- [ ] **10.2** Crear G2MedicalValidation `/components/diagnostic/ValidationGroups/G2MedicalValidation.tsx`
  - Props: { validation: GroupValidation, onCriterionClick }
  - Render: Card con indicadores agrupados por condicion (reflujo, apnea, restless)
  - Comportamiento: Muestra "X de Y indicadores detectados" + "Z pendientes"

- [ ] **10.3** Crear G3NutritionValidation `/components/diagnostic/ValidationGroups/G3NutritionValidation.tsx`
  - Props: { validation: GroupValidation, onCriterionClick }
  - Render: Card con frecuencia comidas y grupos nutricionales
  - Comportamiento: Muestra grupos cubiertos vs requeridos por edad

- [ ] **10.4** Crear G4EnvironmentalValidation `/components/diagnostic/ValidationGroups/G4EnvironmentalValidation.tsx`
  - Props: { validation: GroupValidation, onCriterionClick }
  - Render: Card con factores ambientales y keywords detectadas
  - Comportamiento: Lista factores con status individual

Validacion Fase 10:
• Build pasa
• 4 componentes renderizan con datos mock

---

## Fase 11: UI - Modal y Deep Linking

- [ ] **11.1** Crear AlertDetailModal `/components/diagnostic/Modals/AlertDetailModal.tsx`
  - Props: { open, onClose, groupTitle, criteria[] }
  - Render: Dialog overlay con lista de criterios y sus valores
  - Comportamiento: Solo lectura, cada criterio tiene link
  - Referencia: ver `components/ui/dialog.tsx` para Dialog pattern

- [ ] **11.2** Implementar deep linking en criterios
  - Input: criterio con sourceType ('survey' | 'event') y sourceId
  - Output: Link a `/dashboard/children/[id]?tab=survey&field=X` o calendario
  - Comportamiento: Click navega a fuente del dato

Validacion Fase 11:
• Build pasa
• Modal abre y cierra correctamente
• Links navegan a destino

---

## Fase 12: UI - Pasante AI y CTAs

- [ ] **12.1** Crear PasanteAISection `/components/diagnostic/AIAnalysis/PasanteAISection.tsx`
  - Props: { childId, diagnosticResult }
  - Render: Card con boton "Analizar" + area de resultado
  - Comportamiento: Click llama API, muestra loading, muestra resultado

- [ ] **12.2** Crear EditPlanButton y GenerateNewPlanButton
  - Props: { childId, planId }
  - Render: 2 botones en fila al final del panel
  - Comportamiento: Navegan a `/dashboard/consultas?tab=plan` con context

Validacion Fase 12:
• Build pasa
• Boton Analizar genera resumen AI
• CTAs navegan a consultas

---

## Fase 13: Pagina Completa

- [ ] **13.1** Crear DiagnosticPanelClient `/app/dashboard/diagnosticos/[childId]/DiagnosticPanelClient.tsx`
  - Props: { childId }
  - Render: ProfileHeader + grid 2x2 de ValidationGroups + PasanteAI + CTAs
  - Comportamiento: Fetch diagnostico, maneja loading/error/bloqueado states
  - Referencia: ver `app/dashboard/consultas/page.tsx` para estructura

- [ ] **13.2** Crear pagina con childId `/app/dashboard/diagnosticos/[childId]/page.tsx`
  - Output: Server component que verifica session y renderiza Client
  - Comportamiento: Admin check, pasa childId a DiagnosticPanelClient

- [ ] **13.3** Actualizar pagina base para lista/seleccion de ninos
  - Input: useActiveChild context o lista de ninos
  - Output: Grid de cards de ninos clickeables
  - Comportamiento: Click navega a `/dashboard/diagnosticos/[childId]`

Validacion Fase 13:
• Build pasa
• Flujo: lista ninos -> click -> ver diagnostico completo

---

## Fase 14: Integracion Final

- [ ] **14.1** Agregar link en navegacion admin (opcional)
  - Output: Item "Diagnosticos" en sidebar para admins
  - Referencia: ver config de navegacion en sidebar

- [ ] **14.2** Testing E2E del flujo completo
  - Comportamiento: Login admin -> seleccionar nino con plan -> ver 4 grupos -> analizar AI
  - Validar: Todo funciona, no hay errores consola

Validacion Fase 14:
• Build pasa
• Flujo E2E funciona
• No hay errores en consola

---

## Fase 15: E2E Testing Visual (Agent Browser)

**OBLIGATORIO**: Usar `/agent-browser` en modo headed para testing visual completo.

### Desktop Testing (1280px)

- [ ] **15.1** Test acceso admin al panel de diagnosticos
  - Viewport: 1280x800
  - Flujo: Login admin -> `/dashboard/diagnosticos` -> verificar acceso
  - Checkpoints: Pagina carga, lista de ninos visible, sin errores consola
  - Screenshot: `test-screenshots/15.1-desktop-diagnosticos-list.png`

- [ ] **15.2** Test panel de diagnostico completo (Desktop)
  - Viewport: 1280x800
  - Flujo: Click en nino con plan activo -> ver panel completo
  - Checkpoints:
    - ProfileHeader con datos del nino
    - 4 cards de validacion (G1, G2, G3, G4) visibles
    - Semaforos de status con colores correctos
    - Boton "Analizar" del Pasante AI visible
    - CTAs (Editar Plan, Generar Nuevo) visibles
  - Screenshot: `test-screenshots/15.2-desktop-diagnostic-panel.png`

- [ ] **15.3** Test Pasante AI (Desktop)
  - Viewport: 1280x800
  - Flujo: Click en "Analizar" -> esperar respuesta AI
  - Checkpoints: Loading state, resultado AI visible, texto coherente
  - Screenshot: `test-screenshots/15.3-desktop-pasante-ai.png`

- [ ] **15.4** Test modal de detalle de alerta (Desktop)
  - Viewport: 1280x800
  - Flujo: Click en criterio con alerta -> ver modal
  - Checkpoints: Modal abre, detalles visibles, link a fuente funciona
  - Screenshot: `test-screenshots/15.4-desktop-alert-modal.png`

- [ ] **15.5** Test acceso denegado para padre (Desktop)
  - Viewport: 1280x800
  - Flujo: Login padre -> intentar acceder a `/dashboard/diagnosticos`
  - Checkpoints: Mensaje de acceso denegado, NO redirect, NO panel visible
  - Screenshot: `test-screenshots/15.5-desktop-access-denied.png`

### Mobile Testing (375px) - CRITICO

- [ ] **15.6** Test panel de diagnostico (Mobile)
  - Viewport: 375x667 (iPhone SE)
  - Flujo: Login admin -> `/dashboard/diagnosticos/[childId]`
  - Checkpoints:
    - ProfileHeader responsivo (no overflow)
    - Cards de validacion stack vertical
    - Texto legible sin scroll horizontal
    - Botones touch-friendly (min 44px)
  - Screenshot: `test-screenshots/15.6-mobile-diagnostic-panel.png`
  - **Si hay problemas**: Aplicar fixes de CSS y re-testear

- [ ] **15.7** Test grupos de validacion (Mobile)
  - Viewport: 375x667
  - Flujo: Scroll por cada grupo de validacion
  - Checkpoints:
    - G1 Horario: criterios visibles, iconos correctos
    - G2 Medico: indicadores agrupados, mensaje de pendientes
    - G3 Alimentacion: grupos nutricionales, clasificacion AI
    - G4 Ambiental: factores listados correctamente
  - Screenshot: `test-screenshots/15.7-mobile-validation-groups.png`
  - **Si hay problemas**: Ajustar padding, font-size, flex-direction

- [ ] **15.8** Test modal en mobile
  - Viewport: 375x667
  - Flujo: Tap en criterio -> ver modal
  - Checkpoints: Modal fullscreen o casi, contenido scrolleable, boton cerrar accesible
  - Screenshot: `test-screenshots/15.8-mobile-modal.png`

- [ ] **15.9** Test Pasante AI (Mobile)
  - Viewport: 375x667
  - Flujo: Tap "Analizar" -> ver resultado
  - Checkpoints: Boton visible sin scroll, resultado legible, no overflow
  - Screenshot: `test-screenshots/15.9-mobile-pasante-ai.png`

### Protocolo de Fixes

Si algun test falla:
1. `RALPH_MOBILE_FIX:` o `RALPH_DESKTOP_FIX:` - Documentar el problema
2. Aplicar fix de CSS/layout
3. Re-ejecutar test
4. Repetir hasta pasar (max 10 intentos)
5. Documentar solucion en discoveries.md

Validacion Fase 15:
• Todos los screenshots guardados en `test-screenshots/`
• Desktop: 5 tests pasados
• Mobile: 4 tests pasados
• No hay overflow horizontal en mobile
• Todos los elementos son touch-friendly
• Documentado en discoveries.md

---

## Summary

| Fase | Tareas | Descripcion |
|------|--------|-------------|
| 0 | 2 | Activation & admin check |
| 1 | 1 | Tipos e interfaces |
| 2 | 4 | Constantes y reglas |
| 3 | 2 | Motor G1 Horario |
| 4 | 2 | Motor G2 Medico |
| 5 | 3 | Motor G3 Alimentacion + AI |
| 6 | 2 | Motor G4 Ambiental |
| 7 | 2 | API diagnostico |
| 8 | 2 | Pasante AI |
| 9 | 3 | UI componentes base |
| 10 | 4 | UI grupos validacion |
| 11 | 2 | Modal y deep linking |
| 12 | 2 | AI section y CTAs |
| 13 | 3 | Pagina completa |
| 14 | 2 | Integracion final |
| 15 | 9 | **E2E Testing Visual (Agent Browser)** |
| **Total** | **45** | |
