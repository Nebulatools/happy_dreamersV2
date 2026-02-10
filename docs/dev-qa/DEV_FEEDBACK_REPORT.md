# Reporte de Feedback QA para Desarrollo

**Fecha de Generacion:** 2026-02-09
**Release Evaluado:** Sprint 4A + 4B (Panel Diagnostico + Mejoras Survey + Pasante AI)
**Branch:** QA
**Tester:** Julio
**Analista:** Claude AI

---

## Resumen Ejecutivo

Se identificaron **7 tickets** de ajuste derivados de las pruebas de QA sobre el Sprint 4A+4B. **Todos son bloqueantes** para el merge a main.

| Prioridad | Cantidad | Descripcion |
|-----------|----------|-------------|
| Critica | 3 | Bugs funcionales confirmados (ferritina, crash survey, Pasante AI) |
| Alta | 2 | Funcionalidad faltante o no visible (reflujo survey, humedad G4) |
| Media | 2 | UX - criterios no expandibles (G1/G4) |

---

## TICKET #1: Criterios ocultos en G1 y G4 no son expandibles

**Prioridad:** Media
**Tests QA:** TEST 3 (G1), TEST 6 (G4)
**Componente:** `components/diagnostic/ValidationGroupCard.tsx`
**Tipo:** UX - Funcionalidad faltante

### Descripcion del Issue

En G1 (Validacion de Horario) despues de "Duracion de siestas" y en G4 (Factores Ambientales) despues de "Comparte cuarto", se muestra una leyenda "+2 criterios mas" que parece un link clickeable pero no responde al click. El usuario espera poder expandir y ver los criterios ocultos.

### Analisis Tecnico

`ValidationGroupCard.tsx` tiene un limite hardcodeado de 5 criterios visibles:

```typescript
// Linea 162-164
const visibleCriteria = sortedCriteria.slice(0, 5)  // Solo muestra primeros 5
const hiddenCount = sortedCriteria.length - 5

// Linea 221-226 - Renderiza como <p> plano (no clickeable)
{hiddenCount > 0 && (
  <p className="text-xs text-gray-500 text-center py-1">
    +{hiddenCount} criterio{hiddenCount !== 1 ? "s" : ""} mas
  </p>
)}
```

### Solucion Propuesta

1. Agregar estado `expanded` al componente
2. Cambiar `<p>` por `<button>` con cursor pointer
3. Cuando expanded=true, mostrar todos los criterios (`sortedCriteria` completo)
4. Agregar boton "Ver menos" cuando esta expandido

### Archivos a Modificar

- `components/diagnostic/ValidationGroupCard.tsx` (lineas 162-226)

### Criterios de Aceptacion

- [ ] Click en "+X criterios mas" expande y muestra todos los criterios
- [ ] Aparece opcion "Ver menos" para colapsar
- [ ] El texto tiene cursor pointer y feedback visual de hover
- [ ] Funciona tanto en G1 como en G4 (y cualquier grupo con >5 criterios)

---

## TICKET #2: Seccion de Reflujo no visible en Survey (Desarrollo y Salud)

**Prioridad:** Alta
**Tests QA:** TEST 10, TEST 16
**Componente:** `components/survey/steps/HealthDevStep.tsx`
**Tipo:** Bug - Funcionalidad no visible

### Descripcion del Issue

Al editar el survey de un nino, en la seccion "Desarrollo y Salud" no aparece la pregunta/checkbox de "Reflujo" ni sus sub-checkboxes condicionales (vomita frecuentemente, arquea espalda, llora al comer). Confirmado en TEST 16 con un nino nuevo.

### Analisis Tecnico

El codigo SI esta implementado en `HealthDevStep.tsx` lineas 492-571:

```typescript
// Linea 492-505: Checkbox principal
<Checkbox
  id="prob-reflujo"
  checked={data.problemasHijo?.includes("reflujo") || false}
  onCheckedChange={(checked) => {
    updateProblemaHijo("reflujo", checked, ...)
  }}
/>

// Linea 506-571: Sub-checkboxes condicionales
// reflujoDetails.vomitaFrecuente
// reflujoDetails.arqueaEspalda
// reflujoDetails.lloraAlComer
```

