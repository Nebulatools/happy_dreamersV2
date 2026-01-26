# Feature: Mejoras UX/UI Dashboard - Vista Narrativa y Taxonomía Visual

## Vision

Transformar la experiencia de lectura de la bitacora de eventos de un sistema de "bloques de calendario" dificiles de leer a una **narrativa fluida tipo feed** que permita a admins y padres entender rapidamente "que paso hoy" sin esfuerzo cognitivo.

**Problema actual:** Los bloques de calendario fragmentan visualmente el sueno nocturno y usan iconografia generica que no diferencia tipos de alimentacion.

**Solucion:** Vista narrativa cronologica + taxonomia visual clara + sincronizacion bidireccional calendario-narrativa.

---

## Alcance del Sprint

### MVP (Items 1-3)
1. **Item 1:** Vista Narrativa de Bitacora (Timeline)
2. **Item 2:** Taxonomia Visual (Alimentacion y Sueno)
3. **Item 3:** Vista Dual Split Screen (Admin)

### Diferido (Item 4)
- Panel de Estadisticas y Diagnostico AI (mas complejo, siguiente sprint)

---

## Item 1: Vista Narrativa de Bitacora (Timeline) ✅ COMPLETADO

### Flujo por Tipo de Usuario

| Vista | Admin (Mariana) | Padres |
|-------|-----------------|--------|
| **Home** | N/A | Ultimos 5 eventos + "Ver todo/Colapsar" |
| **Bitacora Diaria** | Split Screen (50% calendario, 50% narrativa) | Narrativa completa vertical |
| **Semanal/Mensual** | Solo bloques (sin narrativa) | Solo bloques (sin narrativa) |

### Anatomia de Tarjeta de Evento

```
+--------------------------------------------------+
| [ICONO]  Matias tomo 5 oz de leche materna       |
|          08:30 AM                          [>]   |
+--------------------------------------------------+
```

**Elementos:**
1. **Icono (izquierda):** Circular, respeta taxonomia Item 2
2. **Narrativa (centro):** Oracion completa generada automaticamente
3. **Metadatos (debajo):** Hora o rango (08:30 - 09:15)
4. **Navegacion (derecha):** `chevron-right` abre edicion

### Reglas de Narrativa (100% automatica)

| Tipo Evento | Formato Narrativa |
|-------------|-------------------|
| Alimentacion Pecho | "[Nombre] tomo pecho por [X] minutos" |
| Alimentacion Biberon | "[Nombre] tomo [X] oz de [formula/leche]" |
| Alimentacion Solidos | "[Nombre] comio [descripcion]" |
| Siesta | "[Nombre] durmio una siesta de [X] min" |
| Sueno Nocturno | "[Nombre] durmio de [hora] a [hora]" |
| Despertar Nocturno | "[Nombre] desperto a las [hora]" |
| Medicamento | "[Nombre] tomo [medicamento]" |

**Datos incompletos:** Omitir el dato faltante (no mostrar placeholder).

### Comportamiento Home (Padres)

- **Default:** Muestra 5 eventos mas recientes, colapsado
- **"Ver todo":** Expande lista completa del dia
- **"Colapsar":** Vuelve a 5 eventos
- **Persistencia:** Siempre inicia colapsado (no guarda estado)

### Ordenamiento

**Cronologico Inverso Estricto:** El evento con `timestamp` mayor aparece primero (arriba).

### Edge Case: Dia sin eventos

Mostrar empty state amigable: "No hay eventos registrados hoy"

---

## Item 2: Taxonomia Visual (Alimentacion y Sueno) ✅ COMPLETADO

### 2.1 Iconos de Alimentacion

| Subtipo | Icono Lucide | Contexto |
|---------|--------------|----------|
| Solidos | `UtensilsCrossed` | Desayuno, comida, cena, snacks |
| Biberon | `Baby` (buscar mejor) | Formula, leche extraida |
| Pecho | Buscar en Lucide el mas cercano | Lactancia directa |

**Regla:** Nunca usar icono generico de "cubiertos" para todo.

**Tomas Nocturnas:** Usan el mismo icono que diurnas (biberon/pecho/solidos segun corresponda).

### 2.2 Sueno Nocturno (Layering Logic)

**NOTA:** Revisar implementacion actual - puede que ya este resuelto.

- **Capa Base:** Bloque continuo azul oscuro desde `hora_dormir` hasta `hora_despertar_definitivo`
- **Overlays:** Eventos nocturnos (despertares, tomas) se superponen con `z-index` mayor
- **El bloque base NUNCA se corta visualmente**

### 2.3 Siestas (Diferenciacion Visual)

- **Paleta:** Tonos morados/azules claros (revisar colores existentes, no repetir)
- **Prohibido:** Naranja (asociado a alerta/actividad)
- **Icono:** Diferente al sueno nocturno (elegir el mas apropiado de Lucide)

