# Plan Maestro AI — Reconciliado contra el Código

> **Qué es este documento.** El `HappyDreamers_Plan_Maestro_AI.docx` (auditoría con 16 mejoras M1–M16)
> fue escrito **a partir de `PROMPTS.md`** (un inventario), no del código en ejecución. Este documento
> verifica cada mejora **contra el código real** y corrige rutas, veredictos y prioridades.
> **Úsalo como fuente de verdad en lugar del .docx original.**
>
> Convenciones del repo: Next.js App Router, estructura raíz `app/` `lib/` `components/`. **No existe `src/`.**

---

## Cómo se construyó

- Cada veredicto está respaldado por `archivo:línea` real, leído del código actual (no del inventario).
- Las rutas inventadas del .docx (`lib/ai/personas.ts`, `lib/ai/prompts.ts`, `src/ai/`, `app/admin/feedback/`)
  **no existen** y fueron reemplazadas por los archivos reales.
- Modelos verificados en código: Planes = `gpt-4`, Pasante = `gpt-5`, Clasificador de alimentos = `gpt-4`.
  El inventario es correcto en esto.

### Leyenda de veredictos

| Veredicto | Significado |
|-----------|-------------|
| **Real** | El problema existe tal como lo describe la auditoría. Implementar. |
| **Ya implementado** | La recomendación ya está (total o casi) en el código. No re-hacer. |
| **Parcial** | Existe base parcial; la auditoría exagera lo faltante. |
| **Riesgo mal caracterizado** | El problema existe pero el riesgo/esfuerzo está mal estimado. |
| **Objetivo equivocado** | La mejora apunta a una feature deshabilitada/muerta. |

---

## Tabla maestra reconciliada

| # | Mejora | Veredicto vs. realidad | Archivo(s) real(es) | Prioridad revisada |
|---|--------|------------------------|---------------------|--------------------|
| M1 | Unificar identidad de Mariana | **Real** — 3 personas distintas | `lib/rag/sleep-coach-personality.ts:68`, `app/api/rag/chat/route.ts:440,854`, `app/api/consultas/analyze/route.ts:343`, `app/api/chat/route.ts:73` | **Fase 1** |
| M2 | Constante de vocabulario alimentario | **Real** — 3 copias literales | `app/api/consultas/plans/route.ts:1752,1845,1943` | **Fase 1** |
| M3 | Deprecar router alternativo | **Riesgo mal caracterizado** — es código muerto (0 referencias) | `app/api/rag/chat/route-optimized.ts` | **Fase 1** (borrar) |
| M4 | Contexto insuficiente en Sleep Coach | **Real** — rama else vacía `""` | `lib/rag/sleep-coach-personality.ts:83-88` | **Fase 1** |
| M5 | Fusionar 2 síntesis | **Real** — 2 prompts casi idénticos | `app/api/rag/chat/route.ts:440,854` | **Fase 2** |
| M6 | Estructurar output Análisis Integral | **Parcial** — hoy texto libre | `app/api/consultas/analyze/route.ts:343-396` → `plans/route.ts` | **Fase 2** |
| M7 | Convergencia en Plan N | **Real** — siempre empuja "siguiente paso" | `app/api/consultas/plans/route.ts:1815-1898` | **Fase 2** |
| M8 | Ambigüedad de legumbres | **Real** — en proteína Y fibra | `lib/diagnostic/ai-food-classifier.ts:15,18` | **Fase 1** |
| M9 | Datos insuficientes en Pasante AI | **Ya implementado** — `dataLevel` existe | `lib/diagnostic/pasante-ai-prompt.ts:412-417,426` | **Cerrado** (solo calibrar) |
| M10 | Calibrar Insights UI | **Objetivo equivocado** — UI comentada/no renderizada | `app/api/sleep-analysis/insights/route.ts:508`; `SleepInsightsCard` (sin render) | **Bloqueado** |
| M11 | Clarificar Prompt 12 vs 13 | **Parcial** — el 13 es legacy, no alimenta planes | `lib/transcripts/analyze.ts` (legacy), `app/api/consultas/analyze/route.ts` (activo) | **Fase 1** (solo doc) |
| M12 | Extractor de imágenes clínicas | **Real** — solo texto plano hoy | `lib/rag/document-processor.ts:185-186` | **Fase 3** |
| M13 | Chain of reasoning entre planes | **Parcial** — hay `progressAnalysis`, no `reasoning` | `app/api/consultas/plans/route.ts` (esquemas) | **Fase 3** |
| M14 | Reglas de transición de siestas | **Real (con matiz)** — existe ventana 15-18m, no fases | `lib/plan-policies.ts:39-45`, `plans/route.ts:1580-1592` | **Fase 2** |
| M15 | RAG de metodología de Mariana | **Real (nuevo)** — no existe corpus | (no existe `lib/rag/mariana-methodology/`) | **Fase 3** |
| M16 | Feedback loop Mariana → IA | **Real (nuevo)** — solo se guarda plan final | `app/api/consultas/plans/[id]/route.ts:281-293`, `types/models.ts` (ChildPlan) | **Fase 3** |

