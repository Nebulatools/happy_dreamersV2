# Reporte de Feedback QA para Desarrollo

**Fecha de Generacion:** 2026-01-12
**Release Evaluado:** Commits 9b787c2, 6184b1e (2026-01-09)
**Tester:** QA Team
**Analista:** Claude AI

---

## Resumen Ejecutivo

Se identificaron **6 tickets** de ajuste derivados de las pruebas de QA sobre la release de estandarizacion de `endTime`. Los issues estan categorizados por prioridad y componente afectado.

| Prioridad | Cantidad | Descripcion |
|-----------|----------|-------------|
| Alta | 1 | UX critico - campos parecen bloqueados |
| Media | 3 | Mejoras de UX y clarificacion |
| Baja | 2 | Ajustes visuales y de texto |

---

## TICKET #1: Columnas de tabla ocultas en vista mobile

**Prioridad:** Media
**Componente:** `app/dashboard/children/[id]/events/page.tsx`
**Tipo:** UI/UX - Responsive Design

### Descripcion del Issue

El tester reporta que las columnas adicionales agregadas en la tabla de eventos ("Mis Eventos") solo son visibles en vista desktop. En dispositivos moviles, las columnas de **Duracion**, **Estado** y **Notas** no aparecen.

### Analisis Tecnico

Las columnas utilizan clases de Tailwind para ocultar en breakpoints menores:

```tsx
// Linea 531 - Duracion
<th className="... hidden sm:table-cell">Duracion</th>

// Linea 533 - Estado
<th className="... hidden md:table-cell">Estado</th>

// Linea 534 - Notas
<th className="... hidden lg:table-cell">Notas</th>
```

**Comportamiento actual:**
- `sm:` (640px+): Muestra Duracion
- `md:` (768px+): Muestra Estado
- `lg:` (1024px+): Muestra Notas

### Opciones de Solucion

1. **Opcion A (Recomendada):** Mantener el comportamiento responsive actual pero agregar un **indicador visual** en mobile que muestre "Ver mas detalles" al hacer clic en la fila, ya que actualmente el clic abre el modal de detalles donde se ve toda la informacion.

2. **Opcion B:** Mostrar al menos la columna **Duracion** en todos los breakpoints (es la mas relevante para el usuario).

3. **Opcion C:** Crear una vista alternativa tipo "card" para mobile que muestre toda la informacion en formato vertical.

### Archivos a Modificar

- `app/dashboard/children/[id]/events/page.tsx` (lineas 531-534, 587-616)

### Criterios de Aceptacion

- [ ] En mobile, el usuario puede ver la duracion del evento sin necesidad de abrir el modal
- [ ] O bien, existe un indicador visual claro de que puede hacer clic para ver mas detalles

---

## TICKET #2: Modal de registro manual no muestra campos de fecha/hora de termino

**Prioridad:** Media
**Componente:** `components/events/ManualEventModal.tsx`
**Tipo:** Feature Request - UX

### Descripcion del Issue

En el modal de registro manual de eventos, no se muestra la captura de fecha y hora de termino del evento. El tester indica que solo en el caso de **Siesta** aparece un checkbox opcional para agregar hora de fin.

### Analisis Tecnico

El modal evalua si mostrar campos de hora fin basandose en la configuracion del tipo de evento:

```tsx
// Linea 193-194
const currentEventType = getEventType(eventType)
const hasEndTime = currentEventType?.hasEndTime ?? false
```

Para eventos como `feeding`, `extra_activities`, `medication`, la propiedad `hasEndTime` esta en `false` porque el sistema calcula automaticamente el `endTime` basado en la duracion (lineas 244-255):

```tsx
// Para feeding: endTime = startTime + feedingDuration
// Para extra_activities: endTime = startTime + activityDuration
// Para night_waking: endTime = startTime + awakeDelay
```

### Comportamiento Actual vs Esperado

| Tipo de Evento | Muestra hora fin | Comportamiento |
|----------------|------------------|----------------|
| sleep | Si (obligatorio) | Correcto |
| nap | Si (checkbox opcional) | Correcto |
| feeding | No | Calculo automatico |
| extra_activities | No | Calculo automatico |
| medication | No | Sin duracion |
| night_waking | No | Calculo automatico |

### Opciones de Solucion

1. **Opcion A:** Mantener el calculo automatico pero mostrar un **preview** de la hora de fin calculada (solo lectura) para que el usuario vea que hora quedara registrada.

2. **Opcion B:** Agregar un checkbox "Especificar hora de fin manualmente" que permita al usuario sobreescribir el calculo automatico.

3. **Opcion C (Recomendada):** Agregar un texto informativo debajo de los campos de duracion indicando: "La hora de fin se calculara automaticamente: [hora calculada]"

### Archivos a Modificar

- `components/events/ManualEventModal.tsx` (lineas 480-522)
- Opcionalmente `lib/event-types.ts` para configurar comportamiento

### Criterios de Aceptacion