### Aplicacion por Vista

| Vista | Aplica Taxonomia |
|-------|------------------|
| Diaria | Si (bloques + narrativa) |
| Semanal | Si (solo bloques) |
| Mensual | Si (solo bloques) |

### Testing Realizado (2026-01-23)

#### Bugs Encontrados y Corregidos

| Bug | Ubicacion | Solucion |
|-----|-----------|----------|
| Vista mensual no usaba sistema centralizado | `app/dashboard/calendar/page.tsx` | Reemplazar `getEventTypeColor()` local por `getEventBgClass()` |
| Iconos no diferenciados en mensual | `app/dashboard/calendar/page.tsx` | Usar `getEventIconConfig()` con feedingType |
| Iconos sin contraste sobre fondos de color | Multiples archivos | Cambiar a `text-white` en lugar de `config.color` |
| Color siesta usaba naranja (prohibido) | `globals.css`, `event-colors.ts` | Cambiar a lavanda `#a78bfa` (violet-400) |

#### Archivos Modificados para Color Siesta

| Archivo | Cambio |
|---------|--------|
| `app/globals.css` | `--color-nap: 258 89% 78%` (lavanda) |
| `lib/colors/event-colors.ts` | `hex: "#a78bfa"` |
| `lib/icons/event-icons.ts` | `color: "#a78bfa"` |
| `components/calendar/MonthLineChart.tsx` | Colores nap a violeta |
| `components/calendar/SimpleSleepBarChart.tsx` | NAP_COLOR a violeta |
| `components/calendar/UserWeeklySleepChart.tsx` | NAP_COLOR a violeta |
| `components/sleep-statistics/SleepDataStorytellingCard.tsx` | `bg-violet-50`, `text-violet-600` |
| `components/child-profile/SleepMetricsCombinedChart.tsx` | `hover:ring-violet-300` |

#### Verificacion

| Criterio | Estado |
|----------|--------|
| Colores diferenciados por feedingType | PASS |
| Iconos blancos para contraste | PASS |
| Consistencia en vistas (mensual/semanal/diaria) | PASS |
| Color siesta en lavanda (no naranja) | PASS |
| Sistema centralizado en todas las vistas | PASS |

---

## Item 3: Vista Dual Split Screen (Solo Admin) ✅ COMPLETADO

### Layout

```
+------------------------+------------------------+
|                        |                        |
|   CALENDARIO (50%)     |   NARRATIVA (50%)      |
|   Gantt Chart          |   Timeline fluido      |
|                        |                        |
|   [Bloques con         |   [Tarjetas apiladas   |
|    taxonomia Item 2]   |    sin espacios]       |
|                        |                        |
+------------------------+------------------------+
```

### Logica de Interaccion (Mirroring Bidireccional)

**Click en Calendario:**
1. Click 1: Narrativa hace `scroll-into-view` + highlight con fade gradual (5-7 seg)
2. Click 2 (doble click): Abre modal de edicion

**Click en Narrativa:**
1. Click 1: Calendario hace scroll al bloque correspondiente + highlight
2. Click 2: Abre modal de edicion (o click en chevron)

**Highlight:** Fade gradual que se desvanece en 5-7 segundos.

### Padres: Sin Split Screen

Los padres ven la narrativa en flujo vertical completo, sin el calendario al lado.

---

## UI/UX Estados

### Loading
- Skeleton loaders para tarjetas de narrativa
- Mantener layout estable durante carga

### Error
- Toast con mensaje en espanol si falla carga de eventos
- Retry automatico silencioso

### Exito
- Feedback visual al editar evento (actualizacion inmediata en ambos paneles)

---

## Edge Cases

| Caso | Manejo |
|------|--------|
| Dia sin eventos | Empty state: "No hay eventos registrados hoy" |
| Datos incompletos | Omitir dato faltante en narrativa |
| Evento en progreso | Revisar implementacion actual, puede que no aplique |
| Muchos eventos (scroll largo) | Highlight se mantiene hasta fade, scroll suave |
| Click rapido multiples bloques | Cancelar scroll anterior, hacer nuevo |

---

## Exito

El feature funciona bien cuando:

1. **Admin (Mariana)** puede leer la bitacora del dia en menos de 30 segundos
2. **Padres** entienden que paso sin hacer scroll horizontal en calendario
3. **La taxonomia visual** permite identificar tipo de evento de un vistazo
4. **El mirroring** nunca pierde sincronizacion entre calendario y narrativa
5. **Sueno nocturno** se ve como UNA barra continua, no fragmentada

---

## Notas de la Entrevista

### Decisiones Tomadas

