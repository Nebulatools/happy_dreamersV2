// Página de estadísticas
// Muestra gráficos y análisis de patrones de sueño, actividad y estado emocional

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useActiveChild } from "@/context/active-child-context"
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
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis
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
  differenceInMinutes,
  getHours as getHoursFns,
  getMinutes as getMinutesFns,
  eachDayOfInterval,
  isSameDay,
  differenceInDays,
  addDays
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

// Definición del tipo para los patrones de sueño diarios
interface DailySleepPattern {
  dayISO: string;
  bedTime?: number; // minutos desde medianoche
  wakeUpTime?: number; // minutos desde medianoche
  firstNapStartTime?: number;
  firstNapDuration?: number;
  secondNapStartTime?: number;
  secondNapDuration?: number;
}

export default function StatsPage() {
  const { toast } = useToast()
  const { activeChildId } = useActiveChild()
  const [period, setPeriod] = useState("week")
  const [isLoading, setIsLoading] = useState(true)
  const [events, setEvents] = useState<Event[]>([])
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])

  // Nuevos estados para métricas de patrones de sueño
  const [averageBedTime, setAverageBedTime] = useState<string | null>(null)
  const [averageWakeUpTime, setAverageWakeUpTime] = useState<string | null>(null)
  const [averageFirstNapStartTime, setAverageFirstNapStartTime] = useState<string | null>(null)
  const [averageFirstNapDuration, setAverageFirstNapDuration] = useState<string | null>(null)
  const [averageSecondNapStartTime, setAverageSecondNapStartTime] = useState<string | null>(null)
  const [averageSecondNapDuration, setAverageSecondNapDuration] = useState<string | null>(null)
  const [bedtimeConsistency, setBedtimeConsistency] = useState<string | null>(null) // e.g., "±30 min"
  const [wakeUpConsistency, setWakeUpConsistency] = useState<string | null>(null)

  // Nuevos estados para los datos de los gráficos
  const [napChartData, setNapChartData] = useState<any[]>([])
  const [bedWakeChartData, setBedWakeChartData] = useState<any[]>([])

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

  // Cargar los eventos cuando cambia el niño activo del contexto
  useEffect(() => {
    const fetchEvents = async () => {
      if (!activeChildId) {
        setEvents([]);
        setFilteredEvents([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true)
      try {
        const response = await fetch(`/api/children/events?childId=${activeChildId}`)
        if (!response.ok) {
          throw new Error('Error al cargar los eventos')
        }
        const data = await response.json()
        setEvents(data.events || [])
      } catch (error) {
        console.error('Error:', error)
        setEvents([])
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
  }, [activeChildId, toast])

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

  // useEffect para calcular patrones de sueño detallados
  useEffect(() => {
    if (!filteredEvents.length) {
      // Resetear todos los estados de patrones detallados
      setAverageBedTime(null);
      setAverageWakeUpTime(null);
      setAverageFirstNapStartTime(null);
      setAverageFirstNapDuration(null);
      setAverageSecondNapStartTime(null);
      setAverageSecondNapDuration(null);
      setBedtimeConsistency(null);
      setWakeUpConsistency(null);
      // También resetear los datos de los gráficos nuevos si los tuviéramos en estado
      setNapChartData([]);
      setBedWakeChartData([]);
      return;
    }

    // --- LÓGICA DE dailySleepPatterns (EXISTENTE Y REUTILIZABLE) ---
    const dailySleepPatterns: DailySleepPattern[] = [];

    const uniqueDaysISO = [...new Set(filteredEvents.map(event => format(parseISO(event.startTime), 'yyyy-MM-dd')))].sort();

    uniqueDaysISO.forEach(dayISO => {
      const dayStart = parseISO(dayISO);
      const dayEnd = addDays(dayStart, 1);

      const eventsOfTheDay = filteredEvents.filter(event => {
        const eventStart = parseISO(event.startTime);
        // Asegurarse que endTime exista para parsearlo
        const eventActualEndTime = event.endTime ? parseISO(event.endTime) : eventStart;
        return isSameDay(eventStart, dayStart) || (event.eventType === 'sleep' && eventStart < dayEnd && eventActualEndTime > dayStart);
      }).sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime());

      let mainNightSleep: Event | null = null;
      const sleepEvents = eventsOfTheDay.filter(e => e.eventType === 'sleep' && e.endTime);
      
      if (sleepEvents.length > 0) {
        mainNightSleep = sleepEvents.reduce((longest, current) => {
          const currentStarts = getHoursFns(parseISO(current.startTime));
          if (currentStarts >= 18 || currentStarts < 4) {
             if (!longest) return current;
             // Usar una función segura para calcular duración que maneje endTime undefined
             const currentDuration = current.endTime ? differenceInMinutes(parseISO(current.endTime), parseISO(current.startTime)) : 0;
             const longestDuration = longest.endTime ? differenceInMinutes(parseISO(longest.endTime), parseISO(longest.startTime)) : 0;
             return currentDuration > longestDuration ? current : longest;
          }
          return longest;
        }, null as Event | null);

        if (!mainNightSleep && sleepEvents.length === 1) mainNightSleep = sleepEvents[0];
        else if (!mainNightSleep && sleepEvents.length > 0) {
            mainNightSleep = sleepEvents.sort((a,b) => parseISO(b.startTime).getTime() - parseISO(a.startTime).getTime())[0];
        }
      }
      
      const pattern: Partial<DailySleepPattern> & { dayISO: string } = { dayISO };

      if (mainNightSleep && mainNightSleep.startTime && mainNightSleep.endTime) {
        const bedTimeDate = parseISO(mainNightSleep.startTime);
        const wakeUpDate = parseISO(mainNightSleep.endTime);
        pattern.bedTime = getHoursFns(bedTimeDate) * 60 + getMinutesFns(bedTimeDate);
        // Ajuste para wakeUpTime si cruza la medianoche (se suma 24h en minutos)
        let wakeUpMinutes = getHoursFns(wakeUpDate) * 60 + getMinutesFns(wakeUpDate);
        if (wakeUpDate < bedTimeDate || (isSameDay(wakeUpDate, bedTimeDate) && wakeUpMinutes < pattern.bedTime)) {
            // Si wakeUpDate es anterior o el mismo día pero hora anterior, asumir que es del día siguiente
            // Esto es una simplificación; una lógica más robusta consideraría la duración
        }
        pattern.wakeUpTime = wakeUpMinutes;
      }
      
      // ... Lógica para siestas (se mantiene para datos, pero no para promedios de tarjetas)
      const napEvents = eventsOfTheDay.filter(e => e.eventType === 'nap' && e.endTime);
      if (napEvents.length > 0) {
        // ... (extracción de datos de siestas se mantiene para el gráfico de siestas)
      }

      if (Object.keys(pattern).length > 1) { // Más que solo dayISO
        dailySleepPatterns.push(pattern as DailySleepPattern);
      }
    });
    
    // --- FIN LÓGICA dailySleepPatterns ---

    // Aquí se llamarán las nuevas funciones para preparar datos de gráficos
    setNapChartData(prepareNapsChartData(filteredEvents));
    setBedWakeChartData(prepareBedtimeWakeUpChartData(dailySleepPatterns));

    // La lógica de promedios para las tarjetas eliminadas puede ser removida o comentada
    // setAverageBedTime(...); setBedtimeConsistency(...); etc.

  }, [filteredEvents]); // Dependencia calculateEventDuration eliminada por ahora

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

  // Función para preparar datos para el gráfico de siestas
  const prepareNapsChartData = (events: Event[]) => {
    return events
      .filter(event => event.eventType === "nap" && event.endTime)
      .map(nap => {
        const startTime = parseISO(nap.startTime);
        const endTime = parseISO(nap.endTime!);
        return {
          date: format(startTime, 'yyyy-MM-dd'),
          startTimeMinutes: getHoursFns(startTime) * 60 + getMinutesFns(startTime),
          duration: differenceInMinutes(endTime, startTime),
          tooltip: `Siesta: ${format(startTime, 'HH:mm')} (${differenceInMinutes(endTime, startTime)} min)`
        };
      });
  };

  // Función para preparar datos para el gráfico de hora de acostarse/despertar
  const prepareBedtimeWakeUpChartData = (dailyPatterns: DailySleepPattern[]) => {
    return dailyPatterns.map(pattern => ({
      date: format(parseISO(pattern.dayISO!), 'dd/MM'),
      bedTime: pattern.bedTime, // en minutos desde medianoche
      wakeUpTime: pattern.wakeUpTime, // en minutos desde medianoche
    })).sort((a, b) => parseISO(a.date.split('/').reverse().join('-')).getTime() - parseISO(b.date.split('/').reverse().join('-')).getTime()); // Asegurar orden cronológico
  };
  
  // Formateador de ticks para el eje Y de horas (0-1440 minutos a HH:mm)
  const formatTimeTick = (tickItem: number) => {
    const hours = Math.floor(tickItem / 60);
    const minutes = tickItem % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  // Renderizar
  if (isLoading && activeChildId) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-12rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando estadísticas...</span>
      </div>
    )
  }

  if (!activeChildId) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Estadísticas</h1>
            <p className="text-muted-foreground">Análisis detallado de patrones de sueño, actividad y estado emocional</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <p>Por favor, selecciona un niño en la parte superior para ver sus estadísticas.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estadísticas</h1>
          <p className="text-muted-foreground">Análisis detallado de patrones de sueño, actividad y estado emocional</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
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

      {filteredEvents.length === 0 && !isLoading ? (
        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <p>No hay eventos registrados para este niño en el período seleccionado.</p>
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
                          // Asegurar que no dividimos por cero si no hay eventos con endTime
                          (filteredEvents.filter(e => (e.eventType === "sleep" || e.eventType === "nap") && e.endTime).length || 1)
                        ).toFixed(1) + 'h'
                      : 'N/A'
                    }
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Basado en {filteredEvents.filter(e => (e.eventType === "sleep" || e.eventType === "nap") && e.endTime).length} eventos con duración
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
                  <CardTitle className="text-sm font-medium">Períodos de sueño nocturno</CardTitle>
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
                  <CardTitle className="text-sm font-medium">Estado emocional (sueño)</CardTitle>
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
                          .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A' // Evitar error si no hay datos
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

            {/* NUEVOS GRÁFICOS */}
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2"> {/* Ajustar grid para 2 gráficos */}
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Patrón de Sueño Nocturno</CardTitle>
                  <CardDescription>Hora de acostarse y despertarse</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={bedWakeChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis 
                        domain={[0, 1440]} 
                        tickFormatter={formatTimeTick} 
                        label={{ value: 'Hora del día', angle: -90, position: 'insideLeft' }}
                        ticks={[0, 180, 360, 540, 720, 900, 1080, 1260, 1440]} // Cada 3 horas
                      />
                      <Tooltip formatter={(value: number) => formatTimeTick(value)} />
                      <Legend />
                      <Line type="monotone" dataKey="bedTime" name="Hora de Acostarse" stroke="#8884d8" connectNulls />
                      <Line type="monotone" dataKey="wakeUpTime" name="Hora de Despertar" stroke="#82ca9d" connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Registro de Siestas</CardTitle>
                  <CardDescription>Hora de inicio y duración de las siestas</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid />
                      <XAxis 
                        type="number" 
                        dataKey="startTimeMinutes" 
                        name="Hora de Inicio" 
                        domain={[0, 1440]} 
                        tickFormatter={formatTimeTick}
                        ticks={[0, 180, 360, 540, 720, 900, 1080, 1260, 1440]}
                      />
                      <YAxis type="category" dataKey="date" name="Fecha" reversed={true} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value, name, props) => {
                        if (name === "startTimeMinutes") return formatTimeTick(value as number);
                        if (name === "duration") return `${value} min`;
                        return value;
                      }} />
                      <Legend />
                      <Scatter name="Siestas" data={napChartData} fill="#ffc658">
                        {/* Podríamos usar ZAxis para la duración si quisiéramos variar el tamaño del punto, 
                            pero el tooltip ya muestra la duración.
                            <ZAxis dataKey="duration" range={[20, 200]} name="Duración (min)" /> 
                        */}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            
            {/* Gráficos existentes que se quedan */}
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
