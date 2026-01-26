# Pull Request: QA -> Main

**Fecha de Analisis:** 2026-01-12
**Total de Commits:** 47
**Periodo:** 2025-12-08 al 2026-01-12
**Rama Origen:** QA
**Rama Destino:** main

---

## Resumen Ejecutivo

Este PR contiene una serie significativa de mejoras y refactorizaciones enfocadas en:

1. **Estandarizacion de eventos** - Refactor del sistema de registro de eventos
2. **Mejoras de UX en calendario** - Visualizacion, tooltips, y posicionamiento
3. **Integracion de eventos en Admin** - Nuevo tab con capacidad de ver/editar/eliminar
4. **Eliminacion de codigo legacy** - Limpieza de scripts y APIs de debug
5. **Migracion de datos** - Script para migrar `night_feeding` a nuevo formato

---

## Impacto en Base de Datos

### CRITICO: Migracion Requerida

Se requiere ejecutar un script de migracion ANTES o DESPUES del deploy para mantener consistencia de datos.

#### Cambio: `night_feeding` -> `feeding` con flag `isNightFeeding`

**Antes (formato legacy):**
```javascript
{
  eventType: "night_feeding",
  feedingType: "bottle",
  // ...otros campos
}
```

**Despues (nuevo formato):**
```javascript
{
  eventType: "feeding",
  isNightFeeding: true,
  feedingContext: "during_sleep",
  feedingType: "bottle",
  // ...otros campos
}
```

### Nuevos Campos en Coleccion `events`

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `isNightFeeding` | Boolean | Flag para identificar alimentacion nocturna |
| `feedingContext` | String | Contexto: `"awake"`, `"during_sleep"`, `"during_nap"` |
| `didNotSleep` | Boolean | Flag para eventos donde el nino no durmio |

### Campos Existentes Modificados

| Campo | Cambio | Impacto |
|-------|--------|---------|
| `eventType` | `night_feeding` deprecated | Nuevos eventos usan `feeding` + flag |
| `endTime` | Estandarizado en todos los flujos | Todos los eventos ahora tienen endTime calculado |

---

## Script de Migracion

### Archivo: `scripts/migrate-night-feeding.ts`

**Proposito:** Convertir eventos `night_feeding` existentes al nuevo formato.

**Comando:**
```bash
npx tsx scripts/migrate-night-feeding.ts
```

**Acciones del script:**
1. Busca todos los eventos con `eventType: "night_feeding"`
2. Para cada evento:
   - Si existe un `feeding` duplicado (mismo startTime, childId): fusiona y elimina duplicado
   - Si no hay duplicado: convierte a `eventType: "feeding"` + flags
3. Reporta estadisticas de migracion

**Output esperado:**
```
=== Migracion de night_feeding ===

Encontrados X eventos night_feeding
Convertidos a feeding: Y
Duplicados fusionados/eliminados: Z
Errores: 0

Migracion completada exitosamente
```

### Recomendacion de Ejecucion

| Opcion | Ventajas | Desventajas |
|--------|----------|-------------|
| **Pre-deploy** | Datos listos antes del cambio de codigo | Requiere ventana de mantenimiento |
| **Post-deploy** | Codigo maneja ambos formatos | Periodo de transicion |

**Recomendacion:** Ejecutar **post-deploy** ya que el codigo en QA ya maneja ambos formatos (legacy y nuevo).

---

## Cambios en APIs

### APIs Eliminadas (Limpieza)

| Ruta | Razon |
|------|-------|
| `/api/admin/cleanup-phantom-events` | Script de debug ya no necesario |
| `/api/admin/delete-phantom-event` | Script de debug ya no necesario |
| `/api/debug/delete-event` | Endpoint de debug eliminado |

### APIs Modificadas

#### `/api/children/events/route.ts`
- **Lineas cambiadas:** +460/-283
- **Cambios principales:**
  - Estandarizacion de calculo de `endTime` en todos los tipos de evento
  - Soporte para nuevo formato de `feeding` con flags
  - Mejora en validacion de campos

#### `/api/children/events/[id]/route.ts`
- **Cambios principales:**
  - Mejora en manejo de edicion de eventos
  - Soporte para campos de actividades extra

