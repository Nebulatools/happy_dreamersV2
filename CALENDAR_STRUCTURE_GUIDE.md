# 📅 GUÍA COMPLETA: ESTRUCTURA DEL CALENDARIO HAPPY DREAMERS

**Versión**: 2.0 - Calendario rediseñado con vista semanal y diaria mejoradas

## 🎯 ESTRUCTURA GENERAL

### **3 Vistas Disponibles:**

1. **📊 Vista Mensual** - Gráfico de líneas con MonthLineChart
2. **📅 Vista Semanal** - Timeline con múltiples días 
3. **🔍 Vista Diaria** - Timeline detallado de un solo día

---

## 🔧 ARQUITECTURA DE COMPONENTES

### **Archivo Principal**
```
/app/dashboard/calendar/page.tsx
```

### **Configuración Base**
```javascript
// Configuración del calendario
const HOUR_HEIGHT = 30 // 30px por hora para vista más compacta (24 horas = 720px)
const HOURS = Array.from({ length: 24 }, (_, i) => i) // 0-23
```

### **Interface de Evento**
```typescript
interface Event {
  _id: string;
  childId: string;
  eventType: string;      // 'sleep', 'nap', 'wake', 'night_waking', etc.
  emotionalState: string;
  startTime: string;      // ISO string: "2025-01-20T09:00:00.000Z"
  endTime?: string;       // ISO string opcional
  notes?: string;
}
```

---

## ⚙️ SISTEMA DE EXTRACCIÓN DE TIEMPO

### **Función Central - extractTimeFromISO**
```javascript
function extractTimeFromISO(isoString: string) {
  const match = isoString.match(/T(\d{2}):(\d{2})/)
  if (match) {
    return {
      hours: parseInt(match[1], 10),
      minutes: parseInt(match[2], 10),
      formatted: `${match[1]}:${match[2]}`
    }
  }
  return null
}
```

**⚡ Clave del Sistema**: Esta función extrae la hora EXACTA del string ISO usando regex, evitando problemas de timezone.

---

## 🎨 COMPONENTE: EventGlobe (Globitos de Eventos)

### **Posicionamiento Exacto**
```javascript
// Posición: minutos desde medianoche * altura por minuto
const totalMinutes = hours * 60 + minutes
const position = totalMinutes * (HOUR_HEIGHT / 60) // posición exacta
```

### **Altura Dinámica**
```javascript
// Duración para altura del globo
let duration = 0
if (endTimeData) {
  const endTotalMinutes = endTimeData.hours * 60 + endTimeData.minutes
  duration = endTotalMinutes - totalMinutes
}
const height = duration > 0 ? Math.max(20, duration * (HOUR_HEIGHT / 60)) : 20
```

### **Colores por Tipo de Evento**
```javascript
const getColor = () => {
  switch (event.eventType) {
    case 'nap': return 'bg-orange-400 text-white'
    case 'sleep': return 'bg-blue-400 text-white'
    case 'wake': return 'bg-green-400 text-white'
    case 'night_waking': return 'bg-red-400 text-white'
    default: return 'bg-gray-400 text-white'
  }
}
```

### **Renderizado del Globito**
```jsx
<div
  className={`absolute left-2 right-2 rounded-lg shadow-md px-2 py-1 text-xs font-medium flex items-center gap-1 cursor-pointer hover:shadow-lg transition-shadow ${getColor()}`}
  style={{
    top: `${position}px`,
    height: `${height}px`,
    minHeight: '20px'
  }}
  onClick={(e) => {
    e.stopPropagation()
    onClick?.(event)
  }}
>
  {getIcon()}
  <div className="flex-1 truncate">
    <div>{getName()}</div>
    <div className="text-xs opacity-90">
      {timeData.formatted}
      {endTimeData && `-${endTimeData.formatted}`}
    </div>
  </div>
</div>
```

---

## ⏰ COMPONENTE: TimeAxis (Eje de Tiempo)

### **Timeline Compacto**
```javascript
const TimeAxis = React.memo(() => {
  return (
    <div className="w-12 bg-gray-50 border-r border-gray-200 flex-shrink-0">
      {/* Header vacío - más compacto */}
      <div className="h-8 border-b border-gray-200 bg-white" />
      
      {/* Timeline - solo mostrar horas cada 2 horas para no saturar */}
      <div className="relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
        {HOURS.filter(hour => hour % 2 === 0).map((hour) => (
          <div
            key={hour}
            className="absolute right-1 text-xs font-medium text-gray-600"
            style={{ 
              top: `${hour * HOUR_HEIGHT}px`,
              transform: 'translateY(-50%)'
            }}
          >
            {hour.toString().padStart(2, '0')}:00
          </div>
        ))}
      </div>
    </div>
  )
})
```

