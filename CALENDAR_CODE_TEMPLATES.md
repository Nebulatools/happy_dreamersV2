# 📝 CÓDIGO COMPLETO: PLANTILLAS DEL CALENDARIO

Aquí están los archivos de código principales que necesitas copiar para replicar el calendario.

---

## 1️⃣ EventGlobe.tsx - COMPONENTE PRINCIPAL DE EVENTO

```typescript
// 🎯 Componente de globo de evento - Versión completa funcional
"use client"

import React from 'react'
import { Moon, Sun, AlertCircle, Clock } from "lucide-react"

interface Event {
  _id: string;
  childId: string;
  eventType: string;
  emotionalState: string;
  startTime: string;
  endTime?: string;
  notes?: string;
}

// ⚡ FUNCIÓN CLAVE: Extracción exacta de tiempo del ISO
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

interface EventGlobeProps {
  event: Event;
  hourHeight: number;  // Ej: 30px por hora
  onClick?: (event: Event) => void;
}

export function EventGlobe({ event, hourHeight = 30, onClick }: EventGlobeProps) {
  const timeData = extractTimeFromISO(event.startTime)
  const endTimeData = event.endTime ? extractTimeFromISO(event.endTime) : null
  
  if (!timeData) return null
  
  const { hours, minutes } = timeData
  
  // 🎯 POSICIÓN EXACTA: minutos desde medianoche * altura por minuto
  const totalMinutes = hours * 60 + minutes
  const position = totalMinutes * (hourHeight / 60)
  
  // 🎯 ALTURA DINÁMICA: basada en duración
  let duration = 0
  if (endTimeData) {
    const endTotalMinutes = endTimeData.hours * 60 + endTimeData.minutes
    duration = endTotalMinutes - totalMinutes
  }
  const height = duration > 0 ? Math.max(20, duration * (hourHeight / 60)) : 20
  
  // 🎨 COLOR POR TIPO DE EVENTO
  const getColor = () => {
    switch (event.eventType) {
      case 'nap': return 'bg-orange-400 text-white'
      case 'sleep': return 'bg-blue-400 text-white'  
      case 'wake': return 'bg-green-400 text-white'
      case 'night_waking': return 'bg-red-400 text-white'
      case 'feeding': return 'bg-yellow-500 text-white'
      case 'medication': return 'bg-purple-500 text-white'
      case 'extra_activities': return 'bg-teal-500 text-white'
      default: return 'bg-gray-400 text-white'
    }
  }
  
  // 🎭 ICONO POR TIPO
  const getIcon = () => {
    switch (event.eventType) {
      case 'nap': return <Sun className="w-3 h-3" />
      case 'sleep': return <Moon className="w-3 h-3" />
      case 'wake': return <Sun className="w-3 h-3" />
      case 'night_waking': return <AlertCircle className="w-3 h-3" />
      default: return <Clock className="w-3 h-3" />
    }
  }
  
  // 📝 NOMBRE DEL EVENTO
  const getName = () => {
    const names: Record<string, string> = {
      nap: 'Siesta',
      sleep: 'Dormir',
      wake: 'Despertar',
      night_waking: 'Despertar nocturno',
      feeding: 'Alimentación',
      medication: 'Medicamento',
      extra_activities: 'Actividad Extra'
    }
    return names[event.eventType] || event.eventType
  }
  
  return (
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
  )
}
```

---

## 2️⃣ TimeAxis.tsx - EJE DE TIEMPO

```typescript
// ⏰ Componente del eje de tiempo - Optimizado y memoizado
"use client"

import React from 'react'

interface TimeAxisProps {
  hourHeight?: number;
  className?: string;
}

export const TimeAxis = React.memo(({ 
  hourHeight = 30, 
  className = "" 
}: TimeAxisProps) => {
  const HOURS = Array.from({ length: 24 }, (_, i) => i)
  
  return (
    <div className={`w-12 bg-gray-50 border-r border-gray-200 flex-shrink-0 ${className}`}>
      {/* Header vacío para alineación */}
      <div className="h-8 border-b border-gray-200 bg-white" />
      
      {/* Timeline - mostrar horas cada 2 horas para no saturar */}
      <div className="relative" style={{ height: `${24 * hourHeight}px` }}>
        {HOURS.filter(hour => hour % 2 === 0).map((hour) => (
          <div
            key={hour}
            className="absolute right-1 text-xs font-medium text-gray-600"
            style={{ 
              top: `${hour * hourHeight}px`,
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

TimeAxis.displayName = 'TimeAxis'
```

