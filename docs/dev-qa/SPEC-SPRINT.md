# 🛠 Especificación Técnica de Implementación: Refactorización UX, Plan de Sueño y Calidad de Datos

## 1. Resumen Ejecutivo
Este sprint se enfoca en resolver inconsistencias de UX y calidad de datos críticas para la operación.
1. **Plan de Sueño:** Mejorar la lógica visual de "madrugada" y consolidar "Ir a acostarse" vs "Dormir" sin perder datos históricos.
2. **UX Preventivo:** Ayudas visuales para cerrar eventos pendientes.
3. **Integridad de Medicamentos:** Hacer obligatorios los campos de medicamento y asegurar su visualización en el rol Admin.

## 2. Impacto en el Repositorio

### A. Archivos a Modificar
* **Validación y Esquemas (Backend/Frontend Shared):**
    * `lib/validations/event.ts`: **CRÍTICO.** Modificar esquema Zod para `medication`.
* **Frontend (Componentes de Calendario/Plan):**
    * `components/calendar/CalendarDayView.tsx`: Implementar "Día Lógico" (Madrugada).
    * `components/calendar/EventBlock.tsx`: Ajustar renderizado de íconos.
* **Frontend (Registro y UX):**
    * `components/events/forms/MedicationForm.tsx` (o el case dentro de `EventRegistration`): Reflejar validación obligatoria en UI.
    * `components/ui/GlobalActivityMonitor.tsx` (Nuevo): Overlay de eventos pendientes.
* **Frontend (Admin/Bitácora):**
    * `components/history/PatientHistory.tsx` o `components/admin/PatientLog.tsx`: Exponer campos de detalles de medicamento.

### B. Archivos a Crear
* `scripts/migrate-bedtime-latency.ts`: Script de migración de datos (One-off).

---

## 3. Lógica Técnica Detallada

### Tarea 1: Integridad de Datos - Medicamentos (Input & Output)
* **Objetivo:** Asegurar que no existan eventos de medicamento "vacíos" y que Mariana pueda leerlos.
* **Paso 1: Validación Estricta (Schema)**
    * En `lib/validations/event.ts`, localizar el esquema de validación de eventos.
    * Para el tipo `medication`, cambiar campos de opcionales a requeridos:
      ```typescript
      // Antes (Posible estado actual)
      // details: z.object({ medication: z.string().optional(), dose: z.string().optional() }).optional()
      
      // AHORA (Requerido)
      details: z.object({
        medication: z.string().min(1, "El nombre del medicamento es obligatorio"),
        dose: z.string().min(1, "La dosis es obligatoria")
      })
      ```
* **Paso 2: Visualización Admin**
    * En el componente de bitácora de Mariana (`PatientHistory.tsx`), dentro del mapeo de eventos:
    * Agregar lógica específica:
      ```tsx
      {event.eventType === 'medication' && (
        <div className="text-sm font-medium text-blue-600">
           💊 {event.details?.medication} - {event.details?.dose}
        </div>
      )}
      ```

### Tarea 2: Migración "Ir a acostarse" -> "Latencia"
* **Objetivo:** Eliminar redundancia visual sin perder historia.
* **Script (`scripts/migrate-bedtime-latency.ts`):**
    * Buscar pares consecutivos: Evento A (`bedtime`) seguido de Evento B (`sleep`).
    * Calcular `diff = B.startTime - A.startTime` (minutos).
    * Actualizar B: `B.sleepDelay = diff`.
    * Actualizar A: `A.isHidden = true` (No borrar, solo ocultar del frontend).

### Tarea 3: Visualización "Día Lógico" (Madrugada)
* **Objetivo:** Que los despertares de las 03:00 AM cuenten visualmente como "anoche".
* **Lógica en `CalendarDayView.tsx`:**
    * Crear utilitario `getVisualDate(date)`:
      ```typescript
      const getVisualDate = (d: Date) => {
         const hours = d.getHours();
         // Si es antes de las 05:00 AM, restar un día al objeto fecha visual
         if (hours < 5) return subDays(d, 1);
         return d;
      }
      ```
    * Usar esta fecha *transformada* solamente para agrupar las columnas del calendario. (No cambiar la fecha real del evento).

### Tarea 4: Monitor de Eventos Pendientes (UX)
* **Objetivo:** Evitar bloqueos "silenciosos" donde el usuario no sabe qué hacer.
* **Implementación:**
    * Crear componente `GlobalActivityMonitor` que consuma el contexto de eventos.
    * Si `activeEvent` existe (ej. un timer corriendo) Y han pasado > 20 mins:
    * Mostrar **Toast/Alert Warning**: *"Tienes un evento de [Tipo] abierto. ¿Finalizar ahora?"*.

---

## 4. Cambios en Base de Datos / Esquema
* **Colección `Events` (dentro de Child):**
    * `sleepDelay` (Number): Nuevo campo para guardar la latencia calculada.
    * `isHidden` (Boolean): Flag para ocultar eventos redundantes (`bedtime`) sin borrarlos físicamente.
    * **Validación:** Se enforcea a nivel de API que `medication` tenga payload completo.

## 5. Casos de Prueba y Criterios de Aceptación
1.  **Medicamentos (Happy Path):** Al crear un evento, si pongo nombre y dosis, se guarda y Mariana lo ve en su lista con el ícono correcto.
2.  **Medicamentos (Unhappy Path):** Si intento guardar un medicamento sin nombre, la UI me muestra error rojo y **NO** permite guardar.
3.  **Plan de Sueño:** Un evento a las 02:00 AM del Sábado debe aparecer visualmente en la columna del Viernes (al final).
4.  **Migración:** Los eventos viejos de "Ir a acostarse" desaparecen de la vista, pero el evento "Dormir" siguiente muestra: "Tiempo para dormir: X min".