**Posibles causas:**
1. El checkbox esta en la posicion 9 de una lista larga - podria estar fuera del viewport visible
2. Error de renderizado condicional que oculta la seccion
3. Problema con la inicializacion de `problemasHijo` en surveys existentes
4. Cache del navegador mostrando version antigua del componente

### Investigacion Requerida

- Verificar si el checkbox se renderiza en el DOM (DevTools > Elements)
- Verificar si hay CSS que lo oculta
- Verificar si `problemasHijo` se inicializa correctamente como array

### Archivos a Investigar

- `components/survey/steps/HealthDevStep.tsx` (lineas 490-575)
- `hooks/useSurveyForm.ts` (inicializacion de datos)

### Criterios de Aceptacion

- [ ] Checkbox "Tiene o ha tenido reflujo y/o colicos" visible en seccion Desarrollo y Salud
- [ ] Al marcarlo, aparecen 3 sub-checkboxes (vomita, arquea espalda, llora)
- [ ] Al desmarcarlo, sub-checkboxes desaparecen y se limpian
- [ ] Datos persisten al guardar
- [ ] Funciona tanto en surveys nuevos como existentes

---

## TICKET #3: Ferritina guardada no se refleja en G2

**Prioridad:** Critica
**Test QA:** TEST 12
**Componente:** `lib/diagnostic/rules/medical-rules.ts`
**Tipo:** Bug - Logica de evaluacion rota

### Descripcion del Issue

Se actualizo el survey de Elias con ferritina=35 (deberia disparar alerta porque <50 ng/mL). Como admin, G2 no mostro la alerta de ferritina baja.

### Analisis Tecnico - Bug Confirmado

El `evaluator` custom definido en `medical-indicators.ts` **nunca es llamado** por `medical-rules.ts`.

**En `medical-indicators.ts` (linea 351-362):**
```typescript
{
  id: "restless_ferritina_baja",
  name: "Ferritina baja (<50 ng/mL)",
  surveyField: "nivelFerritina",
  evaluator: (value: unknown) => {
    if (typeof value !== "number") return false
    return value < 50  // Logica correcta: alerta si < 50
  },
  available: true,
}
```

**En `medical-rules.ts` (lineas 62-78) - EL BUG:**
```typescript
if (config.surveyField && config.available) {
  const value = surveyData?.[config.surveyField]
  if (typeof value === "boolean") {
    detected = value
  } else if (typeof value === "number") {
    detected = value > 0  // GENERICO: Solo checa si > 0, IGNORA el evaluator
  }
}
// El evaluator NUNCA se llama
```

**Resultado:** Con ferritina=35, la logica generica evalua `35 > 0 = true` pero no usa el umbral correcto de `<50`. El indicador se marca como "detectado" pero sin la semantica correcta, o puede que no se muestre por como se interpreta el resultado.

### Solucion Propuesta

En `medical-rules.ts`, agregar llamada al `evaluator` cuando existe:

```typescript
if (config.evaluator) {
  detected = config.evaluator(value)
} else if (typeof value === "boolean") {
  detected = value
} else if (typeof value === "number") {
  detected = value > 0
}
```

### Archivos a Modificar

- `lib/diagnostic/rules/medical-rules.ts` (lineas 62-78)

### Criterios de Aceptacion

- [ ] Con ferritina < 50, G2 muestra alerta "Ferritina baja"
- [ ] Con ferritina >= 50, G2 NO muestra alerta
- [ ] Con ferritina vacia/undefined, no causa error
- [ ] Otros indicadores medicos siguen funcionando correctamente

---

## TICKET #4: Humedad del survey no se refleja en G4

**Prioridad:** Alta
**Test QA:** TEST 13
**Componente:** `lib/diagnostic/rules/environmental-rules.ts` / Survey
**Tipo:** Bug - Datos no llegan al diagnostico

### Descripcion del Issue

Se actualizo el survey de Elias para seleccionar "poca humedad en cuarto" y como admin G4 no lo mostro.

### Analisis Tecnico

El codigo de validacion ambiental parece correcto:
- Survey guarda en campo `humedadHabitacion` (`RoutineHabitsStep.tsx:342`)
- Reglas ambientales leen de `humedadHabitacion` (`environmental-rules.ts:198`)
- Evaluador espera valores: `"seca"`, `"normal"`, `"humeda"`

