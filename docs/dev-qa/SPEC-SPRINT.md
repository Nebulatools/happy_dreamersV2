# SPEC-SPRINT: Admin UX Hub + Diagnostic Pipeline + Patient Status (Sprint 6)

**Fecha:** 2026-02-26 (actualizado 2026-03-10)
**Implementado por:** Claude Opus 4.6
**Branch:** `refactor/admin-ux-hub` -> `fix/diagnostic-data-pipeline`
**Commits:** 28 commits (ver seccion de mapeo)

---

## Resumen del Sprint

Sprint enfocado en 6 areas:

1. **Admin UX Hub** — Nueva vista de pacientes con master-detail, sidebar simplificado, header unificado con busqueda child-centric
2. **Patient Hub** — Pagina unificada por nino con tabs (Resumen, Diagnostico, Bitacora, Consultas, Encuesta, Documentos)
3. **Diagnostic Data Pipeline** — 8 fixes para que el Pasante AI reciba datos reales de survey, eventos y plan
4. **Consultas UX** — Reorden de tabs wizard, limpieza de ruido tecnico, historial persistente del Pasante AI
5. **Sistema de Status de Pacientes** — Status computado (active/inactive/archived), tabs de filtrado, badges visuales, ordenamiento alfabetico
6. **Triage y Alertas** — Sistema de triage diagnostico con alertas en dashboard, auto-reactivacion de pacientes archivados

---

## Cambios Implementados

### 1. Sidebar Simplificado
- **Commit:** `661913d`
- Removidas secciones innecesarias (Ayuda, Contacto, paginas redundantes)
- Boton de Configuracion fijado al fondo del sidebar
- Navegacion mas limpia y directa

### 2. Header Unificado con Busqueda Child-Centric
- **Commit:** `a6293d3`
- Nuevo `header-utility-bar.tsx` con busqueda global de ninos
- Hook `use-admin-search.ts` para busqueda rapida
- Admin ve barra de busqueda por nino en todo momento

### 3. Patient Hub (Vista Unificada por Nino)
- **Commits:** `109bdef`, `5ff5cbc`, `f7d2e95`
- Nueva ruta `/dashboard/paciente/[childId]` con 6 tabs:
  - Resumen (metricas de sueno, comparacion con plan)
  - Diagnostico (panel G1-G4 embebido)
  - Bitacora (calendario de eventos)
  - Consultas (transcript, analisis, plan, historial)
  - Encuesta (survey del nino)
  - Documentos (gestion de documentos RAG)
- Lista de pacientes con master-detail split view
- Tarjetas de pacientes recientes
- Cards colapsados por default en diagnostico

### 4. Consultas: Zoom Transcripts Integration
- **Commit:** `9a23999`
- Transcripts de Zoom integrados directamente en el tab de Consultas
- Removida pagina standalone `/dashboard/transcripts`

### 5. Survey: Reestructuracion de Dia Tipico y Alimentacion
- **Commit:** `3ce101c`
- Nuevo componente `DynamicListField` para listas dinamicas
- `RoutineHabitsStep.tsx` reestructurado con dia tipico detallado
- `HealthDevStep.tsx` con alimentacion estructurada (solidos + leche con detalle)

### 6. Bug Fixes de Estabilidad
- **Commits:** `cff6a2d`, `ba0aef9`, `c5293e3`
- Fix infinite re-render loops en patient hub (Radix Dialog)
- Fix BugCenter fetch monkey-patch infinite recursion
- Fix stale tab indicator y contraste de header

### 7. Diagnostic Data Pipeline (8 Fixes)
- **Commit:** `d9589de`
- **Fix 1:** `recentEventsCount` ahora cuenta eventos reales, no criteria.length
- **Fix 2:** `planScheduleSummary` formateado para el prompt del AI
- **Fix 3:** Eventos recientes de ultimos 14 dias (no 7)
- **Fix 4:** `validateFeedingGap` usa `solidMinCount` (no hardcoded 3)
- **Fix 5:** `planCreatedAt` expuesto para ProfileHeader
- **Fix 6:** Siestas se evaluan contra plan activo (no hardcoded)
- **Fix 7:** Medicamentos y actividades estructurados para el AI
- **Nuevo:** `plan-formatter.ts` para formatear schedule del plan

