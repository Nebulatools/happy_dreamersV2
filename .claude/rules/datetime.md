# Reglas de Fechas y Timezones

## BUG CRITICO: Interpretacion UTC

JavaScript interpreta ciertos formatos de fecha como UTC, NO como hora local:

```typescript
// BUG: Estos formatos interpretan como UTC medianoche
new Date("2026-01-07")           // UTC 00:00 → En Mexico es 2026-01-06 18:00
new Date("2026-01-07T19:30")     // UTC 19:30 → INCORRECTO
new Date(`${fecha}T${hora}`)     // Mismo problema
```

## SOLUCION OBLIGATORIA

SIEMPRE usar `buildLocalDate()` de `/lib/datetime.ts`:

```typescript
import { buildLocalDate, dateToTimestamp } from "@/lib/datetime"

// CORRECTO: Construye fecha en timezone local
const dateObj = buildLocalDate(eventDate, eventTime)
const timestamp = dateToTimestamp(dateObj, timezone)
```

## Patron para Modales de Edicion

```typescript
// 1. Construir fecha local desde inputs
const dateObj = buildLocalDate(eventDate, eventTime)

// 2. Convertir a timestamp con timezone
const editOptions: EditOptions = {
  startTime: dateToTimestamp(dateObj, userData?.timezone)
}

// 3. Pasar editOptions al callback
await onConfirm(data, editOptions)
```

## Archivos que Manejan Fechas (Verificar siempre)

- `components/events/*Modal.tsx`
- `components/events/manual/ManualEventForm.tsx`
- `app/api/children/events/route.ts`

## Imports Requeridos

```typescript
import { buildLocalDate, dateToTimestamp, DEFAULT_TIMEZONE } from "@/lib/datetime"
import { useUser } from "@/context/UserContext"

const { userData } = useUser()
const timezone = userData?.timezone || DEFAULT_TIMEZONE
```
