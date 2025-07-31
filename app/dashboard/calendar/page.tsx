// Página de Calendario de Sueño según diseño de Figma
// Muestra eventos de sueño en vista mensual/semanal/diaria con resumen estadístico

"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Moon,
  Sun,
  Cloud,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useActiveChild } from "@/context/active-child-context"
import { useEventsCache, useEventsInvalidation } from "@/hooks/use-events-cache"
import { EventRegistrationModal } from "@/components/events"
import { 
  TimelineColumn, 
  CompactTimelineColumn, 
  EventBlock, 
  CompactEventBlock
} from "@/components/calendar"
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  parse,
  differenceInHours,
  differenceInMinutes,
  eachHourOfInterval,
} from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"

import { createLogger } from "@/lib/logger"

const logger = createLogger("page")


interface Event {
  _id: string;
  childId: string;
  eventType: string;
  emotionalState: string;
  startTime: string;
  endTime?: string;
  notes?: string;
  duration?: number;
}

interface MonthlyStats {
  nightSleepHours: number;
  napHours: number;
  nightWakings: number;
  nightSleepChange: number;
  napChange: number;
  wakingsChange: number;
}

export default function CalendarPage() {
  const { toast } = useToast()
  const { activeChildId } = useActiveChild()
  const { refreshTrigger, subscribe } = useEventsCache(activeChildId)
  const invalidateEvents = useEventsInvalidation()
  const [date, setDate] = useState<Date>(new Date())
  const [view, setView] = useState<"month" | "week" | "day">("month")
  const [isLoading, setIsLoading] = useState(true)
  const [events, setEvents] = useState<Event[]>([])
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({
    nightSleepHours: 0,
    napHours: 0,
    nightWakings: 0,
    nightSleepChange: 0,
    napChange: 0,
    wakingsChange: 0,
  })
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [children, setChildren] = useState([])

  // Suscribirse a invalidaciones de cache
  useEffect(() => {
    const unsubscribe = subscribe()
    return unsubscribe
  }, [subscribe])

  // Cargar datos cuando cambia el niño activo, fecha o vista
  useEffect(() => {
    fetchEvents()
  }, [activeChildId, date, view, refreshTrigger])

  // Cargar lista de niños para el modal
  useEffect(() => {
    if (eventModalOpen) {
      fetch("/api/children")
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setChildren(data.children)
          }
        })
        .catch(error => logger.error("Error al cargar niños", error))
    }
  }, [eventModalOpen])

  const fetchEvents = async () => {
    if (!activeChildId) {
      setEvents([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/children/events?childId=${activeChildId}`)
      if (!response.ok) throw new Error("Error al cargar eventos")
      
      const data = await response.json()
      const eventsData = data.events || []
      
      // Filtrar eventos según la vista actual
      let filteredEvents = eventsData
      
      if (view === "month") {
        filteredEvents = eventsData.filter((event: Event) => {
          const eventDate = new Date(event.startTime)
          return eventDate.getMonth() === date.getMonth() && 
                 eventDate.getFullYear() === date.getFullYear()
        })
      } else if (view === "week") {
        const weekStart = startOfWeek(date, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(date, { weekStartsOn: 1 })
        filteredEvents = eventsData.filter((event: Event) => {
          const eventDate = new Date(event.startTime)
          return eventDate >= weekStart && eventDate <= weekEnd
        })
      } else if (view === "day") {
        const dayStart = startOfDay(date)
        const dayEnd = endOfDay(date)
        filteredEvents = eventsData.filter((event: Event) => {
          const eventDate = new Date(event.startTime)
          return eventDate >= dayStart && eventDate <= dayEnd
        })
      }
      
      setEvents(filteredEvents)
      calculateMonthlyStats(filteredEvents)
    } catch (error) {
      logger.error("Error:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los eventos",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const calculateMonthlyStats = (periodEvents: Event[]) => {
    let nightSleepTotal = 0
    let napTotal = 0
    let wakingsCount = 0
    let nightsWithSleep = 0
    let daysWithNaps = 0

    logger.info(`Calculando estadísticas para ${periodEvents.length} eventos en vista ${view}`)

    // Ordenar eventos por tiempo para vincular sleep con wake
    const sortedEvents = [...periodEvents].sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )

    // Agrupar eventos por día para calcular promedios más precisos
    const eventsByDay = periodEvents.reduce((acc, event) => {
      const dayKey = format(new Date(event.startTime), "yyyy-MM-dd")
      if (!acc[dayKey]) acc[dayKey] = []
      acc[dayKey].push(event)
      return acc
    }, {} as Record<string, Event[]>)

    // Calcular totales y contar días con eventos
    Object.values(eventsByDay).forEach(dayEvents => {
      let dayHasNightSleep = false
      let dayHasNap = false

      // Ordenar eventos del día por tiempo
      const sortedDayEvents = [...dayEvents].sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      )

      sortedDayEvents.forEach((event, index) => {
        if (event.eventType === "sleep" || event.eventType === "bedtime") {
          let duration = 0
          
          // Si tiene endTime, usar eso
          if (event.endTime) {
            const start = new Date(event.startTime)
            const end = new Date(event.endTime)
            duration = differenceInHours(end, start)
            
            // Validar que la duración sea razonable (menos de 24 horas)
            if (duration > 24) {
              logger.warn(`Duración de sueño inválida: ${duration} horas`, { event })
              duration = 0
            }
          } else {
            // Si no tiene endTime, buscar el siguiente evento wake
            // Buscar en todos los eventos ordenados, no solo del día actual
            const eventIndex = sortedEvents.findIndex(e => e._id === event._id)
            if (eventIndex !== -1) {
              // Buscar el siguiente evento wake
              for (let i = eventIndex + 1; i < sortedEvents.length; i++) {
                const nextEvent = sortedEvents[i]
                if (nextEvent.eventType === "wake" && nextEvent.childId === event.childId) {
                  const sleepStart = new Date(event.startTime)
                  const wakeTime = new Date(nextEvent.startTime)
                  
                  // Calcular la diferencia en minutos y luego convertir a horas
                  const diffMinutes = differenceInMinutes(wakeTime, sleepStart)
                  duration = diffMinutes / 60
                  
                  // Validar que la duración sea razonable
                  if (duration > 24) {
                    logger.warn(`Duración de sueño calculada inválida: ${duration} horas`, { 
                      sleepEvent: event, 
                      wakeEvent: nextEvent,
                      sleepTime: sleepStart.toISOString(),
                      wakeTime: wakeTime.toISOString()
                    })
                    // No usar este wake event, buscar otro más cercano
                    continue
                  } else if (duration < 0) {
                    // Si la duración es negativa, probablemente el wake es del día anterior
                    logger.warn(`Duración negativa detectada, ignorando`, { 
                      sleepEvent: event, 
                      wakeEvent: nextEvent 
                    })
                    duration = 0
                    break
                  } else {
                    // Duración válida encontrada
                    break
                  }
                }
              }
            }
          }
          
          if (duration > 0 && duration <= 24) {
            nightSleepTotal += duration
            dayHasNightSleep = true
            logger.info(`Sueño registrado: ${duration.toFixed(2)} horas`)
          }
        } else if (event.eventType === "nap") {
          if (event.endTime) {
            const duration = differenceInHours(new Date(event.endTime), new Date(event.startTime))
            napTotal += duration
            dayHasNap = true
          }
        } else if (event.eventType === "night_waking") {
          // Contar solo despertares nocturnos, no despertares matutinos (wake)
          wakingsCount++
        }
      })

      if (dayHasNightSleep) nightsWithSleep++
      if (dayHasNap) daysWithNaps++
    })

    // Calcular promedios según la vista
    let avgNightSleep = 0
    let avgNap = 0
    
    if (view === "month") {
      // Para mes: promedio basado en días con registros de sueño
      avgNightSleep = nightsWithSleep > 0 ? nightSleepTotal / nightsWithSleep : 0
      avgNap = daysWithNaps > 0 ? napTotal / daysWithNaps : 0
    } else if (view === "week") {
      // Para semana: promedio basado en días con registros
      avgNightSleep = nightsWithSleep > 0 ? nightSleepTotal / nightsWithSleep : 0
      avgNap = daysWithNaps > 0 ? napTotal / daysWithNaps : 0
    } else {
      // Para vista diaria, mostrar totales del día
      avgNightSleep = nightSleepTotal
      avgNap = napTotal
    }

    logger.info(`Resumen de estadísticas:`, {
      nightSleepTotal: nightSleepTotal.toFixed(2),
      nightsWithSleep,
      avgNightSleep: avgNightSleep.toFixed(2),
      napTotal: napTotal.toFixed(2),
      daysWithNaps,
      avgNap: avgNap.toFixed(2),
      wakingsCount,
      view
    })

    // TODO: Calcular cambios respecto al período anterior
    setMonthlyStats({
      nightSleepHours: avgNightSleep,
      napHours: avgNap,
      nightWakings: wakingsCount,
      nightSleepChange: 0, // TODO: Implementar comparación con período anterior
      napChange: 0,
      wakingsChange: 0,
    })
  }

  const getEventsForDay = (day: Date) => {
    const dayStr = format(day, "yyyy-MM-dd")
    return events.filter(event => event.startTime.startsWith(dayStr))
  }

  const getEventTypeIcon = (type: string) => {
    switch(type) {
    case "sleep":
      return <Moon className="w-3 h-3" />
    case "nap":
      return <Sun className="w-3 h-3" />
    case "wake":
      return <Sun className="w-3 h-3" />
    case "night_waking":
      return <AlertCircle className="w-3 h-3" />
    default:
      return null
    }
  }

  const getEventTypeColor = (type: string) => {
    switch(type) {
    case "sleep":
      return "bg-sleep event-pill"
    case "nap":
      return "bg-nap event-pill"
    case "wake":
      return "bg-wake event-pill"  // Verde para despertar matutino
    case "night_waking":
      return "bg-night-wake event-pill"  // Rojo para despertar nocturno
    default:
      return "bg-gray-400 event-pill"
    }
  }

  const formatEventTime = (event: Event) => {
    const start = new Date(event.startTime)
    if (event.eventType === "wake" || event.eventType === "sleep") {
      return format(start, "HH:mm")
    }
    if (event.endTime) {
      const end = new Date(event.endTime)
      return `${format(start, "HH:mm")}-${format(end, "HH:mm")}`
    }
    return format(start, "HH:mm")
  }

  const getEventTypeName = (type: string) => {
    const types: Record<string, string> = {
      sleep: "Dormir",
      bedtime: "Dormir", // Para compatibilidad con datos antiguos
      nap: "Siesta",
      wake: "Despertar",
      night_waking: "Despertar nocturno",
      meal: "Comida",
      play: "Juego",
      activity: "Actividad física",
      bath: "Baño",
      other: "Otro",
    }
    return types[type] || type
  }

  const getEmotionalStateName = (state: string) => {
    const states: Record<string, string> = {
      happy: "Feliz",
      calm: "Tranquilo",
      excited: "Emocionado",
      tired: "Cansado",
      irritable: "Irritable",
      sad: "Triste",
      anxious: "Ansioso",
      restless: "Inquieto",
    }
    return states[state] || state
  }

  const renderMonthView = () => {
    const monthStart = startOfMonth(date)
    const monthEnd = endOfMonth(date)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 })
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })
    
    const days = eachDayOfInterval({ start: startDate, end: endDate })
    const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
    
    return (
      <div className="mt-6">
        {/* Headers de días */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-sm font-medium text-gray-600">
              {day}
            </div>
          ))}
        </div>
        
        {/* Grid de días */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const dayEvents = getEventsForDay(day)
            const isCurrentMonth = isSameMonth(day, date)
            const isDayToday = isToday(day)
            
            return (
              <div 
                key={day.toString()} 
                className={cn(
                  "calendar-cell rounded-lg relative",
                  !isCurrentMonth && "bg-gray-50 text-gray-400",
                  isDayToday && "bg-blue-50 border-2 border-[#4A90E2]"
                )}
              >
                <div className="absolute top-2 right-2 text-sm font-medium">
                  {format(day, "d")}
                </div>
                
                <div className="mt-6 space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event._id}
                      className={cn(
                        getEventTypeColor(event.eventType),
                        "flex items-center gap-1"
                      )}
                    >
                      {getEventTypeIcon(event.eventType)}
                      <span className="text-xs truncate">
                        {formatEventTime(event)}
                      </span>
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-500 pl-1">
                      +{dayEvents.length - 3} más
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

  const renderWeekView = () => {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 })
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
    const weekDays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
    
    // Reducir altura por hora para que quepa en pantalla
    const hourHeight = 30 // 30px por hora = 720px total para 24 horas
    
    return (
      <div className="mt-6 calendar-timeline">
        <div className="week-view-timeline">
          {/* Timeline Column */}
          <div className="hidden md:block">
            <TimelineColumn hourHeight={hourHeight} />
          </div>
          <div className="md:hidden">
            <CompactTimelineColumn hourHeight={hourHeight} />
          </div>
          
          {/* Days Grid */}
          <div className="flex-1 flex">
            {days.map((day, index) => {
              const dayName = weekDays[index]
              const dayEvents = getEventsForDay(day)
              const isDayToday = isToday(day)
              
              return (
                <div key={day.toString()} className="day-column-timeline">
                  {/* Day Header */}
                  <div className={cn(
                    "day-header-timeline",
                    isDayToday && "bg-blue-50 text-blue-600"
                  )}>
                    <div className="text-xs font-medium opacity-75">{dayName}</div>
                    <div className="text-lg font-bold">
                      {format(day, "d")}
                    </div>
                    {isDayToday && (
                      <div className="text-xs font-medium">Hoy</div>
                    )}
                  </div>
                  
                  {/* Events Timeline Container */}
                  <div className="events-timeline-container">
                    {/* Indicadores de período del día */}
                    <div 
                      className="timeline-period-indicator text-gray-600"
                      style={{ top: `${3 * hourHeight}px` }}
                    >
                      AM
                    </div>
                    <div 
                      className="timeline-period-indicator text-gray-600"
                      style={{ top: `${9 * hourHeight}px` }}
                    >
                      Mañana
                    </div>
                    <div 
                      className="timeline-period-indicator text-gray-600"
                      style={{ top: `${15 * hourHeight}px` }}
                    >
                      Tarde
                    </div>
                    <div 
                      className="timeline-period-indicator text-gray-600"
                      style={{ top: `${21 * hourHeight}px` }}
                    >
                      PM
                    </div>
                    
                    {/* Hour grid lines */}
                    {Array.from({ length: 24 }, (_, hour) => (
                      <div key={hour}>
                        {/* Major hour lines (every 4 hours) */}
                        {hour % 4 === 0 && (
                          <div 
                            className="hour-grid-line-major"
                            style={{ top: `${hour * hourHeight}px` }}
                          />
                        )}
                        {/* Regular hour lines */}
                        <div 
                          className="hour-grid-line"
                          style={{ top: `${hour * hourHeight}px` }}
                        />
                        {/* Half-hour lines */}
                        <div 
                          className="hour-grid-line opacity-50"
                          style={{ top: `${hour * hourHeight + hourHeight / 2}px` }}
                        />
                      </div>
                    ))}
                    
                    {/* Events positioned absolutely */}
                    {dayEvents.map((event) => (
                      <EventBlock
                        key={event._id}
                        event={event}
                        hourHeight={hourHeight}
                        showTooltip={true}
                      />
                    ))}
                    
                    {/* Empty state */}
                    {dayEvents.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center">
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
      </div>
    )
  }

  const renderDayView = () => {
    const dayEvents = getEventsForDay(date)
    const hours = Array.from({ length: 24 }, (_, i) => i)
    
    return (
      <div className="mt-6">
        {/* Header del día */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {format(date, "EEEE, d 'de' MMMM", { locale: es })}
          </h2>
          {isToday(date) && (
            <div className="text-blue-600 font-medium mt-1">Hoy</div>
          )}
        </div>
        
        {/* Timeline de 24 horas */}
        <div className="border rounded-lg bg-white">
          {hours.map((hour) => {
            const hourEvents = dayEvents.filter(event => {
              const eventHour = new Date(event.startTime).getHours()
              return eventHour === hour
            })
            
            return (
              <div key={hour} className="flex border-b last:border-b-0">
                <div className="w-16 p-3 bg-gray-50 text-center text-sm font-medium text-gray-600">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                <div className="flex-1 p-3 min-h-[60px]">
                  <div className="space-y-2">
                    {hourEvents.map((event) => (
                      <div
                        key={event._id}
                        className={cn(
                          "p-3 rounded-lg",
                          getEventTypeColor(event.eventType)
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {getEventTypeIcon(event.eventType)}
                          <span className="font-medium">
                            {getEventTypeName(event.eventType)}
                          </span>
                          <span className="text-sm text-gray-600">
                            {formatEventTime(event)}
                          </span>
                        </div>
                        {event.notes && (
                          <div className="text-sm text-gray-600 mt-1">
                            {event.notes}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          Estado: {getEmotionalStateName(event.emotionalState)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        
        {dayEvents.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-2">No hay eventos registrados</div>
            <div className="text-gray-500 text-sm">
              Agrega el primer evento del día
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderStatCard = (
    title: string, 
    value: string, 
    unit: string, 
    change: number, 
    changeLabel: string,
    type?: "sleep" | "nap" | "wake"
  ) => {
    const isPositive = change > 0
    const isNeutral = change === 0
    const Icon = isPositive ? TrendingUp : (isNeutral ? Minus : TrendingDown)
    const color = isPositive ? "text-green-600" : (isNeutral ? "text-gray-600" : "text-red-600")
    
    // Determinar el color de fondo según el tipo
    const bgColorClass = type === "sleep" ? "bg-sleep/10" : 
      type === "nap" ? "bg-nap/10" : 
        type === "wake" ? "bg-night-wake/10" : ""
    
    const borderColorClass = type === "sleep" ? "border-sleep" : 
      type === "nap" ? "border-nap" : 
        type === "wake" ? "border-night-wake" : ""
    
    const iconColorClass = type === "sleep" ? "bg-sleep" : 
      type === "nap" ? "bg-nap" : 
        type === "wake" ? "bg-night-wake" : ""
    
    return (
      <div className={cn("p-5 rounded-lg border", bgColorClass, borderColorClass)}>
        <div className="flex items-start gap-4">
          <div className={cn("w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0", iconColorClass)}>
            {type === "sleep" && <Moon className="w-6 h-6 text-white" />}
            {type === "nap" && <Cloud className="w-6 h-6 text-white" />}
            {type === "wake" && <AlertCircle className="w-6 h-6 text-white" />}
          </div>
          <div className="flex-1 space-y-3">
            <h4 className="text-sm font-medium text-gray-600">{title}</h4>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#2F2F2F]">{value}</span>
              <span className="text-sm text-gray-500">{unit}</span>
            </div>
          </div>
        </div>
        <div className={cn("flex items-center gap-2 mt-4 pt-4 border-t", color, borderColorClass + "/20")}>
          <Icon className="w-4 h-4" />
          <span className="text-sm flex-1">
            {isNeutral ? "Sin cambios" : `${Math.abs(change)} ${changeLabel}`}
          </span>
        </div>
      </div>
    )
  }

  if (!activeChildId) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Selecciona un niño</h2>
          <p className="text-gray-600">
            Por favor, selecciona un niño en la parte superior para ver su calendario de sueño.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-[#2F2F2F]">Calendario de Sueño</h1>
        
        <div className="flex items-center gap-4">
          {/* Navegación de fecha */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                if (view === "month") {
                  setDate(subMonths(date, 1))
                } else if (view === "week") {
                  setDate(subWeeks(date, 1))
                } else {
                  setDate(subDays(date, 1))
                }
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <span className="font-medium text-lg min-w-[200px] text-center">
              {view === "month" && format(date, "MMMM yyyy", { locale: es })}
              {view === "week" && `Semana del ${format(startOfWeek(date, { weekStartsOn: 1 }), "d 'de' MMMM", { locale: es })}`}
              {view === "day" && format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
            </span>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                if (view === "month") {
                  setDate(addMonths(date, 1))
                } else if (view === "week") {
                  setDate(addWeeks(date, 1))
                } else {
                  setDate(addDays(date, 1))
                }
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Botón Registrar Evento */}
          <Button 
            className="hd-gradient-button text-white"
            onClick={() => setEventModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Registrar Evento
          </Button>
        </div>
      </div>

      {/* Controles de vista y layout */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={view === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("month")}
            className={view === "month" ? "hd-gradient-button text-white" : ""}
          >
            Mensual
          </Button>
          <Button
            variant={view === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("week")}
            className={view === "week" ? "hd-gradient-button text-white" : ""}
          >
            Semanal
          </Button>
          <Button
            variant={view === "day" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("day")}
            className={view === "day" ? "hd-gradient-button text-white" : ""}
          >
            Diario
          </Button>
        </div>
        
      </div>

      {/* Leyenda */}
      <div className="flex gap-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-sleep" />
          <span className="text-sm text-gray-600">Dormir / Acostarse</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-nap" />
          <span className="text-sm text-gray-600">Siesta</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-wake" />
          <span className="text-sm text-gray-600">Despertar</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-night-wake" />
          <span className="text-sm text-gray-600">Despertar nocturno</span>
        </div>
      </div>

      {/* Layout con resumen inferior */}
      <div className="space-y-6">
        {/* Calendario Principal */}
        <Card className="p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A90E2] mx-auto mb-4" />
                <p className="text-gray-600">Cargando calendario...</p>
              </div>
            </div>
          ) : (
            view === "month" ? renderMonthView() :
            view === "week" ? renderWeekView() :
            renderDayView()
          )}
        </Card>

        {/* Panel de Resumen Inferior */}
        <Card className="summary-panel-bottom p-6">
          <h3 className="text-lg font-semibold mb-6">
            {view === "month" && "Resumen del mes"}
            {view === "week" && "Resumen de la semana"}
            {view === "day" && "Resumen del día"}
          </h3>
          
          {/* Cards horizontales en layout inferior */}
          <div className="summary-cards-horizontal">
            {renderStatCard(
              view === "day" ? "Horas de sueño nocturno" : "Promedio de sueño nocturno",
              monthlyStats.nightSleepHours.toFixed(1),
              "horas",
              monthlyStats.nightSleepChange,
              monthlyStats.nightSleepChange > 0 ? 
                (view === "month" ? "horas más que el mes pasado" : 
                 view === "week" ? "horas más vs semana anterior" : "horas del día") :
              monthlyStats.nightSleepChange < 0 ?
                (view === "month" ? "horas menos que el mes pasado" : 
                 view === "week" ? "horas menos vs semana anterior" : "horas del día") :
                "",
              "sleep"
            )}
            
            {renderStatCard(
              view === "day" ? "Tiempo de siesta" : "Promedio de siestas",
              monthlyStats.napHours.toFixed(1),
              "horas",
              monthlyStats.napChange,
              monthlyStats.napChange > 0 ?
                (view === "month" ? "horas más que el mes pasado" : 
                 view === "week" ? "horas más vs semana anterior" : "horas del día") :
              monthlyStats.napChange < 0 ?
                (view === "month" ? "horas menos que el mes pasado" : 
                 view === "week" ? "horas menos vs semana anterior" : "horas del día") :
                "",
              "nap"
            )}
            
            {renderStatCard(
              "Despertares nocturnos",
              monthlyStats.nightWakings.toString(),
              view === "day" ? "" : "total",
              monthlyStats.wakingsChange,
              monthlyStats.wakingsChange > 0 ?
                (view === "month" ? "más que el mes pasado" : 
                 view === "week" ? "más vs semana anterior" : "del día") :
              monthlyStats.wakingsChange < 0 ?
                (view === "month" ? "menos que el mes pasado" : 
                 view === "week" ? "menos vs semana anterior" : "del día") :
                "",
              "wake"
            )}
          </div>
        </Card>
      </div>

      {/* Modal de registro de evento */}
      <EventRegistrationModal
        isOpen={eventModalOpen}
        onClose={() => setEventModalOpen(false)}
        childId={activeChildId || undefined}
        children={children}
        onEventCreated={() => {
          invalidateEvents() // Invalidar cache global
          setEventModalOpen(false)
        }}
      />
    </div>
  )
}