- [ ] El usuario puede ver cual sera la hora de fin del evento antes de guardar
- [ ] El comportamiento es consistente entre todos los tipos de evento

---

## TICKET #3: Cambio de texto "Hora de dormir" a "Hora de acostarse"

**Prioridad:** Baja
**Componente:** `components/events/SleepDelayModal.tsx`
**Tipo:** UI/UX - Texto/Copy

### Descripcion del Issue

El tester solicita cambiar el texto del modal de dormir/siesta. Actualmente dice "Hora de dormir" y deberia decir "Hora de acostarse" para ser mas preciso semanticamente.

### Analisis Tecnico

El texto actual se encuentra en la linea 227:

```tsx
<div className="text-sm font-medium text-gray-700">
  Hora de dormir
</div>
```

### Contexto Semantico

- **"Hora de dormir"** = Momento en que el nino se queda dormido (impreciso, depende de la latencia)
- **"Hora de acostarse"** = Momento en que se acuesta en la cama (mas preciso, es lo que se registra)

El campo captura el momento en que se inicia el proceso de dormir, no cuando efectivamente se duerme (eso se calcula con el `sleepDelay`).

### Solucion Propuesta

Cambiar el texto en la linea 227:

```tsx
// Antes
Hora de dormir

// Despues
Hora de acostarse
```

### Archivos a Modificar

- `components/events/SleepDelayModal.tsx` (linea 227)

### Criterios de Aceptacion

- [ ] El label muestra "Hora de acostarse" en lugar de "Hora de dormir"
- [ ] El cambio aplica tanto para sleep como para nap

---

## TICKET #4: Duracion default de 15 minutos en alimentacion por biberon

**Prioridad:** Baja
**Componente:** `components/events/FeedingModal.tsx`, `components/events/ManualEventModal.tsx`
**Tipo:** UX - Default Values

### Descripcion del Issue

El tester observa que la captura de alimentacion por biberon asume una duracion default de 15 minutos. Se requiere validar si este es el valor correcto o si deberia ser configurable.

### Analisis Tecnico

El valor default se encuentra en multiples ubicaciones:

```tsx
// FeedingModal.tsx - linea 60
const [feedingDuration, setFeedingDuration] = useState<number>(
  initialData?.feedingDuration || 15
)

// ManualEventModal.tsx - linea 177
const [feedingDuration, setFeedingDuration] = useState(15)

// FeedingButton.tsx - linea 69 (registro en vivo)
const durationToSend = feedingData.feedingDuration ||
  (feedingData.feedingType === "breast" ? feedingData.feedingAmount : 15)
```

### Consideraciones

- 15 minutos es un valor razonable para una toma de biberon promedio
- Para pecho, la duracion es variable (5-45 min)
- El usuario puede modificar el valor en el formulario

### Opciones de Solucion

1. **Opcion A:** Mantener 15 min como default (valor clinicamente razonable)

2. **Opcion B:** Hacer el default configurable por usuario en sus preferencias

3. **Opcion C:** Calcular dinamicamente basado en el historial del nino

### Recomendacion

Mantener el valor actual de 15 minutos ya que:
- Es clinicamente razonable
- El usuario puede modificarlo facilmente
- Evita complejidad innecesaria

Si el stakeholder confirma que debe cambiar, documentar el nuevo valor requerido.

### Archivos a Modificar (si aplica)

- `components/events/FeedingModal.tsx` (linea 60)
- `components/events/ManualEventModal.tsx` (linea 177)
- `components/events/FeedingButton.tsx` (linea 69)

### Criterios de Aceptacion

- [ ] Confirmar con stakeholder el valor default correcto
- [ ] Documentar la decision tomada

---

## TICKET #5: Clarificar semantica de hora en registro rapido de eventos

**Prioridad:** Media
**Componente:** Documentacion / UX
**Tipo:** UX - Clarificacion

### Descripcion del Issue

El tester solicita clarificar como se interpreta la hora capturada en un "evento rapido":
- Se toma como hora de inicio?
- Se toma como hora de fin?
- Deberia preguntarse al usuario cual es?

### Analisis Tecnico - Comportamiento Actual

**Registro en vivo (botones en dashboard):**
- La hora actual (`getCurrentTime()`) se toma como `startTime`
- El `endTime` se calcula automaticamente: `endTime = startTime + duracion`

**Registro manual (modal "+"):**
- El usuario selecciona fecha y hora de inicio
- El `endTime` se calcula automaticamente segun el tipo de evento

### Flujo Actual

```
[Usuario presiona boton "Alimentacion"]
     |
     v
[Hora actual = startTime]
     |
     v
[Usuario selecciona duracion (ej: 15 min)]
     |
     v
[Sistema calcula: endTime = startTime + 15 min]
     |
     v
[Evento guardado con startTime y endTime]
```

### Opciones de Solucion

1. **Opcion A (Recomendada):** Agregar **texto informativo** en el modal explicando: "La hora del evento sera: [hora actual] (inicio) - [hora calculada] (fin)"

