# DateTime Patterns - Happy Dreamers

## El Bug UTC Critico

### Manifestacion
Al editar eventos y cambiar solo la hora, la fecha se movia un dia hacia atras.

### Causa Raiz
JavaScript interpreta formatos de fecha sin hora como UTC medianoche:

```typescript
// PROBLEMA: Estos interpretan como UTC
new Date("2026-01-07")           // UTC 00:00 → Mexico 2026-01-06 18:00
new Date("2026-01-07T19:30")     // UTC 19:30 → INCORRECTO
new Date(`${fecha}T${hora}`)     // Mismo problema
```

### Solucion: buildLocalDate()

Ubicacion: `/lib/datetime.ts`

```typescript
/**
 * Construye fecha en timezone local desde inputs de formulario.
 * USAR SIEMPRE en lugar de new Date() con strings.
 */
export function buildLocalDate(dateString: string, timeString: string): Date {
  const [year, month, day] = dateString.split("-")
  const [hours, minutes] = timeString.split(":")
  return new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hours),
    parseInt(minutes),
    0, 0
  )
}
```

## Funciones de datetime.ts

### buildLocalDate(dateString, timeString)
- **Uso**: Combinar fecha y hora de inputs de formulario
- **Input**: "2026-01-07", "19:30"
- **Output**: Date object en timezone local

### dateToTimestamp(date, timezone)
- **Uso**: Convertir Date a string ISO con offset
- **Input**: Date object, "America/Mexico_City"
- **Output**: "2026-01-07T19:30:00-06:00"

### parseTimestamp(isoString)
- **Uso**: Parsear timestamp ISO a Date
- **Input**: "2026-01-07T19:30:00-06:00"
- **Output**: Date object

### getCurrentTime()
- **Uso**: Obtener hora actual del sistema
- **Output**: Date object

## Patron de Edicion de Timestamps

```typescript
// En cualquier modal con modo edit
const handleConfirm = async () => {
  const data = { /* campos del modal */ }

  let editOptions: EditOptions | undefined
  if (mode === "edit" && eventDate && eventTime) {
    const dateObj = buildLocalDate(eventDate, eventTime)
    editOptions = {
      startTime: dateToTimestamp(dateObj, userData?.timezone)
    }
  }

  await onConfirm(data, editOptions)
}
```

## Archivos que Manejan Fechas

Verificar SIEMPRE estos archivos cuando se trabaje con fechas:

| Archivo | Estado |
|---------|--------|
| `FeedingModal.tsx` | ✅ Usa buildLocalDate |
| `ExtraActivityModal.tsx` | ✅ Usa buildLocalDate |
| `NightWakingModal.tsx` | ✅ Usa buildLocalDate |
| `SleepDelayModal.tsx` | ⚠️ Verificar |
| `ManualEventModal.tsx` | ⚠️ Verificar |
| `ManualEventForm.tsx` | ⚠️ Verificar |

## Checklist Pre-Implementacion

Antes de tocar codigo de fechas:

- [ ] Estoy usando `buildLocalDate()` para date+time?
- [ ] Estoy usando `dateToTimestamp()` para guardar?
- [ ] El timezone viene de `userData?.timezone`?
- [ ] No estoy usando `new Date()` con strings?
