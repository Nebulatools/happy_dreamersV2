# Mapa Estructural del Codebase - Happy Dreamers

> **Proposito**: Referencia rapida para evitar confusiones sobre modulos, terminologia y ubicacion de codigo.
> **Ultima actualizacion**: 2026-02-05

---

## Arquitectura de Alto Nivel

```
HAPPY DREAMERS - ESTRUCTURA DE NAVEGACION
==========================================

RUTAS PUBLICAS (Sin autenticacion)
----------------------------------
/                     Landing page (redirige a /dashboard si autenticado)
/auth/login           Login con email/password
/auth/register        Registro de nuevo usuario
/auth/forgot-password Solicitar reset de password
/auth/reset-password  Completar reset con token
/invitation?token=x   Aceptar invitacion a compartir nino


DASHBOARD - USUARIO NORMAL
--------------------------
/dashboard                    Home (EventRegistration, SleepMetrics, PlanSummary)
/dashboard/children           Lista de mis ninos
/dashboard/children/new       Crear nuevo nino
/dashboard/children/[id]      Perfil del nino (tabs: resumen, eventos, progreso, encuestas, acceso)
/dashboard/children/[id]/edit Editar datos del nino
/dashboard/calendar           Vista mensual/semanal de eventos
/dashboard/planes             Planes de sueno activos
/dashboard/sleep-statistics   Estadisticas detalladas
/dashboard/configuracion      Ajustes de la app
/dashboard/profile            Mi perfil de usuario
/dashboard/notificaciones     Centro de notificaciones
/dashboard/survey             Cuestionario inicial


DASHBOARD - ADMIN ONLY
----------------------
/dashboard/patients              Lista de TODOS los usuarios y ninos
/dashboard/patients/[id]         Detalle de un usuario
/dashboard/patients/child/[id]   Detalle de un nino (vista admin)
/dashboard/consultas             Analisis AI con RAG + transcripts
/dashboard/diagnosticos          Panel de diagnostico (server component + redirect)
/dashboard/diagnosticos/[childId] Panel de diagnostico por nino (server + client)
/dashboard/transcripts           Gestion de transcripts Zoom


DASHBOARD - COMPARTIDO (Usuario + Admin)
----------------------------------------
/dashboard/assistant             Chat con AI coach
/dashboard/reports/professional  Editor de reportes profesionales
```

---

## Modulos de Componentes