2. **Opcion B:** Agregar un selector "Esta hora es: [Inicio] [Fin]" con radio buttons

3. **Opcion C:** Mantener el comportamiento actual (siempre es hora de inicio) y documentarlo claramente en el onboarding o tooltips

### Recomendacion

La convencion de usar la hora actual como `startTime` es la mas intuitiva y comun en apps de tracking. Se recomienda mantener el comportamiento actual y agregar un texto informativo o tooltip que lo aclare.

### Archivos a Modificar

- `components/events/FeedingModal.tsx` - agregar texto informativo
- `components/events/ExtraActivityModal.tsx` - agregar texto informativo
- `components/events/NightWakingModal.tsx` - agregar texto informativo

### Criterios de Aceptacion

- [ ] El usuario entiende que la hora capturada es la hora de inicio
- [ ] Se muestra claramente la hora de fin calculada antes de confirmar

---

## TICKET #6: Campos de fecha/hora en edicion aparecen en color gris (parecen bloqueados)

**Prioridad:** Alta
**Componente:** `components/events/FeedingModal.tsx` y otros modales de edicion
**Tipo:** UI/UX - Accesibilidad Visual

### Descripcion del Issue

El tester reporta que los campos de fecha y hora en el modo edicion de eventos aparecen en color gris, lo cual hace pensar que estan bloqueados y no se pueden editar. Los campos **SI son editables**, pero visualmente no lo parece.

### Analisis Tecnico

Los campos de input en `FeedingModal.tsx` (lineas 278-292) usan estilos estandar:

```tsx
<input
  type="date"
  value={eventDate}
  onChange={(e) => setEventDate(e.target.value)}
  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
/>
```

El problema puede deberse a:
1. El estilo default de los inputs `type="date"` y `type="time"` en algunos navegadores
2. Falta de contraste visual suficiente
3. El texto del input puede tener color gris por defecto del navegador

### Solucion Propuesta

Agregar estilos explicitos para asegurar que los campos se vean como editables:

```tsx
className="w-full px-3 py-2 border rounded-lg text-sm
  bg-white text-gray-900
  focus:outline-none focus:ring-2 focus:ring-green-500
  hover:border-gray-400"
```

### Archivos a Modificar

- `components/events/FeedingModal.tsx` (lineas 278-292)
- `components/events/ExtraActivityModal.tsx` (campos similares)
- `components/events/NightWakingModal.tsx` (campos similares)
- `components/events/SleepDelayModal.tsx` (lineas 234-253, 285-304)
- `components/events/ManualEventModal.tsx` (lineas 463-478)

### Criterios de Aceptacion

- [ ] Los campos de fecha/hora tienen fondo blanco explicito (`bg-white`)
- [ ] El texto de los campos es claramente legible (no gris)
- [ ] Al pasar el mouse sobre los campos, hay feedback visual (hover state)
- [ ] Los campos tienen el mismo estilo en todos los modales de edicion

### Ejemplo de Implementacion

```tsx
// Antes
<input
  type="date"
  value={eventDate}
  onChange={(e) => setEventDate(e.target.value)}
  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
/>

// Despues
<input
  type="date"
  value={eventDate}
  onChange={(e) => setEventDate(e.target.value)}
  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
    bg-white text-gray-900
    hover:border-gray-400
    focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
/>
```

---

## Resumen de Archivos Afectados

| Archivo | Tickets |
|---------|---------|
| `app/dashboard/children/[id]/events/page.tsx` | #1 |
| `components/events/ManualEventModal.tsx` | #2, #4, #6 |
| `components/events/SleepDelayModal.tsx` | #3, #6 |
| `components/events/FeedingModal.tsx` | #4, #6 |
| `components/events/FeedingButton.tsx` | #4 |
| `components/events/ExtraActivityModal.tsx` | #5, #6 |
| `components/events/NightWakingModal.tsx` | #5, #6 |

---

## Orden Recomendado de Implementacion

1. **TICKET #6** (Alta) - Arreglar estilos de campos para que no parezcan bloqueados
2. **TICKET #2** (Media) - Mostrar preview de hora de fin calculada
3. **TICKET #5** (Media) - Agregar texto clarificando semantica de hora
4. **TICKET #1** (Media) - Mejorar visibilidad de datos en mobile
5. **TICKET #3** (Baja) - Cambiar texto "Hora de dormir" -> "Hora de acostarse"
6. **TICKET #4** (Baja) - Confirmar/documentar duracion default

---

## Notas Adicionales

- Los tests A, B, C y D del QA_RELEASE_NOTES.md fueron validados como funcionando correctamente
- El fix de duraciones negativas esta funcionando segun lo esperado
- El fix de UTC en edicion esta funcionando correctamente
- Los issues reportados son principalmente de UX/UI, no de funcionalidad core

---

*Documento generado automaticamente basado en QA_FEEDBACK_NOTES.md y analisis de codigo*