#### `/api/consultas/plans/route.ts`
- **Cambios principales:**
  - Prompts de IA actualizados para NO generar actividades
  - Solo genera: despertar, siestas, comidas, dormir
  - Campo `activities` ahora siempre es array vacio

---

## Cambios en Modelos/Tipos

### `types/models.ts`

**Nuevo tipo `Event` agregado (40 lineas):**

```typescript
export interface Event {
  _id: string
  childId: string
  parentId?: string
  eventType: "sleep" | "nap" | "wake" | "night_waking" | "feeding" | "night_feeding" | "medication" | "extra_activities" | string
  emotionalState?: string
  startTime: string
  endTime?: string
  notes?: string
  duration?: number
  sleepDelay?: number
  awakeDelay?: number
  // Campos de alimentacion
  feedingType?: "breast" | "bottle" | "solids"
  feedingDuration?: number
  feedingAmount?: number | string
  feedingNotes?: string
  babyState?: "awake" | "asleep"
  isNightFeeding?: boolean
  feedingContext?: "awake" | "during_sleep" | "during_nap"
  // Campos de medicamento
  medicationName?: string
  medicationDose?: string
  medicationTime?: string
  medicationNotes?: string
  // Campos de actividad extra
  activityType?: string
  activityDescription?: string
  activityDuration?: number
  activityImpact?: "positive" | "neutral" | "negative"
  activityNotes?: string
  // Flag para eventos no dormidos
  didNotSleep?: boolean
  createdAt?: Date
  updatedAt?: Date
}
```

### `lib/event-types.ts`

**Cambios:**
- `feeding`: `hasEndTime: false` -> `hasEndTime: true`
- `medication`: `hasEndTime: false` -> `hasEndTime: true`
- `extra_activities`: `hasEndTime: false` -> `hasEndTime: true`

---

## Cambios en Componentes

### Componentes Nuevos

| Componente | Ruta | Descripcion |
|------------|------|-------------|
| `EventDetailsModal` | `components/events/EventDetailsModal.tsx` | Modal reutilizable para ver detalles de eventos |
| `EventEditRouter` | `components/events/EventEditRouter.tsx` | Router para edicion de eventos por tipo |
| `EventsCalendarTabs` | `components/events/EventsCalendarTabs.tsx` | Tabs dia/semana/mes para calendarios |

### Componentes Modificados Significativamente

#### Calendario

| Componente | Cambios |
|------------|---------|
| `CalendarDayView.tsx` | Sistema de columnas para eventos superpuestos |
| `CalendarWeekView.tsx` | Mejoras de visualizacion |
| `EventGlobe.tsx` | Tooltip posicionado arriba con React Portal |
| `SleepSessionBlock.tsx` | Ancho constante, mejora de iconos |

#### Eventos

| Componente | Cambios |
|------------|---------|
| `ManualEventModal.tsx` | UI mejorada, hora de inicio estandarizada |
| `FeedingModal.tsx` | Soporte para isNightFeeding |
| `NightWakingModal.tsx` | Fix de duplicacion en modo edit |
| `SleepDelayModal.tsx` | Estandarizacion de endTime |

#### Admin

| Componente | Cambios |
|------------|---------|
| `AdminChildDetailClient.tsx` | Nuevo tab "Eventos" con tabla, edicion, eliminacion |
| `EnhancedSleepMetricsCard.tsx` | Rediseno completo de cards de metricas |
| `NightWakeupsEvolutionChart.tsx` | Mejoras menores de formato |

#### Consultas/Planes

| Componente | Cambios |
|------------|---------|
| `PlanDisplay.tsx` | "Hora de dormir" -> "Dormir", dia logico |
| `EditablePlanDisplay.tsx` | "Hora de dormir" -> "Dormir", dia logico |
| `PlanEventEditModal.tsx` | Label actualizado |

---

## Cambios en Utilidades

### `lib/datetime.ts`

**Nueva funcion `buildLocalDate()`:**

```typescript
/**
 * Construye una fecha en zona horaria local desde inputs de formulario.
 * USAR SIEMPRE que se combine dateString (YYYY-MM-DD) + timeString (HH:mm)
 */
export function buildLocalDate(dateString: string, timeString: string): Date
```

