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
| Item | Descripcion | Archivo |
|------|-------------|---------|
| Dia logico para planes | Implementar ordenamiento correcto en generacion de planes IA | `app/api/consultas/plans/route.ts` |
| Testing E2E completo | Verificar todos los cambios funcionan correctamente | Manual |

#### Dia Logico para Planes - Detalle
El plan de sueno generado por IA debe ordenar actividades de la siguiente manera:
1. **Despertar (wakeTime)** - Inicio del dia
2. **Actividades diurnas** - En orden cronologico
3. **Hora de dormir (bedtime/sleep)** - Fin del dia visible
4. **Eventos de madrugada (night_feeding, night_waking)** - Aparecen al final aunque sean las 02:00 AM

**Archivo a modificar:** `app/api/consultas/plans/route.ts`
**Funcion:** `generatePlanWithAI()` lineas ~1533-1767
**Cambio:** Modificar prompts para ordenar correctamente usando `schedule.timelineOrder`

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
- [ ] **PENDIENTE:** Dia logico en generacion de planes

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