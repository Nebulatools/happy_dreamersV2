## Cambios 11 – Análisis de generación de planes y uso de transcripts desde Plan 0

Fecha: 2025-12-12  
Contexto: Happy Dreamers v0 – Sistema de planes (Plan 0, Plan N, Plan N.1)

---

## 1. Visión general de la generación de planes

El sistema tiene **3 tipos de planes**, todos almacenados en la colección `child_plans`:

- **Plan 0 – Inicial**  
  - `planType: "initial"`  
  - `planNumber: 0`, `planVersion: "0"`  
  - Se genera con:  
    - Datos del niño (`children`).  
    - Historial completo de eventos (`events`).  
    - Encuesta inicial (`surveyData` del niño).  
    - RAG (documentos de referencia por edad).  
    - Políticas por edad (`derivePlanPolicy`).
  - Función principal: `generateInitialPlan(...)` en `app/api/consultas/plans/route.ts`.

- **Plan N – Progresión por eventos**  
  - `planType: "event_based"`  
  - `planNumber: 1, 2, 3...`, `planVersion: "1", "2", ...`  
  - Se genera con:  
    - El plan más reciente como base (incluye refinamientos).  
    - Solo los **eventos nuevos** desde el último plan (`events` con `startTime > createdAt del último plan`).  
    - Estadísticas del período reciente (`processSleepStatistics`).  
    - RAG + políticas por edad.
  - Función principal: `generateEventBasedPlan(...)`.

- **Plan N.1 – Refinamiento por transcript**  
  - `planType: "transcript_refinement"`  
  - `planNumber: N`, `planVersion: "N.1"` (ej. `"1.1"`, `"2.1"`)  
  - Se genera con:  
    - Un plan base (N) como referencia.  
    - Un `consultation_report` que contiene:  
      - `transcript` (texto de la consulta).  
      - `analysis` y `recommendations`.  
    - Posibles cambios específicos de horarios extraídos del transcript.
  - Función principal: `generateTranscriptRefinementPlan(...)`.

Todos los planes se crean inicialmente como `status: "borrador"`.  
La activación (cambio a `status: "active"` y marcado de planes anteriores como `superseded`) se hace vía `PATCH /api/consultas/plans`.

---

## 2. Flujo actual de generación (sin cambios)

### 2.1 Endpoint principal

- Ruta: `POST /api/consultas/plans` (`app/api/consultas/plans/route.ts`).  
- Recibe:  
  - `userId`, `childId`.  
  - `planType`: `"initial" | "event_based" | "transcript_refinement"`.  
  - Opcionalmente `reportId` (obligatorio para `transcript_refinement`).
- Pasos clave:
  1. Verifica que el usuario sea admin.
  2. Carga los planes existentes del niño (`child_plans`).
  3. Calcula `planNumber` y `planVersion` con `calculateNextPlanVersion(...)`.
  4. Valida condiciones específicas según `planType`.
  5. Llama a la función generadora correspondiente:
     - `generateInitialPlan(...)` para `initial`.
     - `generateEventBasedPlan(...)` para `event_based`.
     - `generateTranscriptRefinementPlan(...)` para `transcript_refinement`.
  6. Inserta el plan como `borrador` sin tocar el plan activo.

### 2.2 Reglas de validación por tipo

- **Plan 0 (`initial`)**  
  - Solo se permite si **no hay planes previos** para el niño.  
  - Usa toda la historia de eventos + encuesta + RAG.

- **Plan N (`event_based`)**  
  - Requiere que exista al menos un plan previo (Plan 0).  
  - Valida que haya **eventos nuevos** después del último plan (`hasEventsAfterDate(...)`).  
  - Usa el último plan por `createdAt` como frontera para el rango de eventos.

- **Plan N.1 (`transcript_refinement`)**  
  - Requiere que exista al menos un plan base (`existingPlans.length > 0`).  
  - **Hoy** hay dos restricciones importantes:
    1. No se permite refinar si el último plan tiene `planNumber === 0`.  
       - Mensaje actual: `"No se puede refinar el Plan 0. Primero debe generar el Plan 1"`.  
    2. Requiere transcript disponible **después** de la fecha del último plan (`hasAvailableTranscript(childId, lastPlanDate)`), o que se proporcione explícitamente `reportId`.

