// Tab de bitacora - Renderiza el calendario completo del nino
// Usa el mismo CalendarPage pero sin usePageHeaderConfig (embedded en hub)

"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useSession } from "next-auth/react"
import { useActiveChild } from "@/context/active-child-context"
import { useEventsCache, useEventsInvalidation } from "@/hooks/use-events-cache"
import {
  CalendarMain,
  MonthLineChart,
  PlanVsEventsCard,
} from "@/components/calendar"
import { SplitScreenBitacora } from "@/components/bitacora/SplitScreenBitacora"
import { EventEditRouter } from "@/components/events/EventEditRouter"
import { EventDetailsModal } from "@/components/events/EventDetailsModal"
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal"
import { processSleepStatistics } from "@/lib/sleep-calculations"
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
  differenceInMinutes,
  isSameDay,
} from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import {
  getStartOfDayAsDate,
  formatTime,
  DEFAULT_TIMEZONE,
} from "@/lib/datetime"
import { getEventBgClass } from "@/lib/colors/event-colors"
import { getEventIconConfig } from "@/lib/icons/event-icons"
import { createLogger } from "@/lib/logger"
import { AnalysisView } from "@/components/bitacora/analysis/AnalysisView"
import { ActivePlanBanner } from "@/components/bitacora/ActivePlanBanner"

const logger = createLogger("BitacoraTab")

interface Event {
  _id: string
  childId: string
  eventType: string
  emotionalState: string
  startTime: string
  endTime?: string
  notes?: string
  duration?: number
  sleepDelay?: number
  didNotSleep?: boolean
  awakeDelay?: number
  feedingType?: "breast" | "bottle" | "solids"
  feedingAmount?: number
  feedingDuration?: number
  babyState?: "awake" | "asleep"
  feedingNotes?: string
  medicationName?: string
  medicationDose?: string
  medicationTime?: string
  medicationNotes?: string
  activityDescription?: string
  activityDuration?: number
  activityImpact?: "positive" | "neutral" | "negative"
  activityNotes?: string
}

interface Child {
  _id: string
  name: string
  [key: string]: any
}

interface MonthlyStats {
  nightSleepHours: number
  napHours: number
  nightWakings: number
  nightSleepChange: number
  napChange: number
  wakingsChange: number
  avgWakeTime: string
  avgNightSleepDelay: string
  avgNapSleepDelay: string
}

interface BitacoraTabProps {
  childId: string
  onNavigateToConsultas?: (subtab?: string) => void
}

