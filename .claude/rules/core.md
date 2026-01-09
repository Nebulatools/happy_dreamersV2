# Reglas Core de Happy Dreamers

## Stack Tecnologico

- **Frontend**: Next.js 15, React 19, TypeScript 5
- **UI**: Tailwind CSS + shadcn/ui
- **Backend**: Next.js API Routes (serverless)
- **Database**: MongoDB 6.19
- **Auth**: NextAuth.js con JWT

## Idioma

- **Interfaz**: Espanol (todo texto visible al usuario)
- **Codigo/Variables**: Ingles
- **Comentarios**: Espanol

## Coleccion de Datos Principal

La coleccion `events` es la fuente unica de verdad.
La coleccion `analytics` es derivada (sincronizada async).

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

## Archivos Clave

| Archivo | Proposito |
|---------|-----------|
| `/lib/datetime.ts` | Manejo de fechas/timezone |
| `/components/events/types.ts` | Interfaces de eventos |
| `/components/events/EventEditRouter.tsx` | Router de edicion |
| `/app/api/children/events/route.ts` | CRUD de eventos |
| `/lib/event-sync.ts` | Sync con analytics |

## Imports Comunes

```typescript
// Fechas
import { buildLocalDate, dateToTimestamp, DEFAULT_TIMEZONE } from "@/lib/datetime"

// Contexto de usuario
import { useUser } from "@/context/UserContext"

// Tipos de eventos
import { EventType, EventData, EditOptions } from "@/components/events/types"

// Iconos
import { Moon, Sun, Baby, Utensils, UtensilsCrossed, Pill, Activity } from "lucide-react"
```

## Checklist Antes de Implementar

Antes de implementar features relacionadas con eventos:

- [ ] Usar `buildLocalDate()` para inputs de formulario?
- [ ] Usar `dateToTimestamp()` para guardar en BD?
- [ ] Modal soporta `mode="edit"` con `initialData`?
- [ ] Usar `EditOptions` para timestamps editados?
- [ ] Si es variante de evento, usar flag en lugar de nuevo tipo?
- [ ] Iconos de Lucide, no emojis?
- [ ] CSS sin conflictos de posicionamiento?
- [ ] Validacion en API cubre campos requeridos?

## Credenciales de Testing

| Rol | Email | Password |
|-----|-------|----------|
| Admin | mariana@admin.com | password |
| Usuario | eljulius@nebulastudios.io | juls0925 |