**🎯 Características:**
- Ancho: 48px (`w-12`)
- Horas cada 2: `00:00, 02:00, 04:00, etc.`
- Fondo gris claro para distinguir del área de eventos

---

## 🌈 COMPONENTE: BackgroundAreas (Fondo con Colores)

### **Gradiente Día/Noche**
```javascript
const BackgroundAreas = React.memo(() => {
  return (
    <div 
      className="absolute inset-0"
      style={{
        background: `linear-gradient(
          to bottom,
          hsl(220 40% 85%) 0%,        /* Noche (0:00-6:00) */
          hsl(220 40% 85%) 25%,       /* 25% = 6 horas */
          hsl(48 100% 94%) 25%,       /* Día (6:00-19:00) */
          hsl(48 100% 94%) 79.17%,    /* 79.17% = 19 horas */
          hsl(220 40% 85%) 79.17%,    /* Noche (19:00-24:00) */
          hsl(220 40% 85%) 100%
        )`
      }}
    />
  )
})
```

**🎨 Significado de Colores:**
- **Azul claro**: Noche (0:00-6:00 y 19:00-24:00)
- **Amarillo claro**: Día (6:00-19:00)

---

## 📏 COMPONENTE: GridLines (Líneas de Cuadrícula)

### **Líneas Cada Hora**
```javascript
const GridLines = React.memo(() => {
  return (
    <>
      {HOURS.map((hour) => (
        <div
          key={hour}
          className={`absolute left-0 right-0 border-t ${
            hour % 3 === 0 ? 'border-gray-300' : 'border-gray-200'
          }`}
          style={{ top: `${hour * HOUR_HEIGHT}px` }}
        />
      ))}
    </>
  )
})
```

**📐 Tipos de Líneas:**
- **Líneas principales** (cada 3 horas): `border-gray-300` - más gruesas
- **Líneas secundarias**: `border-gray-200` - más sutiles

---

## 📅 VISTA SEMANAL: renderWeekView()

