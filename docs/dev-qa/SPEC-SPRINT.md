# SPEC-SPRINT: Admin UX Hub + Diagnostic Pipeline (Sprint 6)

**Fecha:** 2026-02-26
**Implementado por:** Claude Opus 4.6
**Branch:** `refactor/admin-ux-hub` -> `fix/diagnostic-data-pipeline`
**Commits:** 14 commits (ver seccion de mapeo)

---

## Resumen del Sprint

Sprint enfocado en 4 areas:

1. **Admin UX Hub** — Nueva vista de pacientes con master-detail, sidebar simplificado, header unificado con busqueda child-centric
2. **Patient Hub** — Pagina unificada por nino con tabs (Resumen, Diagnostico, Bitacora, Consultas, Encuesta, Documentos)
3. **Diagnostic Data Pipeline** — 8 fixes para que el Pasante AI reciba datos reales de survey, eventos y plan
4. **Consultas UX** — Reorden de tabs wizard, limpieza de ruido tecnico, historial persistente del Pasante AI

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

---

## Archivos Principales Modificados (96 archivos, 22k+ lineas)

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
