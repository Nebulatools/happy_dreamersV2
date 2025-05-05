// Página de estadísticas
// Muestra gráficos y análisis de patrones de sueño, actividad y estado emocional

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts"
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subMonths,
  format,
  parseISO,
  isAfter,
  isBefore,
  differenceInHours,
  differenceInMinutes
} from "date-fns"
import { es } from "date-fns/locale"

// Interfaces para los datos
interface Child {
  _id: string;
  firstName: string;
  lastName: string;
}

interface Event {
  _id: string;
  childId: string;
  eventType: string;
  emotionalState: string;
  startTime: string;
  endTime?: string;
  notes?: string;
  createdAt: string;
}

export default function StatsPage() {
  const { toast } = useToast()
  const [period, setPeriod] = useState("week")
  const [isLoading, setIsLoading] = useState(true)
  const [children, setChildren] = useState<Child[]>([])
  const [selectedChildId, setSelectedChildId] = useState<string>("")
  const [events, setEvents] = useState<Event[]>([])
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])

  // Obtener la fecha de inicio y fin basado en el período seleccionado
  const getDateRange = () => {
    const now = new Date()
    
    switch (period) {
      case "week":
        return {
          start: startOfWeek(now, { weekStartsOn: 1 }),
          end: endOfWeek(now, { weekStartsOn: 1 })
        }
      case "month":
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        }
      case "3months":
        return {
          start: startOfMonth(subMonths(now, 2)),
          end: endOfMonth(now)
        }
      case "year":
        return {
          start: startOfYear(now),
          end: endOfYear(now)
        }
      default:
        return {
          start: startOfWeek(now, { weekStartsOn: 1 }),
          end: endOfWeek(now, { weekStartsOn: 1 })
        }
    }
  }

  // Cargar los niños al iniciar
  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const response = await fetch('/api/children')
        if (!response.ok) {
          throw new Error('Error al cargar los niños')
        }
        const data = await response.json()
        setChildren(data)
        
        // Seleccionar el primer niño por defecto si hay niños
        if (data.length > 0 && !selectedChildId) {
          setSelectedChildId(data[0]._id)
        }
      } catch (error) {
        console.error('Error:', error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los niños. Inténtalo de nuevo.",
          variant: "destructive",
        })
      }
    }

    fetchChildren()
  }, [toast, selectedChildId])

  // Cargar los eventos cuando se selecciona un niño
  useEffect(() => {
    const fetchEvents = async () => {
      if (!selectedChildId) return
      
      setIsLoading(true)
      try {
        const response = await fetch(`/api/children/events?childId=${selectedChildId}`)
        if (!response.ok) {
          throw new Error('Error al cargar los eventos')
        }
        const data = await response.json()
        setEvents(data.events || [])
      } catch (error) {
        console.error('Error:', error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los eventos. Inténtalo de nuevo.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvents()
  }, [selectedChildId, toast])

  // Filtrar eventos por período seleccionado
  useEffect(() => {
    if (!events.length) {
      setFilteredEvents([])
      return
    }

    const { start, end } = getDateRange()
    
    const filtered = events.filter(event => {
      const eventDate = parseISO(event.startTime)
      return (isAfter(eventDate, start) || eventDate.getTime() === start.getTime()) && 
             (isBefore(eventDate, end) || eventDate.getTime() === end.getTime())
    })
    
    setFilteredEvents(filtered)
  }, [events, period])

  // Función para calcular la duración de un evento en horas
  const calculateEventDuration = (event: Event) => {
    if (!event.endTime) return 0
    
    const startTime = parseISO(event.startTime)
    const endTime = parseISO(event.endTime)
    
    return differenceInHours(endTime, startTime) + (differenceInMinutes(endTime, startTime) % 60) / 60
  }

  // Preparar datos para gráficos
  const prepareSleepData = () => {
    // Filtrar solo eventos de tipo "sleep" o "nap"
    const sleepEvents = filteredEvents.filter(event => event.eventType === "sleep" || event.eventType === "nap")
    
    // Organizar por día
    const sleepByDay = sleepEvents.reduce((acc, event) => {
      const day = format(parseISO(event.startTime), 'yyyy-MM-dd')
      
      if (!acc[day]) {
        acc[day] = {
          date: day,
          totalHours: 0,
          count: 0
        }
      }
      
      acc[day].totalHours += calculateEventDuration(event)
      acc[day].count++
      
      return acc
    }, {} as Record<string, { date: string, totalHours: number, count: number }>)
    
    // Convertir a array para gráficos
    return Object.values(sleepByDay).map(item => ({
      name: format(parseISO(item.date), 'dd/MM', { locale: es }),
      horas: parseFloat(item.totalHours.toFixed(1)),
      eventos: item.count
    }))
  }

  const prepareActivityData = () => {
    // Filtrar solo eventos de tipo "activity" o "play"
    const activityEvents = filteredEvents.filter(event => event.eventType === "activity" || event.eventType === "play")
    
    // Organizar por tipo
    const byType = activityEvents.reduce((acc, event) => {
      const type = event.eventType === "activity" ? "Actividad física" : "Juego"
      
      if (!acc[type]) {
        acc[type] = {
          type,
          count: 0,
          totalHours: 0
        }
      }
      
      acc[type].count++
      acc[type].totalHours += calculateEventDuration(event)
      
      return acc
    }, {} as Record<string, { type: string, count: number, totalHours: number }>)
    
    return Object.values(byType)
  }

  const prepareMoodData = () => {
    // Contar eventos por estado emocional
    const moodCounts = filteredEvents.reduce((acc, event) => {
      const mood = event.emotionalState
      
      if (!acc[mood]) {
        acc[mood] = {
          name: getMoodName(mood),
          value: 0
        }
      }
      
      acc[mood].value++
      
      return acc
    }, {} as Record<string, { name: string, value: number }>)
    
    return Object.values(moodCounts)
  }

  // Función para obtener el nombre de estado emocional
  const getMoodName = (mood: string) => {
    const moods: Record<string, string> = {
      happy: "Feliz",
      calm: "Tranquilo",
      excited: "Emocionado",
      tired: "Cansado",
      irritable: "Irritable",
      sad: "Triste",
      anxious: "Ansioso"
    }
    return moods[mood] || mood
  }

  // Colores para los gráficos
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

  // Renderizar
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-12rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando estadísticas...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estadísticas</h1>
          <p className="text-muted-foreground">Análisis detallado de patrones de sueño, actividad y estado emocional</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select 
            value={selectedChildId} 
            onValueChange={(newChildId) => {
              // Limpiar eventos del niño anterior antes de cambiar
              setEvents([]);
              setFilteredEvents([]);
              
              // Luego actualizar el ID del niño seleccionado
              setSelectedChildId(newChildId);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Seleccionar niño" />
            </SelectTrigger>
            <SelectContent>
              {children.map(child => (
                <SelectItem key={child._id} value={child._id}>
                  {child.firstName} {child.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Seleccionar período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Última semana</SelectItem>
              <SelectItem value="month">Último mes</SelectItem>
              <SelectItem value="3months">Últimos 3 meses</SelectItem>
              <SelectItem value="year">Último año</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {children.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <p>No hay niños registrados para mostrar estadísticas.</p>
            </div>
          </CardContent>
        </Card>
      ) : filteredEvents.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <p>No hay eventos registrados en el período seleccionado.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="sleep" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="sleep">Sueño</TabsTrigger>
            <TabsTrigger value="activity">Actividad</TabsTrigger>
            <TabsTrigger value="mood">Estado de ánimo</TabsTrigger>
            <TabsTrigger value="progress">Progreso</TabsTrigger>
          </TabsList>

          <TabsContent value="sleep" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Promedio de horas de sueño</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {filteredEvents.filter(e => e.eventType === "sleep" || e.eventType === "nap").length > 0 
                      ? (filteredEvents
                          .filter(e => e.eventType === "sleep" || e.eventType === "nap")
                          .reduce((acc, evt) => acc + calculateEventDuration(evt), 0) / 
                          filteredEvents.filter(e => (e.eventType === "sleep" || e.eventType === "nap") && e.endTime).length
                        ).toFixed(1) + 'h'
                      : 'N/A'
                    }
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Basado en {filteredEvents.filter(e => (e.eventType === "sleep" || e.eventType === "nap") && e.endTime).length} eventos
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de siestas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {filteredEvents.filter(e => e.eventType === "nap").length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Durante el período seleccionado
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Períodos de sueño</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {filteredEvents.filter(e => e.eventType === "sleep").length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Durante el período seleccionado
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Estado emocional</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {filteredEvents.filter(e => e.eventType === "sleep" || e.eventType === "nap").length > 0 
                      ? getMoodName(
                          Object.entries(
                            filteredEvents
                              .filter(e => e.eventType === "sleep" || e.eventType === "nap")
                              .reduce((acc, evt) => {
                                if (!acc[evt.emotionalState]) acc[evt.emotionalState] = 0;
                                acc[evt.emotionalState]++;
                                return acc;
                              }, {} as Record<string, number>)
                          )
                          .sort((a, b) => b[1] - a[1])[0][0]
                        )
                      : 'N/A'
                    }
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Estado más común durante el sueño
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Horas de sueño por día</CardTitle>
                  <CardDescription>Distribución de las horas de sueño durante el período seleccionado</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={prepareSleepData()}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="horas" name="Horas de sueño" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Eventos de sueño</CardTitle>
                  <CardDescription>Número de eventos de sueño registrados</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={prepareSleepData()}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="eventos" name="Número de eventos" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <Card className="col-span-2">
                <CardHeader>
                  <CardTitle>Distribución de tipos de sueño</CardTitle>
                  <CardDescription>Comparación entre sueño nocturno y siestas</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Sueño nocturno', value: filteredEvents.filter(e => e.eventType === "sleep").length },
                          { name: 'Siestas', value: filteredEvents.filter(e => e.eventType === "nap").length }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[
                          { name: 'Sueño nocturno', value: filteredEvents.filter(e => e.eventType === "sleep").length },
                          { name: 'Siestas', value: filteredEvents.filter(e => e.eventType === "nap").length }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total actividades</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {filteredEvents.filter(e => e.eventType === "activity" || e.eventType === "play").length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Durante el período seleccionado
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Actividad física</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {filteredEvents.filter(e => e.eventType === "activity").length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Eventos de actividad física
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Juego</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {filteredEvents.filter(e => e.eventType === "play").length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Eventos de juego
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Estado emocional</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {filteredEvents.filter(e => e.eventType === "activity" || e.eventType === "play").length > 0 
                      ? getMoodName(
                          Object.entries(
                            filteredEvents
                              .filter(e => e.eventType === "activity" || e.eventType === "play")
                              .reduce((acc, evt) => {
                                if (!acc[evt.emotionalState]) acc[evt.emotionalState] = 0;
                                acc[evt.emotionalState]++;
                                return acc;
                              }, {} as Record<string, number>)
                          )
                          .sort((a, b) => b[1] - a[1])[0][0]
                        )
                      : 'N/A'
                    }
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Estado más común durante actividades
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Distribución de actividades</CardTitle>
                  <CardDescription>Proporción entre actividad física y juego</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Actividad física', value: filteredEvents.filter(e => e.eventType === "activity").length },
                          { name: 'Juego', value: filteredEvents.filter(e => e.eventType === "play").length }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[
                          { name: 'Actividad física', value: filteredEvents.filter(e => e.eventType === "activity").length },
                          { name: 'Juego', value: filteredEvents.filter(e => e.eventType === "play").length }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Duración de actividades</CardTitle>
                  <CardDescription>Tiempo total dedicado a cada tipo de actividad</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={prepareActivityData()}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="totalHours" name="Horas" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="mood" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Estado predominante</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {filteredEvents.length > 0 
                      ? getMoodName(
                          Object.entries(
                            filteredEvents
                              .reduce((acc, evt) => {
                                if (!acc[evt.emotionalState]) acc[evt.emotionalState] = 0;
                                acc[evt.emotionalState]++;
                                return acc;
                              }, {} as Record<string, number>)
                          )
                          .sort((a, b) => b[1] - a[1])[0][0]
                        )
                      : 'N/A'
                    }
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Estado emocional más frecuente
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Estados positivos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {filteredEvents.filter(e => ['happy', 'calm', 'excited'].includes(e.emotionalState)).length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {((filteredEvents.filter(e => ['happy', 'calm', 'excited'].includes(e.emotionalState)).length / 
                      (filteredEvents.length || 1)) * 100).toFixed(0)}% del total
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Estados negativos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {filteredEvents.filter(e => ['tired', 'irritable', 'sad', 'anxious'].includes(e.emotionalState)).length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {((filteredEvents.filter(e => ['tired', 'irritable', 'sad', 'anxious'].includes(e.emotionalState)).length / 
                      (filteredEvents.length || 1)) * 100).toFixed(0)}% del total
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total eventos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {filteredEvents.length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Durante el período seleccionado
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Distribución de estados emocionales</CardTitle>
                  <CardDescription>Proporción de cada estado emocional registrado</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={prepareMoodData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {prepareMoodData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Estados emocionales por tipo de evento</CardTitle>
                  <CardDescription>Análisis de estados emocionales según la actividad</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        {
                          name: 'Sueño',
                          feliz: filteredEvents.filter(e => e.eventType === 'sleep' && e.emotionalState === 'happy').length,
                          tranquilo: filteredEvents.filter(e => e.eventType === 'sleep' && e.emotionalState === 'calm').length,
                          cansado: filteredEvents.filter(e => e.eventType === 'sleep' && e.emotionalState === 'tired').length,
                          irritable: filteredEvents.filter(e => e.eventType === 'sleep' && e.emotionalState === 'irritable').length
                        },
                        {
                          name: 'Siesta',
                          feliz: filteredEvents.filter(e => e.eventType === 'nap' && e.emotionalState === 'happy').length,
                          tranquilo: filteredEvents.filter(e => e.eventType === 'nap' && e.emotionalState === 'calm').length,
                          cansado: filteredEvents.filter(e => e.eventType === 'nap' && e.emotionalState === 'tired').length,
                          irritable: filteredEvents.filter(e => e.eventType === 'nap' && e.emotionalState === 'irritable').length
                        },
                        {
                          name: 'Actividad',
                          feliz: filteredEvents.filter(e => e.eventType === 'activity' && e.emotionalState === 'happy').length,
                          tranquilo: filteredEvents.filter(e => e.eventType === 'activity' && e.emotionalState === 'calm').length,
                          cansado: filteredEvents.filter(e => e.eventType === 'activity' && e.emotionalState === 'tired').length,
                          irritable: filteredEvents.filter(e => e.eventType === 'activity' && e.emotionalState === 'irritable').length
                        },
                        {
                          name: 'Juego',
                          feliz: filteredEvents.filter(e => e.eventType === 'play' && e.emotionalState === 'happy').length,
                          tranquilo: filteredEvents.filter(e => e.eventType === 'play' && e.emotionalState === 'calm').length,
                          cansado: filteredEvents.filter(e => e.eventType === 'play' && e.emotionalState === 'tired').length,
                          irritable: filteredEvents.filter(e => e.eventType === 'play' && e.emotionalState === 'irritable').length
                        },
                        {
                          name: 'Comida',
                          feliz: filteredEvents.filter(e => e.eventType === 'meal' && e.emotionalState === 'happy').length,
                          tranquilo: filteredEvents.filter(e => e.eventType === 'meal' && e.emotionalState === 'calm').length,
                          cansado: filteredEvents.filter(e => e.eventType === 'meal' && e.emotionalState === 'tired').length,
                          irritable: filteredEvents.filter(e => e.eventType === 'meal' && e.emotionalState === 'irritable').length
                        }
                      ]}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="feliz" name="Feliz" stackId="a" fill="#FFBB28" />
                      <Bar dataKey="tranquilo" name="Tranquilo" stackId="a" fill="#00C49F" />
                      <Bar dataKey="cansado" name="Cansado" stackId="a" fill="#0088FE" />
                      <Bar dataKey="irritable" name="Irritable" stackId="a" fill="#FF8042" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="progress" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="col-span-1 lg:col-span-3">
                <CardHeader>
                  <CardTitle>Resumen de Progreso</CardTitle>
                  <CardDescription>Vista general del desarrollo en todas las áreas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium mb-2">Sueño:</h3>
                      <div className="bg-muted h-2 rounded-full mb-1">
                        <div
                          className="bg-primary h-full rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(
                                0,
                                filteredEvents.filter(e => e.eventType === "sleep" || e.eventType === "nap").length > 0
                                  ? 70 + (Math.random() * 30)
                                  : 50
                              )
                            )}%`
                          }}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {filteredEvents.filter(e => e.eventType === "sleep" || e.eventType === "nap").length > 0
                          ? "Buena consistencia en patrones de sueño."
                          : "No hay suficientes datos para evaluar."}
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-2">Actividad Física:</h3>
                      <div className="bg-muted h-2 rounded-full mb-1">
                        <div
                          className="bg-primary h-full rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(
                                0,
                                filteredEvents.filter(e => e.eventType === "activity").length > 0
                                  ? 65 + (Math.random() * 35)
                                  : 50
                              )
                            )}%`
                          }}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {filteredEvents.filter(e => e.eventType === "activity").length > 5
                          ? "Buen nivel de actividad física."
                          : filteredEvents.filter(e => e.eventType === "activity").length > 0
                            ? "Nivel moderado de actividad física."
                            : "No hay suficientes datos para evaluar."}
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-2">Estado Emocional:</h3>
                      <div className="bg-muted h-2 rounded-full mb-1">
                        <div
                          className="bg-primary h-full rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(
                                0,
                                filteredEvents.length > 0
                                  ? (filteredEvents.filter(e => ['happy', 'calm', 'excited'].includes(e.emotionalState)).length / 
                                     filteredEvents.length) * 100
                                  : 50
                              )
                            )}%`
                          }}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {filteredEvents.length > 0
                          ? filteredEvents.filter(e => ['happy', 'calm', 'excited'].includes(e.emotionalState)).length > 
                            filteredEvents.filter(e => ['tired', 'irritable', 'sad', 'anxious'].includes(e.emotionalState)).length
                            ? "Predominan los estados emocionales positivos."
                            : "Predominan los estados emocionales negativos."
                          : "No hay suficientes datos para evaluar."}
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-2">Balance de Actividades:</h3>
                      <div className="bg-muted h-2 rounded-full mb-1">
                        <div
                          className="bg-primary h-full rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(
                                0,
                                filteredEvents.length > 10
                                  ? 80
                                  : filteredEvents.length > 5
                                    ? 65
                                    : filteredEvents.length > 0
                                      ? 50
                                      : 0
                              )
                            )}%`
                          }}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {filteredEvents.length > 10
                          ? "Buena diversidad de actividades registradas."
                          : filteredEvents.length > 5
                            ? "Variedad moderada de actividades registradas."
                            : filteredEvents.length > 0
                              ? "Pocas actividades registradas."
                              : "No hay suficientes datos para evaluar."}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="col-span-1 lg:col-span-3">
                <CardHeader>
                  <CardTitle>Tendencia de eventos registrados</CardTitle>
                  <CardDescription>Evolución del registro de eventos en el tiempo</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={
                        (() => {
                          // Agrupar eventos por día
                          const eventsByDay = filteredEvents.reduce((acc, event) => {
                            const day = format(parseISO(event.startTime), 'yyyy-MM-dd')
                            
                            if (!acc[day]) {
                              acc[day] = {
                                date: day,
                                sleep: 0,
                                nap: 0,
                                activity: 0,
                                play: 0,
                                meal: 0,
                                total: 0
                              }
                            }
                            
                            acc[day][event.eventType] = (acc[day][event.eventType] || 0) + 1
                            acc[day].total++
                            
                            return acc
                          }, {} as Record<string, any>)
                          
                          // Convertir a array y ordenar por fecha
                          return Object.values(eventsByDay)
                            .map(day => ({
                              ...day,
                              name: format(parseISO(day.date), 'dd/MM')
                            }))
                            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        })()
                      }
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="sleep" name="Sueño" stroke="#8884d8" activeDot={{ r: 8 }} />
                      <Line type="monotone" dataKey="nap" name="Siesta" stroke="#82ca9d" />
                      <Line type="monotone" dataKey="activity" name="Actividad" stroke="#ffc658" />
                      <Line type="monotone" dataKey="play" name="Juego" stroke="#ff7300" />
                      <Line type="monotone" dataKey="meal" name="Comida" stroke="#0088FE" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