---

## Fichas de reconciliación

### M1 — Unificar identidad de Mariana · **Real**
- **Evidencia:** 3 cadenas de identidad distintas conviven:
  - `lib/rag/sleep-coach-personality.ts:68` → "Eres Mariana, coach del sueño infantil."
  - `app/api/rag/chat/route.ts:440` y `:854` → "Eres la Dra. Mariana, pediatra especialista en sueño infantil."
  - `app/api/consultas/analyze/route.ts:343` → "Eres Mariana, coach del sueño infantil y desarrollo infantil."
  - `app/api/chat/route.ts:73` → genérico, sin nombre.
- **Corrección de rutas:** el .docx propone `lib/ai/personas.ts` (no existe). El único módulo de persona real es
  `lib/rag/sleep-coach-personality.ts` — ahí ya hay un `SLEEP_COACH_PERSONALITY` exportado; centralizar la cadena de identidad ahí.
- **Recomendación ajustada:** extraer una constante `MARIANA_IDENTITY` en `lib/rag/sleep-coach-personality.ts` e
  importarla en los 4 puntos. Decidir con Mariana "coach" vs "especialista". Riesgo bajo.

### M2 — Constante de vocabulario alimentario · **Real**
- **Evidencia:** bloque "VOCABULARIO DE ALIMENTACION" copiado **literal 3 veces** en
  `app/api/consultas/plans/route.ts:1752` (Plan 0), `:1845` (Plan N), `:1943` (Refinamiento). No hay constante.
- **Corrección de rutas:** el .docx propone `lib/ai/prompts.ts` (no existe). Crear la constante en un módulo nuevo
  bajo `lib/` (p.ej. `lib/ai-prompts/food-vocabulary.ts`) o como export en `lib/plan-policies.ts` (ya relacionado a planes).
- **Recomendación ajustada:** sin cambios; refactor puro. Riesgo bajo.

### M3 — Router alternativo · **Riesgo mal caracterizado**
- **Evidencia:** `app/api/rag/chat/route-optimized.ts` (GPT-3.5-turbo, 3 categorías) tiene **0 referencias** en todo el repo.
  El router activo es `app/api/rag/chat/route.ts` (GPT-4o-mini, 5 agentes).
- **Corrección:** el .docx pide "migrar tráfico / A-B testing". **No hay tráfico** — es código muerto.
- **Recomendación ajustada:** simplemente **borrar** `route-optimized.ts` (o marcar `@deprecated` si se quiere conservar como referencia).
  No requiere staging ni A/B. Riesgo nulo.

### M4 — Contexto insuficiente en Sleep Coach · **Real**
- **Evidencia:** `lib/rag/sleep-coach-personality.ts:83-88` — el bloque `${context ? "INFORMACIÓN DISPONIBLE..." : ""}`
  tiene **rama else vacía** (`""`). Sin contexto, la IA responde con conocimiento general sin avisarlo.
- **Recomendación ajustada:** poner texto en la rama else aclarando que la respuesta es orientativa. Definir umbral de
  "insuficiente" con Mariana. Riesgo bajo.

### M5 — Fusionar 2 síntesis · **Real**
- **Evidencia:** `app/api/rag/chat/route.ts:440-467` (Síntesis Comprehensiva, contexto estructurado) y `:854-869`
  (Síntesis Orquestador, output combinado de agentes). Misma persona e instrucciones, distinta forma de recibir contexto.
