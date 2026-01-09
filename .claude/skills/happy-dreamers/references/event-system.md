# Event System - Happy Dreamers

## Arquitectura de Datos

### Coleccion Principal: `events`
Es la **fuente unica de verdad** para todos los eventos del bebe.

```typescript
interface Event {
  _id: ObjectId
  childId: ObjectId
  parentId: ObjectId
  createdBy: ObjectId
  eventType: EventType
  startTime: string        // ISO con offset
  endTime?: string
  duration?: number        // Calculado automaticamente
  // ... campos especificos por tipo
}
```

### Coleccion Derivada: `analytics`
Sincronizada async desde events. NO modificar directamente.

## Tipos de Evento Validos

| Tipo | Descripcion | Campos Clave |
|------|-------------|--------------|
| `sleep` | Sueno nocturno | sleepDelay, emotionalState |
| `nap` | Siesta | sleepDelay, emotionalState |
| `wake` | Despertar manana | - |
| `night_waking` | Despertar nocturno | awakeDelay, emotionalState |
| `feeding` | Alimentacion | feedingType, feedingAmount, isNightFeeding |
| `medication` | Medicamentos | medicationName, medicationDose |
| `extra_activities` | Actividades extra | activityDescription |

## REGLA CRITICA: No Duplicar Tipos

### El Bug de Duplicacion

Crear eventTypes separados para variantes causa:
- Datos inconsistentes
- Errores de null references
- Duplicados en BD

### INCORRECTO
```typescript
// NO HACER: Crear eventos duplicados
await createEvent({ eventType: "feeding", ... })
if (isBabySleeping) {
  await createEvent({ eventType: "night_feeding", ... })  // DUPLICADO!
}
```

### CORRECTO: Usar Flags
```typescript
await createEvent({
  eventType: "feeding",
  isNightFeeding: isBabySleeping && isLiquid,
  feedingContext: sleepState === "sleeping" ? "during_sleep" : "awake",
  ...feedingData
})
```

## Legacy: night_feeding

El tipo `night_feeding` existe en datos historicos. Detectarlo asi:

```typescript
const isNightFeedingEvent = (event) =>
  event.eventType === "night_feeding" ||  // Legacy
  (event.eventType === "feeding" && event.isNightFeeding === true)
```

## Validacion de Campos por Tipo

### feeding
- `feedingType` (breast | bottle | solids) - REQUERIDO
- `babyState` (awake | asleep) - REQUERIDO
- Si `bottle`: feedingAmount (ml), feedingDuration (min)
- Si `solids`: feedingAmount (gr), feedingDuration (min)
- Si `breast`: feedingDuration (min)

### medication
- `medicationName` - REQUERIDO (min 1 char)
- `medicationDose` - REQUERIDO (min 1 char)

### extra_activities
- `activityDescription` - REQUERIDO (min 3 chars)
- `activityDuration` - 5-180 minutos

### sleep / nap
- `sleepDelay` - 0-180 minutos
- `emotionalState` - tranquilo | inquieto | alterado

### night_waking
- `awakeDelay` - 0-180 minutos
- `emotionalState` - tranquilo | inquieto | alterado

## Interface EditOptions

Para pasar timestamps editados desde modales:

```typescript
interface EditOptions {
  startTime?: string   // ISO timestamp con offset
  endTime?: string     // ISO timestamp con offset (opcional)
}
```

Uso en modal:

```typescript
const handleConfirm = async () => {
  const data = { /* campos */ }

  let editOptions: EditOptions | undefined
  if (mode === "edit" && eventDate && eventTime) {
    const dateObj = buildLocalDate(eventDate, eventTime)
    editOptions = {
      startTime: dateToTimestamp(dateObj, timezone)
    }
  }

  await onConfirm(data, editOptions)
}
```

## API de Eventos

### Endpoint: `/api/children/events`

#### POST - Crear evento
```typescript
const response = await fetch('/api/children/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    childId,
    eventType,
    startTime,
    // ... campos especificos
  })
})
```

#### PUT - Editar evento
```typescript
const response = await fetch('/api/children/events', {
  method: 'PUT',
  body: JSON.stringify({
    id: event._id,
    childId: event.childId,
    eventType: event.eventType,
    ...data,
    ...(editOptions?.startTime && { startTime: editOptions.startTime })
  })
})
```

#### DELETE - Eliminar evento
```typescript
const response = await fetch(`/api/children/events?eventId=${id}`, {
  method: 'DELETE'
})
```