---

## 6. HISTORIAL DE IMPLEMENTACION - Sesion 2026-01-08

### 6.1 Contexto Inicial
Durante testing del usuario, se identificaron MULTIPLES errores en la implementacion previa. Los problemas principales fueron:

| Problema | Descripcion | Impacto |
|----------|-------------|---------|
| Dia logico mal ubicado | Se implemento en calendario cuando debia ser para planes | Eventos de madrugada aparecian en dia anterior incorrectamente |
| GlobalActivityMonitor | Monitoreaba sleep/nap cuando solo debia monitorear night_waking | Alertas innecesarias para ninos durmiendo 6+ horas |
| Iconos con emojis | Se usaron emojis en lugar de iconos Lucide | Inconsistencia visual con el resto de la app |
| Vista diaria | Eventos muy anchos, tooltip mal posicionado | UX pobre, tooltip salia de pantalla |

### 6.2 CAMBIOS REVERTIDOS

#### A. Dia Logico de Madrugada (REVERTIDO)
**Archivos afectados:**
- `lib/datetime.ts`
- `components/calendar/CalendarWeekView.tsx`

**Que se elimino:**
```typescript
// ELIMINADO de lib/datetime.ts:
export const EARLY_MORNING_CUTOFF_HOUR = 5

export function getLogicalDateKey(isoString: string, timezone: string = DEFAULT_TIMEZONE): string {
  // ... logica que movia eventos de madrugada al dia anterior
}
```

**Razon:** El dia logico de madrugada es para GENERACION DE PLANES, no para visualizacion del calendario. El calendario debe mostrar eventos en su dia real.

**NOTA IMPORTANTE:** La logica de "dia logico" todavia debe implementarse, pero en `app/api/consultas/plans/route.ts` para que los planes generados por IA:
1. Empiecen con la hora de despertar (wakeTime)
2. Continuen con actividades del dia
3. Terminen con alimentacion nocturna (night_feeding a las 02:00, etc.)

---

### 6.3 CAMBIOS IMPLEMENTADOS (Correctos)

#### A. GlobalActivityMonitor - Solo night_waking
**Archivo:** `components/ui/GlobalActivityMonitor.tsx`

**Cambio:** El componente ahora SOLO monitorea eventos de `night_waking` (despertar nocturno).

**Por que:** Los eventos de `sleep` y `nap` duran horas (6+ horas es normal para ninos). No tiene sentido alertar al usuario que "tiene un evento de sueno abierto" cuando el nino simplemente sigue dormido.

**Logica actual:**
```typescript
// Solo verifica localStorage key para night_waking
const nightWakeKey = `pending_night_wake_${activeChild._id}`
const storedNightWake = window.localStorage.getItem(nightWakeKey)

// Alerta solo si night_waking lleva > 20 minutos abierto
if (elapsed >= ALERT_THRESHOLD_MINUTES && !dismissed) {
  setShowAlert(true)
}
```

---

#### B. Vista Diaria - Sistema de Columnas
**Archivo:** `components/calendar/CalendarDayView.tsx`

**Problema:** Eventos superpuestos ocupaban 100% del ancho y se tapaban entre si.

**Solucion:** Se copio la funcion `calculateEventColumns()` de CalendarWeekView.tsx para calcular columnas para eventos superpuestos.

**Como funciona:**
1. Ordena eventos por hora de inicio
2. Determina cuales eventos se superponen en tiempo
3. Asigna columnas (0, 1, 2...) a eventos superpuestos
4. Divide el ancho disponible entre el numero de columnas
5. Cada evento recibe `column` y `totalColumns` para posicionarse

```typescript
// Ejemplo: 3 eventos superpuestos
// Evento A: column=0, totalColumns=3 -> ocupa 33% izquierda
// Evento B: column=1, totalColumns=3 -> ocupa 33% centro
// Evento C: column=2, totalColumns=3 -> ocupa 33% derecha
```

---

#### C. Tooltip Posicionado Arriba
**Archivo:** `components/calendar/EventGlobe.tsx`

**Problema:** Tooltip aparecia a la derecha del evento y se salia de la pantalla.

**Solucion:** Tooltip ahora aparece ARRIBA del evento, centrado horizontalmente.

**Codigo clave:**
```typescript
// Posicion del tooltip
const handleMouseEnter = () => {
  if (eventRef.current) {
    const rect = eventRef.current.getBoundingClientRect()
    setTooltipPosition({
      x: rect.left + rect.width / 2,  // Centrado horizontalmente
      y: rect.top - 8                  // 8px arriba del evento
    })
  }
}

// CSS del tooltip
style={{
  transform: 'translate(-50%, -100%)',  // Centrado y arriba
  zIndex: 9999
}}
```

**Flecha indicadora:** Se agrego una flecha que apunta hacia abajo para indicar a que evento pertenece el tooltip.

---

#### D. Iconos de Feeding (Lucide, sin emojis)
**Archivos modificados:**
- `components/calendar/EventBlock.tsx`
- `components/calendar/EventGlobe.tsx`
- `app/dashboard/patients/child/[childId]/AdminChildDetailClient.tsx`

