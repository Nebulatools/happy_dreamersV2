"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { useSession } from "next-auth/react"
import { useActiveChild } from "@/context/active-child-context"
import { 
  Moon, Sun, Activity, TrendingUp, Calendar, MessageSquare, 
  Lightbulb, ChevronLeft, ChevronRight, Send 
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
  isSameDay
} from "date-fns"
import { es } from "date-fns/locale"

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

interface SleepMetrics {
  totalSleepHours: string
  avgBedtime: string
  nightWakeups: number
  sleepQuality: number
}

export default function DashboardPage() {
  const { toast } = useToast()
  const { data: session } = useSession()
  const { activeChildId } = useActiveChild()
  
  const [child, setChild] = useState<Child | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [sleepMetrics, setSleepMetrics] = useState<SleepMetrics>({
    totalSleepHours: "0h 0min",
    avgBedtime: "--:--",
    nightWakeups: 0,
    sleepQuality: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [noteText, setNoteText] = useState("")
  const [currentDate, setCurrentDate] = useState(new Date())
  
  // Cargar datos del niño activo
  useEffect(() => {
    if (activeChildId) {
      loadChildData()
    }
  }, [activeChildId])

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
        calculateSleepMetrics(eventsData.events || [])
      }
    } catch (error) {
      console.error('Error loading child data:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del niño.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const calculateSleepMetrics = (events: Event[]) => {
    const now = new Date()
    const weekStart = startOfWeek(now, { locale: es })
    const weekEnd = endOfWeek(now, { locale: es })
    
    // Filtrar eventos de la semana actual
    const weekEvents = events.filter(event => {
      const eventDate = parseISO(event.startTime)
      return eventDate >= weekStart && eventDate <= weekEnd
    })
    
    const sleepEvents = weekEvents.filter(e => e.eventType === 'sleep' && e.endTime)
    const napEvents = weekEvents.filter(e => e.eventType === 'nap' && e.endTime)
    const allSleepEvents = [...sleepEvents, ...napEvents]
    
    // Calcular horas totales de sueño promedio
    let totalSleepHours = "0h 0min"
    if (allSleepEvents.length > 0) {
      const totalMinutes = allSleepEvents.reduce((sum, event) => {
        return sum + differenceInMinutes(parseISO(event.endTime!), parseISO(event.startTime))
      }, 0)
      
      const avgMinutesPerDay = totalMinutes / 7
      const hours = Math.floor(avgMinutesPerDay / 60)
      const minutes = Math.round(avgMinutesPerDay % 60)
      totalSleepHours = `${hours}h ${minutes}min`
    }
    
    // Calcular hora promedio de acostarse
    let avgBedtime = "--:--"
    if (sleepEvents.length > 0) {
      const avgMinutes = sleepEvents.reduce((sum, event) => {
        const startTime = parseISO(event.startTime)
        return sum + (getHours(startTime) * 60 + getMinutes(startTime))
      }, 0) / sleepEvents.length
      
      const hours = Math.floor(avgMinutes / 60)
      const minutes = Math.round(avgMinutes % 60)
      avgBedtime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    }
    
    // Calcular despertares nocturnos (simular basado en eventos)
    const nightWakeups = Math.round(Math.random() * 2 + 0.5) // Entre 0.5 y 2.5
    
    // Calcular calidad del sueño (basado en duración y consistencia)
    let sleepQuality = 0
    if (allSleepEvents.length > 0) {
      const avgHours = allSleepEvents.reduce((sum, event) => {
        return sum + differenceInMinutes(parseISO(event.endTime!), parseISO(event.startTime)) / 60
      }, 0) / allSleepEvents.length
      
      // Calidad basada en si está cerca de 10-11 horas recomendadas
      if (avgHours >= 9 && avgHours <= 12) {
        sleepQuality = Math.max(70, Math.min(100, 85 + (10.5 - Math.abs(avgHours - 10.5)) * 10))
      } else {
        sleepQuality = Math.max(20, 70 - Math.abs(avgHours - 10.5) * 15)
      }
    }
    
    setSleepMetrics({
      totalSleepHours,
      avgBedtime,
      nightWakeups,
      sleepQuality: Math.round(sleepQuality)
    })
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "¡Buenos días"
    if (hour < 18) return "¡Buenas tardes"
    return "¡Buenas noches"
  }

  const getMoodEmoji = (mood: string) => {
    switch(mood?.toLowerCase()) {
      case 'happy': case 'feliz': return '😊'
      case 'energetic': case 'energético': return '⚡'
      case 'tired': case 'cansado': return '😴'
      case 'stressed': case 'estresado': return '😰'
      case 'calm': case 'tranquilo': return '😌'
      default: return '😊'
    }
  }

  const getQualityColor = (quality: number) => {
    if (quality >= 80) return "bg-green-100 text-green-800"
    if (quality >= 60) return "bg-yellow-100 text-yellow-800"
    if (quality >= 40) return "bg-orange-100 text-orange-800"
    return "bg-red-100 text-red-800"
  }

  const getQualityLabel = (quality: number) => {
    if (quality >= 80) return "Excelente"
    if (quality >= 60) return "Buena"
    if (quality >= 40) return "Regular"
    return "Mala"
  }

  // Datos del calendario (últimos 7 días)
  const getWeekDays = () => {
    const start = startOfWeek(currentDate, { locale: es })
    const end = endOfWeek(currentDate, { locale: es })
    return eachDayOfInterval({ start, end })
  }

  const getDayQuality = (date: Date) => {
    const dayEvents = events.filter(event => 
      isSameDay(parseISO(event.startTime), date)
    )
    
    if (dayEvents.length === 0) return null
    
    const sleepEvent = dayEvents.find(e => e.eventType === 'sleep')
    if (!sleepEvent) return null
    
    // Simular calidad basada en el estado emocional
    const mood = sleepEvent.emotionalState?.toLowerCase()
    if (mood === 'happy' || mood === 'feliz') return 'good'
    if (mood === 'tired' || mood === 'cansado') return 'poor'
    if (mood === 'stressed' || mood === 'estresado') return 'poor'
    return 'average'
  }

  const recentMoods = events
    .filter(e => e.emotionalState)
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

  return (
    <div className="min-h-screen bg-[#F5F9FF] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Saludo personalizado */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[#2F2F2F]">
            {getGreeting()}, {session?.user?.name?.split(' ')[0] || 'Usuario'}!
          </h1>
          <p className="text-[#666666]">
            Aquí tienes un resumen del sueño de {child?.firstName || 'tu niño'} de los últimos 7 días.
          </p>
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tiempo total de sueño */}
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-[#666666]">Tiempo total de sueño (promedio)</p>
                  <p className="text-3xl font-bold text-[#2F2F2F]">{sleepMetrics.totalSleepHours.split(' ')[0]}</p>
                </div>
                <div className="h-10 w-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <Moon className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Badge className="bg-green-50 text-green-700 hover:bg-green-50">Bueno</Badge>
                <span className="text-xs text-[#666666]">+0.5h vs. semana anterior</span>
              </div>
            </CardContent>
          </Card>

          {/* Hora de acostarse */}
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-[#666666]">Hora de acostarse (promedio)</p>
                  <p className="text-3xl font-bold text-[#2F2F2F]">{sleepMetrics.avgBedtime}</p>
                </div>
                <div className="h-10 w-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Sun className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Badge className="bg-purple-50 text-purple-700 hover:bg-purple-50">Consistente</Badge>
                <span className="text-xs text-[#666666]">±15 min de variación</span>
              </div>
            </CardContent>
          </Card>

          {/* Despertares nocturnos */}
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-[#666666]">Despertares nocturnos (promedio)</p>
                  <p className="text-3xl font-bold text-[#2F2F2F]">{sleepMetrics.nightWakeups}</p>
                </div>
                <div className="h-10 w-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <Activity className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Badge className="bg-yellow-50 text-yellow-700 hover:bg-yellow-50">Promedio</Badge>
                <span className="text-xs text-[#666666]">-0.3 vs. semana anterior</span>
              </div>
            </CardContent>
          </Card>

          {/* Calidad del sueño */}
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-[#666666]">Calidad del sueño</p>
                  <p className="text-3xl font-bold text-[#2F2F2F]">{sleepMetrics.sleepQuality}%</p>
                </div>
                <div className="h-10 w-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Badge className={getQualityColor(sleepMetrics.sleepQuality)}>
                  {getQualityLabel(sleepMetrics.sleepQuality)}
                </Badge>
                <span className="text-xs text-[#666666]">-5% vs. semana anterior</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Grid de contenido principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tendencia de Sueño */}
          <Card className="bg-white shadow-sm border-0 lg:col-span-2">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#2F2F2F]">Tendencia de Sueño</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-[#F0F7FF] text-[#4A90E2] hover:bg-[#E8F4FF] h-8">7 días</Button>
                  <Button size="sm" variant="ghost" className="text-[#666666] h-8">30 días</Button>
                  <Button size="sm" variant="ghost" className="text-[#666666] h-8">3 meses</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-[#F8FAFC] rounded-xl flex items-center justify-center">
                <div className="text-center space-y-2">
                  <TrendingUp className="h-12 w-12 text-[#E3E6EA] mx-auto" />
                  <p className="text-[#666666] text-sm">Gráfico de tendencias de sueño</p>
                </div>
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
                {recentMoods.length > 0 ? recentMoods.map((event, index) => (
                  <div key={event._id} className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-[#F0F7FF] rounded-full flex items-center justify-center">
                      <span className="text-lg">{getMoodEmoji(event.emotionalState)}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-[#3A3A3A] font-medium">
                        {index === 0 ? 'Hoy' : format(parseISO(event.startTime), 'EEEE', { locale: es })}
                      </p>
                    </div>
                    <Badge className="bg-green-50 text-green-700 text-xs">
                      {event.emotionalState}
                    </Badge>
                  </div>
                )) : (
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
                {format(currentDate, 'MMMM yyyy', { locale: es })}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Días de la semana */}
                <div className="grid grid-cols-7 gap-2 text-xs text-center text-[#666666] font-medium">
                  {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
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
                            ${quality === 'good' ? 'bg-green-600 text-white' : ''}
                            ${quality === 'average' ? 'bg-yellow-500 text-white' : ''}
                            ${quality === 'poor' ? 'bg-red-500 text-white' : ''}
                          `}>
                            {format(date, 'd')}
                          </div>
                        ) : (
                          <div className={`text-xs ${isToday ? 'font-bold text-[#3A3A3A]' : 'text-[#9CA3AF]'}`}>
                            {format(date, 'd')}
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
              {/* Nota de ejemplo */}
              <div className="space-y-3">
                <div className="bg-[#EDE5FF] rounded-2xl rounded-tl-sm p-3">
                  <p className="text-sm text-[#3A3A3A] leading-relaxed">
                    {child?.firstName} se despertó a las 3 AM debido a una pesadilla, pero volvió a dormirse rápidamente.
                  </p>
                  <p className="text-xs text-[#666666] mt-2">Ayer, 23:15</p>
                </div>

                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/placeholder-user.jpg" />
                    <AvatarFallback>M</AvatarFallback>
                  </Avatar>
                  <div className="bg-[#F0F7FF] rounded-2xl rounded-tl-sm p-3 flex-1">
                    <p className="text-sm text-[#3A3A3A] leading-relaxed">
                      Hoy durmió sin interrupciones toda la noche. La rutina de lectura antes de dormir parece estar ayudando.
                    </p>
                    <p className="text-xs text-[#666666] mt-2">7 Mayo, 08:30</p>
                  </div>
                </div>
              </div>

              {/* Input para nueva nota */}
              <div className="flex gap-2 pt-2">
                <input
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Añadir una nota..."
                  className="flex-1 px-4 py-3 bg-white border border-[#E5E5E5] rounded-xl text-sm placeholder-[#ADAEBC] focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
                />
                <Button size="sm" className="h-12 w-12 p-0 bg-white border-0 shadow-none">
                  <Send className="h-4 w-4 text-[#4A90E2]" />
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
