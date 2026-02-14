---
title: "fix: Precision y terminologia en Pasante AI"
type: fix
status: active
date: 2026-02-14
---

# fix: Precision y terminologia en Pasante AI

## Overview
Ajustar el prompt y el mapeo de survey para que el Pasante AI sea mas conservador con sintomas medicos, use terminologia precisa sobre despertares, y refleje correctamente datos de alimentacion cuando el cuestionario los indica.

## Hipotesis de causa raiz
- El system prompt permite inferencias medicas aun cuando el cuestionario no marca reflujo, lo que provoca falsos positivos en el resumen.
- La referencia a "Dra. Mariana" esta hardcodeada en el prompt.
- El prompt no impone terminologia estricta para diferenciar despertares al inicio vs early rising.
- El Pasante prioriza criterios calculados de eventos (por ejemplo, solidos=0) aun cuando el cuestionario indica datos de alimentacion distintos.

## Archivos a tocar
- `lib/diagnostic/pasante-ai-prompt.ts`
- `app/api/admin/diagnostics/[childId]/route.ts`
- (posible) `lib/diagnostic/rules/medical-rules.ts`

## Estrategia minima de implementacion
- Ajustar el system prompt para:
  - Remover "Dra."/"Doctora" y referirse a "Mariana" o "Especialista en Sueno".
  - Forzar terminologia: "despertares al inicio de la noche" vs "Early Rising" (evitar "despertares tempranos").
  - Bloquear menciones de reflujo cuando el cuestionario no lo indica.
  - Priorizar datos del cuestionario sobre inferencias de eventos cuando hay conflicto (p. ej. comidas).
- Ajustar flatten de survey para mapear la seleccion de "reflujo" en Pregunta 10 a un flag consistente (ej. `reflujoColicos`).
- Si es necesario, aplicar guardas en validacion medica para no activar reflujo cuando el flag sea falso.

## Estrategia de pruebas
- Prueba manual en Panel de Diagnostico > Pasante AI:
  - Caso sin reflujo marcado: el resumen no debe mencionar reflujo.
  - Caso con despertares iniciales vs early rising: texto debe usar los terminos correctos.
  - Caso con comidas indicadas: no debe decir "Solidos 0" si el cuestionario indica comidas.
- (Opcional) Verificar logs del endpoint `/api/admin/diagnostics/ai-summary`.

## Criterios de aceptacion verificables
- El Pasante no menciona reflujo si el cuestionario no lo marca.
- El Pasante usa "despertares al inicio de la noche" y "Early Rising" de forma consistente.
- El Pasante no contradice datos de alimentacion del cuestionario.
- El prompt ya no incluye "Dra." o "Doctora" para Mariana.