---

## 3️⃣ BackgroundAreas.tsx - FONDO DÍA/NOCHE

```typescript
// 🌈 Componente de áreas de fondo - Gradiente día/noche
"use client"

import React from 'react'

export const BackgroundAreas = React.memo(() => {
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

BackgroundAreas.displayName = 'BackgroundAreas'
```

---

## 4️⃣ GridLines.tsx - LÍNEAS DE CUADRÍCULA

```typescript
// 📏 Componente de líneas de grid - Cada hora con énfasis cada 3h
"use client"

import React from 'react'

interface GridLinesProps {
  hourHeight?: number;
}

export const GridLines = React.memo(({ hourHeight = 30 }: GridLinesProps) => {
  const HOURS = Array.from({ length: 24 }, (_, i) => i)
  
  return (
    <>
      {HOURS.map((hour) => (
        <div
          key={hour}
          className={`absolute left-0 right-0 border-t ${
            hour % 3 === 0 ? 'border-gray-300' : 'border-gray-200'
          }`}
          style={{ top: `${hour * hourHeight}px` }}
        />
      ))}
    </>
  )
})

GridLines.displayName = 'GridLines'
```

---

## 5️⃣ CalendarWeekView.tsx - VISTA SEMANAL COMPLETA

```typescript
// 📅 Vista Semanal - 7 días con eventos
"use client"

import React from 'react'
import { format, addDays, startOfWeek, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { TimeAxis } from './TimeAxis'
import { BackgroundAreas } from './BackgroundAreas' 
import { GridLines } from './GridLines'
import { EventGlobe } from './EventGlobe'

interface Event {
  _id: string;
  childId: string;
  eventType: string;
  emotionalState: string;
  startTime: string;
  endTime?: string;
  notes?: string;
}

interface CalendarWeekViewProps {
  date: Date;
  events: Event[];
  hourHeight?: number;
  onEventClick?: (event: Event) => void;
  onCalendarClick?: (clickEvent: React.MouseEvent, dayDate: Date) => void;
  className?: string;
}

export function CalendarWeekView({
  date,
  events,
  hourHeight = 30,
  onEventClick,
  onCalendarClick,
  className = ""
}: CalendarWeekViewProps) {
  
  const weekStart = startOfWeek(date, { weekStartsOn: 0 }) // Domingo
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
  
  // Obtener eventos de un día específico
  const getEventsForDay = (day: Date) => {
    const dayStr = format(day, "yyyy-MM-dd")
    const dayEvents = events.filter(event => {
      if (!event.startTime || event.startTime === '') return false
      return event.startTime.startsWith(dayStr)
    })
    
    return dayEvents.sort((a, b) => {
      const timeA = new Date(a.startTime).getTime()
      const timeB = new Date(b.startTime).getTime()
      return timeA - timeB
    })
  }
  
  return (
    <div className={`flex ${className}`} style={{ height: `${24 * hourHeight + 32}px` }}>
      {/* Eje de tiempo */}
      <TimeAxis hourHeight={hourHeight} />
      
      {/* Días de la semana */}
      <div className="flex-1 flex">
        {days.map((day, index) => {
          const dayName = weekDays[day.getDay()]
          const dayEvents = getEventsForDay(day)
          const isDayToday = isToday(day)
          
          return (
            <div key={day.toString()} className="flex-1 relative">
              {/* Header del día */}
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
                style={{ height: `${24 * hourHeight}px` }}
                onClick={(e) => onCalendarClick?.(e, day)}
              >
                {/* Fondo con colores */}
                <BackgroundAreas />
                
                {/* Líneas de grid */}
                <GridLines hourHeight={hourHeight} />
                
                {/* Eventos */}
                {dayEvents.map((event) => (
                  <EventGlobe 
                    key={event._id} 
                    event={event} 
                    hourHeight={hourHeight}
                    onClick={onEventClick} 
                  />
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

---

## 6️⃣ CalendarDayView.tsx - VISTA DIARIA

```typescript
// 🔍 Vista Diaria - Un solo día con eventos
"use client"

