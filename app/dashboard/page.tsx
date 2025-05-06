"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useActiveChild } from "@/context/active-child-context"
import { Loader2, Plus, Settings2, Grid2X2, List, User } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
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
  getHours,
  getMinutes,
  eachDayOfInterval,
  isSameDay,
  differenceInDays,
  addDays
} from "date-fns"
import { es } from "date-fns/locale"

// Importamos los posibles gadgets disponibles
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

interface Gadget {
  id: string;
  name: string;
  description: string;
  component: string; // Nombre del componente
  category: string; // Categoría (sleep, activity, mood, progress)
  size: "small" | "medium" | "large"; // Tamaño del gadget
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

interface DailySleepPattern {
  dayISO: string;
  bedTime?: number;
  wakeUpTime?: number;
  firstNapStartTime?: number;
  firstNapDuration?: number;
  secondNapStartTime?: number;
  secondNapDuration?: number;
}

export default function DashboardPage() {
  const { toast } = useToast()
  const { activeChildId } = useActiveChild()
  const [view, setView] = useState<"grid" | "list">("grid")
  const [period, setPeriod] = useState("week")
  const [isLoading, setIsLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedGadgets, setSelectedGadgets] = useState<string[]>([])
  
  // Estados para datos
  const [events, setEvents] = useState<Event[]>([])
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const [napChartData, setNapChartData] = useState<any[]>([])
  const [bedWakeChartData, setBedWakeChartData] = useState<any[]>([])
  const [dailySleepPatterns, setDailySleepPatterns] = useState<DailySleepPattern[]>([])
  const [COLORS] = useState(['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'])

  // Lista de todos los gadgets disponibles
  const availableGadgets: Gadget[] = [
    { id: "sleepHours", name: "Horas de sueño", description: "Promedio de horas de sueño", component: "StatsCard", category: "sleep", size: "small" },
    { id: "napCount", name: "Total de siestas", description: "Siestas registradas", component: "StatsCard", category: "sleep", size: "small" },
    { id: "activityCount", name: "Total actividades", description: "Actividades registradas", component: "StatsCard", category: "activity", size: "small" },
    { id: "moodSummary", name: "Estado emocional", description: "Estado emocional predominante", component: "StatsCard", category: "mood", size: "small" },
    { id: "eventCount", name: "Total eventos", description: "Eventos registrados", component: "StatsCard", category: "general", size: "small" },
    { id: "sleepPattern", name: "Patrón de sueño", description: "Patrón de sueño nocturno", component: "SleepPatternChart", category: "sleep", size: "medium" },
    { id: "napChart", name: "Registro de siestas", description: "Registro de siestas", component: "NapChart", category: "sleep", size: "medium" },
    { id: "sleepEventsChart", name: "Eventos de sueño", description: "Eventos de sueño registrados", component: "SleepEventsChart", category: "sleep", size: "medium" },
    { id: "sleepTypesChart", name: "Tipos de sueño", description: "Distribución de tipos de sueño", component: "SleepTypesChart", category: "sleep", size: "medium" },
    { id: "activityDistribution", name: "Distribución de actividades", description: "Distribución de actividades", component: "ActivityDistributionChart", category: "activity", size: "medium" },
    { id: "activityDuration", name: "Duración de actividades", description: "Duración de actividades", component: "ActivityDurationChart", category: "activity", size: "medium" },
    { id: "moodDistribution", name: "Distribución de estados", description: "Distribución de estados emocionales", component: "MoodDistributionChart", category: "mood", size: "medium" },
    { id: "moodByActivity", name: "Estados por actividad", description: "Estados emocionales por tipo de actividad", component: "MoodByActivityChart", category: "mood", size: "medium" },
    { id: "progressSummary", name: "Resumen de progreso", description: "Resumen del progreso en todas las áreas", component: "ProgressSummaryCard", category: "progress", size: "large" },
    { id: "eventTrend", name: "Tendencia de eventos", description: "Tendencia de eventos registrados", component: "EventTrendChart", category: "progress", size: "large" }
  ]

  // Funciones para obtener datos
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

  // Función para calcular la duración de un evento en horas
  const calculateEventDuration = (event: Event) => {
    if (!event.endTime) return 0
    
    const startTime = parseISO(event.startTime)
    const endTime = parseISO(event.endTime)
    
    return differenceInHours(endTime, startTime) + (differenceInMinutes(endTime, startTime) % 60) / 60
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

  // Formatear ticks para el eje Y de horas (0-1440 minutos a HH:mm)
  const formatTimeTick = (tickItem: number) => {
    const hours = Math.floor(tickItem / 60);
    const minutes = tickItem % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  // Funciones de preparación de datos para gráficos
  // Preparar datos para gráfico de horas de sueño
  const prepareSleepData = () => {
    const sleepEvents = filteredEvents.filter(event => event.eventType === "sleep" || event.eventType === "nap")
    
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
    
    return Object.values(sleepByDay).map(item => ({
      name: format(parseISO(item.date), 'dd/MM', { locale: es }),
      horas: parseFloat(item.totalHours.toFixed(1)),
      eventos: item.count
    }))
  }

  // Preparar datos para gráfico de actividades
  const prepareActivityData = () => {
    const activityEvents = filteredEvents.filter(event => event.eventType === "activity" || event.eventType === "play")
    
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

  // Preparar datos para gráfico de estados emocionales
  const prepareMoodData = () => {
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

  // Preparar datos para el gráfico de siestas
  const prepareNapsChartData = (events: Event[]) => {
    return events
      .filter(event => event.eventType === "nap" && event.endTime)
      .map(nap => {
        const startTime = parseISO(nap.startTime);
        const endTime = parseISO(nap.endTime!);
        return {
          date: format(startTime, 'yyyy-MM-dd'),
          startTimeMinutes: getHours(startTime) * 60 + getMinutes(startTime),
          duration: differenceInMinutes(endTime, startTime),
          tooltip: `Siesta: ${format(startTime, 'HH:mm')} (${differenceInMinutes(endTime, startTime)} min)`
        };
      });
  };

  // Preparar datos para el gráfico de hora de acostarse/despertar
  const prepareBedtimeWakeUpChartData = (dailyPatterns: DailySleepPattern[]) => {
    return dailyPatterns.map(pattern => ({
      date: format(parseISO(pattern.dayISO), 'dd/MM'),
      bedTime: pattern.bedTime,
      wakeUpTime: pattern.wakeUpTime,
    })).sort((a, b) => parseISO(a.date.split('/').reverse().join('-')).getTime() - parseISO(b.date.split('/').reverse().join('-')).getTime());
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
  
  // Función para separar gadgets por tamaño
  const getGadgetsBySize = (size: "small" | "medium" | "large") => {
    return selectedGadgets
      .map(id => availableGadgets.find(g => g.id === id))
      .filter(gadget => gadget && gadget.size === size)
      .map(gadget => gadget!.id);
  };

  // Cargar los eventos cuando cambia el niño activo o el período
  useEffect(() => {
    const fetchEvents = async () => {
      if (!activeChildId) {
        setEvents([]);
        setFilteredEvents([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`/api/children/events?childId=${activeChildId}`);
        if (!response.ok) {
          throw new Error('Error al cargar los eventos');
        }
        const data = await response.json();
        setEvents(data.events || []);
      } catch (error) {
        console.error('Error:', error);
        setEvents([]);
        toast({
          title: "Error",
          description: "No se pudieron cargar los eventos. Inténtalo de nuevo.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [activeChildId, toast]);

  // Filtrar eventos por período seleccionado
  useEffect(() => {
    if (!events.length) {
      setFilteredEvents([]);
      return;
    }

    const { start, end } = getDateRange();
    
    const filtered = events.filter(event => {
      const eventDate = parseISO(event.startTime);
      return (isAfter(eventDate, start) || eventDate.getTime() === start.getTime()) && 
             (isBefore(eventDate, end) || eventDate.getTime() === end.getTime());
    });
    
    setFilteredEvents(filtered);
  }, [events, period]);

  // Procesar datos de patrones de sueño y preparar datos para gráficos
  useEffect(() => {
    if (!filteredEvents.length) {
      setDailySleepPatterns([]);
      setNapChartData([]);
      setBedWakeChartData([]);
      return;
    }

    // Lógica para procesar patrones de sueño diarios
    const patterns: DailySleepPattern[] = [];

    const uniqueDaysISO = [...new Set(filteredEvents.map(event => format(parseISO(event.startTime), 'yyyy-MM-dd')))].sort();

    uniqueDaysISO.forEach(dayISO => {
      const dayStart = parseISO(dayISO);
      const dayEnd = addDays(dayStart, 1);

      const eventsOfTheDay = filteredEvents.filter(event => {
        const eventStart = parseISO(event.startTime);
        const eventActualEndTime = event.endTime ? parseISO(event.endTime) : eventStart;
        return isSameDay(eventStart, dayStart) || (event.eventType === 'sleep' && eventStart < dayEnd && eventActualEndTime > dayStart);
      }).sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime());

      let mainNightSleep: Event | null = null;
      const sleepEvents = eventsOfTheDay.filter(e => e.eventType === 'sleep' && e.endTime);
      
      if (sleepEvents.length > 0) {
        mainNightSleep = sleepEvents.reduce((longest, current) => {
          const currentStarts = getHours(parseISO(current.startTime));
          if (currentStarts >= 18 || currentStarts < 4) {
             if (!longest) return current;
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
        pattern.bedTime = getHours(bedTimeDate) * 60 + getMinutes(bedTimeDate);
        let wakeUpMinutes = getHours(wakeUpDate) * 60 + getMinutes(wakeUpDate);
        pattern.wakeUpTime = wakeUpMinutes;
      }
      
      if (Object.keys(pattern).length > 1) {
        patterns.push(pattern as DailySleepPattern);
      }
    });

    setDailySleepPatterns(patterns);
    setNapChartData(prepareNapsChartData(filteredEvents));
    setBedWakeChartData(prepareBedtimeWakeUpChartData(patterns));
  }, [filteredEvents]);

  // Cargar preferencias guardadas
  useEffect(() => {
    // Cargar vista preferida (grid/list)
    const savedView = localStorage.getItem('dashboard_view');
    if (savedView && (savedView === 'grid' || savedView === 'list')) {
      setView(savedView as "grid" | "list");
    }
    
    // Cargar período preferido
    const savedPeriod = localStorage.getItem('dashboard_period');
    if (savedPeriod && ['week', 'month', '3months', 'year'].includes(savedPeriod)) {
      setPeriod(savedPeriod);
    }
    
    // Cargar gadgets seleccionados por el usuario
    const savedGadgets = localStorage.getItem('dashboard_gadgets');
    if (savedGadgets) {
      try {
        const parsedGadgets = JSON.parse(savedGadgets);
        if (Array.isArray(parsedGadgets)) {
          setSelectedGadgets(parsedGadgets);
        }
      } catch (e) {
        console.error("Error al cargar gadgets guardados:", e);
        // Si hay un error al cargar, establecer algunos gadgets por defecto
        setSelectedGadgets(["sleepHours", "napCount", "activityCount", "moodSummary"]);
      }
    } else {
      // Si no hay nada guardado, establecer algunos gadgets por defecto
      setSelectedGadgets(["sleepHours", "napCount", "activityCount", "moodSummary"]);
    }
  }, []);
  
  // Guardar preferencias cuando cambien
  useEffect(() => {
    localStorage.setItem('dashboard_view', view);
  }, [view]);
  
  useEffect(() => {
    localStorage.setItem('dashboard_period', period);
  }, [period]);
  
  useEffect(() => {
    localStorage.setItem('dashboard_gadgets', JSON.stringify(selectedGadgets));
  }, [selectedGadgets]);

  // Renderizar un placeholder para cuando no hay datos
  if (!activeChildId) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Panel personalizado con las estadísticas más relevantes</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <p>Por favor, selecciona un niño en la parte superior para ver su dashboard.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Renderizar la página con tarjetas primero y gráficos después
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Panel personalizado con las estadísticas más relevantes</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex space-x-2">
            {activeChildId && (
              <Link href={`/dashboard/children/${activeChildId}`}>
                <Button variant="outline" className="gap-2">
                  <User className="h-4 w-4" />
                  Ver perfil
                </Button>
              </Link>
            )}
            <Button
              variant={isDialogOpen ? "secondary" : "outline"}
              onClick={() => setIsDialogOpen(true)}
              className="gap-2"
            >
              <Settings2 className="h-4 w-4" />
              Personalizar gadgets
            </Button>
          </div>
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
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setView("grid")}
              className={view === "grid" ? "bg-muted" : ""}
            >
              <Grid2X2 className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setView("list")}
              className={view === "list" ? "bg-muted" : ""}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de selección de gadgets */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Personalizar gadgets</DialogTitle>
            <DialogDescription>Selecciona los gadgets que quieres mostrar en tu dashboard</DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableGadgets.map(gadget => (
                <div key={gadget.id} className="flex items-start space-x-3 space-y-0">
                  <Checkbox 
                    id={gadget.id}
                    checked={selectedGadgets.includes(gadget.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedGadgets(prev => [...prev, gadget.id]);
                      } else {
                        setSelectedGadgets(prev => prev.filter(id => id !== gadget.id));
                      }
                    }}
                  />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor={gadget.id}>{gadget.name}</Label>
                    <p className="text-sm text-muted-foreground">{gadget.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <DialogFooter>
            <Button type="submit" onClick={() => {
              // Guardar en localStorage y cerrar el modal
              localStorage.setItem('dashboard_gadgets', JSON.stringify(selectedGadgets));
              setIsDialogOpen(false);
            }}>
              Guardar configuración
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex justify-center items-center h-[calc(100vh-12rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Cargando datos...</span>
        </div>
      ) : (
        <>
          {selectedGadgets.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-10">
                <div className="text-center">
                  <p>No has seleccionado ningún gadget para mostrar.</p>
                  <Button 
                    className="mt-4" 
                    onClick={() => setIsDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Añadir gadgets
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {/* Sección de tarjetas (small size) */}
              <div className={`grid gap-4 ${view === "grid" ? 'md:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1'}`}>
                {getGadgetsBySize("small").map(gadgetId => {
                  const gadgetInfo = availableGadgets.find(gadget => gadget.id === gadgetId);
                  if (!gadgetInfo) return null;
                  
                  // Renderizar cards
                  switch (gadgetId) {
                    case "sleepHours":
                      const sleepData = prepareSleepData();
                      const avgSleepHours = sleepData.length > 0 
                        ? (sleepData.reduce((sum, day) => sum + day.horas, 0) / sleepData.length).toFixed(1)
                        : "N/A";
                        
                      return (
                        <StatsCard 
                          key={gadgetId}
                          title="Promedio de sueño" 
                          value={avgSleepHours !== "N/A" ? `${avgSleepHours}h` : "Sin datos"}
                          description="Media diaria de horas de sueño"
                        />
                      );
                    
                    case "napCount":
                      return (
                        <StatsCard 
                          key={gadgetId}
                          title="Total de siestas" 
                          value={filteredEvents.filter(e => e.eventType === "nap").length}
                          description="Durante el período seleccionado"
                        />
                      );
                    
                    case "activityCount":
                      return (
                        <StatsCard 
                          key={gadgetId}
                          title="Total actividades" 
                          value={filteredEvents.filter(e => e.eventType === "activity" || e.eventType === "play").length}
                          description="Durante el período seleccionado"
                        />
                      );
                    
                    case "moodSummary":
                      return (
                        <StatsCard 
                          key={gadgetId}
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
                                .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
                              )
                            : 'Sin datos'
                          }
                          description="Estado emocional más frecuente"
                        />
                      );
                      
                    case "eventCount":
                      return (
                        <StatsCard 
                          key={gadgetId}
                          title="Total eventos" 
                          value={filteredEvents.length}
                          description="Durante el período seleccionado"
                        />
                      );
                      
                    default:
                      return null;
                  }
                })}
              </div>
              
              {/* Sección de gráficos medianos (medium size) */}
              <div className={`grid gap-4 ${view === "grid" ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
                {getGadgetsBySize("medium").map(gadgetId => {
                  const gadgetInfo = availableGadgets.find(gadget => gadget.id === gadgetId);
                  if (!gadgetInfo) return null;
                  
                  // Renderizar gráficos medianos
                  switch (gadgetId) {
                    case "sleepPattern":
                      return (
                        <SleepPatternChart 
                          key={gadgetId}
                          bedWakeChartData={bedWakeChartData} 
                          formatTimeTick={formatTimeTick} 
                        />
                      );
                    
                    case "napChart":
                      return (
                        <NapChart 
                          key={gadgetId}
                          napChartData={napChartData} 
                          formatTimeTick={formatTimeTick} 
                        />
                      );
                    
                    case "sleepEventsChart":
                      return (
                        <SleepEventsChart 
                          key={gadgetId}
                          sleepData={prepareSleepData()} 
                        />
                      );
                    
                    case "sleepTypesChart":
                      return (
                        <SleepTypesChart 
                          key={gadgetId}
                          sleepData={prepareSleepTypesData()} 
                          colors={COLORS}
                        />
                      );
                    
                    case "activityDistribution":
                      return (
                        <ActivityDistributionChart 
                          key={gadgetId}
                          activityData={prepareActivityDistributionData()} 
                          colors={COLORS}
                        />
                      );
                    
                    case "activityDuration":
                      return (
                        <ActivityDurationChart 
                          key={gadgetId}
                          activityData={prepareActivityData()} 
                        />
                      );
                    
                    case "moodDistribution":
                      return (
                        <MoodDistributionChart 
                          key={gadgetId}
                          moodData={prepareMoodData()} 
                          colors={COLORS}
                        />
                      );
                    
                    case "moodByActivity":
                      return (
                        <MoodByActivityChart 
                          key={gadgetId}
                          moodByActivityData={prepareMoodByActivityData()}
                        />
                      );
                      
                    default:
                      return null;
                  }
                })}
              </div>
              
              {/* Sección de gráficos grandes (large size) */}
              <div className="grid gap-4 grid-cols-1">
                {getGadgetsBySize("large").map(gadgetId => {
                  const gadgetInfo = availableGadgets.find(gadget => gadget.id === gadgetId);
                  if (!gadgetInfo) return null;
                  
                  // Renderizar gráficos grandes
                  switch (gadgetId) {
                    case "progressSummary":
                      return (
                        <ProgressSummaryCard 
                          key={gadgetId}
                          filteredEvents={filteredEvents} 
                        />
                      );
                    
                    case "eventTrend":
                      return (
                        <EventTrendChart 
                          key={gadgetId}
                          filteredEvents={filteredEvents} 
                        />
                      );
                      
                    default:
                      return null;
                  }
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