### **Estructura Principal**
```javascript
const renderWeekView = () => {
  const weekStart = startOfWeek(date, { weekStartsOn: 0 }) // Empezar en domingo
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
  
  return (
    <div className="flex" style={{ height: `${24 * HOUR_HEIGHT + 32}px` }}>
      {/* Eje de tiempo */}
      <TimeAxis />
      
      {/* Días de la semana */}
      <div className="flex-1 flex">
        {days.map((day, index) => {
          const dayName = weekDays[day.getDay()]
          const dayEvents = getEventsForDay(day)
          const isDayToday = isToday(day)
          
          return (
            <div key={day.toString()} className="flex-1 relative">
              {/* Header del día - más compacto */}
              <div 
                className={cn(
                  "h-8 bg-white border-b border-gray-200 flex flex-col items-center justify-center text-xs font-medium",
                  isDayToday && "bg-blue-50 text-blue-600"
                )}
              >
                <div className="text-xs opacity-75">{dayName}</div>
                <div className="font-bold text-xs">{format(day, "d")}</div>
              </div>
              
              {/* Container de eventos */}
              <div 
                className="relative border-r border-gray-200 cursor-pointer"
                style={{ height: `${24 * HOUR_HEIGHT}px` }}
                onClick={(e) => handleCalendarClick(e, day)}
              >
                {/* Fondo con colores */}
                <BackgroundAreas />
                
                {/* Líneas de grid */}
                <GridLines />
                
                {/* Eventos */}
                {dayEvents.map((event) => (
                  <EventGlobe key={event._id} event={event} onClick={handleEventClick} />
                ))}
                
                {/* Estado vacío */}
                {dayEvents.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-xs text-gray-400 text-center">
                      <div>Sin eventos</div>
                      <div className="mt-1 opacity-75">este día</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

### **🎯 Características Vista Semanal:**
- **7 columnas** - Una por cada día
- **Headers compactos** - Solo nombre de día y número
- **Altura total**: `24 * 30px + 32px = 752px`
- **Eventos por día** - Cada columna muestra sus eventos
- **Click para agregar** - Click en área vacía crea evento

---

## 🔍 VISTA DIARIA: renderDayView()

### **Estructura Simplificada**
```javascript
const renderDayView = () => {
  return (
    <div className="flex" style={{ height: `${24 * HOUR_HEIGHT + 32}px` }}>
      {/* Eje de tiempo */}
      <TimeAxis />
      
      {/* Área de eventos */}
      <div className="flex-1 relative">
        {/* Header del día - más compacto */}
        <div className="h-8 bg-white border-b border-gray-200 flex items-center justify-center">
          <span className="font-medium text-sm">{format(date, "d")}</span>
        </div>
        
        {/* Container de eventos */}
        <div 
          className="relative overflow-hidden cursor-pointer"
          style={{ height: `${24 * HOUR_HEIGHT}px` }}
          onClick={(e) => handleCalendarClick(e, date)}
        >
          {/* Fondo con colores */}
          <BackgroundAreas />
          
          {/* Líneas de grid */}
          <GridLines />
          
          {/* Eventos */}
          {events.map((event) => (
            <EventGlobe key={event._id} event={event} onClick={handleEventClick} />
          ))}
          
          {/* Estado vacío */}
          {events.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-gray-500">
                <Cloud className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No hay eventos registrados para este día</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

### **🎯 Características Vista Diaria:**
- **1 columna** - Solo el día seleccionado
- **Área completa** - Más espacio para eventos
- **Mismo sistema** - Timeline, fondo, grid, eventos
- **Click interactivo** - Para crear nuevos eventos

---

## 📊 VISTA MENSUAL: renderMonthView()

### **Gráfico de Líneas**
```javascript
const renderMonthView = () => {
  // Test: Si no hay eventos, crear algunos de prueba para verificar que la gráfica funciona
  const testEvents = events.length === 0 ? [
    {
      _id: "test1",
      childId: activeChildId || "test",
      eventType: "sleep",
      emotionalState: "tranquilo",
      startTime: `${format(date, "yyyy-MM")}-15T21:30:00.000Z`,
      endTime: `${format(date, "yyyy-MM")}-16T07:00:00.000Z`,
    },
    // ... más eventos de prueba
  ] : events
  
  return (
    <div className="w-full" style={{ height: "400px" }}>
      <MonthLineChart 
        events={testEvents}
        currentDate={date}
        onEventClick={handleEventClick}
        className="w-full h-full"
      />
    </div>
  )
}
```

---

## 🔧 SISTEMA DE INTERACCIÓN

### **Click en Calendario para Crear Eventos**
```javascript
const handleCalendarClick = (clickEvent: React.MouseEvent, dayDate: Date) => {
  // Solo para vistas de timeline (día y semana)
  if (view === "month") return

  const rect = (clickEvent.currentTarget as HTMLElement).getBoundingClientRect()
  const y = clickEvent.clientY - rect.top
  
  // Calcular hora basada en la posición Y
  const totalMinutes = (y / HOUR_HEIGHT) * 60
  const hour = Math.floor(totalMinutes / 60)
  const minute = Math.round((totalMinutes % 60) / 15) * 15 // Redondear a cada 15 minutos
  
  // Validar que la hora esté en rango válido
  if (hour >= 0 && hour < 24 && minute >= 0 && minute < 60) {
    setClickedTime({ hour, minute, date: dayDate })
    setSelectedEvent(null) // Limpiar evento seleccionado para indicar que es nuevo
    setIsEventModalOpen(true)
  }
}
```

### **Click en Evento para Editar**
```javascript
const handleEventClick = (event: Event) => {
  setSelectedEvent(event)
  setIsEventModalOpen(true)
  setClickedTime(null) // Limpiar tiempo de click para indicar que es edición
}
```

---

## 🎛️ MODAL DE EVENTOS

### **Componente EventModal**
Maneja tanto creación como edición de eventos:

```javascript
function EventModal({
  isOpen,
  onClose,
  event,           // null = crear, objeto = editar
  clickedTime,     // hora donde se hizo click
  onSave,
  onDelete,
})
```

### **Campos del Formulario:**
- **Tipo de evento**: Select con opciones (sleep, nap, wake, night_waking)
- **Estado emocional**: Select con estados
- **Hora de inicio**: Input tipo time
- **Hora de fin**: Input tipo time (opcional)
- **Notas**: Textarea (opcional)

---

## 🔄 NAVEGACIÓN Y CONTROLES

### **Botones de Vista**
```javascript
const handleViewChange = (newView: "month" | "week" | "day") => {
  setView(newView)
  if (typeof window !== "undefined") {
    localStorage.setItem("calendar-view-preference", newView)
  }
}
```

### **Navegación de Fecha**
```javascript
const navigatePrevious = () => {
  if (view === "month") {
    setDate(subMonths(date, 1))
  } else if (view === "week") {
    setDate(subWeeks(date, 1))
  } else {
    setDate(subDays(date, 1))
  }
}

const navigateNext = () => {
  if (view === "month") {
    setDate(addMonths(date, 1))
  } else if (view === "week") {
    setDate(addWeeks(date, 1))
  } else {
    setDate(addDays(date, 1))
  }
}
```

---

## 📱 RESPONSIVE DESIGN

### **Clases Importantes:**
- `w-12` - Ancho fijo del timeline (48px)
- `flex-1` - Área de eventos que se expande
- `text-xs` - Texto pequeño para headers compactos
- `h-8` - Header compacto (32px vs 48px original)

### **Breakpoints:**
- Mobile: Timeline más estrecho, eventos más pequeños
- Desktop: Vista completa con todos los elementos

---

## 🎨 COLORES Y ESTILOS

### **Eventos:**
- **Siesta (nap)**: `bg-orange-400` 🧡
- **Dormir (sleep)**: `bg-blue-400` 🔵  
- **Despertar (wake)**: `bg-green-400` 🟢
- **Despertar nocturno**: `bg-red-400` 🔴

### **Fondo:**
- **Área de día**: `hsl(48 100% 94%)` - Amarillo claro
- **Área de noche**: `hsl(220 40% 85%)` - Azul claro

### **Grid:**
- **Líneas principales**: `border-gray-300` (cada 3 horas)
- **Líneas secundarias**: `border-gray-200` (cada hora)

---

## 🔍 DEBUGGING Y LOGS

### **Sistema de Logging Avanzado**
El EventBlock incluye logs detallados para debugging:

```javascript
if (process.env.NODE_ENV === 'development') {
  console.log(`🔥 GLOBO [${event.eventType}] ANÁLISIS:`)
  console.log(`   📅 ISO: ${event.startTime}`)
  console.log(`   ⏰ Hora extraída: ${hours}:${minutes.toString().padStart(2, '0')}`)
  console.log(`   📐 Posición calculada: ${position.toFixed(2)}px`)
  console.log(`   📏 Esto equivale a hora: ${(position / hourHeight).toFixed(2)} (debería ser ${hours + minutes/60})`)
  
  // MAPEO INVERSO: ¿A qué hora corresponde esta posición?
  const equivalentHour = position / hourHeight
  const realHour = Math.floor(equivalentHour)
  const realMinutes = Math.round((equivalentHour - realHour) * 60)
  console.log(`   🎯 GLOBO ESTÁ EN: ${realHour.toString().padStart(2, '0')}:${realMinutes.toString().padStart(2, '0')}`)
}
```

---

## ⚡ OPTIMIZACIONES DE RENDIMIENTO

### **Componentes Memoizados**
```javascript
const TimeAxis = React.memo(() => { ... })
const BackgroundAreas = React.memo(() => { ... })
const GridLines = React.memo(() => { ... })
```

### **useCallback para Funciones Caras**
```javascript
const fetchEvents = React.useCallback(async () => {
  // Lógica de carga
}, [activeChildId, date, view])
```

---

## 📋 CHECKLIST PARA REPLICAR EN OTRO PROYECTO

### **1. Dependencias Requeridas**
```json
{
  "@tanstack/react-query": "latest",
  "date-fns": "latest", 
  "lucide-react": "latest",
  "next": "15.x",
  "react": "19.x"
}
```

### **2. Estructura de Archivos**
```
/components/calendar/
├── index.ts (exports)
├── MonthLineChart.tsx
├── EventBlock.tsx (con sistema de extracción de tiempo)
└── ... otros componentes

/app/dashboard/calendar/
└── page.tsx (archivo principal)
```

### **3. Configuración Base**
- ✅ Configurar `HOUR_HEIGHT = 30`
- ✅ Implementar `extractTimeFromISO()`
- ✅ Crear componente `EventGlobe`
- ✅ Crear componentes memoizados (TimeAxis, BackgroundAreas, GridLines)

### **4. Sistema de Estados**
- ✅ Estado de vista (month/week/day)
- ✅ Estado de fecha actual
- ✅ Estado de eventos
- ✅ Estados de modal (crear/editar)

### **5. API Integration**
- ✅ Fetch events endpoint
- ✅ Create/Edit/Delete events
- ✅ Filter events by date range

---

## 🚀 RESULTADO FINAL

### **🎯 Funcionalidades Logradas:**
✅ **Sincronización perfecta** - Eventos alineados exactamente con líneas de hora
✅ **Múltiples vistas** - Mensual, semanal, diaria  
✅ **Globitos interactivos** - Click para editar, área vacía para crear
✅ **Colores día/noche** - Fondo que indica período del día
✅ **Responsive** - Funciona en móvil y desktop
✅ **Performance optimizado** - Componentes memoizados
✅ **Debugging avanzado** - Logs detallados para troubleshooting

### **📐 Precisión del Sistema:**
- **Posicionamiento**: Exacto al píxel basado en minutos
- **Altura**: Proporcional a duración del evento  
- **Timeline**: Horas cada 2 para evitar saturación
- **Grid**: Líneas cada hora con énfasis cada 3 horas

---

## 💡 TIPS PARA IMPLEMENTACIÓN

1. **Empezar con vista diaria** - Es la más simple
2. **Probar con eventos de prueba** - Usar script de testing
3. **Verificar extractTimeFromISO** - Clave para alineación correcta
4. **Usar logs de desarrollo** - Para debugging visual
5. **Implementar vista semanal** - Después de dominar diaria
6. **Vista mensual al final** - Usa componente separado

**🎉 ¡Con esta guía puedes replicar exactamente el mismo sistema en cualquier proyecto!**