import React from 'react'
import { format } from 'date-fns'
import { Cloud } from 'lucide-react'
import { TimeAxis } from './TimeAxis'
import { BackgroundAreas } from './BackgroundAreas'
import { GridLines } from './GridLines'
import { EventGlobe } from './EventGlobe'

interface Event {
  _id: string;
  childId: string;
  eventType: string;
  emotionalState: string;
  startTime: string;
  endTime?: string;
  notes?: string;
}

interface CalendarDayViewProps {
  date: Date;
  events: Event[];
  hourHeight?: number;
  onEventClick?: (event: Event) => void;
  onCalendarClick?: (clickEvent: React.MouseEvent, dayDate: Date) => void;
  className?: string;
}

export function CalendarDayView({
  date,
  events,
  hourHeight = 30,
  onEventClick,
  onCalendarClick,
  className = ""
}: CalendarDayViewProps) {
  
  return (
    <div className={`flex ${className}`} style={{ height: `${24 * hourHeight + 32}px` }}>
      {/* Eje de tiempo */}
      <TimeAxis hourHeight={hourHeight} />
      
      {/* Área de eventos */}
      <div className="flex-1 relative">
        {/* Header del día */}
        <div className="h-8 bg-white border-b border-gray-200 flex items-center justify-center">
          <span className="font-medium text-sm">{format(date, "d")}</span>
        </div>
        
        {/* Container de eventos */}
        <div 
          className="relative overflow-hidden cursor-pointer"
          style={{ height: `${24 * hourHeight}px` }}
          onClick={(e) => onCalendarClick?.(e, date)}
        >
          {/* Fondo con colores */}
          <BackgroundAreas />
          
          {/* Líneas de grid */}
          <GridLines hourHeight={hourHeight} />
          
          {/* Eventos */}
          {events.map((event) => (
            <EventGlobe 
              key={event._id} 
              event={event} 
              hourHeight={hourHeight}
              onClick={onEventClick} 
            />
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

---

## 7️⃣ CalendarClickHandler.tsx - SISTEMA DE CLICKS

```typescript
// 🖱️ Utilidad para manejar clicks en el calendario
"use client"

export interface ClickTimeResult {
  hour: number;
  minute: number;
  date: Date;
}

/**
 * Maneja el click en el calendario para crear eventos
 * @param clickEvent - Evento de click del mouse
 * @param dayDate - Fecha del día clickeado
 * @param hourHeight - Altura en pixels por hora (ej: 30)
 * @returns Objeto con hora, minuto y fecha, o null si click inválido
 */
export function handleCalendarClick(
  clickEvent: React.MouseEvent,
  dayDate: Date,
  hourHeight: number
): ClickTimeResult | null {
  const rect = (clickEvent.currentTarget as HTMLElement).getBoundingClientRect()
  const y = clickEvent.clientY - rect.top
  
  // Calcular hora basada en la posición Y
  const totalMinutes = (y / hourHeight) * 60
  const hour = Math.floor(totalMinutes / 60)
  const minute = Math.round((totalMinutes % 60) / 15) * 15 // Redondear a cada 15 min
  
  // Validar que la hora esté en rango válido
  if (hour >= 0 && hour < 24 && minute >= 0 && minute < 60) {
    return { hour, minute, date: dayDate }
  }
  
  return null
}

/**
 * Ejemplo de uso en componente:
 * 
 * const handleClick = (e: React.MouseEvent) => {
 *   const clickTime = handleCalendarClick(e, currentDate, HOUR_HEIGHT)
 *   if (clickTime) {
 *     // Abrir modal para crear evento en clickTime.hour:clickTime.minute
 *     openEventModal(clickTime)
 *   }
 * }
 */
```

---

## 8️⃣ CalendarNavigation.tsx - NAVEGACIÓN DE FECHAS

```typescript
// 🔄 Componente de navegación de calendario
"use client"

import React from 'react'
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, isSameMonth, startOfWeek, endOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ViewMode = "month" | "week" | "day"

interface CalendarNavigationProps {
  date: Date;
  view: ViewMode;
  onDateChange: (date: Date) => void;
  onViewChange: (view: ViewMode) => void;
}

export function CalendarNavigation({
  date,
  view,
  onDateChange,
  onViewChange
}: CalendarNavigationProps) {
  
  // Navegación anterior
  const navigatePrevious = () => {
    if (view === "month") {
      onDateChange(subMonths(date, 1))
    } else if (view === "week") {
      onDateChange(subWeeks(date, 1))
    } else {
      onDateChange(subDays(date, 1))
    }
  }

  // Navegación siguiente
  const navigateNext = () => {
    if (view === "month") {
      onDateChange(addMonths(date, 1))
    } else if (view === "week") {
      onDateChange(addWeeks(date, 1))
    } else {
      onDateChange(addDays(date, 1))
    }
  }

  // Título según la vista
  const getDateTitle = () => {
    if (view === "month") {
      return format(date, "MMMM yyyy", { locale: es })
    } else if (view === "week") {
      const weekStart = startOfWeek(date, { weekStartsOn: 0 })
      const weekEnd = endOfWeek(date, { weekStartsOn: 0 })
      if (isSameMonth(weekStart, weekEnd)) {
        return format(weekStart, "d", { locale: es }) + " - " + format(weekEnd, "d 'de' MMMM yyyy", { locale: es })
      } else {
        return format(weekStart, "d 'de' MMM", { locale: es }) + " - " + format(weekEnd, "d 'de' MMM yyyy", { locale: es })
      }
    } else {
      return format(date, "EEEE, d 'de' MMMM yyyy", { locale: es })
    }
  }

  return (
    <div className="space-y-3">
      {/* Selector de vista */}
      <div className="flex items-center justify-center gap-1 bg-gray-100 p-1 rounded-lg w-fit mx-auto">
        <Button
          variant={view === "month" ? "default" : "ghost"}
          size="sm"
          className={view === "month" ? "bg-white shadow-sm" : ""}
          onClick={() => onViewChange("month")}
        >
          Mensual
        </Button>
        <Button
          variant={view === "week" ? "default" : "ghost"}
          size="sm"
          className={view === "week" ? "bg-white shadow-sm" : ""}
          onClick={() => onViewChange("week")}
        >
          Semanal
        </Button>
        <Button
          variant={view === "day" ? "default" : "ghost"}
          size="sm"
          className={view === "day" ? "bg-white shadow-sm" : ""}
          onClick={() => onViewChange("day")}
        >
          Diario
        </Button>
      </div>

      {/* Navegación de fecha */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={navigatePrevious}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <h2 className="text-xl font-semibold min-w-[200px] text-center">
          {getDateTitle()}
        </h2>
        
        <Button
          variant="outline"
          size="icon"
          onClick={navigateNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
```

---

## 9️⃣ CalendarMain.tsx - COMPONENTE PRINCIPAL INTEGRADO

```typescript
// 📅 Calendario Principal - Integración completa
"use client"

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { CalendarNavigation } from './CalendarNavigation'
import { CalendarWeekView } from './CalendarWeekView'
import { CalendarDayView } from './CalendarDayView'
import { handleCalendarClick } from './CalendarClickHandler'

// Configuración base
const HOUR_HEIGHT = 30

interface Event {
  _id: string;
  childId: string;
  eventType: string;
  emotionalState: string;
  startTime: string;
  endTime?: string;
  notes?: string;
}

type ViewMode = "month" | "week" | "day"

interface CalendarMainProps {
  events: Event[];
  onEventClick?: (event: Event) => void;
  onCreateEvent?: (clickTime: { hour: number; minute: number; date: Date }) => void;
}

export function CalendarMain({
  events,
  onEventClick,
  onCreateEvent
}: CalendarMainProps) {
  
  const [date, setDate] = useState<Date>(new Date())
  const [view, setView] = useState<ViewMode>(() => {
    // Cargar preferencia desde localStorage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("calendar-view-preference")
      if (saved && ["month", "week", "day"].includes(saved)) {
        return saved as ViewMode
      }
    }
    return "day"
  })
  
  // Guardar preferencia de vista
  const handleViewChange = (newView: ViewMode) => {
    setView(newView)
    if (typeof window !== "undefined") {
      localStorage.setItem("calendar-view-preference", newView)
    }
  }
  
  // Manejar click en calendario para crear eventos
  const handleClick = (clickEvent: React.MouseEvent, dayDate: Date) => {
    // Solo para vistas timeline (no mensual)
    if (view === "month") return
    
    const clickTime = handleCalendarClick(clickEvent, dayDate, HOUR_HEIGHT)
    if (clickTime) {
      onCreateEvent?.(clickTime)
    }
  }
  
  return (
    <div className="space-y-4">
      {/* Navegación */}
      <CalendarNavigation
        date={date}
        view={view}
        onDateChange={setDate}
        onViewChange={handleViewChange}
      />
      
      {/* Calendario */}
      <Card className="p-4">
        {view === "week" && (
          <CalendarWeekView
            date={date}
            events={events}
            hourHeight={HOUR_HEIGHT}
            onEventClick={onEventClick}
            onCalendarClick={handleClick}
          />
        )}
        
        {view === "day" && (
          <CalendarDayView
            date={date}
            events={events}
            hourHeight={HOUR_HEIGHT}
            onEventClick={onEventClick}
            onCalendarClick={handleClick}
          />
        )}
        
        {view === "month" && (
          <div className="h-96 flex items-center justify-center text-gray-500">
            {/* Aquí va tu MonthLineChart o vista mensual */}
            Vista mensual - Implementar según necesidades
          </div>
        )}
      </Card>
    </div>
  )
}
```

---

## 🔟 package.json - DEPENDENCIAS REQUERIDAS

```json
{
  "dependencies": {
    "date-fns": "^3.0.0",
    "lucide-react": "^0.300.0",
    "next": "15.x",
    "react": "19.x",
    "@radix-ui/react-dialog": "^1.0.0",
    "@radix-ui/react-select": "^2.0.0",
    "tailwindcss": "^3.0.0"
  }
}
```

---

## 🎨 tailwind.config.js - COLORES PERSONALIZADOS

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        // Colores para eventos
        'sleep': '#3b82f6',     // blue-500
        'nap': '#fb923c',       // orange-400  
        'wake': '#4ade80',      // green-400
        'night-wake': '#ef4444', // red-500
        'feeding': '#eab308',   // yellow-500
        'medication': '#8b5cf6', // purple-500
        'extra-activity': '#14b8a6' // teal-500
      }
    }
  }
}
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### **1. Copiar Archivos Base**
- [ ] EventGlobe.tsx (componente principal)
- [ ] TimeAxis.tsx (eje de tiempo)
- [ ] BackgroundAreas.tsx (fondo día/noche)  
- [ ] GridLines.tsx (líneas de cuadrícula)

### **2. Copiar Vistas**
- [ ] CalendarWeekView.tsx (vista semanal)
- [ ] CalendarDayView.tsx (vista diaria)

### **3. Copiar Utilidades**
- [ ] CalendarClickHandler.tsx (manejo de clicks)
- [ ] CalendarNavigation.tsx (navegación)

### **4. Integrar**
- [ ] CalendarMain.tsx (componente principal)
- [ ] Configurar colores en Tailwind
- [ ] Instalar dependencias

### **5. Conectar con API**
- [ ] Fetch de eventos
- [ ] Create/Edit/Delete eventos
- [ ] Filtros por fecha

---

## 🚀 USO RÁPIDO

```typescript
// En tu página principal
import { CalendarMain } from './components/calendar/CalendarMain'

export default function CalendarPage() {
  const [events, setEvents] = useState<Event[]>([])
  
  const handleEventClick = (event: Event) => {
    // Abrir modal de edición
    console.log('Editar evento:', event)
  }
  
  const handleCreateEvent = (clickTime: any) => {
    // Abrir modal de creación
    console.log('Crear evento en:', clickTime)
  }
  
  return (
    <CalendarMain
      events={events}
      onEventClick={handleEventClick}
      onCreateEvent={handleCreateEvent}
    />
  )
}
```

**🎉 ¡Con estos archivos tienes todo lo necesario para recrear el calendario completo!**