**Proposito:** Evitar bugs de UTC donde JavaScript interpreta fechas ISO como UTC, causando desfase de dias en zonas horarias negativas (ej: Mexico UTC-6).

---

## Archivos Eliminados (Limpieza)

### Scripts de Debug (17 eliminados)

| Script | Razon de eliminacion |
|--------|---------------------|
| `check-events-debug.js` | Debug temporal |
| `cleanup-phantom-events.ts` | Problema resuelto |
| `delete-event-now.js` | Debug temporal |
| `delete-orphan-event.js` | Problema resuelto |
| `delete-phantom-event.js` | Problema resuelto |
| `delete-phantom-events-batch.js` | Problema resuelto |
| `find-orphan-event.js` | Debug temporal |
| `fix-event-ids.js` | Migracion completada |
| `fix-luna-events-childid.js` | Migracion completada |
| `fix-parentId-events.js` | Migracion completada |
| `fix-sofia-events-childid.js` | Migracion completada |
| `force-delete-event.js` | Debug temporal |
| `get-jakito-events.js` | Debug temporal |
| `investigate-event.js` | Debug temporal |
| `list-events-after-sept.js` | Debug temporal |
| `migrate-events-to-collection.js` | Migracion completada |
| `verify-luna-events.js` | Debug temporal |
| `verify-zabdy-events.js` | Debug temporal |

---

## Documentacion Agregada

| Archivo | Descripcion |
|---------|-------------|
| `docs/SPEC-SPRINT.md` | Especificaciones tecnicas del sprint (1031 lineas) |
| `docs/TEMPLATE-PROCESAMIENTO-TECNICO.md` | Template para procesamiento |
| `docs/dev-qa/DEV_FEEDBACK_REPORT.md` | Reporte de feedback de desarrollo |
| `docs/dev-qa/QA_FEEDBACK_NOTES.md` | Notas de QA |
| `docs/dev-qa/QA_RELEASE_NOTES.md` | Release notes de QA |

---

## Resumen de Estadisticas

| Metrica | Valor |
|---------|-------|
| Archivos cambiados | 88 |
| Lineas agregadas | +10,350 |
| Lineas eliminadas | -4,264 |
| Commits | 47 |
| Autores | 2 (Praulio, Nebulatools) |

---

## Checklist Pre-Merge

### Migracion de Datos

- [ ] Backup de la base de datos realizado
- [ ] Script `migrate-night-feeding.ts` probado en ambiente de staging
- [ ] Decisión tomada: pre-deploy o post-deploy

### Verificacion de Funcionalidad

- [ ] Registro de eventos funciona correctamente
- [ ] Edicion de eventos desde Admin funciona
- [ ] Calendario muestra eventos correctamente
- [ ] Planes no generan actividades (solo despertar, siestas, comidas, dormir)
- [ ] Tooltips se muestran correctamente sin salirse de pantalla

### APIs

- [ ] Confirmado que las APIs eliminadas no son usadas en produccion
- [ ] Endpoints de eventos responden correctamente

---

## Instrucciones de Deploy

### 1. Pre-Deploy

```bash
# Opcional: Ejecutar migracion antes del deploy
# Solo si se decide hacer pre-deploy migration
npx tsx scripts/migrate-night-feeding.ts
```

### 2. Deploy

```bash
git checkout main
git merge QA
git push origin main
```

### 3. Post-Deploy

```bash
# Ejecutar migracion despues del deploy
# Recomendado si no se ejecuto en pre-deploy
npx tsx scripts/migrate-night-feeding.ts
```

### 4. Verificacion

- Revisar logs de la aplicacion
- Verificar que eventos se registran correctamente
- Confirmar que Admin puede ver/editar eventos

---

## Riesgos y Mitigacion

| Riesgo | Probabilidad | Impacto | Mitigacion |
|--------|--------------|---------|------------|
| Eventos `night_feeding` no migrados | Baja | Medio | El codigo maneja ambos formatos |
| Rollback requerido | Baja | Alto | Backup de BD antes de merge |
| APIs eliminadas aun en uso | Muy Baja | Alto | Verificado que son solo debug |

---

## Contacto

- **Autor del Analisis:** Claude AI
- **Fecha:** 2026-01-12
- **Revision:** 1.0
