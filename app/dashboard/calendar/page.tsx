// Página de Calendario de Sueño según diseño de Figma
// Muestra eventos de sueño en vista mensual/semanal/diaria con resumen estadístico

"use client"

import React, { useState, useEffect, useMemo } from "react"
import { createLogger } from "@/lib/logger"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { useSession } from "next-auth/react"
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
  CalendarMain,
  SimpleSleepBarChart,
  UserWeeklySleepChart
} from "@/components/calendar"
import type { DailySleepPoint, NightWakingPoint } from "@/components/calendar/SimpleSleepBarChart"
import type { DailyUserSleepData } from "@/components/calendar/UserWeeklySleepChart"
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
  isSameDay,
} from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { startOfDayUTCForTZ } from "@/lib/timezone"

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
  avgWakeTime: string;
}

const WEEKDAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

const capitalizeSentence = (value: string) => {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

interface WeeklySummaryResult {
  points: DailySleepPoint[]
  wakingPoints: NightWakingPoint[]
  averages: {
    totalHours: number
    nightHours: number
    napHours: number
    nightWakings: number
  }
}

const computeWeeklySleepSummary = (events: Event[], referenceDate: Date, timeZone: string): WeeklySummaryResult => {
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 0 })
  const weekEnd = addDays(weekStart, 6)
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const points: DailySleepPoint[] = []
  const wakingPoints: NightWakingPoint[] = []

  days.forEach((day) => {
    const dayStart = startOfDayUTCForTZ(day, timeZone)
    const dayEnd = addDays(dayStart, 1)
    let nightMinutes = 0
    let napMinutes = 0
    const segments: { start: Date; end: Date; minutes: number }[] = []
    const wakingEvents: Event[] = []

    events.forEach((event) => {
      if (!event.startTime) return
      const eventStart = new Date(event.startTime)

      if (event.eventType === "night_waking") {
        if (eventStart >= dayStart && eventStart <= dayEnd) {
          wakingEvents.push(event)
        }
        return
      }

      if (!event.endTime) {
        return
      }

      const eventEnd = new Date(event.endTime)

      if (eventEnd <= dayStart || eventStart >= dayEnd) {
        return
      }

      const overlapStart = eventStart < dayStart ? dayStart : eventStart
      const overlapEnd = eventEnd > dayEnd ? dayEnd : eventEnd
      const minutes = differenceInMinutes(overlapEnd, overlapStart)

      if (minutes <= 0) {
        return
      }

      if (event.eventType === "sleep" || event.eventType === "nap") {
        segments.push({ start: overlapStart, end: overlapEnd, minutes })
        if (event.eventType === "sleep") {
          nightMinutes += minutes
        } else {
          napMinutes += minutes
        }
      }
    })

    const totalMinutes = nightMinutes + napMinutes
    const totalHours = totalMinutes / 60
    const nightHours = nightMinutes / 60
    const napHours = napMinutes / 60

    const sortedSegments = segments.sort((a, b) => a.start.getTime() - b.start.getTime())
    const wakingPositions = wakingEvents
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .map((wakeEvent) => {
        if (totalMinutes === 0) return 0
        const wakeTime = new Date(wakeEvent.startTime)
        let accumulatedMinutes = 0

        for (const segment of sortedSegments) {
          if (wakeTime >= segment.end) {
            accumulatedMinutes += segment.minutes
          } else if (wakeTime <= segment.start) {
            break
          } else {
            accumulatedMinutes += Math.max(0, differenceInMinutes(wakeTime, segment.start))
            break
          }
        }

        const ratio = totalMinutes > 0 ? accumulatedMinutes / totalMinutes : 0
        return Number((totalHours * ratio).toFixed(2))
      })

    const isoDate = dayStart.toISOString()
    const label = WEEKDAY_LABELS[day.getDay()]
    const displayDate = capitalizeSentence(
      format(day, "EEEE d 'de' MMMM", { locale: es })
    )

    const dayPoint: DailySleepPoint = {
      label,
      isoDate,
      displayDate,
      nightHours: Number(nightHours.toFixed(2)),
      napHours: Number(napHours.toFixed(2)),
      totalHours: Number(totalHours.toFixed(2)),
      wakingsCount: wakingEvents.length,
      wakingPositions,
    }

    points.push(dayPoint)

    wakingPositions.forEach((value) => {
      wakingPoints.push({
        label,
        value,
        isoDate,
      })
    })
  })

  const activePoints = points.filter((day) =>
    day.nightHours > 0 || day.napHours > 0 || day.totalHours > 0 || day.wakingsCount > 0
  )

  const dayCount = activePoints.length || points.length || 1
  const totalNightHours = activePoints.reduce((sum, day) => sum + day.nightHours, 0)
  const totalNapHours = activePoints.reduce((sum, day) => sum + day.napHours, 0)
  const totalDailyHours = activePoints.reduce((sum, day) => sum + day.totalHours, 0)
  const totalNightWakings = activePoints.reduce((sum, day) => sum + day.wakingsCount, 0)

  const averages = {
    totalHours: dayCount ? totalDailyHours / dayCount : 0,
    nightHours: dayCount ? totalNightHours / dayCount : 0,
    napHours: dayCount ? totalNapHours / dayCount : 0,
    nightWakings: dayCount ? totalNightWakings / dayCount : 0,
  }

  return { points, wakingPoints, averages }
}

