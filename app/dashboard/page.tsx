"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { UserAvatar } from "@/components/ui/user-avatar"
import { useToast } from "@/hooks/use-toast"
import { useSession } from "next-auth/react"
import { useActiveChild } from "@/context/active-child-context"
import { useEventsCache } from "@/hooks/use-events-cache"
import AdminStatistics from "@/components/dashboard/AdminStatistics"
import SleepMetricsGrid from "@/components/child-profile/SleepMetricsGrid"
// Sistema de eventos - Nueva implementación v1.0
import { EventRegistration } from "@/components/events"
import { 
  Moon, Sun, Activity, TrendingUp, Calendar, MessageSquare, 
  Lightbulb, ChevronLeft, ChevronRight, Send, X,
} from "lucide-react"
import {
  format,
  parseISO,
  differenceInMinutes,
  getHours,
  getMinutes,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
} from "date-fns"
import { es } from "date-fns/locale"

import { createLogger } from "@/lib/logger"

const logger = createLogger("page")


interface Child {
  _id: string
  firstName: string
  lastName: string
  birthDate?: string
  parentId: string
}

interface Event {
  _id: string
  childId: string
  eventType: string
  emotionalState: string
  startTime: string
  endTime?: string
  notes?: string
  createdAt: string
}


export default function DashboardPage() {
  const { toast } = useToast()
  const { data: session } = useSession()
  const { activeChildId } = useActiveChild()
  const { refreshTrigger, subscribe } = useEventsCache(activeChildId)
  
  // Detectar si el usuario es admin
  const isAdmin = session?.user?.role === "admin"
  
  const [child, setChild] = useState<Child | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [noteText, setNoteText] = useState("")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedPeriod, setSelectedPeriod] = useState<"7d" | "30d" | "3m">("7d")
  const [isAddingNote, setIsAddingNote] = useState(false)
  
  // Ya no redirigimos, manejamos todo en esta página

  // Suscribirse a invalidaciones de cache
  useEffect(() => {
    const unsubscribe = subscribe()
    return unsubscribe
  }, [subscribe])

  // Cargar datos del niño activo
  useEffect(() => {
    if (activeChildId) {
      loadChildData()
    }
  }, [activeChildId, refreshTrigger])

  const loadChildData = async () => {
    if (!activeChildId) return
    
    try {
      setIsLoading(true)
      
      // Cargar datos del niño
      const childResponse = await fetch(`/api/children/${activeChildId}`)
      if (childResponse.ok) {
        const childData = await childResponse.json()
        setChild(childData)
      }
      
      // Cargar eventos del niño
      const eventsResponse = await fetch(`/api/children/events?childId=${activeChildId}`)
      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json()
        setEvents(eventsData.events || [])
      }
    } catch (error) {
      logger.error("Error loading child data:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del niño.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }


  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "¡Buenos días"
    if (hour < 18) return "¡Buenas tardes"
    return "¡Buenas noches"
  }

  const getMoodEmoji = (mood: string) => {
    // Función deshabilitada - ya no usamos emojis en UI
    return ""
  }


  // Datos del calendario (últimos 7 días)
  const getWeekDays = () => {
    const start = startOfWeek(currentDate, { locale: es })
    const end = endOfWeek(currentDate, { locale: es })
    return eachDayOfInterval({ start, end })
  }

  const getDayQuality = (date: Date) => {
    const dayEvents = events.filter(event => 
      event.startTime && isSameDay(parseISO(event.startTime), date)
    )
    
    if (dayEvents.length === 0) return null
    
    const sleepEvent = dayEvents.find(e => e.eventType === "sleep")
    if (!sleepEvent) return null
    
    // Simular calidad basada en el estado emocional
    const mood = sleepEvent.emotionalState?.toLowerCase()
    if (mood === "happy" || mood === "feliz") return "good"
    if (mood === "tired" || mood === "cansado") return "poor"
    if (mood === "stressed" || mood === "estresado") return "poor"
    return "average"
  }

  // Función para agregar una nueva nota
  const handleAddNote = async () => {
    if (!noteText.trim() || !activeChildId) return
    
    try {
      setIsAddingNote(true)
      
      const response = await fetch('/api/children/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          childId: activeChildId,
          eventType: 'note',
          emotionalState: 'neutral',
          startTime: new Date().toISOString(),
          notes: noteText.trim(),
        }),
      })
      
      if (response.ok) {
        setNoteText('')
        loadChildData() // Recargar datos para mostrar la nueva nota
        toast({
          title: "Nota agregada",
          description: "La nota se ha guardado correctamente.",
        })
      } else {
        throw new Error('Error al guardar la nota')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la nota. Intenta de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsAddingNote(false)
    }
  }

  // Función para eliminar una nota
  const handleDeleteNote = async (eventId: string) => {
    try {
      const response = await fetch(`/api/children/events/${eventId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        loadChildData() // Recargar datos
        toast({
          title: "Nota eliminada",
          description: "La nota se ha eliminado correctamente.",
        })
      } else {
        throw new Error('Error al eliminar la nota')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la nota. Intenta de nuevo.",
        variant: "destructive",
      })
    }
  }

  // Generar datos del gráfico según el período seleccionado
  const getSleepChartData = () => {
    const now = new Date()
    let startDate: Date
    let dateFormat: string
    let groupBy: string
    
    switch (selectedPeriod) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        dateFormat = "d MMM"
        groupBy = "day"
        break
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        dateFormat = "d MMM"
        groupBy = "day"
        break
      case "3m":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        dateFormat = "MMM"
        groupBy = "week"
        break
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        dateFormat = "d MMM"
        groupBy = "day"
    }
    
    // Filtrar eventos del período
    const periodEvents = events.filter(event => {
      // Solo procesar eventos que tengan startTime definido
      if (!event.startTime) return false
      
      const eventDate = parseISO(event.startTime)
      return eventDate >= startDate && eventDate <= now && 
             (event.eventType === "sleep" || event.eventType === "nap") && 
             event.endTime
    })
    
    // Agrupar por día/semana
    const groupedData = new Map()
    
    periodEvents.forEach(event => {
      // Validación adicional de seguridad
      if (!event.startTime) return
      
      const eventDate = parseISO(event.startTime)
      let groupKey: string
      
      if (groupBy === "day") {
        groupKey = format(eventDate, "yyyy-MM-dd")
      } else {
        // Agrupar por semana
        const startOfWeekDate = startOfWeek(eventDate)
        groupKey = format(startOfWeekDate, "yyyy-MM-dd")
      }
      
      if (!groupedData.has(groupKey)) {
        groupedData.set(groupKey, {
          date: eventDate,
          totalMinutes: 0,
          events: []
        })
      }
      
      const duration = differenceInMinutes(parseISO(event.endTime!), eventDate)
      const group = groupedData.get(groupKey)
      group.totalMinutes += duration
      group.events.push(event)
    })
    
    // Convertir a array y formatear - PROMEDIO en lugar de SUMA
    return Array.from(groupedData.entries()).map(([key, data]) => {
      // Calcular promedio de horas por día en el período
      const avgHoursPerDay = groupBy === "week" 
        ? Number((data.totalMinutes / 60 / 7).toFixed(1)) // Promedio semanal dividido por 7 días
        : Number((data.totalMinutes / 60).toFixed(1)) // Total del día
      
      return {
        label: format(data.date, dateFormat, { locale: es }),
        hours: avgHoursPerDay,
        date: data.date
      }
    }).sort((a, b) => a.date.getTime() - b.date.getTime())
  }

  const recentMoods = events
    .filter(e => e.emotionalState && e.startTime)
    .slice(-5)
    .reverse()

  if (!activeChildId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Activity className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold">Selecciona un niño</h2>
        <p className="text-muted-foreground text-center">
          Elige un niño desde el selector para ver su dashboard de sueño.
        </p>
      </div>
    )
  }

  // Si es admin, mostrar las estadísticas completas
  if (isAdmin) {
    return <AdminStatistics />
  }

  return (
    <div className="min-h-screen bg-[#F5F9FF] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Saludo personalizado */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[#2F2F2F]">
            {getGreeting()}, {session?.user?.name?.split(" ")[0] || "Usuario"}!
          </h1>
          <p className="text-[#666666]">
            Aquí tienes un resumen del sueño de {child?.firstName || "tu niño"} de los últimos 7 días.
          </p>
        </div>

        {/* Métricas principales - usando el componente de sleep-statistics */}
        {activeChildId ? (
          <SleepMetricsGrid childId={activeChildId} dateRange="7-days" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="col-span-full bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
              <p className="text-gray-500">Por favor selecciona un niño desde el menú superior para ver las métricas</p>
            </div>
          </div>
        )}

        {/* Sistema de Registro de Eventos - v1.0 MVP */}
        {activeChildId && child && (
          <div className="mb-8">
            <EventRegistration 
              childId={activeChildId}
              childName={child.firstName}
              onEventRegistered={loadChildData}
            />
          </div>
        )}

        {/* Grid de contenido principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tendencia de Sueño */}
          <Card className="bg-white shadow-sm border-0 lg:col-span-2">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#2F2F2F]">Tendencia de Sueño</CardTitle>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => setSelectedPeriod("7d")}
                    className={selectedPeriod === "7d" ? "bg-[#F0F7FF] text-[#4A90E2] hover:bg-[#E8F4FF] h-8" : "h-8"}
                    variant={selectedPeriod === "7d" ? "default" : "ghost"}
                  >
                    7 días
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => setSelectedPeriod("30d")}
                    className={selectedPeriod === "30d" ? "bg-[#F0F7FF] text-[#4A90E2] hover:bg-[#E8F4FF] h-8" : "text-[#666666] h-8"}
                    variant={selectedPeriod === "30d" ? "default" : "ghost"}
                  >
                    30 días
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => setSelectedPeriod("3m")}
                    className={selectedPeriod === "3m" ? "bg-[#F0F7FF] text-[#4A90E2] hover:bg-[#E8F4FF] h-8" : "text-[#666666] h-8"}
                    variant={selectedPeriod === "3m" ? "default" : "ghost"}
                  >
                    3 meses
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-[#F8FAFC] rounded-xl p-4">
                {(() => {
                  const chartData = getSleepChartData()
                  const maxHours = Math.max(...chartData.map(d => d.hours), 1)
                  
                  if (chartData.length === 0) {
                    return (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center space-y-2">
                          <TrendingUp className="h-12 w-12 text-[#E3E6EA] mx-auto" />
                          <p className="text-[#666666] text-sm">No hay datos de sueño para este período</p>
                        </div>
                      </div>
                    )
                  }
                  
                  return (
                    <div className="h-full flex flex-col">
                      <div className="flex-1 flex items-end justify-between gap-2">
                        {chartData.map((data, index) => (
                          <div key={`chart-${data.label}-${index}`} className="flex flex-col items-center flex-1">
                            <div 
                              className="bg-[#4A90E2] rounded-t-md w-full transition-all duration-300 hover:bg-[#357ABD] flex items-end justify-center relative"
                              style={{ 
                                height: `${Math.max((data.hours / maxHours) * 80, 8)}%`,
                                minHeight: data.hours > 0 ? '12px' : '4px'
                              }}
                              title={`${data.hours} horas`}
                            >
                              {data.hours > 0 && (
                                <span className="text-white text-xs font-medium mb-1">
                                  {data.hours}h
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-[#666666] mt-2 text-center">
                              {data.label}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex justify-between text-xs text-[#666666]">
                        <span>0h</span>
                        <span className="text-[#4A90E2] font-medium">
                          Período: {selectedPeriod === "7d" ? "7 días" : selectedPeriod === "30d" ? "30 días" : "3 meses"}
                        </span>
                        <span>{Math.ceil(maxHours)}h</span>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Estado de Ánimo */}
          <Card className="bg-white shadow-sm border-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-[#2F2F2F]">Estado de Ánimo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentMoods.length > 0 ? recentMoods.map((event) => {
                  if (!event.startTime) return null
                  const eventDate = parseISO(event.startTime)
                  const isToday = isSameDay(eventDate, new Date())
                  const daysDiff = Math.floor((Date.now() - eventDate.getTime()) / (1000 * 60 * 60 * 24))
                  
                  // Determinar el texto de fecha
                  let dateText
                  if (isToday) {
                    dateText = "Hoy"
                  } else if (daysDiff === 1) {
                    dateText = "Ayer"
                  } else if (daysDiff <= 6) {
                    dateText = format(eventDate, "EEEE", { locale: es })
                  } else {
                    dateText = format(eventDate, "d MMM", { locale: es })
                  }
                  
                  // Determinar color del badge según el estado
                  const getBadgeColor = (mood: string) => {
                    const normalizedMood = mood.toLowerCase()
                    if (normalizedMood.includes('happy') || normalizedMood.includes('feliz') || normalizedMood.includes('calm') || normalizedMood.includes('tranquilo')) {
                      return "bg-green-50 text-green-700"
                    } else if (normalizedMood.includes('tired') || normalizedMood.includes('cansado') || normalizedMood.includes('restless') || normalizedMood.includes('inquieto')) {
                      return "bg-yellow-50 text-yellow-700"
                    } else if (normalizedMood.includes('stressed') || normalizedMood.includes('estresado') || normalizedMood.includes('anxious') || normalizedMood.includes('ansioso')) {
                      return "bg-red-50 text-red-700"
                    }
                    return "bg-blue-50 text-blue-700" // neutral
                  }
                  
                  return (
                    <div key={event._id} className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-sm text-[#3A3A3A] font-medium">
                          {dateText}
                        </p>
                      </div>
                      <Badge className={`${getBadgeColor(event.emotionalState)} text-xs`}>
                        {event.emotionalState}
                      </Badge>
                    </div>
                  )
                }) : (
                  <p className="text-[#666666] text-sm text-center py-8">
                    No hay datos de estado de ánimo recientes
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Segunda fila del grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendario de Sueño */}
          <Card className="bg-white shadow-sm border-0">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#2F2F2F]">Calendario de Sueño</CardTitle>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-[#3A3A3A] font-medium">
                {format(currentDate, "MMMM yyyy", { locale: es })}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Días de la semana */}
                <div className="grid grid-cols-7 gap-2 text-xs text-center text-[#666666] font-medium">
                  {["L", "M", "X", "J", "V", "S", "D"].map(day => (
                    <div key={day}>{day}</div>
                  ))}
                </div>
                
                {/* Días del calendario */}
                <div className="grid grid-cols-7 gap-2">
                  {getWeekDays().map(date => {
                    const quality = getDayQuality(date)
                    const isToday = isSameDay(date, new Date())
                    
                    return (
                      <div key={date.toISOString()} className="aspect-square flex items-center justify-center">
                        {quality ? (
                          <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                            ${quality === "good" ? "bg-green-600 text-white" : ""}
                            ${quality === "average" ? "bg-yellow-500 text-white" : ""}
                            ${quality === "poor" ? "bg-red-500 text-white" : ""}
                          `}>
                            {format(date, "d")}
                          </div>
                        ) : (
                          <div className={`text-xs ${isToday ? "font-bold text-[#3A3A3A]" : "text-[#9CA3AF]"}`}>
                            {format(date, "d")}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Leyenda */}
                <div className="flex justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                    <span className="text-[#666666]">Buena calidad</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-[#666666]">Regular</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-[#666666]">Mala</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notas Recientes */}
          <Card className="bg-white shadow-sm border-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-[#2F2F2F]">Notas Recientes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mostrar notas reales de eventos recientes */}
              <div className="space-y-3">
                {(() => {
                  const notesEvents = events.filter(e => e.notes).slice(0, 3)
                  return notesEvents.length > 0 ? (
                    notesEvents.map((event, index) => (
                    <div key={`note-${event._id}-${index}`} className="bg-[#EDE5FF] rounded-2xl rounded-tl-sm p-3 relative group">
                      <button
                        onClick={() => handleDeleteNote(event._id)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded-full"
                        title="Eliminar nota"
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </button>
                      <p className="text-sm text-[#3A3A3A] leading-relaxed pr-6">
                        {event.notes}
                      </p>
                      <p className="text-xs text-[#666666] mt-2">
                        {event.startTime ? format(parseISO(event.startTime), "d MMM, HH:mm", { locale: es }) : 'Sin hora'}
                      </p>
                    </div>
                  ))
                ) : (
                  <div key="no-notes" className="text-center py-8 text-gray-500">
                    <p className="text-sm">No hay notas recientes</p>
                    <p className="text-xs mt-2">Registra eventos para ver las notas aquí</p>
                  </div>
                )})()}
              </div>

              {/* Input para nueva nota */}
              <div className="flex gap-2 pt-2">
                <input
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddNote()}
                  placeholder="Añadir una nota..."
                  disabled={isAddingNote}
                  className="flex-1 px-4 py-3 bg-white border border-[#E5E5E5] rounded-xl text-sm placeholder-[#ADAEBC] focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent disabled:opacity-50"
                />
                <Button 
                  size="sm" 
                  onClick={handleAddNote}
                  disabled={!noteText.trim() || isAddingNote}
                  className="h-12 w-12 p-0 bg-[#4A90E2] hover:bg-[#357ABD] border-0 shadow-none disabled:opacity-50"
                >
                  <Send className="h-4 w-4 text-white" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Consejos Personalizados */}
          <Card className="bg-white shadow-sm border-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-[#2F2F2F]">Consejos Personalizados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-[#F0F7FF] rounded-xl p-4 space-y-3">
                <div className="flex gap-3">
                  <div className="h-8 w-8 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="h-4 w-4 text-[#4A90E2]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-[#2553A1] mb-1">Mantén un horario regular</h4>
                    <p className="text-xs text-[#666666] leading-relaxed">
                      Acostar a {child?.firstName} todos los días a la misma hora ayuda a regular su reloj biológico.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-[#F0F7FF] rounded-xl p-4 space-y-3">
                <div className="flex gap-3">
                  <div className="h-8 w-8 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                    <Moon className="h-4 w-4 text-[#4A90E2]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-[#2553A1] mb-1">Ambiente de sueño</h4>
                    <p className="text-xs text-[#666666] leading-relaxed">
                      Una habitación oscura, tranquila y ligeramente fresca promueve un mejor descanso.
                    </p>
                  </div>
                </div>
              </div>

              <Button variant="ghost" className="w-full text-[#4A90E2] hover:bg-[#F0F7FF] justify-center">
                Ver todos los consejos
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