---

## 3. Uso actual de transcripts en el sistema

### 3.1 Generación de transcript

- Entrada de transcript:
  - Manual: texto pegado en UI (`TranscriptInput`).  
  - Audio: se envía a `/api/transcript` para transcripción con Google Gemini.
- El transcript + análisis se guardan en `consultation_reports` vía `/api/consultas/analyze`.

### 3.2 Consumo de transcript en planes

Hoy, **solo** se usa transcript cuando se genera un plan de tipo `transcript_refinement`:

- Endpoint: `POST /api/consultas/plans` con:
  - `planType: "transcript_refinement"`.  
  - `reportId`: ID de `consultation_reports`.

La función `generateTranscriptRefinementPlan(...)`:

1. Carga el `consultation_report` (`transcript`, `analysis`, `recommendations`).  
2. Carga el plan base `basePlan` (hoy, N ≥ 1).  
3. Extrae cambios de horarios específicos del transcript (`extractScheduleChangesFromTranscript(...)`).  
4. Llama a `generatePlanWithAI({ planType: "transcript_refinement", previousPlan: basePlan, transcriptAnalysis: {...}, scheduleChanges })`.  
5. Devuelve un `ChildPlan` con:
   - `planType: "transcript_refinement"`.  
   - `planNumber: N`.  
   - `planVersion: "N.1"`.  
   - `basedOn: "transcript_refinement"`.  
   - `transcriptAnalysis` con `reportId`, `improvements`, `adjustments`, `basePlanVersion`.

Conclusión: **el transcript NO se usa en Plan 0 ni en Plan N (event_based)**, solo en Plan N.1.

---

## 4. Limitación actual: no se puede refinar el Plan 0

La restricción está en dos sitios clave:

1. **Cálculo de versión de plan** – `calculateNextPlanVersion(...)`  
   - Si `planType === "transcript_refinement"` y el último plan (`latestPlan`) tiene `planNumber === 0`, lanza error:  
   > "No se puede refinar el Plan 0. Primero debe generar el Plan 1"

2. **Validación de posibilidad de generar** – `PUT /api/consultas/plans`  
   - Si se pide `planType: "transcript_refinement"` y `existingPlans[0].planNumber === 0`, la API responde:  
   > "No se puede refinar el Plan 0. Primero genere el Plan 1"

Por diseño de negocio actual:

- El primer refinamiento por transcript solo puede ocurrir **después** de que exista al menos un plan de progresión por eventos (Plan 1, Plan 2, etc.).  
- No existe hoy la versión `"0.1"` como refinamiento de Plan 0.

---

## 5. Objetivo: permitir transcripts desde el Plan 0

Objetivo funcional:  
> Poder usar un transcript (por ejemplo, de Zoom) para refinar directamente el Plan 0 y generar un **Plan 0.1**, sin obligar a pasar primero por un Plan 1 basado en eventos.

Esto implica:

- Aceptar `planType: "transcript_refinement"` cuando el último y único plan es el Plan 0.  
- Generar un plan con:  
  - `planNumber: 0`.  
  - `planVersion: "0.1"`.  
  - `planType: "transcript_refinement"`.  
  - `basedOnPlan` apuntando al Plan 0.  
  - `transcriptAnalysis` asociada al `reportId` del transcript.
- Mantener la misma metodología de refinamiento por transcript ya existente (no hace falta un nuevo motor).

---

## 6. Problemática y cambios deseados (diseño, antes de implementar)

### 6.1 Permitir refinar Plan 0 en cálculo de versión

Hoy `calculateNextPlanVersion(...)` prohíbe explícitamente refinar Plan 0.  
Necesario:

