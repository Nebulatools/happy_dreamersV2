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
  SleepSessionBlock
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
  const [children, setChildren] = useState([])
  
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
        const weekStart = startOfDay(date)
        const weekEnd = endOfDay(addDays(date, 6))
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

  const renderWeekView = () => {
    // Mostrar 7 días consecutivos desde la fecha actual (para navegación día por día)
    const days = Array.from({ length: 7 }, (_, i) => addDays(date, i))
    const allWeekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
    
    // Altura optimizada para que todo quepa en una pantalla sin scroll
    const hourHeight = 25 // 25px * 24 horas = 600px total
    
    return (
      <div className="calendar-timeline">
        <div className="week-view-timeline" style={{ maxHeight: "calc(100vh - 280px)", overflow: "auto" }}>
          {/* Timeline Column */}
          <div className="hidden md:block">
            <TimelineColumn hourHeight={hourHeight} />
          </div>
          <div className="md:hidden">
            <CompactTimelineColumn hourHeight={hourHeight} />
          </div>
          
          {/* Days Grid con flechas de navegación día por día */}
          <div className="flex-1 flex">
            {/* Flecha izquierda para retroceder un día */}
            <div className="flex-shrink-0 relative">
              <div className="h-12 border-b border-gray-200 flex items-center justify-center sticky top-0 z-20 bg-white">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-gray-100"
                  onClick={() => setDate(subDays(date, 1))}
                  title="Día anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
              <div className="h-[600px] bg-gray-50/50 border-r border-gray-200 w-10 flex items-center justify-center">
                <ChevronLeft className="h-4 w-4 text-gray-400" />
              </div>
            </div>
            
            {/* Días de la semana */}
            {days.map((day, index) => {
              const dayName = allWeekDays[day.getDay()] // Usar el día real de la semana
              const dayEvents = getEventsForDay(day)
              const isDayToday = isToday(day)
              
              return (
                <div key={day.toString()} className="day-column-timeline">
                  {/* Day Header */}
                  <div 
                    className={cn(
                      "day-header-timeline cursor-pointer hover:bg-gray-50 transition-colors",
                      isDayToday && "bg-blue-50 text-blue-600 hover:bg-blue-100"
                    )}
                    onClick={() => handleDayClick(day)}
                  >
                    <div className="text-xs font-medium opacity-75">{dayName}</div>
                    <div className="text-sm font-bold">
                      {format(day, "d")}
                    </div>
                  </div>
                  
                  {/* Events Timeline Container */}
                  <div 
                    className="events-timeline-container cursor-pointer hover:bg-gray-50/50 transition-colors"
                    onClick={() => handleDayClick(day)}
                  >
                    {/* Hour grid lines - solo líneas principales para menos desorden */}
                    {Array.from({ length: 24 }, (_, hour) => (
                      <div key={hour}>
                        {/* Major hour lines (every 3 hours) */}
                        {hour % 3 === 0 && (
                          <div 
                            className="hour-grid-line-major"
                            style={{ top: `${hour * hourHeight}px` }}
                          />
                        )}
                        {/* Regular hour lines */}
                        {hour % 3 !== 0 && (
                          <div 
                            className="hour-grid-line"
                            style={{ top: `${hour * hourHeight}px` }}
                          />
                        )}
                      </div>
                    ))}
                    
                    {/* Process and render sleep sessions and other events */}
                    {(() => {
                      const { sessions, otherEvents } = processSleepSessions(dayEvents, day)
                      
                      return (
                        <>
                          {/* Render sleep sessions first (lower z-index) */}
                          {sessions.map((session, idx) => (
                            <SleepSessionBlock
                              key={`session-${idx}`}
                              startTime={session.startTime}
                              endTime={session.endTime}
                              originalStartTime={session.originalStartTime}
                              originalEndTime={session.originalEndTime}
                              nightWakings={session.nightWakings}
                              hourHeight={hourHeight}
                              isContinuationFromPrevious={session.isContinuationFromPrevious}
                              continuesNextDay={session.continuesNextDay}
                              onClick={() => handleEventClick(session.originalEvent)}
                              onNightWakingClick={(waking) => handleEventClick(waking)}
                            />
                          ))}
                          
                          {/* Render other events on top */}
                          {otherEvents.map((event) => (
                            <EventBlock
                              key={event._id}
                              event={event}
                              hourHeight={hourHeight}
                              showTooltip={true}
                              onClick={(clickedEvent) => {
                                handleEventClick(clickedEvent)
                              }}
                            />
                          ))}
                        </>
                      )
                    })()}
                    
                    {/* Empty state */}
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
            
            {/* Flecha derecha para avanzar un día */}
            <div className="flex-shrink-0 relative">
              <div className="h-12 border-b border-gray-200 flex items-center justify-center sticky top-0 z-20 bg-white">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-gray-100"
                  onClick={() => setDate(addDays(date, 1))}
                  title="Día siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="h-[600px] bg-gray-50/50 border-l border-gray-200 w-10 flex items-center justify-center">
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderDayView = () => {
    const dayEvents = getEventsForDay(date)
    const hourHeight = 25 // Reducida para que quepa en pantalla sin scroll
    
    return (
      <div className="h-full flex flex-col">
        {/* Header del día - más compacto */}
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {format(date, "EEEE, d 'de' MMMM", { locale: es })}
          </h2>
          {isToday(date) && (
            <div className="text-blue-600 font-medium text-sm">Hoy</div>
          )}
        </div>
        
        {/* Timeline de 24 horas */}
        <div className="calendar-timeline flex-1" style={{ maxHeight: "calc(100vh - 350px)" }}>
          <div className="flex h-full">
            {/* Columna de horas */}
            <TimelineColumn hourHeight={hourHeight} hourInterval={1} />
            
            {/* Columna de eventos del día */}
            <div className="flex-1 relative border-l border-gray-200">
              {/* Header del día - más pequeño */}
              <div 
                className="h-12 bg-white border-b border-gray-200 flex items-center justify-center sticky top-0 z-20 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleDayClick(date)}
              >
                <div className="text-base font-bold">
                  {format(date, "d")}
                </div>
              </div>
              
              {/* Container de eventos */}
              <div 
                className="events-timeline-container relative cursor-pointer hover:bg-gray-50/50 transition-colors"
                onClick={() => handleDayClick(date)}
              >
                {/* Líneas de la grilla de horas */}
                {Array.from({ length: 24 }, (_, hour) => (
                  <div key={hour}>
                    {/* Líneas principales de hora (cada 3 horas) */}
                    {hour % 3 === 0 && (
                      <div 
                        className="hour-grid-line-major"
                        style={{ top: `${hour * hourHeight}px` }}
                      />
                    )}
                    {/* Líneas regulares de hora */}
                    {hour % 3 !== 0 && (
                      <div 
                        className="hour-grid-line"
                        style={{ top: `${hour * hourHeight}px` }}
                      />
                    )}
                  </div>
                ))}
                
                {/* Process and render sleep sessions and other events */}
                {(() => {
                  const { sessions, otherEvents } = processSleepSessions(dayEvents, date)
                  
                  return (
                    <>
                      {/* Render sleep sessions first (lower z-index) */}
                      {sessions.map((session, idx) => (
                        <SleepSessionBlock
                          key={`session-${idx}`}
                          startTime={session.startTime}
                          endTime={session.endTime}
                          originalStartTime={session.originalStartTime}
                          originalEndTime={session.originalEndTime}
                          nightWakings={session.nightWakings}
                          hourHeight={hourHeight}
                          isContinuationFromPrevious={session.isContinuationFromPrevious}
                          continuesNextDay={session.continuesNextDay}
                          onClick={() => handleEventClick(session.originalEvent)}
                          onNightWakingClick={(waking) => handleEventClick(waking)}
                        />
                      ))}
                      
                      {/* Render other events on top */}
                      {otherEvents.map((event) => (
                        <EventBlock
                          key={event._id}
                          event={event}
                          hourHeight={hourHeight}
                          showTooltip={true}
                          onClick={(clickedEvent) => {
                            handleEventClick(clickedEvent)
                          }}
                        />
                      ))}
                    </>
                  )
                })()}
                
                {/* Estado vacío */}
                {dayEvents.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <div className="text-gray-400 text-lg mb-2">No hay eventos registrados</div>
                      <div className="text-gray-500 text-sm">
                        Haz clic para agregar el primer evento del día
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
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
      {/* Leyenda compacta */}
      <div className="flex gap-4 px-6 pt-4">
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

      {/* Resumen con controles de navegación */}
      <div className="px-6">
        <Card className="p-3 md:p-4 bg-gray-50 border-gray-200">
          {/* Primera fila: Navegación y selector de vista */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-3 border-b border-gray-200">
            {/* Navegación de fecha */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
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
              
              <span className="font-semibold text-base min-w-[160px] text-center text-gray-800">
                {view === "month" && format(date, "MMMM yyyy", { locale: es })}
                {view === "week" && `${format(date, "d MMM", { locale: es })} - ${format(addDays(date, 6), "d MMM", { locale: es })}`}
                {view === "day" && format(date, "d 'de' MMMM yyyy", { locale: es })}
              </span>
              
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
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

            {/* Selector de vista */}
            <div className="flex items-center gap-1 bg-white rounded-lg p-1 border border-gray-200">
              <Button
                variant={view === "month" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleViewChange("month")}
                className={`text-xs md:text-sm ${view === "month" ? "hd-gradient-button text-white shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
              >
                Mensual
              </Button>
              <Button
                variant={view === "week" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleViewChange("week")}
                className={`text-xs md:text-sm ${view === "week" ? "hd-gradient-button text-white shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
              >
                Semanal
              </Button>
              <Button
                variant={view === "day" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleViewChange("day")}
                className={`text-xs md:text-sm ${view === "day" ? "hd-gradient-button text-white shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
              >
                Diario
              </Button>
            </div>
          </div>

          {/* Segunda fila: Métricas */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            {/* Título del resumen */}
            <h3 className="text-sm font-semibold text-gray-700">
              {view === "month" && "Resumen del mes"}
              {view === "week" && "Resumen de la semana"}
              {view === "day" && "Resumen del día"}
            </h3>
            
            {/* Métricas en línea */}
            <div className="flex items-center gap-3 md:gap-6 flex-wrap">
              {/* Sueño nocturno */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-sleep/20 flex items-center justify-center">
                  <Moon className="w-4 h-4 text-sleep" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">
                    {view === "day" ? "Sueño" : "Promedio sueño"}
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
                    {view === "day" ? "Siesta" : "Promedio siesta"}
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
        </Card>
      </div>

      {/* Calendario Principal */}
      <div className="px-6 pb-6">
        <Card className={`p-4 ${view === 'month' ? 'h-[600px]' : view === 'day' ? 'h-[calc(100vh-320px)]' : ''}`} style={{ minHeight: '500px' }}>
          {isLoading ? (
            <div className="flex justify-center items-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A90E2] mx-auto mb-4" />
                <p className="text-gray-600">Cargando calendario...</p>
              </div>
            </div>
          ) : (
            view === "month" ? renderMonthLineView() :
            view === "week" ? renderWeekView() :
            renderDayView()
          )}
        </Card>
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
        childName={children && Array.isArray(children) ? children.find((c: any) => c._id === activeChildId)?.name || "el niño" : "el niño"}
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