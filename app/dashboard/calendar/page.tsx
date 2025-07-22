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
  Minus
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useActiveChild } from "@/context/active-child-context"
import { EventRegistrationModal } from "@/components/events"
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
  parse,
  differenceInHours,
  differenceInMinutes
} from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"

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
    wakingsChange: 0
  })
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [children, setChildren] = useState([])

  // Cargar datos cuando cambia el niño activo o el mes
  useEffect(() => {
    fetchEvents()
  }, [activeChildId, date])

  // Cargar lista de niños para el modal
  useEffect(() => {
    if (eventModalOpen) {
      fetch('/api/children')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setChildren(data.children)
          }
        })
        .catch(console.error)
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
      if (!response.ok) throw new Error('Error al cargar eventos')
      
      const data = await response.json()
      const eventsData = data.events || []
      
      // Filtrar eventos del mes actual
      const monthEvents = eventsData.filter((event: Event) => {
        const eventDate = new Date(event.startTime)
        return eventDate.getMonth() === date.getMonth() && 
               eventDate.getFullYear() === date.getFullYear()
      })
      
      setEvents(monthEvents)
      calculateMonthlyStats(monthEvents)
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los eventos",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const calculateMonthlyStats = (monthEvents: Event[]) => {
    let nightSleepTotal = 0
    let napTotal = 0
    let wakingsCount = 0

    monthEvents.forEach(event => {
      if (event.eventType === 'sleep') {
        // Calcular duración si hay endTime
        if (event.endTime) {
          const duration = differenceInHours(new Date(event.endTime), new Date(event.startTime))
          nightSleepTotal += duration
        }
      } else if (event.eventType === 'nap') {
        if (event.endTime) {
          const duration = differenceInHours(new Date(event.endTime), new Date(event.startTime))
          napTotal += duration
        }
      } else if (event.eventType === 'wake') {
        wakingsCount++
      }
    })

    // Calcular promedios diarios
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    const avgNightSleep = nightSleepTotal / daysInMonth
    const avgNap = napTotal / daysInMonth

    // TODO: Calcular cambios respecto al mes anterior
    setMonthlyStats({
      nightSleepHours: avgNightSleep,
      napHours: avgNap,
      nightWakings: wakingsCount,
      nightSleepChange: 0.3, // Placeholder
      napChange: 0,
      wakingsChange: -2
    })
  }

  const getEventsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd')
    return events.filter(event => event.startTime.startsWith(dayStr))
  }

  const getEventTypeIcon = (type: string) => {
    switch(type) {
      case 'sleep':
        return <Moon className="w-3 h-3" />
      case 'nap':
        return <Sun className="w-3 h-3" />
      case 'wake':
        return <AlertCircle className="w-3 h-3" />
      default:
        return null
    }
  }

  const getEventTypeColor = (type: string) => {
    switch(type) {
      case 'sleep':
        return 'bg-sleep event-pill'
      case 'nap':
        return 'bg-nap event-pill'
      case 'wake':
        return 'bg-wake event-pill'
      default:
        return 'bg-gray-400 event-pill'
    }
  }

  const formatEventTime = (event: Event) => {
    const start = new Date(event.startTime)
    if (event.eventType === 'wake') {
      return format(start, 'HH:mm')
    }
    if (event.endTime) {
      const end = new Date(event.endTime)
      return `${format(start, 'HH:mm')}-${format(end, 'HH:mm')}`
    }
    return format(start, 'HH:mm')
  }

  const renderMonthView = () => {
    const monthStart = startOfMonth(date)
    const monthEnd = endOfMonth(date)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 })
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })
    
    const days = eachDayOfInterval({ start: startDate, end: endDate })
    const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    
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
                  {format(day, 'd')}
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

  const renderStatCard = (
    title: string, 
    value: string, 
    unit: string, 
    change: number, 
    changeLabel: string,
    type?: 'sleep' | 'nap' | 'wake'
  ) => {
    const isPositive = change > 0
    const isNeutral = change === 0
    const Icon = isPositive ? TrendingUp : (isNeutral ? Minus : TrendingDown)
    const color = isPositive ? "text-green-600" : (isNeutral ? "text-gray-600" : "text-red-600")
    
    // Determinar el color de fondo según el tipo
    const bgColorClass = type === 'sleep' ? 'bg-sleep/10' : 
                        type === 'nap' ? 'bg-nap/10' : 
                        type === 'wake' ? 'bg-wake/10' : ''
    
    const borderColorClass = type === 'sleep' ? 'border-sleep' : 
                            type === 'nap' ? 'border-nap' : 
                            type === 'wake' ? 'border-wake' : ''
    
    const iconColorClass = type === 'sleep' ? 'bg-sleep' : 
                          type === 'nap' ? 'bg-nap' : 
                          type === 'wake' ? 'bg-wake' : ''
    
    return (
      <div className={cn("p-5 rounded-lg border", bgColorClass, borderColorClass)}>
        <div className="flex items-start gap-4">
          <div className={cn("w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0", iconColorClass)}>
            {type === 'sleep' && <Moon className="w-6 h-6 text-white" />}
            {type === 'nap' && <Cloud className="w-6 h-6 text-white" />}
            {type === 'wake' && <AlertCircle className="w-6 h-6 text-white" />}
          </div>
          <div className="flex-1 space-y-3">
            <h4 className="text-sm font-medium text-gray-600">{title}</h4>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#2F2F2F]">{value}</span>
              <span className="text-sm text-gray-500">{unit}</span>
            </div>
          </div>
        </div>
        <div className={cn("flex items-center gap-2 mt-4 pt-4 border-t", color, borderColorClass + '/20')}>
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
              onClick={() => setDate(subMonths(date, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <span className="font-medium text-lg min-w-[140px] text-center">
              {format(date, 'MMMM yyyy', { locale: es })}
            </span>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => setDate(addMonths(date, 1))}
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

      {/* Controles de vista */}
      <div className="flex gap-2">
        <Button
          variant={view === 'month' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('month')}
          className={view === 'month' ? 'hd-gradient-button text-white' : ''}
        >
          Mensual
        </Button>
        <Button
          variant={view === 'week' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('week')}
          disabled
        >
          Semanal
        </Button>
        <Button
          variant={view === 'day' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('day')}
          disabled
        >
          Diario
        </Button>
      </div>

      {/* Leyenda */}
      <div className="flex gap-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-sleep" />
          <span className="text-sm text-gray-600">Sueño nocturno</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-nap" />
          <span className="text-sm text-gray-600">Siesta</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-wake" />
          <span className="text-sm text-gray-600">Despertar nocturno</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendario */}
        <Card className="lg:col-span-3 p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A90E2] mx-auto mb-4" />
                <p className="text-gray-600">Cargando calendario...</p>
              </div>
            </div>
          ) : (
            renderMonthView()
          )}
        </Card>

        {/* Panel de Resumen */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Resumen del mes</h3>
          
          <div className="space-y-6">
            {renderStatCard(
              "Horas de sueño nocturno",
              monthlyStats.nightSleepHours.toFixed(1),
              "horas",
              monthlyStats.nightSleepChange,
              "horas más que el mes pasado",
              "sleep"
            )}
            
            {renderStatCard(
              "Tiempo de siesta",
              monthlyStats.napHours.toFixed(1),
              "horas",
              monthlyStats.napChange,
              "respecto al mes pasado",
              "nap"
            )}
            
            {renderStatCard(
              "Despertares nocturnos",
              monthlyStats.nightWakings.toString(),
              "",
              monthlyStats.wakingsChange,
              "menos que el mes pasado",
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
          fetchEvents()
          setEventModalOpen(false)
        }}
      />
    </div>
  )
}