- Cambiar la lógica para que, cuando `planType === "transcript_refinement"`:
  - Si el último plan existente es el Plan 0 → se permita generar:
    - `planNumber: 0`.  
    - `planVersion: "0.1"`.
  - Si el último plan es N ≥ 1 → se mantenga el comportamiento actual:
    - `planNumber: N`.  
    - `planVersion: "N.1"`.

Esto convierte la restricción actual en una **política opcional**, no en un bloqueo técnico.

### 6.2 Ajustar validación de `PUT /api/consultas/plans` para refinamientos

En el endpoint de validación:

- Hoy: si `existingPlans[0].planNumber === 0`, se devuelve `"No se puede refinar el Plan 0"`.  
- Necesario:
  - Permitir `planType: "transcript_refinement"` cuando solo existe Plan 0.  
  - Seguir exigiendo:
    - Que haya transcript disponible **después** de la fecha del plan 0 (`hasAvailableTranscript(childId, lastPlanDate)`).  
    - Que no exista ya una versión `.1` para ese `planNumber` (para no tener dos 0.1).

Resultado esperado:

- Si existe solo el Plan 0 y hay un `consultation_report` nuevo → `canGenerate: true` para `transcript_refinement`.  
- UI puede mostrar el botón “Generar Plan 0.1 (refinamiento por transcript)” de forma natural.

### 6.3 Ajustar validación de `POST /api/consultas/plans` para refinamientos

En el `POST`:

- Reutiliza `calculateNextPlanVersion(...)` y comprueba que exista al menos un plan.  
- Al relajar la restricción en `calculateNextPlanVersion`, el `POST` ya podría:
  - Generar un refinamiento con base Plan 0.  
  - Guardarlo como borrador con `planNumber: 0`, `planVersion: "0.1"`.

Es importante mantener:

- Validación de `reportId` obligatorio para `planType: "transcript_refinement"`.  
- Uso de `hasAvailableTranscript` o `reportId` para asegurar que el transcript existe y corresponde al niño.

### 6.4 Mantener el motor de refinamiento tal cual

La función `generateTranscriptRefinementPlan(...)`:

- Ya está diseñada para recibir un `basePlan` cualquiera (hoy se asume N ≥ 1, pero no hay limitación técnica fuerte).  
- Cambios necesarios: **ninguno** a nivel lógico, solo asegurarse de:
  - Respetar que `basePlan.planNumber` puede ser `0`.  
  - Guardar correctamente `basedOnPlan` y `transcriptAnalysis.basePlanVersion = "0"` cuando se refine Plan 0.

Esto significa que **no hace falta crear una nueva función “especial” para Plan 0.1**: se reutiliza el mismo flujo de transcript_refinement.

### 6.5 Actualizar documentación y mensajes de negocio

Hay varios documentos y mensajes que asumen explícitamente que no se refina Plan 0:

- `docs/PLAN_GENERATION_FLOW.md`  
  - Secciones donde se dice que no existe Plan 0.1 y que el primer refinamiento es Plan 1.1.
- `docs/RESUMEN_FLUJO_GENERACION_PLANES.md`  
  - Apartado de Plan N.1 donde se menciona que el refinamiento empieza en Plan 1.
- Mensajes de error en la API y posiblemente textos en UI.

Necesario:

- Actualizar estos textos para reflejar la nueva regla:
  - “Se pueden crear refinamientos por transcript para el Plan 0 (Plan 0.1) y para cualquier Plan N (Plan N.1), siempre que exista transcript posterior”.

### 6.6 Impacto en UI / UX (conceptual)

UI ya depende de la validación `PUT /api/consultas/plans` para habilitar/deshabilitar botones.  
Al permitir refinamiento desde Plan 0:

- Cuando exista solo Plan 0 + transcript nuevo:
  - La UI debería mostrar que puede generarse un **Plan 0.1 (Refinamiento por transcript)**.  
- La lógica de “qué plan se usa como base para el siguiente Plan N por eventos” no cambia:
  - Para Plan 1 (event_based), se puede decidir si la base es:
    - El último plan por `createdAt` (podría ser 0.1)  
    - o siempre el último `planType === "event_based"` (esto habría que definirlo a nivel de negocio, pero ya está resuelto para refinamientos 1.1 → 2).

