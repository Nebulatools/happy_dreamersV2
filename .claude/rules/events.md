# Reglas del Sistema de Eventos

## NO Duplicar Tipos de Evento

### Bug Conocido: Eventos duplicados

Crear un eventType separado para variantes causa:
- Datos inconsistentes (editar uno no actualiza el otro)
- Errores de null references al editar
- Duplicados en la base de datos

### INCORRECTO

```typescript
// NO HACER: Crear 2 eventos para una alimentacion nocturna
await createEvent({ eventType: "feeding", ... })
if (isBabySleeping) {
  await createEvent({ eventType: "night_feeding", ... })  // DUPLICADO
}
```

### CORRECTO: Usar Flags Booleanos

```typescript
await createEvent({
  eventType: "feeding",
  isNightFeeding: isBabySleeping && isLiquid,
  feedingContext: sleepState === "sleeping" ? "during_sleep" : "awake",
  ...feedingData
})
```

## Tipos de Evento Validos

| Tipo | Descripcion | Campos Clave |
|------|-------------|--------------|
| `sleep` | Sueno nocturno | sleepDelay, emotionalState |
| `nap` | Siesta | sleepDelay, emotionalState |
| `wake` | Despertar manana | - |
| `night_waking` | Despertar nocturno | awakeDelay, emotionalState |
| `feeding` | Alimentacion (con flag `isNightFeeding`) | feedingType, feedingAmount |
| `medication` | Medicamentos | medicationName, medicationDose |
| `extra_activities` | Actividades extra | activityDescription |

## Legacy: night_feeding

`night_feeding` todavia existe en datos historicos. La UI lo detecta asi:

```typescript
const isNightFeedingEvent = (event) =>
  event.eventType === "night_feeding" ||  // Legacy
  (event.eventType === "feeding" && event.isNightFeeding === true)
```

## Validacion de Campos Requeridos

### feeding
- `feedingType` (breast | bottle | solids) - REQUERIDO
- `babyState` (awake | asleep) - REQUERIDO
- Si `bottle`: feedingAmount (ml) y feedingDuration (min) REQUERIDOS
- Si `solids`: feedingAmount (gr) y feedingDuration (min) REQUERIDOS
- Si `breast`: feedingDuration (min) REQUERIDO

### medication
- `medicationName` - REQUERIDO (min 1 caracter)
- `medicationDose` - REQUERIDO (min 1 caracter)

### extra_activities
- `activityDescription` - REQUERIDO (min 3 caracteres)
- `activityDuration` - Entre 5 y 180 minutos

### sleep/nap
- `sleepDelay` - Entre 0 y 180 minutos
- `emotionalState` - tranquilo | inquieto | alterado

### night_waking
- `awakeDelay` - Entre 0 y 180 minutos
- `emotionalState` - tranquilo | inquieto | alterado

## Patron EditOptions para Edicion

```typescript
interface EditOptions {
  startTime?: string   // ISO timestamp con offset
  endTime?: string     // ISO timestamp con offset (opcional)
}

const handleConfirm = async () => {
  const data = { /* campos del modal */ }

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