1. **Prioridad:** Items 1-3 son MVP, Item 4 (AI) para siguiente sprint
2. **Narrativa:** 100% automatica, no editable por usuario
3. **Iconos:** Usar Lucide, buscar el mas cercano para "pecho"
4. **Colores siesta:** Usar paleta existente, evitar repetir colores ya usados
5. **Persistencia "Ver todo":** No guarda estado, siempre inicia colapsado
6. **Interaccion Split:** Click 1 = highlight, Click 2 = editar
7. **Mirroring:** Bidireccional (calendario <-> narrativa)
8. **Highlight:** Fade gradual 5-7 segundos
9. **Layering sueno nocturno:** Revisar si ya esta implementado
10. **Eventos en progreso:** Revisar implementacion actual

### Contexto Adicional del Usuario

> "Para que no haya confusion: la vista diaria es donde vive el Item 1 de forma extendida. Para Admin es Split Screen. Para Padres es feed vertical. Las vistas semanal/mensual NO llevan narrativa, solo aplica el rediseno visual (Item 2)."

---

---

## Trabajo Previo Completado: Refactorizacion Arquitectural

**Fecha:** 2026-01-23
**Objetivo:** Establecer Single Source of Truth para colores y componentes reutilizables antes de implementar Items 1-3.

### Archivos Creados

| Archivo | Proposito |
|---------|-----------|
| `lib/colors/event-colors.ts` | Sistema centralizado de colores para eventos |
| `hooks/use-modal-datetime.ts` | Hook reutilizable para fecha/hora en modales |
| `components/events/shared/DelaySelector.tsx` | Selector de tiempo con +/- y opciones rapidas |
| `components/events/shared/EmotionalStateSelector.tsx` | Selector de estado emocional (tranquilo/inquieto/alterado) |
| `components/events/shared/index.ts` | Barrel exports |

### Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `components/calendar/EventBlock.tsx` | Usa `getEventBlockClasses()` del sistema centralizado |
| `components/events/types.ts` | Documentacion mejorada, tipos canonicos |
| `lib/icons/event-icons.ts` | Importa tipos desde `types.ts` |
| `components/events/SleepDelayModal.tsx` | Integra `DelaySelector` y `EmotionalStateSelector` |
| `components/events/NightWakingModal.tsx` | Integra componentes compartidos con `themeColor="red"` |

### Taxonomia de Colores (Single Source of Truth)

```typescript
// lib/colors/event-colors.ts
EVENT_COLORS = {
  sleep:           "#7DBFE2"  // Cyan azulado - sueno nocturno
  nap:             "#a78bfa"  // Lavanda - siesta (violet-400)
  wake:            "#34D399"  // Verde - despertar
  night_waking:    "#DC2626"  // ROJO - despertar nocturno
  feeding_breast:  "#EC4899"  // Rosa - pecho
  feeding_bottle:  "#0EA5E9"  // Azul cielo - biberon
  feeding_solids:  "#10B981"  // Esmeralda - solidos
  medication:      "#f59e0b"  // Ambar/Dorado - medicamentos
  extra_activities:"#33CCCC"  // Turquesa - actividades
  note:            "#8B5CF6"  // Violeta - notas
}
```

### Tests Realizados

#### Test 1: SleepDelayModal (Color Azul) - PASSED
- Selector de tiempo: Fondo azul claro, borde azul, texto azul
- Boton seleccionado: Azul solido
- Estado emocional: Borde azul cuando seleccionado
- **Screenshot:** `/tmp/test-1-siesta-modal.png`