**Regla de iconos:**
| Tipo de Evento | Icono Lucide | Color |
|----------------|--------------|-------|
| sleep | Moon | indigo (#6366f1) |
| nap | Sun | amber (#f59e0b) |
| wake | Sun | yellow (#eab308) |
| night_waking | Baby | purple (#a855f7) |
| feeding (liquidos: breast/bottle) | Utensils | green (#22c55e) |
| feeding (solidos) | UtensilsCrossed | green (#22c55e) |
| medication | Pill | blue (#3b82f6) |
| extra_activities | Activity | orange (#f97316) |

**Codigo de ejemplo:**
```typescript
case "feeding":
case "night_feeding":
  if (event.feedingType === "solids") {
    return <UtensilsCrossed className="h-4 w-4 text-green-500" />
  }
  return <Utensils className="h-4 w-4 text-green-500" />
```

---

### 6.4 ACLARACION IMPORTANTE: Admin vs User Views

**El calendario (vistas semana/mes/dia) es SOLO para Admin.**

| Vista | Quien la ve | Ruta |
|-------|-------------|------|
| Calendario completo (semana/mes/dia) | Solo Admin | `/dashboard/calendar` |
| Grafica de barras (resumen) | Usuario normal (padres) | `/dashboard/children/{id}` |

**Implicacion para testing:**
- Para probar el calendario: Login como admin (mariana@admin.com)
- Los usuarios normales NO tienen acceso a las vistas detalladas del calendario
- La verificacion de columnas, tooltips, etc. debe hacerse desde cuenta admin

---

### 6.5 TRABAJO PENDIENTE

#### PRIORIDAD ALTA
| Item | Descripcion | Estado |
|------|-------------|--------|
| ~~Dia logico para planes~~ | ~~Ordenamiento por ciclo del nino~~ | **COMPLETADO** (ver 6.12) |
| Testing E2E completo | Verificar todos los cambios funcionan correctamente | Pendiente |

#### ~~Dia Logico para Planes - Detalle~~ (COMPLETADO)
✅ **Implementado en seccion 6.12** - Los planes ahora ordenan eventos en el siguiente orden:
1. **Despertar (wakeTime)** - Inicio del dia
2. **Actividades diurnas** - En orden cronologico
3. **Dormir (bedtime)** - Fin del dia visible (etiqueta simplificada)
4. **Eventos de madrugada** - Aparecen al final aunque sean las 02:00 AM

**Nota:** Se implemento en la visualizacion (`PlanDisplay.tsx`, `EditablePlanDisplay.tsx`) + se agrego regla 7 al prompt de IA para evitar actividades redundantes.

#### PRIORIDAD MEDIA
| Item | Descripcion | Estado |
|------|-------------|--------|
| Errores TypeScript pre-existentes | Hay errores en archivos de API no tocados | Pendiente |
| Errores de lint | Warnings de ESLint en varios archivos | Pendiente |

---

### 6.6 ARCHIVOS MODIFICADOS (Commit 554412a)

| Archivo | Tipo de Cambio |
|---------|----------------|
| `lib/datetime.ts` | Eliminadas funciones de dia logico |
| `components/calendar/CalendarWeekView.tsx` | Restaurada funcion getEventsForDay original |
| `components/calendar/CalendarDayView.tsx` | Agregada funcion calculateEventColumns |
| `components/calendar/EventGlobe.tsx` | Tooltip arriba + iconos Lucide |
| `components/calendar/EventBlock.tsx` | Iconos Lucide sin emojis |
| `components/ui/GlobalActivityMonitor.tsx` | Solo monitorea night_waking |
| `AdminChildDetailClient.tsx` | Iconos Lucide sin emojis |

---

### 6.7 CREDENCIALES DE TESTING

| Rol | Email | Password |
|-----|-------|----------|
| Admin | mariana@admin.com | password |
| Usuario | eljulius@nebulastudios.io | juls0925 |

**URL Base:** `http://localhost:3000`

---

### 6.8 CHECKLIST DE VERIFICACION

- [x] Vista diaria: Eventos superpuestos lado a lado (no tapandose)
- [x] Tooltip: Aparece arriba del evento, no a la derecha
- [x] Iconos feeding: Solidos (UtensilsCrossed) vs Liquidos (Utensils)
- [x] GlobalActivityMonitor: Solo alerta para night_waking
- [x] Calendario: Eventos de madrugada en su dia real (no dia anterior)
- [x] EventGlobe: Posicionamiento correcto de eventos (fix clase relative)
- [x] **COMPLETADO:** Dia logico en visualizacion de planes (ver 6.12)

---

### 6.9 FIX: Posicionamiento de Eventos EventGlobe (Commit f606207) - 2026-01-09

#### Problema Reportado
Los eventos de tipo `feeding`, `medication` y `extra_activities` aparecian desplazados ~1 hora hacia abajo de su posicion correcta. Los eventos de `sleep`, `nap` y `night_waking` (renderizados por SleepSessionBlock) se mostraban correctamente.

#### Diagnostico con Claude in Chrome

| Verificacion | Resultado |
|-------------|-----------|
| Timezone interpretation | Correcta (`new Date().getHours()` retorna valor correcto) |
| Formulas matematicas | Correctas y consistentes entre componentes |
| cssTop del evento 21:00 | 630px (correcto: 21 * 30 = 630) |
| **computed position** | **`relative` en vez de `absolute`** ← BUG |

#### Causa Raiz
**EventGlobe.tsx linea 260** tenia clases conflictivas:
```tsx
className={`group relative absolute shadow-md...`}
```

En Tailwind CSS, cuando hay clases conflictivas (`relative` y `absolute`), una gana segun el orden en la stylesheet compilada. El **computed style mostraba `position: relative`**, causando que `top: 630px` fuera relativo a la posicion en el flujo del documento, NO al contenedor padre.

#### Por que SleepSessionBlock funcionaba
SleepSessionBlock.tsx solo tenia `absolute` sin `relative` conflictivo:
```tsx
className={cn("absolute left-2 right-2 cursor-pointer", className)}
```

#### Solucion Implementada

**Archivo:** `components/calendar/EventGlobe.tsx`
```diff
- className={`group relative absolute shadow-md...`}
+ className={`group absolute shadow-md...`}
```

**Archivo:** `components/calendar/CalendarWeekView.tsx`
```diff
- "h-6 bg-white border-b border-gray-200..."
+ "h-8 bg-white border-b border-gray-200..."
```
(Alineacion de header con TimeAxis)

#### Verificacion Post-Fix
```javascript
// Antes del fix
{ cssTop: 630, position: "relative" } // ❌

// Despues del fix
{ cssTop: 630, position: "absolute" } // ✓
```

#### Archivos Modificados (Commit f606207)
| Archivo | Cambio |
|---------|--------|
| `components/calendar/EventGlobe.tsx` | Quitar `relative` conflictivo, agregar soporte `night_feeding` |
| `components/calendar/CalendarWeekView.tsx` | Header h-6 → h-8, agregar overflow-hidden |

---

### 6.10 FIX: Contraste de Iconos y Ancho de SleepSessionBlock (Commit 67e3fdb) - 2026-01-09

#### Problemas Reportados por Usuario
1. **Iconos sin contraste**: El drop-shadow blanco no proporcionaba suficiente contraste sobre fondos de colores
2. **SleepSessionBlock escalonado**: El bloque de sueno participaba en el sistema de columnas cuando deberia ocupar siempre 100% del ancho

#### Diagnostico

| Componente | Problema | Impacto |
|------------|----------|---------|
| EventGlobe iconos | `drop-shadow-[0_0_2px_rgba(255,255,255,0.9)]` insuficiente | Iconos dificiles de ver sobre fondos de colores |
| SleepSessionBlock iconos | Mismo problema de drop-shadow blanco | Iconos Moon/Sun/Baby poco visibles |
| SleepSessionBlock ancho | Pasaba por `calculateEventColumns()` | Se escalonaba con otros eventos cuando no debia |

#### Solucion Implementada

##### A. Stroke Negro en Iconos
Cambio de drop-shadow blanco a doble drop-shadow negro que crea efecto de contorno:

**EventGlobe.tsx - funcion getIcon():**
```tsx
// ANTES:
const iconClass = "h-3 w-3 drop-shadow-[0_0_2px_rgba(255,255,255,0.9)]"

// DESPUES:
const iconClass = "h-3 w-3 [filter:drop-shadow(0_0_1px_black)_drop-shadow(0_0_1px_black)]"
```

**SleepSessionBlock.tsx - todos los iconos:**
```tsx
// ANTES:
<Moon className="h-4 w-4 drop-shadow-[0_0_2px_rgba(255,255,255,0.9)]" />
<Sun className="h-4 w-4 drop-shadow-[0_0_2px_rgba(255,255,255,0.9)]" />
<Baby className="h-3 w-3 drop-shadow-[0_0_2px_rgba(255,255,255,0.9)]" />

// DESPUES:
<Moon className="h-4 w-4 [filter:drop-shadow(0_0_1px_black)_drop-shadow(0_0_1px_black)]" />
<Sun className="h-4 w-4 [filter:drop-shadow(0_0_1px_black)_drop-shadow(0_0_1px_black)]" />
<Baby className="h-3 w-3 [filter:drop-shadow(0_0_1px_black)_drop-shadow(0_0_1px_black)]" />
```

**Por que doble drop-shadow:** Un solo drop-shadow de 1px no crea suficiente grosor de contorno. Al duplicar el filtro, se logra un efecto de stroke mas visible sin agregar blur excesivo.

##### B. SleepSessionBlock Siempre 100% Ancho
Las sesiones de sueno (sleep/nap con duracion) ahora se renderizan ANTES de pasar otros eventos por `calculateEventColumns()`:

**CalendarDayView.tsx y CalendarWeekView.tsx:**
```tsx
// ANTES: Sesiones incluidas en calculateEventColumns
const allEvents = [...sessionEvents, ...otherEvents]
const eventsWithColumns = calculateEventColumns(allEvents)

// DESPUES: Sesiones renderizadas aparte, SIEMPRE 100% ancho
const eventsWithColumns = calculateEventColumns(otherEvents as Event[])

return (
  <>
    {/* Sesiones de sleep PRIMERO (fondo) - SIEMPRE 100% ancho */}
    {sessions.map((session, idx) => (
      <SleepSessionBlock
        key={`session-${idx}`}
        {...sessionProps}
        column={0}
        totalColumns={1}  // ← Forzar ancho 100%
      />
    ))}

    {/* EventGlobes con sistema de columnas */}
    {eventsWithColumns.map(event => (
      <EventGlobe
        column={event.column}
        totalColumns={event.totalColumns}
      />
    ))}
  </>
)
```

**Justificacion del usuario:** "El evento de dormir es el unico que quiero que se mantenga constante como antes, ocupando todo el espacio ya que es un evento largo por naturaleza."

#### Archivos Modificados (Commit 67e3fdb)
| Archivo | Cambio |
|---------|--------|
| `components/calendar/EventGlobe.tsx` | Stroke negro en iconos |
| `components/calendar/SleepSessionBlock.tsx` | Stroke negro en iconos (Moon, Sun, Baby) |
| `components/calendar/CalendarDayView.tsx` | Sesiones excluidas de calculateEventColumns, forzar 100% ancho |
| `components/calendar/CalendarWeekView.tsx` | Sesiones excluidas de calculateEventColumns, forzar 100% ancho |
| `components/events/ManualEventModal.tsx` | endTime requerido para night_waking |

#### Verificacion
- [x] Iconos con buen contraste sobre todos los fondos de colores
- [x] SleepSessionBlock ocupa 100% del ancho de la columna del dia
- [x] EventGlobe (feeding, medication, activities) sigue escalonandose correctamente
- [x] NightWakings visibles sobre el bloque de sleep

---

### 6.11 REFACTOR: EventDetailsModal como Componente Reutilizable (Commit e84bc4a) - 2026-01-09

#### Problema Identificado
El modal de "Detalles del Evento" en el calendario estaba implementado inline (~300 lineas de codigo) en `calendar/page.tsx`. Esto causaba:
1. Codigo duplicado si se queria usar en otras partes de la app
2. Tab "Eventos" en Admin (`AdminChildDetailClient`) no tenia modal de detalles
3. Admin podia ver lista de eventos pero no podia hacer click para ver todos los campos

#### Solucion Implementada

##### A. Nuevo Componente EventDetailsModal
**Archivo:** `components/events/EventDetailsModal.tsx`

**Contenido extraido:**
- 9 funciones helper: `getEventTypeIcon`, `getEventTypeColor`, `getEventTypeName`, `getEmotionalStateName`, `getFeedingTypeName`, `getBabyStateName`, `getActivityImpactName`, `formatMinutes`, `formatFeedingAmount`
- Secciones especificas por tipo de evento (sleep, feeding, medication, activities)
- Botones de accion (Editar/Eliminar)

**Props del componente:**
```typescript
interface EventDetailsModalProps {
  event: Event | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: () => void
  onDelete?: () => void
  showActions?: boolean
  userTimeZone?: string
}
```

##### B. Integracion en AdminChildDetailClient
**Archivo:** `app/dashboard/patients/child/[childId]/AdminChildDetailClient.tsx`

**Cambios:**
1. Import de `EventDetailsModal`, `EventEditRouter`, `DeleteConfirmationModal`
2. Estados agregados: `selectedEvent`, `isDetailsModalOpen`, `isEditModalOpen`, `showDeleteModal`, `isDeleting`
3. Eventos clickeables con `cursor-pointer` y `onClick`
4. Modales agregados al final del componente
5. Funcion `refetchEvents()` para actualizar lista despues de editar/eliminar

**Resultado:** Admin ahora puede hacer click en cualquier evento del Tab "Eventos" y ver el modal completo con todos los campos.

##### C. Refactor de calendar/page.tsx
**Archivo:** `app/dashboard/calendar/page.tsx`

**Cambios:**
- Import del nuevo `EventDetailsModal`
- Eliminacion de ~300 lineas de Dialog inline
- Uso del componente reutilizable con mismos props

**Reduccion:** El archivo paso de tener el modal inline a solo 11 lineas usando el componente.

##### D. Boton Editar con Color de Branding
El boton de Editar en el modal usaba un gradiente `from-indigo-500 to-purple-500` que no coincidia con el branding de la app.

**Cambio:**
```tsx
// ANTES:
className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white"

// DESPUES:
className="bg-primary hover:bg-primary/90 text-white"
```

#### Archivos Modificados (Commit e84bc4a)
| Archivo | Cambio |
|---------|--------|
| `components/events/EventDetailsModal.tsx` | **NUEVO** - Componente reutilizable |
| `components/events/index.ts` | Export agregado |
| `app/dashboard/patients/child/[childId]/AdminChildDetailClient.tsx` | Integracion del modal, eventos clickeables |
| `app/dashboard/calendar/page.tsx` | Reemplazo de Dialog inline con componente |

#### Verificacion
- [x] Calendario: Click en evento abre modal igual que antes
- [x] Admin Tab Eventos: Click en evento abre modal con todos los campos
- [x] Boton Editar abre EventEditRouter correctamente
- [x] Boton Eliminar muestra confirmacion y elimina evento
- [x] Build compila sin errores

---

### 6.12 FEAT: Día Lógico para Planes y Simplificación de Etiquetas (Commit 074960d) - 2026-01-09

#### Problema Reportado por Usuario
El plan de sueño mostraba DOS eventos redundantes para la hora de dormir:
- 8:15 PM - "Acostado" (15 min) - descripción "Acostarse"
- 8:30 PM - "Hora de dormir" - descripción "Ir a la cama"

Además, eventos de madrugada (ej: alimentación a las 02:00 AM) aparecían al INICIO del plan cronológicamente cuando deberían aparecer AL FINAL del día lógico del niño.

#### Decisiones de Diseño

| Decisión | Justificación |
|----------|---------------|
| Mantener `schedule.bedtime` | Es un campo de horario recomendado, no un tipo de evento |
| Eliminar actividad "Acostado" | Redundante con el evento `bedtime` |
| Simplificar a "Dormir" | Más claro y directo para los padres |
| Día lógico en visualización | Los planes deben reflejar el ciclo natural del niño |

#### Solución Implementada

##### A. Función sortByLogicalDay()
Nueva función para ordenar eventos según el ciclo del niño:

```typescript
const EARLY_MORNING_CUTOFF = 6 * 60 // 06:00 = 360 minutos

const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

const sortByLogicalDay = (events: TimelineEvent[], wakeTime?: string | null): TimelineEvent[] => {
  const wakeMinutes = timeToMinutes(wakeTime || "07:00")

  // Separar eventos en categorías
  const wakeEvent = events.find(e => e.type === "wake")
  const bedtimeEvent = events.find(e => e.type === "bedtime")
  const postBedtime: TimelineEvent[] = []  // Eventos de madrugada
  const daytime: TimelineEvent[] = []       // Eventos diurnos

  events.forEach(event => {
    if (event.type === "wake" || event.type === "bedtime") return
    const mins = timeToMinutes(event.time)
    // Es nocturno si: antes de despertar Y antes de las 06:00
    if (mins < wakeMinutes && mins < EARLY_MORNING_CUTOFF) {
      postBedtime.push(event)
    } else {
      daytime.push(event)
    }
  })

  // Orden: despertar → actividades → dormir → eventos nocturnos
  return [
    ...(wakeEvent ? [wakeEvent] : []),
    ...daytime.sort(byTime),
    ...(bedtimeEvent ? [bedtimeEvent] : []),
    ...postBedtime.sort(byTime)
  ]
}
```

##### B. Simplificación de Etiquetas

| Antes | Después |
|-------|---------|
| "Hora de dormir" | "Dormir" |
| "Ir a la cama" (descripción) | "" (vacío) |

**Archivos modificados:**
- `PlanDisplay.tsx` líneas 219-220
- `EditablePlanDisplay.tsx` líneas 578-579
- `PlanEventEditModal.tsx` línea 46
- `EditablePlanDisplay.tsx` EVENT_TEMPLATES línea 89

##### C. Regla 7 en Prompt de IA
Agregada instrucción para evitar actividades redundantes:

```
7. ⛔ NO generar actividades de "Acostado", "Acostarse", "Ir a la cama"
   o "Rutina de sueño" - el campo "bedtime" ya cubre la hora de dormir
```

**Archivos modificados:**
- `app/api/consultas/plans/route.ts` línea 1726 (refinamiento)
- `app/api/consultas/plans/route.ts` línea 1799 (fallback)

##### D. Ejemplo de Activities Mejorado
El ejemplo de actividades en el prompt usaba "jugar" genérico. Cambiado a ejemplo más representativo:

```json
// ANTES:
"activities": [{ "time": "08:00", "activity": "jugar", "duration": 60 }]

// DESPUÉS:
"activities": [{ "time": "10:30", "activity": "Juego activo", "duration": 60,
                 "description": "Actividad motriz o al aire libre" }]
```

#### Archivos Modificados (Commit 074960d)

| Archivo | Cambio |
|---------|--------|
| `components/consultas/PlanDisplay.tsx` | sortByLogicalDay + etiquetas simplificadas |
| `components/consultas/EditablePlanDisplay.tsx` | sortByLogicalDay + etiquetas + template actualizado |
| `components/consultas/PlanEventEditModal.tsx` | Etiqueta "Dormir" en selector |
| `app/api/consultas/plans/route.ts` | Regla 7 + ejemplo mejorado |

#### Verificación

- [x] Eventos de madrugada (02:00 AM) aparecen AL FINAL del plan
- [x] Orden: despertar → actividades → dormir → eventos nocturnos
- [x] Etiqueta "Dormir" en lugar de "Hora de dormir"
- [x] Sin descripción "Ir a la cama" redundante
- [x] Planes generados por IA no incluyen actividad "Acostado"
- [x] Build compila sin errores
- [x] App inicia correctamente (Next.js Ready)

---

### 6.13 REFACTOR: Eliminar night_feeding como eventType separado (Commit ec3d44e) - 2026-01-09

#### Problema Identificado
Cuando se registraba una alimentación mientras el bebé dormía, el sistema creaba **2 eventos separados**:
1. Evento `feeding` con los detalles de la alimentación
2. Evento `night_feeding` como marcador de alimentación nocturna

Esto causaba:
- **Inconsistencia de datos**: Editar uno no actualizaba el otro
- **Error de edición**: "Cannot read properties of null (reading 'toString')" al editar `night_feeding`
- **Duplicados en la BD**: 2 registros por cada alimentación nocturna

#### Solución Implementada

##### A. Nuevo Modelo de Datos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `isNightFeeding` | `boolean` | `true` si la alimentación ocurrió mientras el bebé dormía |
| `feedingContext` | `"awake" \| "during_sleep" \| "during_nap"` | Contexto del bebé al momento de alimentar |

##### B. Cambio en Creación de Eventos

**FeedingButton.tsx - ANTES:**
```typescript
// Creaba 2 eventos
await createEvent({ eventType: "feeding", ... })
if (isBabySleeping && isLiquid) {
  await createEvent({ eventType: "night_feeding", ... })
}
```

**FeedingButton.tsx - DESPUÉS:**
```typescript
// Crea 1 solo evento con flag
const isNightFeeding = isBabySleeping && isLiquid
const feedingContext = sleepState.status === "sleeping"
  ? "during_sleep"
  : sleepState.status === "napping"
    ? "during_nap"
    : "awake"

await createEvent({
  eventType: "feeding",
  isNightFeeding,
  feedingContext,
  ...
})
```

##### C. Compatibilidad hacia Atrás
La UI detecta alimentaciones nocturnas con ambos formatos:

```typescript
const isNightFeedingEvent = (event: Event) =>
  event.eventType === "night_feeding" ||  // Legacy
  (event.eventType === "feeding" && event.isNightFeeding === true)  // Nuevo
```

##### D. Visualización en UI

**Tabla de Mis Eventos:**
```
| Tipo                          | Hora  |
|-------------------------------|-------|
| Alimentación [Nocturna]       | 02:30 |  ← Badge morado
| Alimentación                  | 14:00 |
```

**Modal de Detalles:**
- Badge "Nocturna" junto al tipo de evento
- Texto: "Esta alimentación ocurrió mientras el bebé dormía"

##### E. Script de Migración
**Archivo:** `scripts/migrate-night-feeding.ts`

```bash
npx tsx scripts/migrate-night-feeding.ts
```

**Resultados de la migración:**
- 34 eventos `night_feeding` encontrados
- 32 convertidos directamente a `feeding` con flag
- 2 duplicados fusionados y eliminados
- 0 eventos `night_feeding` restantes

#### Archivos Modificados (Commit ec3d44e)

| Archivo | Cambio |
|---------|--------|
| `types/models.ts` | Agregados `isNightFeeding`, `feedingContext` al Event |
| `components/events/types.ts` | Agregados campos a EventData |
| `app/api/children/events/route.ts` | POST/PUT/PATCH guardan nuevos campos |
| `components/events/FeedingButton.tsx` | Crear 1 evento con flag en lugar de 2 |
| `app/dashboard/children/[id]/events/page.tsx` | Badge "Nocturna" en tabla |
| `components/events/EventDetailsModal.tsx` | Badge "Nocturna" + texto informativo |
| `components/events/EventEditRouter.tsx` | `night_feeding` → FeedingModal con conversión |
| `components/events/ManualEventModal.tsx` | Fix bug null check (`!= null`) |
| `lib/event-sync.ts` | Agregados campos a EventSyncData |
| `scripts/migrate-night-feeding.ts` | **NUEVO** - Script de migración |

#### Verificación

- [x] Alimentar bebé dormido crea 1 solo evento con `isNightFeeding: true`
- [x] Badge "Nocturna" visible en tabla de Mis Eventos
- [x] Badge "Nocturna" visible en modal de detalles
- [x] Editar evento nocturno abre FeedingModal correctamente
- [x] Cambios persisten después de editar
- [x] Eventos legacy `night_feeding` se muestran correctamente
- [x] Migración ejecutada: 0 eventos `night_feeding` en BD
- [x] Build compila sin errores relacionados con este cambio

---

### 6.14 DOCS: Sistema de Rules, Skill y Knowledge Compounding (Commit pendiente) - 2026-01-09

#### Contexto
Después de resolver el bug UTC de edición de eventos, se identificó la necesidad de documentar patrones y bugs conocidos de forma que Claude Code los cargue automáticamente en cada sesión.

#### Solución Implementada

##### A. Sistema de Rules (`.claude/rules/`)
Directorio con archivos `.md` que se cargan automáticamente al inicio de cada sesión de Claude Code.

| Archivo | Contenido |
|---------|-----------|
| `core.md` | Stack tecnológico, archivos clave, imports comunes, credenciales de testing |
| `datetime.md` | Bug UTC crítico y solución con `buildLocalDate()` |
| `events.md` | Tipos de evento válidos, validación de campos, patrón EditOptions |
| `patterns.md` | Patrón modal con modo edit, EventEditRouter, validación API, día lógico |
| `ui.md` | CSS sin conflictos, iconos Lucide, SleepSessions 100% ancho |

##### B. Skill Happy Dreamers (`.claude/skills/happy-dreamers/`)
Skill con YAML frontmatter siguiendo el patrón compound-engineering.

**Estructura:**
```
skills/happy-dreamers/
├── SKILL.md              # Metadata + instrucciones + mecanismo compound
└── references/
    ├── datetime-patterns.md   # Detalle profundo de manejo de fechas
    ├── event-system.md        # Sistema de eventos completo
    └── modal-patterns.md      # Patrones de implementación de modales
```

**SKILL.md incluye:**
- YAML frontmatter con `name` y `description`
- Quick reference del stack
- Lista de bugs críticos conocidos
- **Mecanismo de compound** - Instrucciones para documentar nuevos descubrimientos

##### C. Knowledge Repository (`.claude/docs/solutions/`)
Directorio para acumular conocimiento a lo largo del desarrollo.

**Estructura por categorías:**
```
docs/solutions/
├── README.md                              # Cómo usar el sistema
├── datetime-bugs/
│   └── utc-midnight-interpretation.md     # Bug UTC documentado
├── event-bugs/
│   └── duplicate-event-types.md           # Anti-patrón de tipos duplicados
├── ui-bugs/                               # Para futuros bugs de UI
└── patterns/                              # Para patrones reutilizables
```

**Template de documento:**
```yaml
---
title: [Título descriptivo]
category: [datetime-bugs|event-bugs|ui-bugs|patterns]
date: [YYYY-MM-DD]
severity: [critical|high|medium|low]
tags: [comma, separated, tags]
---
```

##### D. Mecanismo de Compound
Instrucciones en SKILL.md para que Claude documente automáticamente cuando:
1. Arregla un bug no obvio
2. Descubre un patrón reutilizable
3. Encuentra un "gotcha" que hizo perder tiempo
4. Aprende cómo interactúan dos sistemas

**Flujo:**
```
Descubrir problema → Resolver → Documentar en docs/solutions/ → Si es crítico, agregar a rules/
```

#### Archivos Creados

| Archivo | Propósito |
|---------|-----------|
| `.claude/rules/core.md` | Reglas core del proyecto |
| `.claude/rules/datetime.md` | Reglas de manejo de fechas |
| `.claude/rules/events.md` | Reglas del sistema de eventos |
| `.claude/rules/patterns.md` | Patrones de implementación |
| `.claude/rules/ui.md` | Reglas de UI y componentes |
| `.claude/skills/happy-dreamers/SKILL.md` | Skill principal |
| `.claude/skills/happy-dreamers/references/datetime-patterns.md` | Referencia de fechas |
| `.claude/skills/happy-dreamers/references/event-system.md` | Referencia de eventos |
| `.claude/skills/happy-dreamers/references/modal-patterns.md` | Referencia de modales |
| `.claude/docs/solutions/README.md` | Guía del repositorio de conocimiento |
| `.claude/docs/solutions/datetime-bugs/utc-midnight-interpretation.md` | Documento de bug UTC |
| `.claude/docs/solutions/event-bugs/duplicate-event-types.md` | Documento de tipos duplicados |

#### Beneficios

1. **Prevención automática**: Las rules se cargan en cada sesión, previniendo bugs conocidos
2. **Contexto profundo disponible**: References cargables cuando se necesita más detalle
3. **Conocimiento acumulativo**: Cada bug resuelto mejora las sesiones futuras
4. **Searchable con YAML**: Frontmatter permite buscar por categoría, severidad, tags

#### Verificación

- [x] `.claude/rules/` contiene 5 archivos .md
- [x] `.claude/skills/happy-dreamers/SKILL.md` tiene YAML frontmatter válido
- [x] `.claude/skills/happy-dreamers/references/` contiene 3 archivos de referencia
- [x] `.claude/docs/solutions/` tiene estructura por categorías
- [x] Documentos de ejemplo creados con template correcto

---

### 6.15 FIX: Estandarizar Cálculo de endTime en Todos los Flujos (Commit 9b787c2) - 2026-01-09

#### Problemas Identificados

1. **Duraciones negativas** (-56m, -15m) en la tabla de eventos de "Mis Eventos"
2. **Registro manual afectaba botones en vivo**: Al registrar un `night_waking` manual, los botones cambiaban a "VOLVER A DORMIR"
3. **Inconsistencia entre flujos**: Algunos flujos enviaban `endTime`, otros no

#### Causa Raíz

##### A. Duraciones Negativas
Los modales de edición NO calculaban `endTime` correctamente. Al editar un evento y cambiar la hora, el `endTime` quedaba incorrecto o no se actualizaba, resultando en `endTime < startTime`.

##### B. Registro Manual Afectando Botones En Vivo
En `lib/event-types.ts`, `night_waking` tenía `hasEndTime: true`, lo que causaba:
1. ManualEventModal mostraba checkbox "incluir hora fin"
2. Si el usuario no lo marcaba, evento se guardaba SIN endTime
3. API veía `night_waking && !endTime` → devolvía `status: "night_waking"`
4. Botones cambiaban a "VOLVER A DORMIR"

#### Solución Implementada

##### A. Cálculo Automático de endTime en Registro En Vivo

**ExtraActivityButton.tsx:**
```typescript
const now = getCurrentTime()
// NUEVO: Calcular endTime = startTime + activityDuration
const endTime = new Date(now.getTime() + (activityData.activityDuration * 60 * 1000))

const eventData = {
  startTime: dateToTimestamp(now, userData.timezone),
  endTime: dateToTimestamp(endTime, userData.timezone),  // ← AGREGADO
  activityDuration: activityData.activityDuration,
  // ...
}
```

**FeedingButton.tsx:**
```typescript
const durationToSend = feedingData.feedingDuration || ...
// NUEVO: Calcular endTime = startTime + feedingDuration
const endTime = new Date(now.getTime() + (durationToSend * 60 * 1000))

const eventData = {
  startTime: dateToTimestamp(now, userData.timezone),
  endTime: dateToTimestamp(endTime, userData.timezone),  // ← AGREGADO
  feedingDuration: durationToSend,
  // ...
}
```

##### B. Cálculo Automático de endTime en Registro Manual

**ManualEventModal.tsx:**
```typescript
// Calcular endTime automáticamente para alimentación, actividades extra Y despertares nocturnos
let calculatedEndTime: Date | null = null
if (eventType === "feeding") {
  calculatedEndTime = new Date(startDateTime.getTime() + (feedingDuration * 60 * 1000))
} else if (eventType === "extra_activities") {
  calculatedEndTime = new Date(startDateTime.getTime() + (activityDuration * 60 * 1000))
} else if (eventType === "night_waking") {  // ← NUEVO CASO
  const awakeDelayMinutes = awakeDelay || 15
  calculatedEndTime = new Date(startDateTime.getTime() + (awakeDelayMinutes * 60 * 1000))
}
```

##### C. Separación Total: Manual vs En Vivo

**lib/event-types.ts:**
```typescript
{
  id: "night_waking",
  hasEndTime: false,  // ANTES: true → AHORA: false
  // Usa awakeDelay para calcular endTime automáticamente
}
```

**Por qué este cambio:**
- `hasEndTime: true` mostraba campos de "hora fin" en el formulario manual
- `hasEndTime: false` usa el cálculo automático `startTime + awakeDelay`
- El flujo EN VIVO (SleepButton) NO usa `event-types.ts` → no se afecta

##### D. Cálculo de endTime en Modales de Edición

**NightWakingModal.tsx, ExtraActivityModal.tsx, FeedingModal.tsx:**
Todos ahora calculan `endTime` en modo edición usando el patrón:
```typescript
if (mode === "edit" && eventDate && eventTime) {
  const startDateObj = buildLocalDate(eventDate, eventTime)
  const endDateObj = new Date(startDateObj.getTime() + (duration * 60 * 1000))
  editOptions = {
    startTime: dateToTimestamp(startDateObj, timezone),
    endTime: dateToTimestamp(endDateObj, timezone)
  }
}
```

#### Matriz de Consistencia Final

| Flujo | extra_activities | feeding | night_waking |
|-------|------------------|---------|--------------|
| **EN VIVO** | ✅ Sí endTime | ✅ Sí endTime | ✅ Sí endTime |
| **MANUAL** | ✅ Sí endTime | ✅ Sí endTime | ✅ Sí endTime |
| **EDICIÓN** | ✅ Sí endTime | ✅ Sí endTime | ✅ Sí endTime |

#### Archivos Modificados (Commit 9b787c2)

| Archivo | Cambio |
|---------|--------|
| `components/events/ExtraActivityButton.tsx` | +endTime en registro en vivo |
| `components/events/FeedingButton.tsx` | +endTime en registro en vivo |
| `components/events/ManualEventModal.tsx` | +cálculo endTime para night_waking |
| `components/events/ExtraActivityModal.tsx` | +cálculo endTime en edición |
| `components/events/FeedingModal.tsx` | +cálculo endTime en edición |
| `components/events/NightWakingModal.tsx` | +cálculo endTime en edición |
| `components/events/EventEditRouter.tsx` | Pasar endTime calculado a updateEvent |
| `lib/event-types.ts` | night_waking: `hasEndTime: false` |

#### Verificación

- [x] Duraciones positivas en tabla de eventos
- [x] Registro manual NO afecta botones en vivo
- [x] Editar eventos mantiene duración correcta
- [x] Build compila sin errores
- [x] Flujos en vivo y manual completamente independientes