| Carpeta | Proposito | Estado | Audiencia | Archivos clave |
|---------|-----------|--------|-----------|----------------|
| `/components/ui/` | shadcn/ui + custom | ACTIVO | Compartido | button, dialog, input, card, sidebar |
| `/components/events/` | Registro de eventos | ACTIVO | Usuario | SleepButton, FeedingModal, EventEditRouter |
| `/components/calendar/` | Vistas de calendario | ACTIVO | Usuario | CalendarMain, TimelineColumn, EventBlock |
| `/components/consultas/` | Sistema AI/Planes | ACTIVO | Admin | PlanManager, EditablePlanDisplay, TranscriptInput |
| `/components/survey/` | Cuestionario inicial | ACTIVO | Usuario | SurveyWizard, steps/* |
| `/components/sleep-statistics/` | Graficos de sueno | ACTIVO | Ambos | SleepComparison, EnhancedSleepMetricsCard |
| `/components/dashboard/` | Nav y layout | ACTIVO | Ambos | sidebar, header, AdminStatistics |
| `/components/dev/` | Herramientas dev | ACTIVO | Dev only | DevTools, TimeAdjuster |
| `/components/rag/` | RAG/documentos | ACTIVO | Admin | google-drive-sync, documents-list |
| `/components/parent/` | Tarjetas padre | ACTIVO | Usuario | TodayInstructionsCard, PlanSummaryCard |
| `/components/child-profile/` | Metricas del nino | ACTIVO | Usuario | SleepMetricsGrid, RecentEvents |
| `/components/reports/` | Reportes profesionales | ACTIVO | Admin | ProfessionalReportEditor |
| `/components/child-access/` | Compartir ninos | ACTIVO | Usuario | CaregiverManagement |

---

## Glosario de Terminologia

### Conceptos Core

| Termino | Definicion | Donde se usa |
|---------|------------|--------------|
| **Evento** | Registro unico de actividad (sleep, feeding, medication, etc.) | `/api/children/events`, coleccion `events` |
| **Sesion** | Evento de tipo sleep/nap CON duracion calculada | UI: 100% ancho en timeline |
| **Plan** | Horario personalizado de sueno para un nino | `/api/consultas/plans`, coleccion `childPlans` |
| **Consulta** | Analisis AI de datos del nino | `/dashboard/consultas` (admin) |
| **Diagnostico** | Validacion clinica cruzando eventos, survey y reglas por edad | `/dashboard/diagnosticos` (admin) |
| **Survey** | Cuestionario inicial sobre el nino/familia | `/dashboard/survey`, campo `child.surveyData` |

### Sinonimos Admin vs Usuario

| Admin dice | Usuario dice | Significado |
|------------|--------------|-------------|
| "Patient" | "Child" | Perfil de un nino |
| "Consultas" | "Planes" | Sistema de planes de sueno |
| `/patients/*` | `/children/*` | Rutas de gestion de ninos |

### Tipos de Evento

| EventType | Descripcion | Campos especiales |
|-----------|-------------|-------------------|
| `sleep` | Sueno nocturno | sleepDelay, emotionalState |
| `nap` | Siesta | sleepDelay, emotionalState |
| `wake` | Despertar manana | - |
| `night_waking` | Despertar nocturno | awakeDelay, emotionalState |
| `feeding` | Alimentacion | feedingType, feedingAmount, isNightFeeding |
| `medication` | Medicamentos | medicationName, medicationDose |
| `extra_activities` | Actividades extra | activityDescription, activityDuration |

### Versiones de Plan

| Version | Tipo | Basado en |
|---------|------|-----------|
| `"0"` | Inicial | Survey + stats + RAG |
| `"1"`, `"2"`, etc. | Event-based | Eventos registrados |
| `"1.1"`, `"2.1"` | Refinamiento | Transcript de consulta |

---

## Busquedas Comunes

### "Donde esta...?" - Componentes

| Busco... | Ubicacion |
|----------|-----------|
| Boton de dormir | `components/events/SleepButton.tsx` |
| Modal de alimentacion | `components/events/FeedingModal.tsx` |
| Modal de medicamentos | `components/events/MedicationModal.tsx` |
| Modal de actividades | `components/events/ExtraActivityModal.tsx` |
| Modal de despertar nocturno | `components/events/NightWakingModal.tsx` |
| Router de edicion de eventos | `components/events/EventEditRouter.tsx` |
| Vista de calendario | `components/calendar/CalendarMain.tsx` |
| Bloque de evento en timeline | `components/calendar/EventBlock.tsx` |
| Editor de planes (admin) | `components/consultas/EditablePlanDisplay.tsx` |
| Gestor de planes (admin) | `components/consultas/PlanManager.tsx` |
| Wizard de encuesta | `components/survey/SurveyWizard.tsx` |
| Sidebar/navegacion | `components/ui/sidebar.tsx` |
| Selector de nino activo | `components/dashboard/child-selector.tsx` |
| Estadisticas admin | `components/dashboard/AdminStatistics.tsx` |
| Panel diagnostico (pagina) | `app/dashboard/diagnosticos/page.tsx` (server) + `DiagnosticosClient.tsx` (client) |
| Panel diagnostico por nino | `app/dashboard/diagnosticos/[childId]/DiagnosticPanelClient.tsx` |
| Header del diagnostico | `components/diagnostic/ProfileHeader.tsx` |
| Grupos de validacion G1-G4 | `components/diagnostic/ValidationGroups/G{1-4}*.tsx` |
| Modal de detalle de alerta | `components/diagnostic/Modals/AlertDetailModal.tsx` |
| Seccion Pasante AI | `components/diagnostic/AIAnalysis/PasanteAISection.tsx` |
| CTAs del diagnostico | `components/diagnostic/DiagnosticCTAs.tsx` |

### "Donde esta...?" - Logica/Lib

| Busco... | Ubicacion |
|----------|-----------|
| Manejo de fechas/timezone | `lib/datetime.ts` **(USAR ESTE)** |
| Calculo de edad | `lib/date-utils.ts` |
| Conexion MongoDB | `lib/mongodb.ts` (singleton) |
| Validacion de eventos | `lib/validations/event.ts` |
| Estadisticas de sueno | `lib/sleep-stats.ts` |
| Logger centralizado | `lib/logger.ts` |
| Helpers de autenticacion | `lib/auth-helpers.ts` |
| Control de acceso | `lib/db/user-child-access.ts` |
| Chat agent (RAG) | `lib/rag/chat-agent.ts` |
| Vector store | `lib/rag/vector-store-mongodb.ts` |
| Tipos de diagnostico | `lib/diagnostic/types.ts` |
| Reglas G1 Horario | `lib/diagnostic/rules/schedule-rules.ts` |
| Reglas G2 Medico | `lib/diagnostic/rules/medical-rules.ts` |
| Reglas G3 Nutricion | `lib/diagnostic/rules/nutrition-rules.ts` |
| Reglas G4 Ambiental | `lib/diagnostic/rules/environmental-rules.ts` |
| Reglas por edad | `lib/diagnostic/age-schedules.ts` |

### "Donde esta...?" - APIs

| Busco... | Ubicacion |
|----------|-----------|
| CRUD de eventos | `app/api/children/events/route.ts` |
| CRUD de ninos | `app/api/children/route.ts` |
| CRUD de planes | `app/api/consultas/plans/route.ts` |
| Chat RAG | `app/api/rag/chat/route.ts` |
| Gestion de invitaciones | `app/api/invitation/route.ts` |
| Metricas admin | `app/api/admin/dashboard-metrics/route.ts` |
| Perfil de usuario | `app/api/user/profile/route.ts` |
| Diagnostico de nino | `app/api/admin/diagnostics/[childId]/route.ts` |
| Resumen AI diagnostico | `app/api/admin/diagnostics/ai-summary/route.ts` |

### "Donde esta...?" - Contextos/Hooks

| Busco... | Ubicacion |
|----------|-----------|
| Nino activo seleccionado | `context/ActiveChildContext.tsx` |
| Datos del usuario actual | `context/UserContext.tsx` |
| Hook para obtener hijos | `hooks/use-children.ts` |
| Hook para datos de sueno | `hooks/use-sleep-data.ts` |
| Hook para estado de sueno | `hooks/use-sleep-state.ts` |
| Hook para cache de eventos | `hooks/use-events-cache.ts` |

---

## APIs - Referencia Rapida

### Autenticacion
| Ruta | Metodo | Auth | Descripcion |
|------|--------|------|-------------|
| `/api/auth/register` | POST | No | Registrar usuario |
| `/api/auth/forgot-password` | POST | No | Reset password |

### Ninos
| Ruta | Metodo | Auth | Descripcion |
|------|--------|------|-------------|
| `/api/children` | GET | Si | Obtener mis ninos |
| `/api/children` | POST | Si | Crear nino |
| `/api/children/[id]/survey` | GET/PUT | Si | Survey del nino |
| `/api/children/[id]/access` | GET/POST | Si | Gestionar acceso |

### Eventos
| Ruta | Metodo | Auth | Descripcion |
|------|--------|------|-------------|
| `/api/children/events` | GET | Si | Obtener eventos (`?childId=X&from=ISO&to=ISO`) |
| `/api/children/events` | POST | Si | Crear evento |
| `/api/children/events` | PUT | Si | Actualizar evento |
| `/api/children/events` | DELETE | Si | Eliminar evento |

### Planes (Admin)
| Ruta | Metodo | Auth | Descripcion |
|------|--------|------|-------------|
| `/api/consultas/plans` | GET | Si | Planes del nino |
| `/api/consultas/plans` | POST | Si | Crear plan |
| `/api/consultas/analyze` | POST | Admin | Analizar con RAG |

### RAG/Chat
| Ruta | Metodo | Auth | Descripcion |
|------|--------|------|-------------|
| `/api/rag/chat` | POST | Si | Chat con AI |
| `/api/rag/documents` | GET | Admin | Documentos RAG |

---

## Colecciones MongoDB

| Coleccion | Proposito | Campos clave |
|-----------|-----------|--------------|
| `users` | Usuarios del sistema | email, role, password |
| `children` | Perfiles de ninos | firstName, parentId, surveyData |
| `events` | Eventos registrados | childId, eventType, startTime, endTime |
| `childPlans` | Planes personalizados | childId, planVersion, schedule, status |
| `userChildAccess` | Acceso compartido | userId, childId, role, permissions |
| `pendingInvitations` | Invitaciones pendientes | email, childId, invitationToken |
| `chatSessions` | Sesiones de chat | userId, childId, title |
| `chatMessages` | Mensajes individuales | sessionId, role, content |
| `vector_documents` | Embeddings RAG | content, embedding, metadata |

---

## Patrones Criticos

### 1. Manejo de Fechas (BUG CONOCIDO)
```typescript
// MAL: JavaScript interpreta como UTC
new Date("2026-01-07")  // UTC medianoche!

// BIEN: Usar buildLocalDate de lib/datetime.ts
import { buildLocalDate, dateToTimestamp } from "@/lib/datetime"
const dateObj = buildLocalDate(eventDate, eventTime)
const timestamp = dateToTimestamp(dateObj, timezone)
```

### 2. Patron Modal con Modo Edit
```typescript
interface ModalProps {
  mode?: "create" | "edit"
  initialData?: { startTime?: string, ... }
  onConfirm: (data, editOptions?: EditOptions) => void
}
```

### 3. Verificacion de Acceso en API
```typescript
// Siempre verificar sesion + acceso al nino
const session = await getServerSession(authOptions)
const accessContext = await resolveChildAccess(db, session.user, childId, "canCreateEvents")
```

### 4. Singleton MongoDB
```typescript
// Usar siempre el singleton para evitar agotar conexiones
import clientPromise from '@/lib/mongodb'
const client = await clientPromise
```

---

## Archivos Criticos por Funcionalidad

### Registro de Eventos
1. `components/events/EventRegistration.tsx` - Contenedor de botones
2. `components/events/SleepButton.tsx` - Boton principal
3. `components/events/EventEditRouter.tsx` - Router de edicion
4. `app/api/children/events/route.ts` - API de eventos

### Sistema de Planes
1. `components/consultas/PlanManager.tsx` - Gestor
2. `components/consultas/EditablePlanDisplay.tsx` - Editor (1,668 lineas)
3. `app/api/consultas/plans/route.ts` - API de planes

### Calendario
1. `components/calendar/CalendarMain.tsx` - Orquestador
2. `components/calendar/TimelineColumn.tsx` - Columna de tiempo
3. `components/calendar/EventBlock.tsx` - Bloque de evento

### Autenticacion
1. `lib/auth.ts` - Config NextAuth
2. `lib/auth-helpers.ts` - Helpers de acceso
3. `context/UserContext.tsx` - Datos de usuario