export default function BitacoraTab({ childId, onNavigateToConsultas }: BitacoraTabProps) {
  const { toast } = useToast()
  const { data: session } = useSession()
  const userTimeZone = session?.user?.timezone || "America/Monterrey"
  const { activeChildId, activeUserId } = useActiveChild()
  const { refreshTrigger, subscribe } = useEventsCache(activeChildId || childId)
  const invalidateEvents = useEventsInvalidation()

  const effectiveChildId = activeChildId || childId

  const [date, setDate] = useState<Date>(() => {
    return getStartOfDayAsDate(new Date(), userTimeZone)
  })
  const [activePlan, setActivePlan] = useState<any>(null)
  const [view, setView] = useState<"month" | "week" | "day">(() => {
    if (typeof window !== "undefined") {
      const savedView = localStorage.getItem("calendar-view-preference")
      if (savedView && ["month", "week", "day"].includes(savedView)) {
        return savedView as "month" | "week" | "day"
      }
    }
    return "week"
  })
  const [calendarTab, setCalendarTab] = useState<"calendar" | "stats" | "analisis">("calendar")
  const [isLoading, setIsLoading] = useState(true)
  const [events, setEvents] = useState<Event[]>([])
  const [allEventsCache, setAllEventsCache] = useState<Event[]>([])
  const [lastFetchChildId, setLastFetchChildId] = useState<string | null>(null)
  const [children, setChildren] = useState<Child[]>([])
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({
    nightSleepHours: 0,
    napHours: 0,
    nightWakings: 0,
    nightSleepChange: 0,
    napChange: 0,
    wakingsChange: 0,
    avgWakeTime: "--:--",
    avgNightSleepDelay: "--",
    avgNapSleepDelay: "--",
  })

  // Estados para modales de evento
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const calendarContainerRef = useRef<HTMLDivElement>(null)

  // Cambiar vista y guardar preferencia
  const handleViewChange = (newView: "month" | "week" | "day") => {
    setView(newView)
    if (typeof window !== "undefined") {
      localStorage.setItem("calendar-view-preference", newView)
    }
  }

  // Navegacion de fechas
  const navigatePrevious = () => {
    if (view === "month") setDate(subMonths(date, 1))
    else if (view === "week") setDate(subWeeks(date, 1))
    else setDate(subDays(date, 1))
  }

  const navigateNext = () => {
    if (view === "month") setDate(addMonths(date, 1))
    else if (view === "week") setDate(addWeeks(date, 1))
    else setDate(addDays(date, 1))
  }

  const navigateOneDayBack = () => {
    const newDate = subDays(date, 1)
    setDate(newDate)
    if (allEventsCache.length > 0 && lastFetchChildId === effectiveChildId) {
      setEvents(filterEventsByView(allEventsCache, view, newDate))
    }
  }

  const navigateOneDayForward = () => {
    const newDate = addDays(date, 1)
    setDate(newDate)
    if (allEventsCache.length > 0 && lastFetchChildId === effectiveChildId) {
      setEvents(filterEventsByView(allEventsCache, view, newDate))
    }
  }

  const getPeriodTitle = () => {
    if (view === "month") {
      return format(date, "MMMM yyyy", { locale: es })
    } else if (view === "week") {
      const weekStart = startOfWeek(date, { weekStartsOn: 0 })
      const weekEnd = endOfWeek(date, { weekStartsOn: 0 })
      if (isSameMonth(weekStart, weekEnd)) {
        return format(weekStart, "d", { locale: es }) + " - " + format(weekEnd, "d 'de' MMMM yyyy", { locale: es })
      }
      return format(weekStart, "d 'de' MMM", { locale: es }) + " - " + format(weekEnd, "d 'de' MMM yyyy", { locale: es })
    }
    return format(date, "EEEE, d 'de' MMMM yyyy", { locale: es })
  }

  // Filtrar eventos por vista
  const filterEventsByView = useCallback((eventsData: Event[], currentView: string, currentDate: Date) => {
    if (currentView === "month") {
      const monthStart = startOfMonth(currentDate)
      const monthEnd = endOfMonth(currentDate)
      return eventsData.filter((event) => {
        const eventStart = new Date(event.startTime)
        const eventEnd = event.endTime ? new Date(event.endTime) : null
        const startsInMonth = eventStart >= monthStart && eventStart <= monthEnd
        const endsInMonth = eventEnd && eventEnd >= monthStart && eventEnd <= monthEnd
        const crossesMonth = eventStart < monthStart && eventEnd && eventEnd > monthEnd
        return startsInMonth || endsInMonth || crossesMonth
      })
    } else if (currentView === "week") {
      const centerDate = getStartOfDayAsDate(currentDate, userTimeZone)
      const weekStart = subDays(centerDate, 3)
      const weekEnd = endOfDay(addDays(centerDate, 3))
      return eventsData.filter((event) => {
        const eventStart = new Date(event.startTime)
        const eventEnd = event.endTime ? new Date(event.endTime) : null
        const startsInRange = eventStart >= weekStart && eventStart <= weekEnd
        const endsInRange = eventEnd && eventEnd >= weekStart && eventEnd <= weekEnd
        const crossesRange = eventStart < weekStart && eventEnd && eventEnd > weekEnd
        const sleepInProgress = !eventEnd && event.eventType === "sleep" && eventStart < weekEnd
        return startsInRange || endsInRange || crossesRange || sleepInProgress
      })
    } else if (currentView === "day") {
      const dayStart = startOfDay(currentDate)
      const dayEnd = endOfDay(currentDate)
      return eventsData.filter((event) => {
        const eventStart = new Date(event.startTime)
        const eventEnd = event.endTime ? new Date(event.endTime) : null
        const startsInDay = eventStart >= dayStart && eventStart <= dayEnd
        const endsInDay = eventEnd && eventEnd >= dayStart && eventEnd <= dayEnd
        const crossesDay = eventStart < dayStart && eventEnd && eventEnd > dayEnd
        const sleepInProgress = !eventEnd && event.eventType === "sleep" && eventStart < dayEnd
        return startsInDay || endsInDay || crossesDay || sleepInProgress
      })
    }
    return eventsData
  }, [userTimeZone])

  const getEventsForDay = useCallback((day: Date) => {
    const dayStr = format(day, "yyyy-MM-dd")
    const dayStart = startOfDay(day)
    return events.filter(event => {
      if (!event.startTime || event.startTime === "") return false
      const eventStart = new Date(event.startTime)
      const eventEnd = event.endTime ? new Date(event.endTime) : null
      if (event.startTime.startsWith(dayStr)) return true
      if (eventEnd && format(eventEnd, "yyyy-MM-dd") === dayStr) return true
      if (eventStart < dayStart) {
        if (!eventEnd && event.eventType === "sleep") return true
        if (eventEnd && eventEnd > dayStart) return true
      }
      return false
    }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  }, [events])

  // Suscribirse a invalidaciones de cache
  useEffect(() => {
    const unsubscribe = subscribe()
    return unsubscribe
  }, [subscribe])

  // Fetch eventos cuando cambia el nino
  const fetchEvents = useCallback(async (forceRefresh = false) => {
    if (!effectiveChildId || !session) {
      setEvents([])
      setAllEventsCache([])
      setIsLoading(false)
      return
    }

    if (!forceRefresh && lastFetchChildId === effectiveChildId && allEventsCache.length > 0) {
      setEvents(filterEventsByView(allEventsCache, view, date))
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/children/events?childId=${effectiveChildId}`)
      if (!response.ok) throw new Error("Error al cargar eventos")
      const data = await response.json()
      const eventsData = data.events || []

      setAllEventsCache(eventsData)
      setLastFetchChildId(effectiveChildId)
      setEvents(filterEventsByView(eventsData, view, date))
    } catch (error) {
      logger.error("Error:", error)
      toast({ title: "Error", description: "No se pudieron cargar los eventos", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }, [effectiveChildId, session, lastFetchChildId, allEventsCache, view, date, filterEventsByView, toast])

  useEffect(() => {
    if (effectiveChildId && session) {
      fetchEvents(true)
      fetchActivePlan()
    }
  }, [effectiveChildId, refreshTrigger, session])

  // Filtrar desde cache cuando cambia fecha/vista
  useEffect(() => {
    if (effectiveChildId && allEventsCache.length > 0 && lastFetchChildId === effectiveChildId) {
      setEvents(filterEventsByView(allEventsCache, view, date))
    }
  }, [date, view])

  // Auto-scroll a 6AM
  useEffect(() => {
    if ((view === "day" || view === "week") && calendarContainerRef.current && !isLoading) {
      const HOUR_HEIGHT = 30
      setTimeout(() => {
        calendarContainerRef.current?.scrollTo({ top: 6 * HOUR_HEIGHT, behavior: "instant" })
      }, 100)
    }
  }, [view, effectiveChildId, isLoading])

  // Plan activo
  const fetchActivePlan = async () => {
    try {
      if (!effectiveChildId) return
      const userIdForQuery = activeUserId || session?.user?.id
      if (!userIdForQuery) return

      const response = await fetch(`/api/consultas/plans?childId=${effectiveChildId}&userId=${userIdForQuery}`)
      if (!response.ok) { setActivePlan(null); return }
      const data = await response.json()

      if (data.success && data.plans?.length > 0) {
        const found = data.plans
          .filter((p: any) => p.status === "active")
          .sort((a: any, b: any) => b.planNumber - a.planNumber)[0]
        setActivePlan(found || null)
      } else {
        setActivePlan(null)
      }
    } catch { setActivePlan(null) }
  }

  // Cargar ninos para nombre
  useEffect(() => {
    if (effectiveChildId) {
      fetch("/api/children")
        .then(res => res.json())
        .then(data => { if (data.success) setChildren(data.children) })
        .catch(() => {})
    }
  }, [effectiveChildId])

  // Estadisticas mensuales
  const monthEventsForStats = useMemo(() => {
    const source = allEventsCache.length > 0 ? allEventsCache : events
    if (!source.length) return []
    return filterEventsByView(source, "month", date)
  }, [allEventsCache, events, date, filterEventsByView])

  useEffect(() => {
    if (!effectiveChildId) {
      setMonthlyStats({ nightSleepHours: 0, napHours: 0, nightWakings: 0, nightSleepChange: 0, napChange: 0, wakingsChange: 0, avgWakeTime: "--:--", avgNightSleepDelay: "--", avgNapSleepDelay: "--" })
      return
    }
    const source = allEventsCache.length > 0 ? allEventsCache : events
    if (!source.length) { setMonthlyStats({ nightSleepHours: 0, napHours: 0, nightWakings: 0, nightSleepChange: 0, napChange: 0, wakingsChange: 0, avgWakeTime: "--:--", avgNightSleepDelay: "--", avgNapSleepDelay: "--" }); return }
    const monthScoped = filterEventsByView(source, "month", date)
    const sleepEvents = monthScoped.map(event => ({
      _id: event._id, eventType: event.eventType, startTime: event.startTime,
      endTime: event.endTime, notes: event.notes, emotionalState: event.emotionalState, sleepDelay: event.sleepDelay,
    }))
    if (sleepEvents.length === 0) {
      setMonthlyStats({ nightSleepHours: 0, napHours: 0, nightWakings: 0, nightSleepChange: 0, napChange: 0, wakingsChange: 0, avgWakeTime: "--:--", avgNightSleepDelay: "--", avgNapSleepDelay: "--" })
      return
    }
    const stats = processSleepStatistics(sleepEvents)
    setMonthlyStats({
      nightSleepHours: stats.avgSleepDuration, napHours: stats.avgNapDuration,
      nightWakings: Math.round(stats.totalWakeups), nightSleepChange: 0, napChange: 0, wakingsChange: 0,
      avgWakeTime: stats.avgWakeTime || "--:--",
      avgNightSleepDelay: stats.bedtimeToSleepDifference || "--",
      avgNapSleepDelay: stats.avgNapSleepDelay || "--",
    })
  }, [effectiveChildId, allEventsCache, events, date, filterEventsByView])

  // Eventos del dia para vista diaria
  const dayEvents = useMemo(() => {
    const dayStart = startOfDay(date)
    const dayEnd = endOfDay(date)
    return events.filter((event) => {
      const eventDate = new Date(event.startTime)
      return eventDate >= dayStart && eventDate <= dayEnd
    })
  }, [events, date])

  const activeChildName = useMemo(() => {
    if (!children?.length) return "el bebe"
    const child = children.find((c) => c._id === effectiveChildId)
    return child?.name || "el bebe"
  }, [children, effectiveChildId])

  // Handlers de eventos
  const handleEventClick = (event: Event) => {
    setSelectedEvent(event)
    setIsDetailsModalOpen(true)
  }

  const deleteEvent = async () => {
    if (!selectedEvent) return
    setIsDeleting(true)
    try {
      const childQuery = selectedEvent.childId ? `?childId=${selectedEvent.childId}` : effectiveChildId ? `?childId=${effectiveChildId}` : ""
      const response = await fetch(`/api/children/events/${selectedEvent._id}${childQuery}`, { method: "DELETE" })
      const responseData = await response.json()
      if (!response.ok) throw new Error(responseData.message || "Error al eliminar")

      await fetchEvents(true)
      invalidateEvents()
      toast({ title: "Evento eliminado", description: "El evento ha sido eliminado correctamente." })
      setIsDetailsModalOpen(false)
      setIsEditModalOpen(false)
      setSelectedEvent(null)
      setShowDeleteModal(false)
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "No se pudo eliminar el evento.", variant: "destructive" })
    } finally {
      setIsDeleting(false)
    }
  }

  // Iconos y colores (sistema centralizado)
  const getEventTypeIcon = (type: string, feedingType?: "breast" | "bottle" | "solids") => {
    const config = getEventIconConfig(type, feedingType)
    const IconComponent = config.icon
    return <IconComponent className="w-3 h-3" style={{ color: "white" }} />
  }

  const getEventTypeColor = (type: string, feedingType?: "breast" | "bottle" | "solids") => {
    return `${getEventBgClass(type, feedingType)} event-pill`
  }

  const getEventTypeName = (type: string) => {
    const types: Record<string, string> = {
      sleep: "Dormir", nap: "Siesta", wake: "Despertar", night_waking: "Despertar nocturno",
      feeding: "Alimentacion", night_feeding: "Alimentacion nocturna", medication: "Medicamento",
      activity: "Actividad Extra", extra_activities: "Actividad Extra",
    }
    return types[type] || type
  }

  // Render vista mensual (grid de dias)
  const renderMonthView = () => {
    const monthStart = startOfMonth(date)
    const monthEnd = endOfMonth(date)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 })
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })
    const days = eachDayOfInterval({ start: startDate, end: endDate })
    const weekDays = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"]

    return (
      <div className="h-full flex flex-col">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-gray-600 py-1">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 flex-1">
          {days.map((day) => {
            const dayEvts = getEventsForDay(day)
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
              >
                <div className="text-xs font-medium mb-1 text-right">{format(day, "d")}</div>
                <div className="space-y-0">
                  {dayEvts.slice(0, 4).map((event) => (
                    <div
                      key={event._id}
                      className={cn(getEventTypeColor(event.eventType, event.feedingType), "flex items-center gap-0.5 cursor-pointer hover:opacity-80 z-10 relative px-1 py-px rounded")}
                      style={{ fontSize: "9px", lineHeight: "1.1" }}
                      onClick={(e) => { e.stopPropagation(); handleEventClick(event) }}
                    >
                      {getEventTypeIcon(event.eventType, event.feedingType)}
                      <span className="truncate" style={{ fontSize: "10px" }}>{formatTime(event.startTime, userTimeZone)}</span>
                    </div>
                  ))}
                  {dayEvts.length > 4 && <div className="text-xs text-gray-500 text-center">+{dayEvts.length - 4}</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderMonthLineView = () => (
    <div className="h-full flex flex-col">
      <MonthLineChart
        events={monthEventsForStats}
        currentDate={date}
        onEventClick={handleEventClick}
        className="h-full"
        idealBedtime={activePlan?.schedule?.bedtime}
        idealWakeTime={activePlan?.schedule?.wakeTime}
        timezone={userTimeZone}
      />
    </div>
  )

  if (!effectiveChildId) {
    return (
      <div className="text-center py-16 text-gray-500">
        Selecciona un nino para ver su bitacora.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Barra superior: tabs + vistas + navegacion - sticky al hacer scroll */}
      <div className="sticky top-0 z-10 bg-[#DEF1F1] pb-3 -mx-1 px-1">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {/* Tabs Calendario / Estadisticas */}
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
                Estadisticas
              </Button>
              <Button
                variant={calendarTab === "analisis" ? "default" : "ghost"}
                size="sm"
                className={calendarTab === "analisis" ? "bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] text-white" : "text-gray-600"}
                onClick={() => setCalendarTab("analisis")}
              >
                Analisis
              </Button>
            </div>

            {/* Selector de vista: Mensual / Semanal / Diario */}
            {calendarTab === "calendar" && (
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-fit">
                <Button variant={view === "month" ? "default" : "ghost"} size="sm" className={view === "month" ? "bg-white shadow-sm" : ""} onClick={() => handleViewChange("month")}>Mensual</Button>
                <Button variant={view === "week" ? "default" : "ghost"} size="sm" className={view === "week" ? "bg-white shadow-sm" : ""} onClick={() => handleViewChange("week")}>Semanal</Button>
                <Button variant={view === "day" ? "default" : "ghost"} size="sm" className={view === "day" ? "bg-white shadow-sm" : ""} onClick={() => handleViewChange("day")}>Diario</Button>
              </div>
            )}
          </div>

          {/* Navegacion de periodo */}
          {calendarTab === "calendar" && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={navigatePrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium text-gray-700 min-w-[180px] text-center">
                {getPeriodTitle()}
              </span>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={navigateNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Banner del plan activo */}
      <ActivePlanBanner
        plan={activePlan}
        onViewFullPlan={onNavigateToConsultas ? () => onNavigateToConsultas("planes") : undefined}
      />

      {/* Contenido principal */}
      {calendarTab === "analisis" ? (
        <AnalysisView
          events={allEventsCache.length > 0 ? allEventsCache : events}
          childName={activeChildName}
          timezone={userTimeZone}
        />
      ) : calendarTab === "calendar" ? (
        <Card ref={calendarContainerRef} className="p-4 h-[calc(100vh-300px)] overflow-auto" style={{ minHeight: "450px" }}>
          <div className="h-full">
            {isLoading ? (
              <div className="flex justify-center items-center h-96">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A90E2] mx-auto mb-4" />
                  <p className="text-gray-600">Cargando calendario...</p>
                </div>
              </div>
            ) : view === "day" ? (
              <div className="space-y-4">
                <PlanVsEventsCard
                  plan={activePlan}
                  events={dayEvents}
                  selectedDate={date}
                  timezone={userTimeZone}
                />
                <SplitScreenBitacora
                  events={events}
                  childName={activeChildName}
                  selectedDate={date}
                  timezone={userTimeZone}
                  onEventUpdate={invalidateEvents}
                  onDayNavigateBack={navigateOneDayBack}
                  onDayNavigateForward={navigateOneDayForward}
                />
              </div>
            ) : (
              <CalendarMain
                events={events}
                onEventClick={handleEventClick}
                monthView={renderMonthView()}
                initialDate={date}
                initialView={view}
                onDayNavigateBack={navigateOneDayBack}
                onDayNavigateForward={navigateOneDayForward}
              />
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resumen del periodo</CardTitle>
              <CardDescription>Promedios calculados para el mes seleccionado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Sueno nocturno", value: `${monthlyStats.nightSleepHours.toFixed(1)}h`, tone: "text-[#4A90E2]", subtitle: monthlyStats.avgNightSleepDelay !== "--" ? `Tiempo para dormir: ${monthlyStats.avgNightSleepDelay}` : null },
                  { label: "Siestas", value: `${monthlyStats.napHours.toFixed(1)}h`, tone: "text-[#F5A524]", subtitle: monthlyStats.avgNapSleepDelay !== "--" ? `Tiempo para siesta: ${monthlyStats.avgNapSleepDelay}` : null },
                  { label: "Despertares", value: `${monthlyStats.nightWakings}`, tone: "text-[#D97706]", subtitle: null },
                  { label: "Hora de despertar", value: monthlyStats.avgWakeTime || "--:--", tone: "text-[#16A34A]", subtitle: null },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-gray-100 bg-gradient-to-br from-white to-gray-50 p-4">
                    <p className="text-xs uppercase tracking-wider text-gray-500">{item.label}</p>
                    <p className={`text-2xl font-semibold mt-2 ${item.tone}`}>{item.value}</p>
                    {item.subtitle && <p className="mt-1 text-[11px] text-gray-500">{item.subtitle}</p>}
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
              <Badge variant="outline" className="text-xs">{format(date, "MMMM yyyy", { locale: es })}</Badge>
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
                <div className="h-80 flex items-center justify-center text-gray-500">No hay eventos registrados este mes.</div>
              ) : (
                <div className="h-[420px]">{renderMonthLineView()}</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modales de evento */}
      <EventDetailsModal
        event={selectedEvent}
        open={isDetailsModalOpen}
        onOpenChange={setIsDetailsModalOpen}
        onEdit={() => { setIsDetailsModalOpen(false); setIsEditModalOpen(true) }}
        onDelete={() => setShowDeleteModal(true)}
        userTimeZone={userTimeZone}
      />

      <EventEditRouter
        event={selectedEvent}
        open={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setSelectedEvent(null) }}
        onUpdate={() => {
          invalidateEvents()
          setIsEditModalOpen(false)
          setIsDetailsModalOpen(false)
          setSelectedEvent(null)
        }}
        childName={activeChildName}
      />

      {selectedEvent && (
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={deleteEvent}
          itemName={`evento de ${getEventTypeName(selectedEvent.eventType)}`}
          isDeleting={isDeleting}
        />
      )}
    </div>
  )
}