**Posible causa:** Mismatch entre el valor que guarda el survey y lo que espera la regla. El tester reporta "poca humedad" - si el select usa labels como "Poca humedad" pero el value guardado es diferente, o si el valor no se mapea correctamente a "seca", la regla no lo detectaria.

### Investigacion Requerida

- Verificar que valor exacto guarda el survey cuando se selecciona "poca humedad"
- Verificar en MongoDB el campo `surveyData.humedadHabitacion` del nino Elias
- Comparar con los valores que espera `evaluateHumidity()`: "seca", "normal", "humeda"

### Archivos a Investigar

- `components/survey/steps/RoutineHabitsStep.tsx` (campo de humedad, ~linea 342)
- `lib/diagnostic/rules/environmental-rules.ts` (lineas 129-179)
- `lib/diagnostic/environmental-rules.ts` (lineas 44-53)

### Criterios de Aceptacion

- [ ] Seleccionar "Seca" en survey → G4 muestra warning
- [ ] Seleccionar "Humeda" en survey → G4 muestra warning
- [ ] Seleccionar "Normal" → G4 no muestra warning
- [ ] Sin seleccion → G4 no muestra error

---

## TICKET #5: Crash al navegar a Dinamica Familiar del cuestionario

**Prioridad:** Critica
**Test QA:** TEST 14
**Componente:** `components/survey/steps/FamilyDynamicsStep.tsx`, `components/survey/SiblingsList.tsx`
**Tipo:** Bug - Crash (ErrorBoundary)

### Descripcion del Issue

Al intentar navegar a la seccion "Dinamica Familiar" del cuestionario, aparece "Algo salio mal" (ErrorBoundary). El tester no pudo completar la prueba de agregar hermanos.

### Analisis Tecnico - Bug Confirmado

Cadena de fallo:

1. **`useSurveyForm.ts:31`** inicializa `dinamicaFamiliar: {}` (sin campo `hijosInfo`)
2. **`FamilyDynamicsStep.tsx:52`** pasa `data.hijosInfo` a SiblingsList con type assertion
3. **`SiblingsList.tsx:127`** intenta hacer `.map()` sobre `value` que puede ser `undefined`

```typescript
// FamilyDynamicsStep.tsx:52
<SiblingsList
  value={(data.hijosInfo as SiblingInfo[]) || []}  // Si hijosInfo es null, || [] no atrapa
  onChange={...}
/>

// SiblingsList.tsx:127
{value.map((sibling, index) => (  // Crash si value es undefined/null
```

**Escenario:** Surveys existentes (antes de Sprint 4B) no tienen `hijosInfo` en su `dinamicaFamiliar`. Cuando se carga ese step, `data.hijosInfo` es `undefined` o `null`, el fallback `|| []` no siempre atrapa `null`, y `.map()` lanza TypeError.

### Solucion Propuesta

1. Inicializar `hijosInfo: []` en `useSurveyForm.ts` default data
2. Agregar fallback defensivo en `SiblingsList.tsx`: `const safeValue = Array.isArray(value) ? value : []`
3. Validar que `FamilyDynamicsStep.tsx` pase array seguro

### Archivos a Modificar

- `hooks/useSurveyForm.ts` (linea 31 - agregar hijosInfo: [])
- `components/survey/SiblingsList.tsx` (linea 62 - validacion defensiva)
- `components/survey/steps/FamilyDynamicsStep.tsx` (linea 52 - fallback seguro)

### Criterios de Aceptacion

- [ ] Navegar a Dinamica Familiar NO causa crash
- [ ] Surveys existentes (sin hijosInfo) cargan correctamente con lista vacia
- [ ] Surveys nuevos permiten agregar hermanos sin error
- [ ] Los datos de hermanos persisten al guardar

---

## TICKET #6: Pasante AI no integra notas de Bitacora en el analisis

**Prioridad:** Critica
**Test QA:** TEST 15
**Componente:** `app/dashboard/diagnosticos/[childId]/DiagnosticPanelClient.tsx`
**Tipo:** Bug - Datos no pasan al componente AI

### Descripcion del Issue

Al hacer click en "Analizar" en la seccion Pasante AI del diagnostico, el resumen generado no menciona ni integra las notas de la Bitacora (notas de eventos de padres + notas del dashboard). El tester tenia notas dadas de alta pero no aparecieron en el analisis.