- **Recomendación ajustada:** extraer `SYNTHESIS_INSTRUCTIONS` + `buildSynthesisPrompt(contextType, context)` en el mismo archivo. Riesgo bajo.

### M6 — Estructurar output del Análisis Integral · **Parcial**
- **Evidencia:** `app/api/consultas/analyze/route.ts:343-396` devuelve `analysis` y `recommendations` como **texto libre**
  que luego consume el Refinamiento en `plans/route.ts`. Confirmado: no hay campos estructurados (acuerdos/horarios).
- **Recomendación ajustada:** la del .docx es válida (JSON con `agreedSchedules`, `parentConstraints`, etc.) y requiere
  tocar productor (12) y consumidor (9). Mayor esfuerzo de la fase 2. Hacer con feature flag.

### M7 — Convergencia en Plan N · **Real**
- **Evidencia:** `app/api/consultas/plans/route.ts:1815-1898` — Plan N **siempre** instruye "CONTINÚA avanzando... da el
  SIGUIENTE PASO PROGRESIVO". No hay detección de "ya estás en el ideal → mantener".
- **Recomendación ajustada:** la del .docx aplica (modo mantenimiento cuando distancia ≤ umbral). Validar el umbral
  (15 vs 30 min) con Mariana por rango de edad.

### M8 — Ambigüedad de legumbres · **Real**
- **Evidencia:** `lib/diagnostic/ai-food-classifier.ts:15` lista "legumbres" en **proteína** y `:18` en **fibra**.
- **Recomendación ajustada:** documentar explícitamente que legumbres clasifican en ambas con un ejemplo. Riesgo muy bajo.

### M9 — Datos insuficientes en Pasante AI · **Ya implementado**
- **Evidencia:** `lib/diagnostic/pasante-ai-prompt.ts:412-417` ya computa `dataLevel`/`dataLevelLabel`
  ("Completo / Parcial / Mínimo") y lo inyecta al prompt en `:426` ("Nivel de datos: ...").
  El `dataLevel` se calcula en `app/api/admin/diagnostics/[childId]/route.ts`.
- **Recomendación ajustada:** **no re-implementar.** Lo único pendiente (opcional): calibrar con Mariana los umbrales por
  edad y reforzar el lenguaje "hedged" cuando el nivel es Mínimo. Cerrar este item.

### M10 — Calibrar Insights UI · **Objetivo equivocado**
- **Evidencia:** `app/api/sleep-analysis/insights/route.ts:508` confirma `temperature: 0.7` y el prompt pide
  `action.link: "#section"`. **Pero** `SleepInsightsCard` **no renderiza el campo `action`** y está **comentado** en
  `app/dashboard/sleep-statistics/page.tsx`. La feature no se muestra al usuario.
- **Recomendación ajustada:** **bloqueado.** Antes de afinar temperatura/links, decidir si la feature de Insights se
  reactiva. Si se reactiva, entonces aplica el .docx (temp 0.4, mapear links reales, caso "sin problemas"). Si no, no invertir.

### M11 — Prompt 12 vs 13 · **Parcial**
- **Evidencia:** `lib/transcripts/analyze.ts` (genérico, prompt 13) se llama solo desde
  `app/api/transcripts/process/route.ts` (pipeline legacy). El flujo de planes usa el integral
  `app/api/consultas/analyze/route.ts` (prompt 12). El 13 **no** alimenta planes hoy.
- **Recomendación ajustada:** menor riesgo del que asume el .docx. Basta con **documentar en código** el criterio
  ("13 = legacy/informal; 12 = consulta formal con coach") y vigilar que el 13 no se reconecte a planes. Fase 1 (doc).

### M12 — Extractor de imágenes clínicas · **Real**
- **Evidencia:** `lib/rag/document-processor.ts:185-186` — el prompt de imagen extrae **solo texto plano**. No hay
  variante de extracción estructurada de eventos de sueño.
- **Recomendación ajustada:** la del .docx aplica (variante `IMAGE_CLINICAL_EXTRACTOR` con fallback a texto). Fase 3.

### M13 — Chain of reasoning entre planes · **Parcial**
- **Evidencia:** los esquemas de plan en `app/api/consultas/plans/route.ts` devuelven `progressAnalysis` (solo Plan N),
  `improvements`/`adjustments` (refinamiento), pero **no** un campo `reasoning` estructurado con tolerancia y sugerencia
  de siguiente paso. No se inyecta el razonamiento del plan anterior al siguiente.