Este punto es más de diseño funcional que de código, y conviene definirlo con claridad con la Dra. Mariana.

----------------------------------------------------------------------------
----------------------------------------------------------------------------
----------------------------------------------------------------------------
----------------------------------------------------------------------------
----------------------------------------------------------------------------
----------------------------------------------------------------------------
----------------------------------------------------------------------------


## 7. Cambios implementados en esta sesión (12 Dic 2025)

### 7.1 Backend – lógica de versiones y validaciones

- Se actualizó `calculateNextPlanVersion(...)` en `app/api/consultas/plans/route.ts` para:
  - Permitir refinamientos con `planType: "transcript_refinement"` incluso cuando el último plan es el 0.
  - Generar:
    - Desde Plan 0 → `planNumber: 0`, `planVersion: "0.1"`.
    - Desde Plan N ≥ 1 → `planNumber: N`, `planVersion: "N.1"` (sin cambios).
- Se ajustó la validación de `PUT /api/consultas/plans` para `planType: "transcript_refinement"`:
  - Ya **no** bloquea cuando `existingPlans[0].planNumber === 0`.
  - Sigue validando:
    - Que exista al menos un plan base.
    - Que no exista ya un `.1` para ese `planNumber`.
    - Que haya transcript disponible después de la fecha del plan base (`hasAvailableTranscript(childId, lastPlanDate)`).
- El `POST /api/consultas/plans` reutiliza esta lógica:
  - Si solo existe Plan 0 + transcript nuevo:
    - Usa Plan 0 como `basePlan`.
    - Crea borrador con `planNumber: 0`, `planVersion: "0.1"`, usando `generateTranscriptRefinementPlan(...)`.

### 7.2 Motor de generación de planes

- No se modificó la función `generateTranscriptRefinementPlan(...)` más allá de permitir que `basePlan.planNumber` sea 0:
  - El flujo de refinamiento por transcript es el mismo que ya se usaba para Plan 1.1, 2.1, etc.
  - Se respetan los campos existentes: `basedOnPlan`, `transcriptAnalysis.basePlanVersion`, etc.

### 7.3 Documentación y alineación conceptual

- Actualizado `docs/PLAN_GENERATION_FLOW.md`:
  - Se elimina la regla de “no se puede refinar Plan 0”.
  - Se documenta explícitamente el flujo con Plan 0.1 como refinamiento válido.
- Actualizado `docs/RESUMEN_FLUJO_GENERACION_PLANES.md`:
  - Se mencionan refinamientos `0.1, 1.1, 2.1…` en lugar de empezar en 1.1.
  - Se aclara que el refinamiento por consulta aplica a cualquier `planNumber`, incluyendo 0.
- Este propio archivo (`cambios11.md`) queda como:
  - Secciones 1–6 → **Problemática / diseño original**.
  - Sección 7 → **Cambios efectivamente implementados**.

### 7.4 Complejidad e impacto

- **Complejidad técnica**: Baja–Media.
  - Cambios localizados en un endpoint (`app/api/consultas/plans/route.ts`) y en documentación.
- **Base de datos**:
  - Sin migraciones: `planVersion` ya es string (soporta `"0.1"` sin cambios).
- **UI**:
  - La lógica de habilitar botones ya se basa en `PUT /api/consultas/plans`, por lo que:
    - Cuando exista solo Plan 0 + transcript nuevo → el botón “Plan 0.1 (Refinamiento por transcript)” podrá habilitarse.
  - Pueden quedar textos específicos pendientes de ajustar a este nuevo flujo.

Estado a 12 Dic 2025: la lógica para permitir refinamientos desde Plan 0 (Plan 0.1) ya está implementada en `app/api/consultas/plans/route.ts` y la documentación principal (`docs/PLAN_GENERATION_FLOW.md`, `docs/RESUMEN_FLUJO_GENERACION_PLANES.md`) fue actualizada según este diseño. Queda revisar/ajustar textos específicos de UI si hiciera falta.
