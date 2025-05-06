// Página de estadísticas
// Muestra gráficos y análisis de patrones de sueño, actividad y estado emocional

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Clock, Moon, Sun, Activity } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useActiveChild } from "@/context/active-child-context"
import {
  ResponsiveContainer,
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

// Importar componentes de estadísticas
import {
  SleepPatternChart,
  NapChart,
  SleepHoursChart,
  SleepEventsChart,
  SleepTypesChart,
  ActivityDistributionChart,
  ActivityDurationChart,
  MoodDistributionChart,
  MoodByActivityChart,
  ProgressSummaryCard,
  EventTrendChart,
  StatsCard
} from "@/components/stats"

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

  // Preparar datos para estados emocionales por tipo de actividad
  const prepareMoodByActivityData = () => {
    return [
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
    ];
  };

  // Preparar datos para distribución de tipos de sueño
  const prepareSleepTypesData = () => {
    return [
      { name: 'Sueño nocturno', value: filteredEvents.filter(e => e.eventType === "sleep").length },
      { name: 'Siestas', value: filteredEvents.filter(e => e.eventType === "nap").length }
    ];
  };

  // Preparar datos para distribución de actividades
  const prepareActivityDistributionData = () => {
    return [
      { name: 'Actividad física', value: filteredEvents.filter(e => e.eventType === "activity").length },
      { name: 'Juego', value: filteredEvents.filter(e => e.eventType === "play").length }
    ];
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
              <StatsCard 
                title="Promedio de horas de sueño" 
                value={filteredEvents.filter(e => e.eventType === "sleep" || e.eventType === "nap").length > 0 
                  ? (filteredEvents
                      .filter(e => e.eventType === "sleep" || e.eventType === "nap")
                      .reduce((acc, evt) => acc + calculateEventDuration(evt), 0) / 
                      (filteredEvents.filter(e => (e.eventType === "sleep" || e.eventType === "nap") && e.endTime).length || 1)
                    ).toFixed(1) + 'h'
                  : 'N/A'
                }
                description={`Basado en ${filteredEvents.filter(e => (e.eventType === "sleep" || e.eventType === "nap") && e.endTime).length} eventos con duración`}
              />
              
              <StatsCard 
                title="Total de siestas" 
                value={filteredEvents.filter(e => e.eventType === "nap").length}
                description="Durante el período seleccionado"
              />
              
              <StatsCard 
                title="Períodos de sueño nocturno" 
                value={filteredEvents.filter(e => e.eventType === "sleep").length}
                description="Durante el período seleccionado"
              />
              
              <StatsCard 
                title="Estado emocional (sueño)" 
                value={filteredEvents.filter(e => e.eventType === "sleep" || e.eventType === "nap").length > 0 
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
                description="Estado más común durante el sueño"
              />
            </div>

            {/* NUEVOS GRÁFICOS */}
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
              <SleepPatternChart 
                bedWakeChartData={bedWakeChartData} 
                formatTimeTick={formatTimeTick} 
              />

              <NapChart 
                napChartData={napChartData} 
                formatTimeTick={formatTimeTick} 
              />
            </div>
            
            {/* Gráficos existentes que se quedan */}
            <div className="grid gap-4 md:grid-cols-2">
              <SleepHoursChart sleepData={prepareSleepData()} />
              
              <SleepEventsChart sleepData={prepareSleepData()} />
              
              <SleepTypesChart 
                sleepData={prepareSleepTypesData()} 
                colors={COLORS}
              />
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatsCard 
                title="Total actividades" 
                value={filteredEvents.filter(e => e.eventType === "activity" || e.eventType === "play").length}
                description="Durante el período seleccionado"
              />
              
              <StatsCard 
                title="Actividad física" 
                value={filteredEvents.filter(e => e.eventType === "activity").length}
                description="Eventos de actividad física"
              />
              
              <StatsCard 
                title="Juego" 
                value={filteredEvents.filter(e => e.eventType === "play").length}
                description="Eventos de juego"
              />
              
              <StatsCard 
                title="Estado emocional" 
                value={filteredEvents.filter(e => e.eventType === "activity" || e.eventType === "play").length > 0 
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
                description="Estado más común durante actividades"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <ActivityDistributionChart 
                activityData={prepareActivityDistributionData()} 
                colors={COLORS}
              />
              
              <ActivityDurationChart activityData={prepareActivityData()} />
            </div>
          </TabsContent>

          <TabsContent value="mood" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatsCard 
                title="Estado predominante" 
                value={filteredEvents.length > 0 
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
                description="Estado emocional más frecuente"
              />
              
              <StatsCard 
                title="Estados positivos" 
                value={filteredEvents.filter(e => ['happy', 'calm', 'excited'].includes(e.emotionalState)).length}
                description={`${((filteredEvents.filter(e => ['happy', 'calm', 'excited'].includes(e.emotionalState)).length / 
                  (filteredEvents.length || 1)) * 100).toFixed(0)}% del total`}
              />
              
              <StatsCard 
                title="Estados negativos" 
                value={filteredEvents.filter(e => ['tired', 'irritable', 'sad', 'anxious'].includes(e.emotionalState)).length}
                description={`${((filteredEvents.filter(e => ['tired', 'irritable', 'sad', 'anxious'].includes(e.emotionalState)).length / 
                  (filteredEvents.length || 1)) * 100).toFixed(0)}% del total`}
              />
              
              <StatsCard 
                title="Total eventos" 
                value={filteredEvents.length}
                description="Durante el período seleccionado"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <MoodDistributionChart 
                moodData={prepareMoodData()} 
                colors={COLORS}
              />
              
              <MoodByActivityChart 
                moodByActivityData={prepareMoodByActivityData()}
              />
            </div>
          </TabsContent>

          <TabsContent value="progress" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <ProgressSummaryCard filteredEvents={filteredEvents} />
              
              <EventTrendChart filteredEvents={filteredEvents} />
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
