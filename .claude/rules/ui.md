# Reglas de UI y Componentes

## CSS: Evitar Clases Conflictivas

### Bug Conocido: relative vs absolute

Tailwind compila clases en orden no garantizado. Clases conflictivas
causan comportamiento impredecible:

```tsx
// BUG: Estas clases son conflictivas
className="group relative absolute shadow-md..."
// Computed style puede ser "position: relative" → eventos desplazados
```

### Solucion

```tsx
// CORRECTO: Solo una clase de posicionamiento
className="group absolute shadow-md..."
```

## Iconos: Usar Lucide, NO Emojis

Usar iconos de Lucide React para consistencia con shadcn/ui:

```tsx
import { Moon, Sun, Utensils, Pill, Activity, Baby } from "lucide-react"

// CORRECTO
<Moon className="h-4 w-4 text-indigo-500" />

// INCORRECTO - No usar emojis
```

### Mapa de Iconos por Tipo de Evento

| Tipo | Icono | Color |
|------|-------|-------|
| sleep | Moon | indigo-500 |
| nap | CloudMoon | violet-400 |
| wake | Sun | yellow-500 |
| night_waking | Baby | purple-500 |
| feeding (liquids) | Utensils | green-500 |
| feeding (solids) | UtensilsCrossed | green-500 |
| medication | Pill | amber-500 |
| extra_activities | Activity | orange-500 |

### Contraste de Iconos

Para iconos sobre fondos de color, usar doble drop-shadow negro:

```tsx
className="h-4 w-4 [filter:drop-shadow(0_0_1px_black)_drop-shadow(0_0_1px_black)]"
```

## SleepSessions: Siempre 100% Ancho

Los eventos de `sleep` y `nap` con duracion son "sesiones" que deben
ocupar 100% del ancho, NO participar en el sistema de columnas:

```tsx
// Las sesiones se renderizan APARTE, siempre 100% ancho
{sessions.map(session => (
  <SleepSessionBlock
    column={0}
    totalColumns={1}  // Fuerza 100% ancho
  />
))}

// Otros eventos SI participan en columnas
const eventsWithColumns = calculateEventColumns(otherEvents)
```

## GlobalActivityMonitor: Solo night_waking

Solo debe alertar sobre `night_waking` pendientes.
NO alertar sobre `sleep` o `nap` - es normal que duren horas.

```typescript
// Solo verificar localStorage para night_waking
const nightWakeKey = `pending_night_wake_${childId}`
const storedNightWake = localStorage.getItem(nightWakeKey)
```