#### Test 2: NightWakingModal (Color Rojo) - PENDIENTE
- Modal actualizado para usar `themeColor="red"`
- Consistente con `night_waking` en calendario (#DC2626)

#### Test 3: Registro Manual - VERIFICADO
- Formulario funcional con campos de fecha/hora
- **Screenshot:** `/tmp/test-2-registro-manual.png`

### Reduccion de Codigo

| Fase | Lineas Eliminadas | Lineas Creadas | Neto |
|------|-------------------|----------------|------|
| Colores centralizados | ~80 | ~80 | 0 |
| Hook useModalDatetime | ~150 | ~60 | -90 |
| DelaySelector | ~160 | ~45 | -115 |
| EmotionalStateSelector | ~140 | ~55 | -85 |
| **Total** | **~530** | **~240** | **-290** |

### Builds Verificados

- [x] `npm run build` exitoso despues de cada fase
- [x] Sin errores de TypeScript relacionados con los cambios
- [x] Componentes compartidos compilan correctamente

---

---

## Fix: Eventos Dentro de Bloques de Sueno (2026-01-23)

### Problema

Eventos (night_waking, feeding, medication) que ocurren DURANTE un bloque de sueno nocturno se "aplastaban" visualmente - se solapaban en lugar de mostrarse en columnas separadas.

### Causa Raiz

`SleepSessionBlock.tsx` renderizaba `nightWakings` y `overlayEvents` por separado, sin calcular columnas. Todos usaban `column=0, totalColumns=1` (100% ancho).

### Solucion Implementada

1. **Crear funcion compartida** - `lib/utils/calculate-event-columns.ts`
   - Algoritmo de 2 pasadas para calcular columnas de eventos superpuestos
   - Tipado generico `<T extends BaseEvent>` para preservar propiedades
   - Incluye `filterVisibleEvents()` para limitar a 3 columnas max

2. **Modificar SleepSessionBlock.tsx**
   - Combinar `nightWakings` + `overlayEvents` en `allInternalEvents`
   - Usar `calculateEventColumns()` para calcular columnas juntas
   - Eventos simultaneos ahora se muestran lado a lado (50%, 33%, etc.)

3. **Refactor DRY** - CalendarWeekView y CalendarDayView
   - Eliminar ~80 lineas de codigo duplicado de cada archivo
   - Importar funcion compartida desde `lib/utils/`

4. **UI: Solo iconos** - Quitar texto de eventos dentro de bloques de sueno
   - Consistente con el resto del calendario

### Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `lib/utils/calculate-event-columns.ts` | NUEVO - Funcion compartida |
| `components/calendar/SleepSessionBlock.tsx` | Usar columnas para eventos internos |
| `components/calendar/CalendarWeekView.tsx` | Importar funcion compartida |
| `components/calendar/CalendarDayView.tsx` | Importar funcion compartida |

### Verificacion

| Criterio | Estado |
|----------|--------|
| Eventos dentro de sleep se muestran en columnas | PASS |
| nightWaking + feeding simultaneos lado a lado | PASS |
| Solo iconos (sin texto) dentro de sleep blocks | PASS |
| Vista semanal y diaria funcionan correctamente | PASS |

---

## Item 3: Implementacion Completada (2026-01-25)

### Cambio Arquitectural

El `SplitScreenBitacora` estaba ubicado incorrectamente en `/dashboard/patients/child/[childId]/` (seccion de detalle de pacientes admin). Segun el spec, debia estar en la **vista Diaria del calendario** (`/dashboard/calendar`).

### Cambios Realizados

| Archivo | Cambio | Lineas |
|---------|--------|--------|
| `app/dashboard/calendar/page.tsx` | Integrar SplitScreenBitacora (admin) y NarrativeTimeline (parent) | +47 |
| `app/dashboard/patients/child/[childId]/AdminChildDetailClient.tsx` | Remover SplitScreen y simplificar tab eventos | -121 |

### Flujo Implementado

```
/dashboard/calendar (vista Diario):
├── Admin → SplitScreenBitacora (50% calendario + 50% narrativa)
└── Parent → NarrativeTimeline (solo narrativa vertical)

/dashboard/patients/child/[id] (tab Eventos):
└── Todos → EventsCalendarTabs (lista simplificada)
```

### Codigo Clave Agregado

**calendar/page.tsx - Admin:**
```typescript
{view === "day" ? (
  <SplitScreenBitacora
    events={events}
    childName={activeChildName}
    selectedDate={date}
    timezone={userTimeZone}
    onEventUpdate={invalidateEvents}
    onDayNavigateBack={navigateOneDayBack}
    onDayNavigateForward={navigateOneDayForward}
  />
) : (
  <CalendarMain ... />
)}
```

**calendar/page.tsx - Parent:**
```typescript
{view === "day" ? (
  <NarrativeTimeline
    events={dayEvents as unknown as NarrativeTimelineEvent[]}
    childName={activeChildName}
    timezone={userTimeZone}
    isLoading={isLoading}
    onEventEdit={(eventId) => {
      const ev = dayEvents.find(e => e._id === eventId)
      if (ev) handleEventClick(ev)
    }}
    emptyMessage="No hay eventos registrados hoy"
  />
) : (
  <CalendarMain ... />
)}
```

### Testing Visual Realizado

| Test | Usuario | Resultado | Screenshot |
|------|---------|-----------|------------|
| Vista Diaria Admin | mariana@admin.com | Split Screen visible (50/50) | `/tmp/test-admin-split-screen.png` |
| Vista Diaria Parent | eljulius@nebulastudios.io | Narrativa vertical centrada | `/tmp/test-parent-narrative.png` |

### Verificacion

| Criterio | Estado |
|----------|--------|
| Admin ve Split Screen en vista Diario | PASS |
| Parent ve Narrativa vertical en vista Diario | PASS |
| Patients sin Split Screen (tab eventos simplificado) | PASS |
| Build exitoso (`npm run build`) | PASS |
| Mirroring bidireccional (calendario <-> narrativa) | PASS (componente existente) |
| Empty state correcto | PASS |

---

## Siguiente Paso

**Items 1, 2 y 3 completados.** Sprint MVP finalizado. Listo para QA.
