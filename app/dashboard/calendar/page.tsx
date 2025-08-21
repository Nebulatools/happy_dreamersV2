// Página de Calendario de Sueño según diseño de Figma
// Muestra eventos de sueño en vista mensual/semanal/diaria con resumen estadístico

"use client"

import React, { useState, useEffect, useMemo } from "react"
import { createLogger } from "@/lib/logger"
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
  Edit,
  Trash,
  Save,
  Loader2,
  Clock,
  Calendar,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useActiveChild } from "@/context/active-child-context"
import { useEventsCache, useEventsInvalidation } from "@/hooks/use-events-cache"
// TEMPORALMENTE COMENTADO - Sistema de eventos en reset
// import { EventRegistrationModal, QuickEventSelector } from "@/components/events"
import { 
  TimelineColumn, 
  CompactTimelineColumn, 
  EventBlock, 
  CompactEventBlock,
  MonthLineChart,
  SleepSessionBlock,
  CalendarMain
} from "@/components/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal"
import { processSleepStatistics } from "@/lib/sleep-calculations"
import { usePageHeaderConfig } from "@/context/page-header-context"
import { EventEditRouter } from "@/components/events/EventEditRouter"
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

const logger = createLogger("CalendarPage")


interface Event {
  _id: string;
  childId: string;
  eventType: string;
  emotionalState: string;
  startTime: string;
  endTime?: string;
  notes?: string;
  duration?: number;
  sleepDelay?: number; // Added missing sleepDelay property
}

interface Child {
  _id: string;
  name: string;
  [key: string]: any; // Allow for other properties
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
  const [activePlan, setActivePlan] = useState<any>(null)
  
  // Estado para vista del calendario con localStorage
  const [view, setView] = useState<"month" | "week" | "day">(() => {
    // Intentar cargar la preferencia desde localStorage
    if (typeof window !== "undefined") {
      const savedView = localStorage.getItem("calendar-view-preference")
      if (savedView && ["month", "week", "day"].includes(savedView)) {
        return savedView as "month" | "week" | "day"
      }
    }
    // Default a vista semanal
    return "week"
  })
  const [isLoading, setIsLoading] = useState(true)
  
