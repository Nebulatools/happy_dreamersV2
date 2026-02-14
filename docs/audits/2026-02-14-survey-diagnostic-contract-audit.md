---
title: "Auditoria Survey -> Diagnostico (G1-G4 + Pasante)"
date: 2026-02-14
author: "Codex"
status: "completed"
---

# Auditoria Survey -> Diagnostico (G1-G4 + Pasante)

## Objetivo
Detectar inconsistencias de contrato de datos entre:
- captura del survey,
- aplanado (`flattenSurveyData`),
- reglas de diagnostico (G1-G4),
- y prompt del Pasante AI.

## Hallazgos

### P1 - Mismatch estructural en G2 (campos esperados vs campos capturados)
- Evidencia reglas G2 esperan campos camelCase directos como `congestionNasal`, `infeccionesOido`, `respiraBoca`, `sudoracionNocturna`, `muchaPipiNoche`, `inquietoPrimeraParte`, `pesadillasFinNoche`, etc.
  - `lib/diagnostic/medical-indicators.ts:147`
  - `lib/diagnostic/medical-indicators.ts:155`
  - `lib/diagnostic/medical-indicators.ts:179`
  - `lib/diagnostic/medical-indicators.ts:195`
  - `lib/diagnostic/medical-indicators.ts:203`
  - `lib/diagnostic/medical-indicators.ts:307`
  - `lib/diagnostic/medical-indicators.ts:263`
- Evidencia survey actual captura gran parte de esto como tokens en arrays:
  - `problemasHijo` con valores como `respira-boca`, `transpira`, `pesadillas`, `moja-cama`, `ronca`.
  - `situacionesHijo` con valores como `infecciones-oido`, `nariz-tapada`, `dermatitis`.
  - `components/survey/steps/HealthDevStep.tsx:442`
  - `components/survey/steps/HealthDevStep.tsx:486`
  - `components/survey/steps/HealthDevStep.tsx:576`
  - `components/survey/steps/HealthDevStep.tsx:734`
  - `components/survey/steps/HealthDevStep.tsx:778`
  - `components/survey/steps/HealthDevStep.tsx:786`
- Evidencia `flattenSurveyData` solo mapea explícitamente `reflujo` desde `problemasHijo` y no mapea el resto de tokens.
  - `app/api/admin/diagnostics/[childId]/route.ts:45`
- Impacto
  - Falsos negativos en G2 (la encuesta sí trae señal, pero la regla no la ve).
  - Resultado clínico puede verse "ok" cuando hay síntomas reportados.

### P1 - Data completeness de G2 sobreestima cobertura (riesgo de confianza falsa)
- Evidencia `calculateMedicalDataCompleteness` marca como "available" según bandera estática del indicador, no según presencia real del dato en survey.
  - `lib/diagnostic/rules/medical-rules.ts:214`
  - `lib/diagnostic/rules/medical-rules.ts:225`
- Impacto
  - El panel puede mostrar pocos "pendientes" aunque realmente faltan datos capturados/mapeados.
  - Sesgo de "sin indicadores" en lugar de "sin datos".

### P1 - G3 mezcla criterios de eventos del día con survey y puede generar contradicciones
- Evidencia G3 usa solo eventos del día actual para conteos (`solidCount`, `milkCount`).
  - `lib/diagnostic/rules/nutrition-rules.ts:53`
  - `lib/diagnostic/rules/nutrition-rules.ts:64`
- Evidencia esos criterios se evalúan siempre, incluso cuando hay survey disponible.
  - `lib/diagnostic/rules/nutrition-rules.ts:528`
  - `lib/diagnostic/rules/nutrition-rules.ts:532`
- Evidencia también agrega criterio de survey (`comeSolidos`), creando escenarios conflictivos (ej. eventos=0 pero survey dice sí).
  - `lib/diagnostic/rules/nutrition-rules.ts:390`
  - `lib/diagnostic/rules/nutrition-rules.ts:539`
- Impacto
  - Mensajes tipo "Sólidos 0" frente a respuestas válidas del cuestionario.
  - Exactamente el tipo de inconsistencia que detonó el incidente reportado.

### P2 - Contrato roto en G4 para tiempo de pantalla
- Evidencia G4 espera `screenTime` numérico en survey.
  - `lib/diagnostic/environmental-rules.ts:182`
  - `lib/diagnostic/rules/environmental-rules.ts:56`
- Evidencia survey actual captura `vePantallas` + `pantallasDetalle` (texto), no `screenTime` numérico.
  - `components/survey/steps/PhysicalActivityStep.tsx:70`
  - `components/survey/steps/PhysicalActivityStep.tsx:99`
  - `types/models.ts:227`
- Impacto
  - Criterio G4 de pantalla queda frecuentemente en "dato no disponible".
  - Se pierde capacidad de alertar exceso de pantalla de forma consistente.

### P2 - "Survey completo" del prompt no es realmente completo para objetos anidados
- Evidencia `buildSurveyContext` descarta objetos anidados.
  - `lib/diagnostic/pasante-ai-prompt.ts:282`
- Evidencia `flattenSurveyData` no aplana de forma genérica objetos profundos (ej. muchos campos de `papa`/`mama`).
  - `app/api/admin/diagnostics/[childId]/route.ts:25`
- Impacto
  - El Pasante no ve todo el contenido del cuestionario pese a la intención declarada.

## Hallazgos ya corregidos en este branch
- Mapeo explícito de `problemasHijo.includes("reflujo")` -> `reflujoColicos`.
  - `app/api/admin/diagnostics/[childId]/route.ts:45`
- Guarda defensiva en G2 para no activar reflujo cuando está explícitamente en NO y sin detalles positivos.
  - `lib/diagnostic/rules/medical-rules.ts:121`
- Reglas del prompt para evitar inferencia médica sin evidencia y usar terminología precisa.
  - `lib/diagnostic/pasante-ai-prompt.ts:418`

## Remediaciones aplicadas (este branch)
1. Normalización adicional en `flattenSurveyData` para mapear tokens de `problemasHijo` y `situacionesHijo` a campos canónicos de G2 (`ronca`, `respiraBoca`, `sudoracionNocturna`, `muchaPipiNoche`, `pesadillasFinNoche`, `infeccionesOido`, `congestionNasal`, `dermatitisEczema`), además de derivados (`tardaDormirse`, `screenTime`).
2. Ajuste de completitud G2 para contar disponibilidad real de datos por indicador (no solo `config.available`) y reportar pendientes por dato faltante.
3. Ajuste G3 para degradar criterios de eventos a `warning/no-data` cuando no hay eventos de alimentación del día, evitando contradicciones con baseline del survey.
4. Mapeo derivado de pantalla (`pantallasTiempo` / `pantallasDetalle` / `vePantallas`) hacia `screenTime` numérico para reglas G4.

## Riesgo residual
Permanece pendiente robustecer el contexto de prompt para incluir más objetos anidados del survey de forma canónica (más allá de las normalizaciones ya agregadas en `flattenSurveyData`).