const formatHoursLabel = (hours: number) => {
  const totalMinutes = Math.round(hours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (totalMinutes === 0) return "0h"
  if (m === 0) return `${h}h`
  return `${h}h ${m.toString().padStart(2, "0")}min`
}

// Función para calcular datos del gráfico de usuario
// Muestra las horas de sueño desde la noche del día anterior hasta el despertar del día actual
const computeUserWeeklySleepData = (events: Event[], endDate: Date, timeZone: string) => {
  // Calcular 7 días hacia atrás desde endDate
  const days: Date[] = []
  for (let i = 6; i >= 0; i--) {
    days.push(subDays(endDate, i))
  }

  const userSleepData = days.map((day) => {
    // Para cada día, consideramos:
    // - Sueño nocturno: eventos "sleep" que terminan en este día (pueden empezar el día anterior)
    // - Siestas: eventos "nap" que ocurren durante este día
    // - Despertares: eventos "night_waking" que ocurren durante el sueño nocturno

    const dayStart = startOfDayUTCForTZ(day, timeZone)
    const dayEnd = addDays(dayStart, 1)

    let nightMinutes = 0
    let napMinutes = 0
    const wakingTimes: Date[] = []
    const sleepSegments: { start: Date; end: Date; minutes: number }[] = []

    // Primer paso: encontrar el segmento de sueño nocturno del día
    events.forEach((event) => {
      if (!event.startTime) return
      const eventStart = new Date(event.startTime)

      // Procesar eventos de sueño nocturno
      if (event.eventType === "sleep" && event.endTime) {
        const eventEnd = new Date(event.endTime)

        // Si el sueño termina en este día (puede haber empezado el día anterior)
        if (eventEnd >= dayStart && eventEnd <= dayEnd) {
          const duration = differenceInMinutes(eventEnd, eventStart)
          nightMinutes += duration
          sleepSegments.push({ start: eventStart, end: eventEnd, minutes: duration })
        }
      }

      // Procesar siestas del día
      if (event.eventType === "nap" && event.endTime) {
        const eventEnd = new Date(event.endTime)

        // Si la siesta ocurre durante este día
        if (eventStart >= dayStart && eventStart <= dayEnd) {
          const duration = differenceInMinutes(eventEnd, eventStart)
          napMinutes += duration
        }
      }
    })

    // Segundo paso: filtrar despertares que están dentro del segmento de sueño de ESTE día
    if (sleepSegments.length > 0) {
      const sleepSegment = sleepSegments[0] // Asumimos un solo período de sueño nocturno

      events.forEach((event) => {
        if (!event.startTime) return
        const eventStart = new Date(event.startTime)

        // Procesar despertares nocturnos que están dentro del segmento de sueño
        if (event.eventType === "night_waking") {
          if (eventStart >= sleepSegment.start && eventStart <= sleepSegment.end) {
            wakingTimes.push(eventStart)
          }
        }
      })
    }

    const totalMinutes = nightMinutes + napMinutes
    const totalHours = totalMinutes / 60
    const nightHours = nightMinutes / 60
    const napHours = napMinutes / 60

    // Calcular posiciones de los despertares en el eje Y
    // Las posiciones deben ser relativas al sueño nocturno SOLAMENTE
    const wakingPositions = wakingTimes
      .sort((a, b) => a.getTime() - b.getTime())
      .map((wakeTime) => {
        if (nightMinutes === 0 || sleepSegments.length === 0) return 0

        const sleepSegment = sleepSegments[0] // Ya sabemos que hay un segmento

        // Calcular los minutos transcurridos desde el inicio del sueño hasta el despertar
        const minutesFromStart = differenceInMinutes(wakeTime, sleepSegment.start)

        // Convertir a horas y retornar (posición dentro del sueño nocturno en horas)
        return Number((minutesFromStart / 60).toFixed(2))
      })
      .filter(pos => pos > 0) // Eliminar posiciones inválidas

    const label = format(day, "EEE", { locale: es }).charAt(0).toUpperCase() + format(day, "EEE", { locale: es }).slice(1)
    const dateNumber = format(day, "d")
    const displayDate = format(day, "EEEE d 'de' MMMM", { locale: es })

    return {
      label,
      dateNumber,
      isoDate: day.toISOString(),
      displayDate,
      nightHours: Number(nightHours.toFixed(2)),
      napHours: Number(napHours.toFixed(2)),
      totalHours: Number(totalHours.toFixed(2)),
      wakingsCount: wakingTimes.length,
      wakingPositions,
    }
  })

  return userSleepData
}

export default function CalendarPage() {
  const { toast } = useToast()
  const { data: session } = useSession()
  const userTimeZone = session?.user?.timezone || "America/Monterrey"
  const isAdminView = session?.user?.role === "admin" || session?.user?.role === "professional"
  const { activeChildId, activeUserId } = useActiveChild()
  const { refreshTrigger, subscribe } = useEventsCache(activeChildId)
  const invalidateEvents = useEventsInvalidation()
  // Inicializar con la fecha actual
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
  const [calendarTab, setCalendarTab] = useState<"calendar" | "stats">("calendar")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isAdminView) return
    if (view !== "week") {
      handleViewChange("week")
    }
  }, [isAdminView, view])

  useEffect(() => {
    if (!isAdminView && calendarTab !== "calendar") {
      setCalendarTab("calendar")
    }
  }, [isAdminView, calendarTab])
  
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
    if (!isAdminView) {
      const todayStart = startOfDay(new Date())
      const minAllowed = subDays(todayStart, 6)
      const nextDate = subDays(date, 1)

      if (startOfDay(nextDate) < minAllowed) {
        return
      }

      setDate(nextDate)
      return
    }

    if (view === "month") {
      setDate(subMonths(date, 1))
    } else if (view === "week") {
      setDate(subWeeks(date, 1))
    } else {
      setDate(subDays(date, 1))
    }
  }

  const navigateNext = () => {
    // Para usuarios no admin, verificar si pueden navegar hacia adelante
    if (!isAdminView) {
      const today = startOfDayUTCForTZ(new Date(), userTimeZone)
      const nextDate = addDays(date, 1)

      if (startOfDay(nextDate) > today) {
        return
      }

      setDate(nextDate)
      return
    }

    if (view === "month") {
      setDate(addMonths(date, 1))
    } else if (view === "week") {
      setDate(addWeeks(date, 1))
    } else {
      setDate(addDays(date, 1))
    }
  }

  const getClampedUserDate = () => {
    if (isAdminView) return date

    const today = startOfDayUTCForTZ(new Date(), userTimeZone)
    const minAllowed = subDays(today, 6)
    const normalized = startOfDayUTCForTZ(date, userTimeZone)

    if (normalized > today) return today
    if (normalized < minAllowed) return minAllowed
    return normalized
  }

  // Función para obtener el título del período según la vista
  const getPeriodTitle = () => {
    if (view === "month") {
      return format(date, "MMMM yyyy", { locale: es })
    } else if (view === "week") {
      // Para vista semanal, mostrar el rango de 7 días centrado en la fecha seleccionada
      const weekStart = addDays(date, -3) // 3 días antes del centro
      const weekEnd = addDays(date, 3) // 3 días después del centro
      if (isSameMonth(weekStart, weekEnd)) {
        return format(weekStart, "d", { locale: es }) + " - " + format(weekEnd, "d 'de' MMMM yyyy", { locale: es })
      } else {
        return format(weekStart, "d 'de' MMM", { locale: es }) + " - " + format(weekEnd, "d 'de' MMM yyyy", { locale: es })
      }
    } else {
      return format(date, "EEEE, d 'de' MMMM yyyy", { locale: es })
    }
  }

  // Cache de eventos para optimizar navegación
  const [allEventsCache, setAllEventsCache] = useState<Event[]>([])
  const [lastFetchChildId, setLastFetchChildId] = useState<string | null>(null)

  // Funciones de navegación día por día optimizadas
  const navigateOneDayBack = () => {
    const newDate = subDays(date, 1)
    
    // Actualizar fecha inmediatamente
    setDate(newDate)
    
    // Filtrar eventos inmediatamente desde cache si está disponible
    if (allEventsCache.length > 0 && lastFetchChildId === activeChildId) {
      const filteredEvents = filterEventsByView(allEventsCache, view, newDate)
      setEvents(filteredEvents)
      
      // Log para debugging
      if (view === "week") {
        const currentWeekStart = startOfWeek(date, { weekStartsOn: 0 })
        const newWeekStart = startOfWeek(newDate, { weekStartsOn: 0 })
        
        if (currentWeekStart.getTime() !== newWeekStart.getTime()) {
          logger.info("Navegación día: Cambiando de semana hacia atrás", {
            currentWeek: format(currentWeekStart, "dd/MM"),
            newWeek: format(newWeekStart, "dd/MM"),
            eventsCount: filteredEvents.length
          })
        }
      }
    }
  }

  const navigateOneDayForward = () => {
    const newDate = addDays(date, 1)
    
    // Actualizar fecha inmediatamente
    setDate(newDate)
    
    // Filtrar eventos inmediatamente desde cache si está disponible
    if (allEventsCache.length > 0 && lastFetchChildId === activeChildId) {
      const filteredEvents = filterEventsByView(allEventsCache, view, newDate)
      setEvents(filteredEvents)
      
      // Log para debugging
      if (view === "week") {
        const currentWeekStart = startOfWeek(date, { weekStartsOn: 0 })
        const newWeekStart = startOfWeek(newDate, { weekStartsOn: 0 })
        
        if (currentWeekStart.getTime() !== newWeekStart.getTime()) {
          logger.info("Navegación día: Cambiando de semana hacia adelante", {
            currentWeek: format(currentWeekStart, "dd/MM"),
            newWeek: format(newWeekStart, "dd/MM"),
            eventsCount: filteredEvents.length
          })
        }
      }
    }
  }

  const filterToLastSevenDays = (eventsData: Event[]) => {
    const todayStart = startOfDayUTCForTZ(new Date(), userTimeZone)
    const cutoff = subDays(todayStart, 6)
    return eventsData.filter((event: Event) => {
      if (!event.startTime) return false
      const eventDate = new Date(event.startTime)
      return eventDate >= cutoff
    })
  }

  // Función auxiliar para filtrar eventos por vista
  const filterEventsByView = (eventsData: Event[], currentView: string, currentDate: Date) => {
    let filteredEvents = eventsData

    if (currentView === "month") {
      filteredEvents = eventsData.filter((event: Event) => {
        const eventDate = new Date(event.startTime)
        return eventDate.getMonth() === currentDate.getMonth() &&
               eventDate.getFullYear() === currentDate.getFullYear()
      })
    } else if (currentView === "week") {
      // CAMBIO: Usar el mismo rango de 7 días que CalendarWeekView (centrando la fecha seleccionada)
      const weekStart = addDays(currentDate, -3) // 3 días antes del centro
      const weekEnd = endOfDay(addDays(currentDate, 3)) // 3 días después del centro
      filteredEvents = eventsData.filter((event: Event) => {
        const eventDate = new Date(event.startTime)
        return eventDate >= weekStart && eventDate <= weekEnd
      })
    } else if (currentView === "day") {
      const dayStart = startOfDay(currentDate)
      const dayEnd = endOfDay(currentDate)
      filteredEvents = eventsData.filter((event: Event) => {
        const eventDate = new Date(event.startTime)
        return eventDate >= dayStart && eventDate <= dayEnd
      })
    }

    if (!isAdminView) {
      filteredEvents = filterToLastSevenDays(filteredEvents)
    }

    return filteredEvents
  }

  const [events, setEvents] = useState<Event[]>([])
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({
    nightSleepHours: 0,
    napHours: 0,
    nightWakings: 0,
    nightSleepChange: 0,
    napChange: 0,
    wakingsChange: 0,
    avgWakeTime: "--:--",
  })
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [quickSelectorOpen, setQuickSelectorOpen] = useState(false)
  const [selectedDateForEvent, setSelectedDateForEvent] = useState<Date | null>(null)
  const [children, setChildren] = useState<Child[]>([])
  const [selectedSimpleDayIso, setSelectedSimpleDayIso] = useState<string | null>(null)
  
  // Estados para el diálogo de edición
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // Configurar el header dinámico - simplificado con solo botón de agregar
  const headerActions = useMemo(() => {
    if (!isAdminView) return null
    return (
      <div className="flex items-center gap-2">
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
    )
  }, [isAdminView])

  usePageHeaderConfig({
    title: "Calendario",
    actions: headerActions,
    showSearch: false,
    showChildSelector: true,
    showNotifications: true
  })

  // Suscribirse a invalidaciones de cache
  useEffect(() => {
    const unsubscribe = subscribe()
    return unsubscribe
  }, [subscribe])

  // Cargar datos cuando cambia el niño activo o hay refresh forzado
  useEffect(() => {
    if (activeChildId && session) {
      fetchEvents(true) // Forzar refresh desde servidor
      fetchActivePlan()
    }
  }, [activeChildId, activeUserId, refreshTrigger, session])

  // Filtrar desde cache cuando solo cambia fecha o vista (sin niño activo o refresh)
  useEffect(() => {
    if (activeChildId && allEventsCache.length > 0 && lastFetchChildId === activeChildId) {
      filterEventsFromCache()
    }
  }, [date, view])
  
  // Función para obtener el plan activo del niño
  const fetchActivePlan = async () => {
    try {
      if (!activeChildId) return

      // Para vistas de admin usamos el padre seleccionado, para padres usamos su propio id
      const userIdForQuery = activeUserId || session?.user?.id

      if (!userIdForQuery) {
        logger.error('No se pudo determinar el usuario para consultar planes', {
          activeUserId,
          sessionUserId: session?.user?.id
        })
        return
      }

      const response = await fetch(`/api/consultas/plans?childId=${activeChildId}&userId=${userIdForQuery}`)
      
      if (!response.ok) {
        logger.error('Error al obtener planes:', response.status)
        setActivePlan(null)
        return
      }
      
      const data = await response.json()
      
      if (data.success && data.plans && data.plans.length > 0) {
        // Buscar el plan activo (el de mayor planNumber con status 'active')
        const activePlanFound = data.plans
          .filter((plan: any) => plan.status === 'active')
          .sort((a: any, b: any) => b.planNumber - a.planNumber)[0]
        
        if (activePlanFound) {
          setActivePlan(activePlanFound)
          logger.info('Plan activo obtenido:', {
            planNumber: activePlanFound.planNumber,
            bedtime: activePlanFound.schedule?.bedtime,
            wakeTime: activePlanFound.schedule?.wakeTime
          })
        } else {
          // Sin plan activo: no mostrar líneas ideales
          setActivePlan(null)
          logger.info('No hay plan activo, omitiendo líneas ideales')
        }
      } else {
        // No hay planes para este niño
        setActivePlan(null)
      }
    } catch (error) {
      logger.error('Error al obtener plan activo:', error)
      setActivePlan(null)
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

  const fetchEvents = async (forceRefresh = false) => {
    if (!activeChildId || !session) {
      logger.warn('No se puede cargar eventos: faltan identificadores requeridos', {
        activeChildId,
        hasSession: !!session,
      })
      setEvents([])
      setAllEventsCache([])
      setIsLoading(false)
      return
    }

    // Si es la misma child y no es un refresh forzado, usar cache para filtrar
    if (!forceRefresh && lastFetchChildId === activeChildId && allEventsCache.length > 0) {
      filterEventsFromCache()
      return
    }

    setIsLoading(true)
    try {
      logger.debug('Cargando eventos para niño activo', { activeChildId })
      const response = await fetch(`/api/children/events?childId=${activeChildId}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        logger.error('Error HTTP al cargar eventos', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        })
        throw new Error("Error al cargar eventos")
      }
      
      const data = await response.json()
      const eventsData = data.events || []
      
      logger.info('Eventos cargados exitosamente', { count: eventsData.length })
      
      // Log para debugging: verificar orden de eventos recibidos
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Detalles de eventos cargados (solo desarrollo)', {
          events: eventsData.map((e: Event) => ({
            id: e._id,
            time: e.startTime,
            type: e.eventType,
          })),
        })
      }
      
      // Actualizar cache
      setAllEventsCache(eventsData)
      setLastFetchChildId(activeChildId)
      
      // Filtrar y mostrar
      const filteredEvents = filterEventsByView(eventsData, view, date)
      setEvents(filteredEvents)
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

  // Función para filtrar desde cache (más rápida)
  const filterEventsFromCache = () => {
    const filteredEvents = filterEventsByView(allEventsCache, view, date)
    setEvents(filteredEvents)
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

    if (sleepEvents.length === 0) {
      setMonthlyStats({
        nightSleepHours: 0,
        napHours: 0,
        nightWakings: 0,
        nightSleepChange: 0,
        napChange: 0,
        wakingsChange: 0,
        avgWakeTime: "--:--",
      })
      return
    }

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
      avgWakeTime: stats.avgWakeTime || "--:--",
    })
  }

  useEffect(() => {
    if (!activeChildId) {
      setMonthlyStats({
        nightSleepHours: 0,
        napHours: 0,
        nightWakings: 0,
        nightSleepChange: 0,
        napChange: 0,
        wakingsChange: 0,
        avgWakeTime: "--:--",
      })
      return
    }

    const sourceEvents = allEventsCache.length > 0 ? allEventsCache : events
    if (!sourceEvents.length) {
      calculateMonthlyStats([])
      return
    }
    const monthScoped = filterEventsByView(sourceEvents, "month", date)
    calculateMonthlyStats(monthScoped)
  }, [activeChildId, allEventsCache, events, date])

  const weeklySummary = useMemo(() => {
    const sourceEvents = allEventsCache.length > 0 ? allEventsCache : events
    const scopedEvents = isAdminView ? sourceEvents : filterToLastSevenDays(sourceEvents)
    const referenceDate = isAdminView ? date : getClampedUserDate()
    return computeWeeklySleepSummary(scopedEvents, referenceDate, userTimeZone)
  }, [isAdminView, allEventsCache, events, date, userTimeZone])

  // Datos para la vista de usuario (parent)
  const userWeeklySleepData = useMemo(() => {
    if (isAdminView) return []
    const sourceEvents = allEventsCache.length > 0 ? allEventsCache : events
    const scopedEvents = filterToLastSevenDays(sourceEvents)
    return computeUserWeeklySleepData(scopedEvents, getClampedUserDate(), userTimeZone)
  }, [isAdminView, allEventsCache, events, date, userTimeZone])

  const monthEventsForStats = useMemo(() => {
    const sourceEvents = allEventsCache.length > 0 ? allEventsCache : events
    if (!sourceEvents.length) return []
    return filterEventsByView(sourceEvents, "month", date)
  }, [allEventsCache, events, date])

  useEffect(() => {
    if (isAdminView) return
    if (!weeklySummary.points || weeklySummary.points.length === 0) {
      setSelectedSimpleDayIso(null)
      return
    }

    const todayIso = weeklySummary.points.find((point) =>
      isSameDay(new Date(point.isoDate), new Date())
    )?.isoDate

    const fallbackIso = weeklySummary.points[0]?.isoDate ?? null
    const nextIso = todayIso ?? fallbackIso

    setSelectedSimpleDayIso((prev) => {
      if (prev && weeklySummary.points.some((point) => point.isoDate === prev)) {
        return prev
      }
      return nextIso
    })
  }, [isAdminView, weeklySummary])

  const getEventsForDay = (day: Date) => {
    const dayStr = format(day, "yyyy-MM-dd")
    const dayStart = startOfDay(day)
    const dayEnd = endOfDay(day)
    
    const dayEvents = events.filter(event => {
      // Validar que el evento tenga startTime y no sea vacío
      if (!event.startTime || event.startTime === '') {
        logger.warn('Evento sin startTime válido, omitiendo', { eventId: event._id })
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

  const selectedSimpleDayPoint = useMemo(() => {
    if (!selectedSimpleDayIso) return null
    return weeklySummary.points.find((point) => point.isoDate === selectedSimpleDayIso) || null
  }, [selectedSimpleDayIso, weeklySummary])

  const selectedSimpleDayEvents = useMemo(() => {
    if (!selectedSimpleDayIso) return []
    return getEventsForDay(new Date(selectedSimpleDayIso))
  }, [selectedSimpleDayIso, events])

  const selectedSimpleDayTitle = selectedSimpleDayPoint
    ? capitalizeSentence(format(new Date(selectedSimpleDayPoint.isoDate), "EEEE d 'de' MMMM", { locale: es }))
    : "Selecciona un día"

  const userAverageTotal = formatHoursLabel(weeklySummary.averages.totalHours)
  const userAverageNight = formatHoursLabel(weeklySummary.averages.nightHours)
  const userAverageNap = formatHoursLabel(weeklySummary.averages.napHours)
  const userAverageWakings = Math.round(weeklySummary.averages.nightWakings)

  const selectedSimpleDayMetrics = selectedSimpleDayPoint
    ? {
        total: formatHoursLabel(selectedSimpleDayPoint.totalHours),
        night: formatHoursLabel(selectedSimpleDayPoint.nightHours),
        nap: formatHoursLabel(selectedSimpleDayPoint.napHours),
        wakings: selectedSimpleDayPoint.wakingsCount,
      }
    : null

  const userWeekLabel = useMemo(() => {
    const start = startOfWeek(date, { weekStartsOn: 0 })
    const end = endOfWeek(date, { weekStartsOn: 0 })
    const startText = format(start, "d MMM", { locale: es })
    const endText = format(end, "d MMM", { locale: es })
    return `${startText} - ${endText}`
  }, [date])

  const monthLabel = useMemo(() => {
    return format(date, "LLLL yyyy", { locale: es }).toUpperCase()
  }, [date])

  // Para usuarios (parents), calcular si pueden navegar hacia adelante
  // No se permite navegar más allá del día actual
  const canNavigateForward = useMemo(() => {
    if (isAdminView) return true // Admins siempre pueden navegar

    const today = startOfDay(new Date())
    const currentEndDate = startOfDay(date)

    return currentEndDate < today
  }, [isAdminView, date])

  const canNavigateBackward = useMemo(() => {
    if (isAdminView) return true

    const today = startOfDay(new Date())
    const minAllowed = subDays(today, 6)
    const currentEndDate = startOfDay(date)

    return currentEndDate > minAllowed
  }, [isAdminView, date])

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
      const childQuery = selectedEvent.childId
        ? `?childId=${selectedEvent.childId}`
        : activeChildId
          ? `?childId=${activeChildId}`
          : ""
      const response = await fetch(`/api/children/events/${selectedEvent._id}${childQuery}`, {
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
    // NOTA: Incluir eventos wake que no fueron emparejados con sleep
    const otherEvents = dayEvents.filter(e => !processedEventIds.has(e._id))
    
    return { sessions, otherEvents }
  }

  const renderMonthLineView = () => {
    return (
      <div className="h-full flex flex-col">
        <MonthLineChart 
          events={monthEventsForStats}
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
                
                <div className="space-y-0">
                  {dayEvents.slice(0, 4).map((event) => (
                    <div
                      key={event._id}
                      className={cn(
                        getEventTypeColor(event.eventType),
                        "flex items-center gap-0.5 cursor-pointer hover:opacity-80 z-10 relative px-1 py-px rounded"
                      )}
                      style={{ fontSize: '9px', lineHeight: '1.1' }}
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
      {isAdminView ? (
        <>
          {/* Barra superior: tabs + leyenda */}
          <div className="flex flex-col gap-4 px-6 pt-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-white rounded-lg shadow-sm p-1">
                  <Button
                    variant={calendarTab === "calendar" ? "default" : "ghost"}
                    size="sm"
                    className={calendarTab === "calendar" ? "bg-gradient-to-r from-[#4A90E2] to-[#68A1C8] text-white" : "text-gray-600"}
                    onClick={() => setCalendarTab("calendar")}
                  >
                    Calendario
                  </Button>
                  <Button
                    variant={calendarTab === "stats" ? "default" : "ghost"}
                    size="sm"
                    className={calendarTab === "stats" ? "bg-gradient-to-r from-[#FBCFE8] to-[#FDE68A] text-[#3A3A3A]" : "text-gray-600"}
                    onClick={() => setCalendarTab("stats")}
                  >
                    Estadísticas
                  </Button>
                </div>

                {calendarTab === "calendar" && (
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
                )}
              </div>

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

          {calendarTab === "calendar" ? (
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
                  <CalendarMain
                    events={events}
                    onEventClick={handleEventClick}
                    onCreateEvent={(clickTime) => {
                      setSelectedDateForEvent(clickTime.date)
                    }}
                    monthView={renderMonthView()}
                    initialDate={date}
                    initialView={view}
                    onDayNavigateBack={navigateOneDayBack}
                    onDayNavigateForward={navigateOneDayForward}
                  />
                )}
              </Card>
            </div>
          ) : (
            <div className="px-6 pb-10 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Resumen del período</CardTitle>
                  <CardDescription>Promedios calculados para el mes seleccionado</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    {[{
                      label: "Sueño nocturno",
                      value: `${monthlyStats.nightSleepHours.toFixed(1)}h`,
                      tone: "text-[#4A90E2]"
                    }, {
                      label: "Siestas",
                      value: `${monthlyStats.napHours.toFixed(1)}h`,
                      tone: "text-[#F5A524]"
                    }, {
                      label: "Despertares",
                      value: `${monthlyStats.nightWakings}`,
                      tone: "text-[#D97706]"
                    }, {
                      label: "Hora de despertar",
                      value: monthlyStats.avgWakeTime || "--:--",
                      tone: "text-[#16A34A]"
                    }].map((item) => (
                      <div key={item.label} className="rounded-xl border border-gray-100 bg-gradient-to-br from-white to-gray-50 p-4">
                        <p className="text-xs uppercase tracking-wider text-gray-500">{item.label}</p>
                        <p className={`text-2xl font-semibold mt-2 ${item.tone}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Tendencias del mes</CardTitle>
                    <CardDescription>Promedios diarios de dormir, siestas y despertares</CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {format(date, "MMMM yyyy", { locale: es })}
                  </Badge>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center items-center h-80 text-gray-500">
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
                        <p>Cargando tendencias...</p>
                      </div>
                    </div>
                  ) : monthEventsForStats.length === 0 ? (
                    <div className="h-80 flex items-center justify-center text-gray-500">
                      No hay eventos registrados este mes.
                    </div>
                  ) : (
                    <div className="h-[420px]">
                      {renderMonthLineView()}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6 px-4 pt-4 pb-10 md:px-6">
          {/* Header con mes y año */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">{monthLabel}</p>
          </div>

          {/* Gráfico de barras apiladas */}
          <Card className="p-4 md:p-6">
            <div className="flex flex-col gap-4">
              {/* Header con título y navegación (solo mobile) */}
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">
                  Últimos 7 días
                </h3>
                {/* Navegación anterior/siguiente */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={navigatePrevious}
                    disabled={!canNavigateBackward}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={navigateNext}
                    disabled={!canNavigateForward}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Gráfico principal */}
              {isLoading ? (
                <div className="flex justify-center items-center h-96">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A90E2] mx-auto mb-4" />
                    <p className="text-gray-600">Cargando datos...</p>
                  </div>
                </div>
              ) : (
                <UserWeeklySleepChart data={userWeeklySleepData} />
              )}
            </div>
          </Card>
        </div>
      )}

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
                  setIsEditModalOpen(true)
                }}
                className="w-full sm:w-auto"
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar
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
