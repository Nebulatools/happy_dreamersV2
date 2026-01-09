# Modal Patterns - Happy Dreamers

## Patron Modal con Modo Edit

Todos los modales de eventos deben seguir este patron.

### Interface Base

```typescript
interface ModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (data: ModalData, editOptions?: EditOptions) => void | Promise<void>
  childName: string
  mode?: "create" | "edit"
  initialData?: {
    // Campos del evento
    startTime?: string
    eventId?: string
  }
}
```

### Implementacion Completa

```typescript
function Modal({ mode = "create", initialData, open, onClose, onConfirm, childName }: ModalProps) {
  const { userData } = useUser()
  const timezone = userData?.timezone || DEFAULT_TIMEZONE

  // Estado local inicializado desde initialData
  const [field, setField] = useState(initialData?.field || defaultValue)

  // Fecha/hora para edicion
  const [eventDate, setEventDate] = useState(() => {
    if (mode === "edit" && initialData?.startTime) {
      return format(new Date(initialData.startTime), "yyyy-MM-dd")
    }
    return format(getCurrentTime(), "yyyy-MM-dd")
  })

  const [eventTime, setEventTime] = useState(() => {
    if (mode === "edit" && initialData?.startTime) {
      return format(new Date(initialData.startTime), "HH:mm")
    }
    return format(getCurrentTime(), "HH:mm")
  })

  // Re-inicializar cuando cambia initialData
  useEffect(() => {
    if (open && mode === "edit" && initialData) {
      setField(initialData.field || defaultValue)
      if (initialData.startTime) {
        const date = new Date(initialData.startTime)
        setEventDate(format(date, "yyyy-MM-dd"))
        setEventTime(format(date, "HH:mm"))
      }
    }
  }, [open, mode, initialData])

  const handleConfirm = async () => {
    const data = { /* campos del modal */ }

    // Construir editOptions SOLO en modo edit
    let editOptions: EditOptions | undefined
    if (mode === "edit" && eventDate && eventTime) {
      const dateObj = buildLocalDate(eventDate, eventTime)
      editOptions = {
        startTime: dateToTimestamp(dateObj, timezone)
      }
    }

    await onConfirm(data, editOptions)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      {/* ... contenido del modal ... */}

      {/* Mostrar campos de fecha/hora SOLO en modo edit */}
      {mode === "edit" && (
        <div className="space-y-4">
          <div>
            <Label>Fecha</Label>
            <Input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </div>
          <div>
            <Label>Hora</Label>
            <Input
              type="time"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
            />
          </div>
        </div>
      )}
    </Dialog>
  )
}
```

## EventEditRouter Pattern

El router centraliza la logica de edicion de todos los tipos de evento.

### Ubicacion
`/components/events/EventEditRouter.tsx`

### Implementacion

```typescript
interface EventEditRouterProps {
  event: EventData
  open: boolean
  onClose: () => void
  onSaveComplete?: () => void
}

function EventEditRouter({ event, open, onClose, onSaveComplete }: EventEditRouterProps) {
  const renderModal = () => {
    switch (event.eventType) {
      case "feeding":
      case "night_feeding":  // Legacy support
        return (
          <FeedingModal
            open={open}
            onClose={onClose}
            mode="edit"
            initialData={extractFeedingData(event)}
            onConfirm={handleFeedingSave}
            childName={event.childName}
          />
        )

      case "medication":
        return (
          <MedicationModal
            open={open}
            onClose={onClose}
            mode="edit"
            initialData={extractMedicationData(event)}
            onConfirm={handleMedicationSave}
            childName={event.childName}
          />
        )

      case "extra_activities":
        return (
          <ExtraActivityModal
            open={open}
            onClose={onClose}
            mode="edit"
            initialData={extractActivityData(event)}
            onConfirm={handleActivitySave}
            childName={event.childName}
          />
        )

      case "night_waking":
        return (
          <NightWakingModal
            open={open}
            onClose={onClose}
            mode="edit"
            initialData={extractNightWakingData(event)}
            onConfirm={handleNightWakingSave}
            childName={event.childName}
          />
        )

      default:
        return null
    }
  }

  const handleSave = async (data: any, editOptions?: EditOptions) => {
    const payload = {
      id: event._id,
      childId: event.childId,
      eventType: event.eventType,
      ...data,
      ...(editOptions?.startTime && { startTime: editOptions.startTime }),
    }

    await fetch('/api/children/events', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    onClose()
    onSaveComplete?.()
  }

  return renderModal()
}
```

## Extract Functions

Funciones para extraer datos de eventos hacia initialData de modales:

```typescript
function extractFeedingData(event: EventData) {
  return {
    eventId: event._id,
    startTime: event.startTime,
    feedingType: event.feedingType,
    feedingAmount: event.feedingAmount,
    feedingDuration: event.feedingDuration,
    babyState: event.babyState,
    isNightFeeding: event.isNightFeeding,
    notes: event.notes
  }
}

function extractActivityData(event: EventData) {
  return {
    eventId: event._id,
    startTime: event.startTime,
    activityDescription: event.activityDescription,
    activityDuration: event.activityDuration,
    notes: event.notes
  }
}
```

## UI Rules para Modales

### Iconos
Usar Lucide React, nunca emojis:
```typescript
import { Moon, Sun, Utensils, Pill, Activity } from "lucide-react"
```

### Contraste de Iconos
Para iconos sobre fondos de color:
```typescript
className="h-4 w-4 [filter:drop-shadow(0_0_1px_black)_drop-shadow(0_0_1px_black)]"
```

### CSS Positioning
NUNCA mezclar `relative` y `absolute` en el mismo className:
```typescript
// BUG: Conflicto de posicionamiento
className="group relative absolute shadow-md..."

// CORRECTO: Solo uno
className="group absolute shadow-md..."
```