### Analisis Tecnico - Bug Confirmado

La cadena de datos esta rota en un punto intermedio:

```
API diagnostics/[childId] → Extrae notas ✅
                          → Las usa para G4 ✅
                          → PERO NO las retorna al frontend ❌

DiagnosticPanelClient → Recibe diagnosticResult (sin notas)
                      → Renderiza PasanteAISection SIN freeTextData ❌

PasanteAISection → Espera prop freeTextData (undefined)
                 → Envia undefined al API ai-summary ❌

API ai-summary → Recibe freeTextData: undefined
              → Prompt se genera sin seccion de texto libre ❌
```

**Puntos especificos del bug:**

1. `app/api/admin/diagnostics/[childId]/route.ts` (lineas 125-132): Extrae `eventNotes` y `chatTexts` pero no los incluye en la respuesta JSON
2. `DiagnosticPanelClient.tsx` (lineas 323-332): No pasa `freeTextData` prop a `PasanteAISection`
3. `PasanteAISection.tsx` (linea 20-25): Define el prop como opcional, recibe `undefined`

### Solucion Propuesta

1. **API diagnostics/[childId]**: Incluir `freeTextData: { eventNotes, chatMessages: chatTexts }` en el JSON de respuesta
2. **DiagnosticResult type** (`lib/diagnostic/types.ts`): Agregar campo `freeTextData` a la interfaz
3. **DiagnosticPanelClient**: Extraer `freeTextData` del resultado y pasarlo como prop a PasanteAISection

### Archivos a Modificar

- `app/api/admin/diagnostics/[childId]/route.ts` (agregar freeTextData al response)
- `lib/diagnostic/types.ts` (agregar campo a interfaz)
- `app/dashboard/diagnosticos/[childId]/DiagnosticPanelClient.tsx` (pasar prop)

### Criterios de Aceptacion

- [ ] Si el nino tiene notas de eventos (ultimos 14 dias), se incluyen en el analisis AI
- [ ] Si tiene notas de Bitacora del dashboard, tambien se incluyen
- [ ] El resumen AI menciona hallazgos del texto libre cuando hay notas
- [ ] Sin notas, el analisis funciona normalmente (sin seccion de texto libre)
- [ ] El indicador "(incluye analisis de texto libre)" aparece cuando hay notas

---

## TICKET #7: Verificar integracion Survey → Diagnostico (Reflujo + Humedad)

**Prioridad:** Alta
**Tests QA:** TEST 12, TEST 13, TEST 16
**Componente:** Pipeline Survey → API Diagnostics
**Tipo:** Integracion - Verificar flujo completo

### Descripcion del Issue

Los tickets #2, #3 y #4 comparten una causa comun potencial: los datos del survey no llegan correctamente al panel de diagnostico. Ademas de los bugs individuales, se necesita verificar el flujo completo de datos.

### Verificacion Requerida

1. **Survey guarda correctamente**: Verificar en MongoDB que los campos nuevos (`reflujoDetails`, `nivelFerritina`, `humedadHabitacion`) se guardan con los valores esperados
2. **API lee correctamente**: Verificar que la API de diagnostico lee estos campos del survey
3. **Reglas evaluan correctamente**: Verificar que las reglas de cada grupo procesan los valores

### Criterios de Aceptacion

- [ ] Flujo completo: Survey → MongoDB → API Diagnostico → Panel muestra datos correctos
- [ ] Campos nuevos de Sprint 4B se guardan y leen sin error
- [ ] Surveys existentes (sin campos nuevos) no causan errores en el diagnostico

---

## Orden de Implementacion Recomendado

| Orden | Ticket | Prioridad | Estimacion |
|-------|--------|-----------|------------|
| 1 | #5 - Crash Dinamica Familiar | Critica | Rapido (defensivo) |
| 2 | #3 - Ferritina evaluator | Critica | Rapido (agregar llamada a evaluator) |
| 3 | #6 - Pasante AI freeTextData | Critica | Medio (3 archivos, pipeline de datos) |
| 4 | #2 - Reflujo survey visible | Alta | Investigar primero |
| 5 | #4 - Humedad G4 | Alta | Investigar (posible mismatch de valores) |
| 6 | #7 - Verificar integracion | Alta | Verificacion post-fix |
| 7 | #1 - G1/G4 expandir criterios | Media | Medio (estado expand/collapse) |