### 8. Consultas UX + Historial Pasante AI
- **Commit:** `ed6f6a4`
- Tabs reordenados: Transcript -> Analisis -> Plan -> Historial (flujo wizard)
- Removido ruido tecnico del AnalysisReport (metadata, processing time, RAG subtitle)
- CTA "Siguiente paso -> Ir al Plan" despues del analisis
- Persistencia de analisis del Pasante AI en MongoDB (`diagnostic_ai_summaries`)
- Endpoint GET para historial + accordion UI con fechas relativas

### 9. Sistema de Status Computado de Pacientes
- **Commit:** `c8fbe0d`
- **Nuevo:** `lib/patient-status.ts` — Funcion pura `computePatientStatus()` que calcula status en tiempo de lectura (no almacenado en MongoDB)
- **Reglas de clasificacion:**
  - `archived === true` → "archived" (manual, prioridad maxima)
  - `hasActivePlan` → "active"
  - `lastEvent < 30 dias` → "active"
  - `childCreatedAt < 14 dias` → "active" (gracia para nuevos)
  - `else` → "inactive"
- **Nuevo:** `sortByPatientPriority()` para ordenar por prioridad clinica (severidad triage > sin plan > actividad reciente > alfabetico)
- **Test:** `__tests__/lib/patient-status.test.ts` con 8 casos edge

### 10. Tabs de Status en Lista de Pacientes
- **Commit:** `c8fbe0d`
- **Archivo:** `app/dashboard/paciente/PacienteListClient.tsx`
- Tabs de filtrado: Activos, Inactivos, Archivados, Todos (con contadores)
- Fetch de `/api/admin/dashboard-metrics` para obtener status computado de cada nino
- Familias filtradas por status de sus ninos (si un nino de la familia tiene el status, la familia aparece)
- Badges de status en tarjetas de ninos: "Sin plan" (ambar), "Sin actividad reciente" (gris), "Archivado" (rojo)
- Opacidad reducida para tarjetas de ninos inactivos y archivados

### 11. Archive/Restore y Auto-reactivacion
- **Commits:** `ce80f6e`, `c8fbe0d`
- **Archivo:** `app/api/admin/children/archive/route.ts` — Endpoint POST para archivar/restaurar ninos
- **Archivo:** `app/api/children/events/route.ts` — Auto-reactivacion: al registrar un evento, si el nino estaba archivado se desarchiva automaticamente
- **Archivo:** `app/api/consultas/plans/route.ts` — Auto-reactivacion: al activar un plan, se desarchiva automaticamente
- Boton Archivar/Restaurar en cada tarjeta de nino con confirmacion

### 12. Sistema de Triage Diagnostico
- **Commits:** `c8fbe0d`, `461a877`
- **Nuevo:** `lib/diagnostic/triage.ts` — Funcion `triageChild()` que evalua G2 (Medico) + G4 (Ambiental) sobre surveyData
- **Nuevo:** `lib/diagnostic/flatten-survey-data.ts` — Normaliza surveyData anidado a formato plano
- Severidades: critical (indicadores medicos graves), warning (revision ambiental), ok (sin alertas)
- Dashboard Admin (`AdminStatistics.tsx`) muestra tarjeta de alertas con contadores critical/warning/ok
- Lista de alertas clickeables que navegan al diagnostico del nino