  // Función para cambiar la vista y guardar en localStorage
  const handleViewChange = (newView: "month" | "week" | "day") => {
    setView(newView)
    // Guardar preferencia en localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("calendar-view-preference", newView)
      logger.info(`Vista del calendario guardada: ${newView}`)
    }
  }

  // Funciones de navegación de fechas
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

  // Función para obtener el título del período según la vista
  const getPeriodTitle = () => {
    if (view === "month") {
      return format(date, "MMMM yyyy", { locale: es })
    } else if (view === "week") {
      // Para vista semanal, usar la misma lógica que CalendarWeekView: 7 días consecutivos desde la fecha actual
      const weekStart = date
      const weekEnd = addDays(date, 6)
      if (isSameMonth(weekStart, weekEnd)) {
        return format(weekStart, "d", { locale: es }) + " - " + format(weekEnd, "d 'de' MMMM yyyy", { locale: es })
      } else {
        return format(weekStart, "d 'de' MMM", { locale: es }) + " - " + format(weekEnd, "d 'de' MMM yyyy", { locale: es })
      }
    } else {
      return format(date, "EEEE, d 'de' MMMM yyyy", { locale: es })
    }
  }

  // Funciones de navegación día por día
  const navigateOneDayBack = () => {
    setDate(subDays(date, 1))
  }

  const navigateOneDayForward = () => {
    setDate(addDays(date, 1))
  }
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
  const [quickSelectorOpen, setQuickSelectorOpen] = useState(false)
  const [selectedDateForEvent, setSelectedDateForEvent] = useState<Date | null>(null)
  const [children, setChildren] = useState<Child[]>([])
  
  // Estados para el diálogo de edición
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // Configurar el header dinámico - simplificado con solo botón de agregar
  const headerActions = useMemo(() => (
    <div className="flex items-center gap-2">
      {/* Botón de registrar evento */}
      <Button 
        size="sm"
        className="hd-gradient-button text-white"
        onClick={() => {
          setSelectedDateForEvent(null)
          setQuickSelectorOpen(true)
        }}
      >
        <Plus className="w-4 h-4 mr-2" />
        Registrar evento
      </Button>
    </div>
  ), [])

  usePageHeaderConfig({
    title: "Calendario",
    actions: headerActions,
    showSearch: true,
    showChildSelector: true,
    showNotifications: true
  })

  // Suscribirse a invalidaciones de cache
  useEffect(() => {
    const unsubscribe = subscribe()
    return unsubscribe
  }, [subscribe])

  // Cargar datos cuando cambia el niño activo, fecha o vista
  useEffect(() => {
    fetchEvents()
    if (activeChildId) {
      fetchActivePlan()
    }
  }, [activeChildId, date, view, refreshTrigger])
  
  // Función para obtener el plan activo del niño
  const fetchActivePlan = async () => {
    try {
      // Primero obtener el userId del padre
      const sessionRes = await fetch('/api/auth/session')
      const sessionData = await sessionRes.json()
      
      if (!sessionData?.user?.id) {
        logger.error('No se pudo obtener el usuario de la sesión')
        return
      }
      
      // Obtener los planes del niño
      const response = await fetch(`/api/consultas/plans?childId=${activeChildId}&userId=${sessionData.user.id}`)
      
      if (!response.ok) {
        logger.error('Error al obtener planes:', response.status)
        // Si no hay planes, usar valores por defecto basados en edad promedio
        setActivePlan({
          schedule: {
            bedtime: "20:00",
            wakeTime: "07:00"
          }
        })
        return
      }
      
      const data = await response.json()
      
      if (data.success && data.plans && data.plans.length > 0) {
        // Buscar el plan activo (el de mayor planNumber con status 'active')
        const activePlan = data.plans
          .filter((plan: any) => plan.status === 'active')
          .sort((a: any, b: any) => b.planNumber - a.planNumber)[0]
        
        if (activePlan) {
          setActivePlan(activePlan)
          logger.info('Plan activo obtenido:', {
            planNumber: activePlan.planNumber,
            bedtime: activePlan.schedule?.bedtime,
            wakeTime: activePlan.schedule?.wakeTime
          })
        } else {
          // Si no hay planes activos, buscar el más reciente
          const latestPlan = data.plans
            .sort((a: any, b: any) => b.planNumber - a.planNumber)[0]
          
          if (latestPlan) {
            setActivePlan(latestPlan)
            logger.info('Usando plan más reciente (no activo):', {
              planNumber: latestPlan.planNumber,
              bedtime: latestPlan.schedule?.bedtime,
              wakeTime: latestPlan.schedule?.wakeTime
            })
          } else {
            // Valores por defecto si no hay ningún plan
            setActivePlan({
              schedule: {
                bedtime: "20:00",
                wakeTime: "07:00"
              }
            })
          }
        }
      } else {
        // Valores por defecto si no hay planes
        setActivePlan({
          schedule: {
            bedtime: "20:00",
            wakeTime: "07:00"
          }
        })
      }
    } catch (error) {
      logger.error('Error al obtener plan activo:', error)
      // En caso de error, usar valores por defecto
      setActivePlan({
        schedule: {
          bedtime: "20:00",
          wakeTime: "07:00"
        }
      })
    }
  }

  // Cargar lista de niños para el modal o el quick selector
  useEffect(() => {
    if (eventModalOpen || quickSelectorOpen || activeChildId) {
      fetch("/api/children")
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setChildren(data.children)
          }
        })
        .catch(error => logger.error("Error al cargar niños", error))
    }
  }, [eventModalOpen, quickSelectorOpen, activeChildId])

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
      
      // Log para debugging: verificar orden de eventos recibidos
      if (process.env.NODE_ENV === 'development') {
        console.log('Eventos recibidos del servidor:', eventsData.map((e: Event) => ({
          id: e._id,
          time: e.startTime,
          type: e.eventType
        })))
      }
      
      // Filtrar eventos según la vista actual
      let filteredEvents = eventsData
      
      if (view === "month") {
        filteredEvents = eventsData.filter((event: Event) => {
          const eventDate = new Date(event.startTime)
          return eventDate.getMonth() === date.getMonth() && 
                 eventDate.getFullYear() === date.getFullYear()
        })
      } else if (view === "week") {
        const weekStart = startOfWeek(date, { weekStartsOn: 0 })
        const weekEnd = endOfWeek(date, { weekStartsOn: 0 })
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
    logger.info(`Calculando estadísticas para ${periodEvents.length} eventos en vista ${view}`)

    // Convertir eventos al formato esperado por processSleepStatistics
    const sleepEvents = periodEvents.map(event => ({
      _id: event._id,
      eventType: event.eventType,
      startTime: event.startTime,
      endTime: event.endTime,
      notes: event.notes,
      emotionalState: event.emotionalState,
      sleepDelay: event.sleepDelay
    }))

    // Usar la función unificada de cálculo de estadísticas
    const stats = processSleepStatistics(sleepEvents)

    logger.info(`Resumen de estadísticas unificadas:`, {
      avgSleepDuration: stats.avgSleepDuration.toFixed(2),
      avgNapDuration: stats.avgNapDuration.toFixed(2),
      totalSleepHours: stats.totalSleepHours.toFixed(2),
      avgWakeupsPerNight: stats.avgWakeupsPerNight.toFixed(2),
      totalWakeups: stats.totalWakeups,
      avgBedtime: stats.avgBedtime,
      avgWakeTime: stats.avgWakeTime,
      view
    })

    // Mapear las estadísticas al formato esperado por el calendario
    setMonthlyStats({
      nightSleepHours: stats.avgSleepDuration,
      napHours: stats.avgNapDuration,
      nightWakings: Math.round(stats.totalWakeups), // Total de despertares en el período
      nightSleepChange: 0, // TODO: Implementar comparación con período anterior
      napChange: 0,
      wakingsChange: 0,
    })
  }

  const getEventsForDay = (day: Date) => {
    const dayStr = format(day, "yyyy-MM-dd")
    const dayStart = startOfDay(day)
    const dayEnd = endOfDay(day)
    
    const dayEvents = events.filter(event => {
      // Validar que el evento tenga startTime y no sea vacío
      if (!event.startTime || event.startTime === '') {
        console.warn('Evento sin startTime válido, omitiendo:', event)
        return false
      }
      
      const eventStart = new Date(event.startTime)
      const eventEnd = event.endTime ? new Date(event.endTime) : null
      
      // Incluir evento si:
      // 1. Empieza en este día
      if (event.startTime.startsWith(dayStr)) {
        return true
      }
      
      // 2. Termina en este día (pero empezó antes)
      if (eventEnd && format(eventEnd, "yyyy-MM-dd") === dayStr) {
        return true
      }
      
      // 3. Cruza este día (empezó antes y termina después o no ha terminado)
      if (eventStart < dayStart) {
        // Si no tiene fin, incluir si es un evento de sueño activo
        if (!eventEnd && event.eventType === 'sleep') {
          return true
        }
        // Si tiene fin, incluir si el fin es después del inicio del día
        if (eventEnd && eventEnd > dayStart) {
          return true
        }
      }
      
      return false
    })
    
    // CRÍTICO: Ordenar eventos por startTime para posicionamiento consistente
    // Esto evita que los eventos se desplacen cuando se añaden nuevos
    return dayEvents.sort((a, b) => {
      const timeA = new Date(a.startTime).getTime()
      const timeB = new Date(b.startTime).getTime()
      return timeA - timeB // Orden cronológico ascendente
    })
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
    case "feeding":
      return null
    case "medication":
      return null
    case "activity":
    case "extra_activities":
      return null
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
    case "feeding":
      return "bg-feeding event-pill"  // Amarillo para alimentación
    case "medication":
      return "bg-medication event-pill"  // Morado para medicamentos
    case "activity":
    case "extra_activities":
      return "bg-extra-activities event-pill"  // Naranja para actividades extra
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
      feeding: "Alimentación",
      medication: "Medicamento",
      activity: "Actividad Extra",
      extra_activities: "Actividad Extra",
      meal: "Comida",
      play: "Juego",
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
  
  // Función para manejar el clic en un día del calendario
  const handleDayClick = (day: Date) => {
    setSelectedDateForEvent(day)
    setEventModalOpen(true)
  }

  // Función para manejar el clic en un evento
  const handleEventClick = (event: Event) => {
    setSelectedEvent(event)
    setIsDetailsModalOpen(true)
  }
  
  
  // Función para eliminar un evento
  const deleteEvent = async () => {
    if (!selectedEvent) return // Prevenir doble click
    
    setIsDeleting(true)
    try {
      // Usar la URL con el ID en la ruta
      const response = await fetch(`/api/children/events/${selectedEvent._id}`, {
        method: "DELETE",
      })
      
      const responseData = await response.json()
      
      if (!response.ok) {
        throw new Error(responseData.message || responseData.error || "Error al eliminar el evento")
      }
      
      // Recargar eventos
      await fetchEvents()
      
      // Invalidar cache global
      invalidateEvents()
      
      toast({
        title: "Evento eliminado",
        description: "El evento ha sido eliminado correctamente.",
      })
      
      setIsDialogOpen(false)
      setIsDetailsModalOpen(false)
      setIsEditModalOpen(false)
      setSelectedEvent(null)
      setShowDeleteModal(false)
    } catch (error: any) {
      logger.error("Error al eliminar evento:", error?.message || error)
      toast({
        title: "Error",
        description: error?.message || "No se pudo eliminar el evento. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Procesar eventos de sueño para crear sesiones continuas
  // Ahora maneja eventos que cruzan días
  const processSleepSessions = (dayEvents: Event[], currentDay?: Date) => {
    const sessions: any[] = []
    const processedEventIds = new Set<string>()
    
    // Si tenemos el día actual, podemos determinar qué parte del evento mostrar
    const dayStart = currentDay ? startOfDay(currentDay) : null
    const dayEnd = currentDay ? endOfDay(currentDay) : null
    
    // Buscar eventos sleep
    dayEvents.forEach(event => {
      if (event.eventType === 'sleep' && !processedEventIds.has(event._id)) {
        processedEventIds.add(event._id)
        
        // Determinar los tiempos de inicio y fin para esta sesión
        let sessionStartTime = event.startTime
        let sessionEndTime = event.endTime
        let isContinuationFromPrevious = false
        let continuesNextDay = false
        
        if (dayStart && dayEnd) {
          const eventStart = new Date(event.startTime)
          const eventEnd = event.endTime ? new Date(event.endTime) : null
          
          // Si el evento empieza antes del día actual, ajustar inicio
          if (eventStart < dayStart) {
            sessionStartTime = dayStart.toISOString()
            isContinuationFromPrevious = true
          }
          
          // Si el evento termina después del día actual, ajustar fin
          if (eventEnd && eventEnd > dayEnd) {
            sessionEndTime = dayEnd.toISOString()
            continuesNextDay = true
          }
          
          // Si el evento no tiene fin y empezó antes, es una sesión en progreso
          if (!eventEnd && eventStart < dayStart) {
            isContinuationFromPrevious = true
          }
        }
        
        // Buscar despertares nocturnos dentro del rango de sueño
        const nightWakings = dayEvents.filter(e => 
          e.eventType === 'night_waking' && 
          e.startTime > event.startTime &&
          (!event.endTime || e.startTime < event.endTime)
        )
        
        // Marcar night_wakings como procesados
        nightWakings.forEach(nw => processedEventIds.add(nw._id))
        
        // Si hay endTime, buscar evento wake correspondiente y marcarlo como procesado
        if (event.endTime) {
          const wakeEvent = dayEvents.find(e => 
            e.eventType === 'wake' && 
            Math.abs(new Date(e.startTime).getTime() - new Date(event.endTime!).getTime()) < 60000 // Dentro de 1 minuto
          )
          if (wakeEvent) {
            processedEventIds.add(wakeEvent._id)
          }
        }
        
        // Crear sesión de sueño con metadata sobre continuación
        sessions.push({
          type: 'sleep-session',
          startTime: sessionStartTime,
          endTime: sessionEndTime,
          originalStartTime: event.startTime, // Tiempo original completo
          originalEndTime: event.endTime, // Tiempo original completo
          nightWakings: nightWakings,
          originalEvent: event,
          isContinuationFromPrevious,
          continuesNextDay
        })
      }
    })
    
    // Agregar eventos no procesados (que no son sleep/wake/night_waking o que no fueron emparejados)
    const otherEvents = dayEvents.filter(e => !processedEventIds.has(e._id) && e.eventType !== 'wake')
    
    return { sessions, otherEvents }
  }

  const renderMonthLineView = () => {
    return (
      <div className="h-full flex flex-col">
        <MonthLineChart 
          events={events}
          currentDate={date}
          onEventClick={handleEventClick}
          className="h-full"
          idealBedtime={activePlan?.schedule?.bedtime}
          idealWakeTime={activePlan?.schedule?.wakeTime}
        />
      </div>
    )
  }

  const renderMonthView = () => {
    const monthStart = startOfMonth(date)
    const monthEnd = endOfMonth(date)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 })
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })
    
    const days = eachDayOfInterval({ start: startDate, end: endDate })
    const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
    
    return (
      <div className="h-full flex flex-col">
        {/* Headers de días */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-gray-600 py-1">
              {day}
            </div>
          ))}
        </div>
        
        {/* Grid de días - altura flexible */}
        <div className="grid grid-cols-7 gap-1 flex-1">
          {days.map((day) => {
            const dayEvents = getEventsForDay(day)
            const isCurrentMonth = isSameMonth(day, date)
            const isDayToday = isToday(day)
            
            return (
              <div 
                key={day.toString()} 
                className={cn(
                  "min-h-[80px] p-1 rounded-md relative cursor-pointer hover:bg-gray-50 transition-colors border",
                  !isCurrentMonth && "bg-gray-50/50 text-gray-400 border-gray-100",
                  isCurrentMonth && "bg-white border-gray-200",
                  isDayToday && "bg-blue-50 border-[#4A90E2] border-2"
                )}
                onClick={() => handleDayClick(day)}
              >
                <div className="text-xs font-medium mb-1 text-right">
                  {format(day, "d")}
                </div>
                
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 4).map((event) => (
                    <div
                      key={event._id}
                      className={cn(
                        getEventTypeColor(event.eventType),
                        "flex items-center gap-0.5 cursor-pointer hover:opacity-80 z-10 relative text-xs px-1 py-0.5 rounded"
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEventClick(event)
                      }}
                    >
                      {getEventTypeIcon(event.eventType)}
                      <span className="truncate" style={{ fontSize: "10px" }}>
                        {format(new Date(event.startTime), "HH:mm")}
                      </span>
                    </div>
                  ))}
                  {dayEvents.length > 4 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{dayEvents.length - 4}
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


  // Opciones para el formulario de edición
  const eventTypes = [
    { id: "sleep", label: "Dormir" },
    { id: "nap", label: "Siesta" },
    { id: "wake", label: "Despertar" },
    { id: "night_waking", label: "Despertar nocturno" },
    { id: "meal", label: "Comida" },
    { id: "play", label: "Juego" },
    { id: "activity", label: "Actividad física" },
    { id: "bath", label: "Baño" },
    { id: "other", label: "Otro" },
  ]

  const emotionalStates = [
    { id: "happy", label: "Feliz" },
    { id: "calm", label: "Tranquilo" },
    { id: "excited", label: "Emocionado" },
    { id: "tired", label: "Cansado" },
    { id: "irritable", label: "Irritable" },
    { id: "sad", label: "Triste" },
    { id: "anxious", label: "Ansioso" },
  ]
  
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
    <div className="space-y-4">
      {/* Barra superior: Selector de vista + Leyenda de colores */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 px-6 pt-4">
        {/* Selector de vista */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          <Button
            variant={view === "month" ? "default" : "ghost"}
            size="sm"
            className={view === "month" ? "bg-white shadow-sm" : ""}
            onClick={() => handleViewChange("month")}
          >
            Mensual
          </Button>
          <Button
            variant={view === "week" ? "default" : "ghost"}
            size="sm"
            className={view === "week" ? "bg-white shadow-sm" : ""}
            onClick={() => handleViewChange("week")}
          >
            Semanal
          </Button>
          <Button
            variant={view === "day" ? "default" : "ghost"}
            size="sm"
            className={view === "day" ? "bg-white shadow-sm" : ""}
            onClick={() => handleViewChange("day")}
          >
            Diario
          </Button>
        </div>

        {/* Leyenda de colores */}
        <div className="flex flex-wrap gap-3 lg:gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-sleep" />
            <span className="text-sm text-gray-600">Dormir</span>
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
            <span className="text-sm text-gray-600">Nocturno</span>
          </div>
        </div>
      </div>

      {/* Resumen de estadísticas con navegación integrada */}
      <div className="px-6">
        <Card className="p-3 md:p-4 bg-gray-50 border-gray-200">
          <div className="flex flex-col gap-3">
            {/* Header: Navegación + Título + Métricas */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              {/* Navegación y título a la izquierda */}
              <div className="flex items-center gap-3">
                {/* Navegación de fechas */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={navigatePrevious}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={navigateNext}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Título del período */}
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">Período seleccionado</span>
                  <h3 className="text-sm font-semibold text-gray-700">
                    {getPeriodTitle()}
                  </h3>
                </div>
              </div>
              
              {/* Métricas a la derecha */}
              <div className="flex items-center gap-3 md:gap-6 flex-wrap">
                {/* Sueño nocturno */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-sleep/20 flex items-center justify-center">
                    <Moon className="w-4 h-4 text-sleep" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500">
                      Promedio sueño
                    </span>
                    <span className="text-sm font-bold text-gray-900">
                      {monthlyStats.nightSleepHours.toFixed(1)}h
                    </span>
                  </div>
                </div>
                
                {/* Siestas */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-nap/20 flex items-center justify-center">
                    <Cloud className="w-4 h-4 text-nap" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500">
                      Promedio siesta
                    </span>
                    <span className="text-sm font-bold text-gray-900">
                      {monthlyStats.napHours.toFixed(1)}h
                    </span>
                  </div>
                </div>
                
                {/* Despertares */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-night-wake/20 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-night-wake" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500">Despertares</span>
                    <span className="text-sm font-bold text-gray-900">
                      {monthlyStats.nightWakings}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Calendario Principal - Nueva estructura limpia */}
      <div className="px-6 pb-6">
        {isLoading ? (
          <Card className="p-4" style={{ minHeight: '500px' }}>
            <div className="flex justify-center items-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A90E2] mx-auto mb-4" />
                <p className="text-gray-600">Cargando calendario...</p>
              </div>
            </div>
          </Card>
        ) : (
          <CalendarMain
            events={events}
            onEventClick={handleEventClick}
            onCreateEvent={(clickTime) => {
              // Manejar creación de eventos desde clicks en el calendario
              setSelectedDateForEvent(clickTime.date)
              // TODO: Abrir modal de creación de eventos cuando esté disponible
              // setQuickSelectorOpen(true)
            }}
            monthView={renderMonthView()}
            initialDate={date}
            initialView={view}
            onDayNavigateBack={navigateOneDayBack}
            onDayNavigateForward={navigateOneDayForward}
          />
        )}
      </div>

      {/* TEMPORALMENTE COMENTADO - Sistema de eventos en reset */}
      {/* Selector rápido de eventos */}
      {/* <QuickEventSelector
        isOpen={quickSelectorOpen}
        onClose={() => {
          setQuickSelectorOpen(false)
          setSelectedDateForEvent(null) // Limpiar fecha seleccionada al cerrar
        }}
        childId={activeChildId || ""}
        children={children}
        onEventCreated={() => {
          invalidateEvents() // Invalidar cache global
          setQuickSelectorOpen(false)
          setSelectedDateForEvent(null) // Limpiar fecha seleccionada
        }}
      /> */}
      
      {/* Modal de registro de evento (mantenido para compatibilidad) */}
      {/* <EventRegistrationModal
        isOpen={eventModalOpen}
        onClose={() => {
          setEventModalOpen(false)
          setSelectedDateForEvent(null) // Limpiar fecha seleccionada al cerrar
        }}
        childId={activeChildId || undefined}
        children={children}
        selectedDate={selectedDateForEvent || undefined}
        onEventCreated={() => {
          invalidateEvents() // Invalidar cache global
          setEventModalOpen(false)
          setSelectedDateForEvent(null) // Limpiar fecha seleccionada
        }}
      /> */}
      
      {/* Modal de detalles del evento */}
      {selectedEvent && (
        <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {getEventTypeIcon(selectedEvent.eventType)}
                <span>Detalles del Evento</span>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Badge del tipo de evento */}
              <div className="flex items-center gap-2">
                <div className={cn(
                  "px-3 py-1 rounded-full text-white text-sm font-medium inline-flex items-center gap-2",
                  getEventTypeColor(selectedEvent.eventType)
                )}>
                  {getEventTypeIcon(selectedEvent.eventType)}
                  {getEventTypeName(selectedEvent.eventType)}
                </div>
              </div>
              
              {/* Información principal */}
              <div className="space-y-3">
                {/* Fecha y hora */}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Fecha:</span>
                  <span>{format(new Date(selectedEvent.startTime), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Hora:</span>
                  <span>
                    {format(new Date(selectedEvent.startTime), "HH:mm")}
                    {selectedEvent.endTime && ` - ${format(new Date(selectedEvent.endTime), "HH:mm")}`}
                  </span>
                </div>
                
                {/* Duración si tiene endTime */}
                {selectedEvent.endTime && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">Duración:</span>
                    <span>
                      {(() => {
                        const start = new Date(selectedEvent.startTime)
                        const end = new Date(selectedEvent.endTime)
                        const hours = differenceInHours(end, start)
                        const minutes = differenceInMinutes(end, start) % 60
                        if (hours > 0) {
                          return `${hours}h ${minutes > 0 ? `${minutes}min` : ''}`
                        }
                        return `${minutes}min`
                      })()}
                    </span>
                  </div>
                )}
                
                {/* Estado emocional */}
                {selectedEvent.emotionalState && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Estado emocional:</span>
                    <span>{getEmotionalStateName(selectedEvent.emotionalState)}</span>
                  </div>
                )}
                
              </div>
              
              {/* Notas si existen */}
              {selectedEvent.notes && (
                <div className="border-t pt-3">
                  <div className="flex items-start gap-2">
                    <span className="text-sm font-medium text-gray-600">Notas:</span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1 bg-gray-50 p-3 rounded-lg">
                    {selectedEvent.notes}
                  </p>
                </div>
              )}
              
              {/* Información adicional para eventos de sueño */}
              {selectedEvent.eventType === 'sleep' && (
                <div className="border-t pt-3 space-y-2">
                  <div className="text-sm font-medium text-gray-600">Información del sueño</div>
                  {selectedEvent.endTime ? (
                    <div className="text-sm text-gray-700">
                      El niño durmió {(() => {
                        const start = new Date(selectedEvent.startTime)
                        const end = new Date(selectedEvent.endTime)
                        const hours = differenceInHours(end, start)
                        const minutes = differenceInMinutes(end, start) % 60
                        if (hours > 0) {
                          return `${hours} hora${hours > 1 ? 's' : ''} ${minutes > 0 ? `y ${minutes} minuto${minutes > 1 ? 's' : ''}` : ''}`
                        }
                        return `${minutes} minuto${minutes > 1 ? 's' : ''}`
                      })()}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-700">El niño está durmiendo actualmente</div>
                  )}
                </div>
              )}
            </div>
            
            {/* Botones de acción */}
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDetailsModalOpen(false)
                  setIsEditModalOpen(true)
                }}
                className="w-full sm:w-auto"
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(true)
                }}
                className="w-full sm:w-auto text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash className="w-4 h-4 mr-2" />
                Eliminar
              </Button>
              <Button
                variant="default"
                onClick={() => {
                  setIsDetailsModalOpen(false)
                  setSelectedEvent(null)
                }}
                className="w-full sm:w-auto"
              >
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Router para editar eventos usando modales específicos */}
      <EventEditRouter
        event={selectedEvent}
        open={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setSelectedEvent(null)
        }}
        onUpdate={() => {
          invalidateEvents()
          setIsEditModalOpen(false)
          setIsDetailsModalOpen(false)
          setSelectedEvent(null)
        }}
        childName={children && Array.isArray(children) ? children.find((c: Child) => c._id === activeChildId)?.name || "el niño" : "el niño"}
      />
      
      {/* Modal de confirmación de eliminación */}
      {selectedEvent && (
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => {
            // Cerrando modal
            setShowDeleteModal(false)
          }}
          onConfirm={() => {
            // Confirmación de eliminación
            deleteEvent()
          }}
          itemName={`evento de ${getEventTypeName(selectedEvent.eventType)}`}
          isDeleting={isDeleting}
        />
      )}
    </div>
  )
}