---

## Archivos Afectados (Resumen)

| Archivo | Tickets |
|---------|---------|
| `components/diagnostic/ValidationGroupCard.tsx` | #1 |
| `components/survey/steps/HealthDevStep.tsx` | #2 |
| `lib/diagnostic/rules/medical-rules.ts` | #3 |
| `lib/diagnostic/rules/environmental-rules.ts` | #4 |
| `components/survey/steps/RoutineHabitsStep.tsx` | #4 |
| `hooks/useSurveyForm.ts` | #5 |
| `components/survey/SiblingsList.tsx` | #5 |
| `components/survey/steps/FamilyDynamicsStep.tsx` | #5 |
| `app/api/admin/diagnostics/[childId]/route.ts` | #6 |
| `lib/diagnostic/types.ts` | #6 |
| `app/dashboard/diagnosticos/[childId]/DiagnosticPanelClient.tsx` | #6 |

---

---

## Estado de Resolucion

| Ticket | Status | Resolucion |
|--------|--------|------------|
| #1 - G1/G4 expandir criterios | RESUELTO | Agregado expand/collapse con useState en ValidationGroupCard.tsx |
| #2 - Reflujo survey visible | NO ES BUG | El checkbox existe en HealthDevStep.tsx:492-571. QA_RELEASE_NOTES no era claro sobre ubicacion |
| #3 - Ferritina evaluator | RESUELTO | Agregado llamada a `config.evaluator` antes de logica generica en medical-rules.ts |
| #4 - Humedad G4 | RESUELTO | Root cause: surveyData anidado por seccion, diagnostico accedia plano. Agregado `flattenSurveyData()` en API |
| #5 - Crash Dinamica Familiar | RESUELTO | 3 archivos: inicializacion hijosInfo, Array.isArray defensivo en FamilyDynamicsStep y SiblingsList |
| #6 - Pasante AI freeTextData | RESUELTO | Pipeline roto en 3 puntos: API no retornaba datos, tipo no incluia campo, client no pasaba prop |
| #7 - Integracion Survey-Diag | RESUELTO | Cubierto por fix #4: flattenSurveyData() resuelve el mapping de TODOS los campos survey a diagnostico |

### Descubrimiento Critico durante Fix #4

La investigacion de humedad revelo un problema mayor: **TODOS los campos del survey estaban inaccesibles** para el motor de diagnostico. El survey guarda datos anidados por seccion (`surveyData.desarrolloSalud.reflujoColicos`) pero las reglas de validacion accedian de forma plana (`surveyData["reflujoColicos"]`).

**Solucion implementada:**
1. **`flattenSurveyData()`** en `app/api/admin/diagnostics/[childId]/route.ts`: Merge todas las secciones en un objeto plano + mappings especiales para G4 (roomTemperature, postpartumDepression, sleepingArrangement, sharesRoom, alergiasPadres)
2. **`getNestedValue()`** en `lib/diagnostic/rules/medical-rules.ts`: Soporte dot-notation para campos como `reflujoDetails.vomitaFrecuente` y `restlessLegSyndrome.pataleoNocturno`

### Archivos Modificados

| Archivo | Tickets Resueltos | Cambio |
|---------|-------------------|--------|
| `hooks/useSurveyForm.ts` | #5 | `dinamicaFamiliar: { hijosInfo: [] }` |
| `components/survey/steps/FamilyDynamicsStep.tsx` | #5 | `Array.isArray()` defensivo |
| `components/survey/SiblingsList.tsx` | #5 | Validacion defensiva de `rawValue` |
| `lib/diagnostic/rules/medical-rules.ts` | #3, #4 | evaluator call + getNestedValue() |
| `lib/diagnostic/types.ts` | #6 | Campo `freeTextData` en DiagnosticResult |
| `app/api/admin/diagnostics/[childId]/route.ts` | #4, #6 | flattenSurveyData() + freeTextData en response |
| `app/dashboard/diagnosticos/[childId]/DiagnosticPanelClient.tsx` | #6 | freeTextData prop a PasanteAISection |
| `components/diagnostic/ValidationGroupCard.tsx` | #1 | expand/collapse con useState |

*Documento actualizado el 2026-02-09 con resoluciones implementadas*