### 13. Dashboard Admin Actualizado
- **Commits:** `461a877`, `abbfdee`, `86c457b`
- `AdminStatistics.tsx` reescrito con datos reales del API
- Tarjeta "Total de Pacientes" excluye archivados, muestra conteo en popover
- Tarjeta "Alertas Clinicas" con triage de todos los ninos
- Tab "Todos los Pacientes" con lista ordenada A→Z por nombre del nino
- Tab "Actividad Reciente" con eventos de las ultimas 48 horas
- Tab "Nuevos Usuarios" y "Nuevos Ninos" del ultimo mes

### 14. Ordenamiento Alfabetico y Fix de Estabilidad
- **Commit:** `c8fbe0d`
- Listas de pacientes ordenadas A→Z por nombre completo (antes por apellido de contacto)
- Fix de loop infinito en `useEffect` de `PacienteListClient` (handleSelectFamily en deps)
- `dashboard-metrics` API ordena `childMetrics` por `childName` con locale "es"

---

## Archivos Principales Modificados (140 archivos, 27k+ lineas)

### Nuevos
| Archivo | Proposito |
|---------|-----------|
| `app/dashboard/paciente/*` | Patient Hub completo (7 archivos) |
| `components/dashboard/header-utility-bar.tsx` | Header con busqueda |
| `hooks/use-admin-search.ts` | Hook de busqueda de ninos |
| `hooks/use-notifications.ts` | Hook de notificaciones |
| `components/survey/DynamicListField.tsx` | Listas dinamicas en survey |
| `lib/diagnostic/plan-formatter.ts` | Formateador de plan para AI |
| `app/api/children/[id]/documents/route.ts` | API de documentos por nino |
| `lib/patient-status.ts` | Clasificacion computada de status (active/inactive/archived) |
| `lib/diagnostic/triage.ts` | Triage ligero G2+G4 para alertas masivas |
| `lib/diagnostic/flatten-survey-data.ts` | Normalizador de surveyData anidado |
| `__tests__/lib/patient-status.test.ts` | Tests unitarios de clasificacion |
| `app/api/admin/children/archive/route.ts` | Endpoint archivar/restaurar ninos |

### Modificados Significativamente
| Archivo | Cambio |
|---------|--------|
| `components/dashboard/sidebar.tsx` | Simplificado, settings al fondo |
| `components/dashboard/header.tsx` | Unificado con utility bar |
| `components/survey/steps/RoutineHabitsStep.tsx` | Dia tipico reestructurado |
| `components/survey/steps/HealthDevStep.tsx` | Alimentacion estructurada |
| `app/api/admin/diagnostics/[childId]/route.ts` | 8 data pipeline fixes |
| `lib/diagnostic/rules/schedule-rules.ts` | Siestas vs plan, dead code cleanup |
| `lib/diagnostic/rules/nutrition-rules.ts` | Feeding gap fix |
| `components/consultas/AnalysisReport.tsx` | UX cleanup + CTA |
| `components/diagnostic/AIAnalysis/PasanteAISection.tsx` | Historial persistente |
| `app/dashboard/paciente/PacienteListClient.tsx` | Tabs status, badges, archive/restore, sort A→Z |
| `components/dashboard/AdminStatistics.tsx` | Datos reales, triage alerts, status counts |
| `app/api/admin/dashboard-metrics/route.ts` | Status computado, triage, ordering |
| `app/api/children/events/route.ts` | Auto-reactivacion al crear evento |
| `app/api/consultas/plans/route.ts` | Auto-reactivacion al activar plan |
| `types/models.ts` | Campo `archived` formalizado en Child |

### Eliminados
| Archivo | Razon |
|---------|-------|
| `app/dashboard/transcripts/page.tsx` | Integrado en Consultas tab |
| `app/dashboard/ayuda/page.tsx` | Removido del sidebar |
| `app/dashboard/contacto/page.tsx` | Removido del sidebar |

---

## Credenciales de Testing

| Rol | Email | Password |
|-----|-------|----------|
| Admin | mariana@admin.com | password |
| Usuario/Padre | eljulius@nebulastudios.io | juls0925 |
