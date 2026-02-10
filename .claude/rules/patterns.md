# Patrones de Implementacion

## Patron Modal con Modo Edit

Todos los modales de eventos deben seguir este patron:

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

function Modal({ mode = "create", initialData, ... }: ModalProps) {
  // Estado local inicializado desde initialData
  const [field, setField] = useState(initialData?.field || defaultValue)

  // Fecha/hora para edicion
  const [eventDate, setEventDate] = useState(() => {
    if (mode === "edit" && initialData?.startTime) {
      return format(new Date(initialData.startTime), "yyyy-MM-dd")
    }
    return format(getCurrentTime(), "yyyy-MM-dd")
  })

  // Re-inicializar cuando cambia initialData
  useEffect(() => {
    if (open && mode === "edit" && initialData) {
      setField(initialData.field || defaultValue)
    }
  }, [open, mode, initialData])

  const handleConfirm = async () => {
    const data = { /* campos del modal */ }

    // Construir editOptions solo en modo edit
    let editOptions: EditOptions | undefined
    if (mode === "edit" && eventDate && eventTime) {
      const dateObj = buildLocalDate(eventDate, eventTime)
      editOptions = {
        startTime: dateToTimestamp(dateObj, timezone)
      }
    }

    await onConfirm(data, editOptions)
  }
}
```

## Patron EventEditRouter

El router centraliza la logica de edicion:

```typescript
function EventEditRouter({ event, open, onClose, onSaveComplete }) {
  const renderModal = () => {
    switch (event.eventType) {
      case "feeding":
      case "night_feeding":  // Legacy
        return (
          <FeedingModal
            mode="edit"
            initialData={extractFeedingData(event)}
            onConfirm={handleFeedingSave}
          />
        )
      case "medication":
        return <MedicationModal mode="edit" ... />
      // etc.
    }
  }

  const handleSave = async (data, editOptions) => {
    const payload = {
      id: event._id,
      childId: event.childId,
      eventType: event.eventType,
      ...data,
      ...(editOptions?.startTime && { startTime: editOptions.startTime }),
    }

    await fetch('/api/children/events', {
      method: 'PUT',
      body: JSON.stringify(payload)
    })

    onSaveComplete?.()
  }
}
```

## Patron de Validacion en API

```typescript
export async function POST(req: NextRequest) {
  // 1. Verificar sesion
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  // 2. Verificar acceso al nino
  const accessContext = await resolveChildAccess(
    db, session.user, childId, "canCreateEvents"
  )

  // 3. Validaciones especificas por tipo
  if (data.eventType === "feeding") {
    if (!data.feedingType) {
      return NextResponse.json({ error: "Tipo requerido" }, { status: 400 })
    }
  }

  // 4. Construir evento
  const event = { ... }

  // 5. Calcular duracion si aplica
  if (event.startTime && event.endTime) {
    event.duration = calculateSleepDuration(...)
  }

  // 6. Guardar en coleccion 'events' (fuente de verdad)
  await db.collection("events").insertOne(event)

  // 7. Sync async a analytics (no bloquear si falla)
  await syncEventToAnalyticsCollection(event)
}
```

## Patron Pagina Admin-Only (Server + Client Component)

### BUG CONOCIDO: useSession() retorna undefined en Vercel

`useSession()` de next-auth puede retornar `undefined` en paginas nuevas
desplegadas en Vercel con Next.js 15 + React 19 (problema de hidratacion/streaming).
Esto causa `TypeError: Cannot destructure property 'data'` y el ErrorBoundary
captura el crash mostrando "Ups! Algo salio mal".

**Detalle completo**: `.claude/docs/solutions/auth-bugs/useSession-undefined-crash.md`

### SOLUCION: Usar server component para auth

Para rutas que requieren verificacion de rol (admin-only, etc):

```typescript
// page.tsx — SERVER COMPONENT (sin "use client")
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import PageClient from "./PageClient"

export default async function Page() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/auth/login")
  if (session.user.role !== "admin") redirect("/dashboard")
  return <PageClient />
}
```

```typescript
// PageClient.tsx — CLIENT COMPONENT
"use client"
// Solo logica que necesita hooks: useActiveChild, useRouter, etc.
// NO usar useSession() para auth gating
```

### Cuando SI usar useSession()

- En componentes INTERIORES que ya estan protegidos por un server component padre
- Para obtener datos reactivos de sesion (nombre, email) en UI
- NUNCA para decidir si mostrar o bloquear una pagina completa

### Ejemplos de referencia

| Archivo | Patron |
|---------|--------|
| `app/dashboard/diagnosticos/page.tsx` | Server component + redirect |
| `app/dashboard/diagnosticos/DiagnosticosClient.tsx` | Client con useActiveChild |
| `app/dashboard/diagnosticos/[childId]/page.tsx` | Server component + getServerSession |

## Dia Logico para Planes

Los planes de sueno deben ordenarse por el ciclo del nino, no cronologicamente.
Eventos de madrugada (02:00 AM) pertenecen al "dia anterior" logico.

### Orden Correcto

1. Despertar (wakeTime)
2. Actividades diurnas (en orden cronologico)
3. Dormir (bedtime)
4. Eventos de madrugada (< 06:00)

### Donde Aplicar

- `PlanDisplay.tsx` - Funcion `sortByLogicalDay()`
- `EditablePlanDisplay.tsx` - Funcion `sortByLogicalDay()`
- **NO en calendario** - El calendario muestra eventos en su dia real
