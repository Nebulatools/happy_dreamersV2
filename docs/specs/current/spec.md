# Panel de Diagnóstico (Estadísticas) - ÍTEM 4

## Visión

Este módulo es un **motor de validación** que cruza la bitácora en tiempo real con las respuestas del cuestionario y las reglas clínicas de Happy Dreamers. Permite a Mariana auditar el progreso de cada niño y tomar decisiones informadas sobre su plan de sueño.

**Audiencia:** Solo Admin (Mariana). Los padres NO deben ver este panel.

**Ubicación:** Dashboard Admin > `/dashboard/diagnosticos`

**Prerequisito:** El niño debe tener un **plan activo**. Sin plan, el panel está bloqueado.

---

## Los 4 Grupos de Validación

### G1: Horario (Schedule)
- **Fuente:** Eventos de sueño/siesta/wake + Plan activo
- **Criterios:** Desvío ±15min, límite 6AM, duración noche, ventanas de sueño, siestas
- **Disponibilidad:** 100%

### G2: Médico
- **Fuente:** Survey + Eventos
- **Criterios:** Indicadores de reflujo, apnea, restless leg (1 indicador = alerta)
- **Disponibilidad:** ~70%

### G3: Alimentación
- **Fuente:** Eventos de feeding + Survey
- **Criterios:** Frecuencia leche, sólidos, grupos nutricionales
- **AI:** Clasificación de alimentos con GPT-4

### G4: Ambiental
- **Fuente:** Survey + Eventos + Chat
- **Criterios:** Pantallas, temperatura, colecho, cambios recientes
- **Disponibilidad:** ~90%

---

## Arquitectura

### API Endpoints
- `GET /api/admin/diagnostics/[childId]` - DiagnosticResult completo
- `POST /api/admin/diagnostics/classify-food` - Clasificación AI de alimentos
- `POST /api/admin/diagnostics/ai-summary` - Resumen del Pasante AI

### Componentes UI
- `ProfileHeader` - Cabecera con datos del niño
- `StatusIndicator` - Semáforo (ok/warning/alert)
- `ValidationGroupCard` - Card genérica de grupo
- `G1ScheduleValidation` - Validación de horario
- `G2MedicalValidation` - Validación médica
- `G3NutritionValidation` - Validación nutricional
- `G4EnvironmentalValidation` - Validación ambiental
- `AlertDetailModal` - Modal con detalles y deep linking
- `PasanteAISection` - Sección de análisis AI

---

## Reglas de Negocio

### Tolerancias
- Desvío horario: ±15 minutos
- Despertar mínimo: 6:00 AM (fijo para todos)
- Umbral alerta G2: 1 indicador dispara alerta

### Duración de Noche por Edad
| Edad | Duración |
|------|----------|
| Hasta 2.5 años | 11 hrs |
| 3 años | 11.5-12 hrs |
| 4 años | 11-11.5 hrs |
| 5 años | 10.5-11 hrs |
| 6 años | 10-10.5 hrs |

### Clasificación AI de Alimentos
- Modelo: GPT-4
- Fallback: `aiClassified: false` si falla
- Grupos: Proteínas, Carbohidratos, Frutas, Verduras, Lácteos, Grasas

---

## Referencias

- Spec completo: `docs/dev-qa/SPEC-SPRINT.md`
- Plan técnico: `docs/plans/2026-02-03-feat-diagnostic-panel-estadisticas-plan.md`