- **Recomendación ajustada:** la del .docx aplica; se apoya en el `progressAnalysis` existente como punto de partida.
  Persistir `reasoning` en `child_plans` y reinyectarlo. Fase 3 (acoplado a M16).

### M14 — Transición de siestas · **Real (con matiz)**
- **Evidencia:** `lib/plan-policies.ts:39-45` ya detecta una **ventana 15-18 meses** (transición 2→1 siesta) y ajusta el
  paso (10 vs 30 min). Pero `plans/route.ts:1580-1592` solo **incluye/excluye** siesta según `napCount` del período;
  no hay fases "activa / en transición / dejando" basadas en frecuencia.
- **Recomendación ajustada:** la del .docx aplica, **pero reutilizar** la ventana de edad ya existente en `plan-policies.ts`
  en vez de partir de cero. Validar umbrales (0.8/0.3) con Mariana.

### M15 — RAG de metodología de Mariana · **Real (nuevo)**
- **Evidencia:** no existe `lib/rag/mariana-methodology/` ni jerarquía "metodología HD > RAG médico general". El RAG actual
  es genérico (vector store Mongo + `docs/RAG_SUMMARY_OPTIMIZED.md`).
- **Recomendación ajustada:** sin cambios respecto al .docx. **Cuello de botella real:** tiempo de Mariana para documentar.
  Fase 3.

### M16 — Feedback loop Mariana → IA · **Real (nuevo)**
- **Evidencia:** `app/api/consultas/plans/[id]/route.ts:281-293` (PUT) guarda **solo el plan final editado**
  (`schedule, objectives, recommendations, ...`). El esquema `ChildPlan` en `types/models.ts` no tiene
  `ai_suggestion`, `delta` ni historial. El delta IA↔Mariana se pierde.
- **Corrección de rutas:** el .docx propone `app/admin/feedback/` (no existe; los admin APIs viven en `app/api/admin/`).
- **Recomendación ajustada:** sin cambios de fondo respecto al .docx. Empezar por **Fase 1 de captura** (guardar
  `ai_suggestion` + `delta` en `child_plans`) — es barato y desbloquea M13. El dashboard de patrones necesita meses de datos.

---

## Secuencia de implementación corregida

> Diferencias vs. el .docx: **M9 sale** (ya hecho), **M10 sale** de Fase 2 (bloqueado por UI muerta),
> **M3 baja** a "borrar" (no migrar), **M11 baja** a solo-documentación, **M14 reutiliza** lógica existente.

### Fase 1 — Fundamentos (bajo riesgo, confirmados reales)
- **M1** Unificar identidad → constante en `lib/rag/sleep-coach-personality.ts`.
- **M2** Constante de vocabulario alimentario (de-duplicar las 3 copias en `plans/route.ts`).
- **M3** **Borrar** `route-optimized.ts` (código muerto, 0 referencias).
- **M4** Texto en la rama else del contexto del Sleep Coach.
- **M8** Nota de legumbres en el clasificador.
- **M11** Documentar criterio Prompt 12 vs 13 en código.

### Fase 2 — Calidad clínica (lógica nueva, validación con Mariana)
- **M5** Fusionar las 2 síntesis.
- **M6** Estructurar output del Análisis Integral (JSON) → consumirlo en Refinamiento (feature flag).
- **M7** Modo mantenimiento / convergencia en Plan N.
- **M14** Fases de siesta, reutilizando la ventana 15-18m de `lib/plan-policies.ts`.

### Fase 3 — Aprendizaje continuo (arquitectura nueva)
- **M16** Captura de `ai_suggestion` + `delta` en `child_plans` (Fase 1 de captura primero).
- **M13** Campo `reasoning` entre versiones de plan (se apoya en M16).
- **M12** Extractor de imágenes clínicas estructurado.
- **M15** RAG de metodología de Mariana ⚠️ cuello de botella: sesiones de captura con Mariana.

### Cerrados / bloqueados
- **M9** Cerrado — ya implementado (`dataLevel`). Opcional: calibrar umbrales con Mariana.
- **M10** Bloqueado — decidir primero si se reactiva la UI de Insights (`SleepInsightsCard` está comentada).
