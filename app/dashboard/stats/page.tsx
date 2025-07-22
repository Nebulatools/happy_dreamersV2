"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useSession } from "next-auth/react"
import { 
  Users, TrendingUp, AlertTriangle, Calendar, 
  Moon, Activity, BarChart3, CheckCircle,
  FileText, MessageSquare, Filter
} from "lucide-react"
import {
  format,
  parseISO,
  differenceInMinutes
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

interface AdminMetrics {
  totalPatients: number
  activeToday: number
  totalEvents: number
  avgSleepHours: string
  alertsCount: number
  completedConsultations: number
}

export default function AdminDashboardPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [period, setPeriod] = useState("week")
  const [isLoading, setIsLoading] = useState(true)
  const [children, setChildren] = useState<Child[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [metrics, setMetrics] = useState<AdminMetrics>({
    totalPatients: 0,
    activeToday: 0,
    totalEvents: 0,
    avgSleepHours: "0h 0min",
    alertsCount: 0,
    completedConsultations: 0
  })
  const [recentChildren, setRecentChildren] = useState<Child[]>([])
  const [recentAlerts, setRecentAlerts] = useState<any[]>([])

  // Cargar datos administrativos
  useEffect(() => {
    loadAdminData()
  }, [period])

  const loadAdminData = async () => {
    try {
      setIsLoading(true)
      
      // Cargar todos los niños
      const childrenResponse = await fetch('/api/children')
      if (childrenResponse.ok) {
        const childrenData = await childrenResponse.json()
        const allChildren = childrenData.children || []
        setChildren(allChildren)
        setRecentChildren(allChildren.slice(0, 5))
        
        // Calcular métricas administrativas
        const totalPatients = allChildren.length
        const activeToday = Math.floor(totalPatients * 0.7) // Simular 70% activos hoy
        
        // Cargar eventos de todos los niños para calcular métricas globales
        const eventsPromises = allChildren.map((child: Child) => 
          fetch(`/api/children/events?childId=${child._id}`)
            .then(res => res.json())
            .then(data => data.events || [])
            .catch(() => [])
        )
        
        const allEventsArrays = await Promise.all(eventsPromises)
        const allEvents = allEventsArrays.flat()
        setEvents(allEvents)
        
        // Calcular métricas
        const totalEvents = allEvents.length
        const alertsCount = Math.floor(totalPatients * 0.15) // 15% con alertas
        const completedConsultations = Math.floor(totalPatients * 0.6) // 60% completadas
        
        // Calcular promedio de horas de sueño
        const sleepEvents = allEvents.filter(e => e.eventType === 'sleep' && e.endTime)
        let avgSleepHours = "0h 0min"
        if (sleepEvents.length > 0) {
          const totalMinutes = sleepEvents.reduce((sum, event) => {
            return sum + differenceInMinutes(parseISO(event.endTime!), parseISO(event.startTime))
          }, 0)
          const avgMinutes = totalMinutes / sleepEvents.length
          const hours = Math.floor(avgMinutes / 60)
          const minutes = Math.round(avgMinutes % 60)
          avgSleepHours = `${hours}h ${minutes}min`
        }
        
        setMetrics({
          totalPatients,
          activeToday,
          totalEvents,
          avgSleepHours,
          alertsCount,
          completedConsultations
        })
        
        // Simular alertas recientes
        setRecentAlerts([
          {
            id: 1,
            childName: allChildren[0]?.firstName || 'Paciente',
            message: 'Patrón de sueño irregular detectado',
            type: 'warning',
            time: '2 horas'
          },
          {
            id: 2,
            childName: allChildren[1]?.firstName || 'Paciente',
            message: 'Consulta pendiente de revisión',
            type: 'info',
            time: '5 horas'
          }
        ])
      }
    } catch (error) {
      console.error('Error loading admin data:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos administrativos.",
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

  const getAlertIcon = (type: string) => {
    switch(type) {
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'info': return <MessageSquare className="h-4 w-4 text-blue-600" />
      default: return <AlertTriangle className="h-4 w-4 text-gray-600" />
    }
  }

  const getAlertBgColor = (type: string) => {
    switch(type) {
      case 'warning': return 'bg-yellow-50 border-yellow-200'
      case 'error': return 'bg-red-50 border-red-200'
      case 'info': return 'bg-blue-50 border-blue-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Activity className="h-16 w-16 text-muted-foreground animate-pulse" />
        <h2 className="text-2xl font-bold">Cargando Dashboard Administrativo</h2>
        <p className="text-muted-foreground text-center">
          Obteniendo métricas y datos de todos los pacientes...
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F9FF] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Saludo personalizado para admin */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[#2F2F2F]">
            {getGreeting()}, Dr. {session?.user?.name?.split(' ')[0] || 'Admin'}!
          </h1>
          <p className="text-[#666666]">
            Panel administrativo con métricas globales y gestión de pacientes.
          </p>
        </div>

        {/* Métricas principales administrativas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Total de Pacientes */}
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-[#666666]">Total de Pacientes</p>
                  <p className="text-3xl font-bold text-[#2F2F2F]">{metrics.totalPatients}</p>
                </div>
                <div className="h-10 w-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50">Registrados</Badge>
                <span className="text-xs text-[#666666]">+{Math.floor(metrics.totalPatients * 0.1)} este mes</span>
              </div>
            </CardContent>
          </Card>

          {/* Activos Hoy */}
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-[#666666]">Activos Hoy</p>
                  <p className="text-3xl font-bold text-[#2F2F2F]">{metrics.activeToday}</p>
                </div>
                <div className="h-10 w-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <Activity className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Badge className="bg-green-50 text-green-700 hover:bg-green-50">
                  {Math.round((metrics.activeToday / metrics.totalPatients) * 100)}% de tasa
                </Badge>
                <span className="text-xs text-[#666666]">vs. ayer</span>
              </div>
            </CardContent>
          </Card>

          {/* Total de Eventos */}
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-[#666666]">Total de Eventos</p>
                  <p className="text-3xl font-bold text-[#2F2F2F]">{metrics.totalEvents}</p>
                </div>
                <div className="h-10 w-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Badge className="bg-purple-50 text-purple-700 hover:bg-purple-50">Registrados</Badge>
                <span className="text-xs text-[#666666]">En {period}</span>
              </div>
            </CardContent>
          </Card>

          {/* Promedio de Sueño */}
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-[#666666]">Promedio de Sueño</p>
                  <p className="text-3xl font-bold text-[#2F2F2F]">{metrics.avgSleepHours.split(' ')[0]}</p>
                </div>
                <div className="h-10 w-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <Moon className="h-5 w-5 text-indigo-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50">Global</Badge>
                <span className="text-xs text-[#666666]">Todos los pacientes</span>
              </div>
            </CardContent>
          </Card>

          {/* Alertas Activas */}
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-[#666666]">Alertas Activas</p>
                  <p className="text-3xl font-bold text-[#2F2F2F]">{metrics.alertsCount}</p>
                </div>
                <div className="h-10 w-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Badge className="bg-red-50 text-red-700 hover:bg-red-50">Requieren atención</Badge>
                <span className="text-xs text-[#666666]">2 críticas</span>
              </div>
            </CardContent>
          </Card>

          {/* Consultas Completadas */}
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-[#666666]">Consultas Completadas</p>
                  <p className="text-3xl font-bold text-[#2F2F2F]">{metrics.completedConsultations}</p>
                </div>
                <div className="h-10 w-10 bg-teal-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-teal-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Badge className="bg-teal-50 text-teal-700 hover:bg-teal-50">
                  {Math.round((metrics.completedConsultations / metrics.totalPatients) * 100)}% completado
                </Badge>
                <span className="text-xs text-[#666666]">Este período</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sección de filtros y período */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xl font-semibold text-[#2F2F2F]">Análisis Detallado</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="text-[#666666]">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">7 días</SelectItem>
                <SelectItem value="month">30 días</SelectItem>
                <SelectItem value="3months">3 meses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Grid de contenido administrativo */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pacientes Recientes */}
          <Card className="bg-white shadow-sm border-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-[#2F2F2F]">Pacientes Recientes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentChildren.map((child, index) => (
                <div key={child._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#F8FAFC] transition-colors">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={`/placeholder-user.jpg`} />
                    <AvatarFallback>{child.firstName.charAt(0)}{child.lastName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm text-[#3A3A3A] font-medium">
                      {child.firstName} {child.lastName}
                    </p>
                    <p className="text-xs text-[#666666]">
                      {child.birthDate ? 
                        `${Math.floor((Date.now() - new Date(child.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} años` 
                        : 'Edad no especificada'
                      }
                    </p>
                  </div>
                  <Badge className="bg-green-50 text-green-700 text-xs">
                    Activo
                  </Badge>
                </div>
              ))}
              {recentChildren.length === 0 && (
                <p className="text-[#666666] text-sm text-center py-8">
                  No hay pacientes registrados
                </p>
              )}
            </CardContent>
          </Card>

          {/* Alertas y Notificaciones */}
          <Card className="bg-white shadow-sm border-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-[#2F2F2F]">Alertas Recientes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentAlerts.map((alert) => (
                <div key={alert.id} className={`p-3 rounded-xl border ${getAlertBgColor(alert.type)}`}>
                  <div className="flex items-start gap-3">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <p className="text-sm text-[#3A3A3A] font-medium mb-1">
                        {alert.childName}
                      </p>
                      <p className="text-xs text-[#666666] leading-relaxed">
                        {alert.message}
                      </p>
                      <p className="text-xs text-[#999999] mt-2">
                        Hace {alert.time}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {recentAlerts.length === 0 && (
                <p className="text-[#666666] text-sm text-center py-8">
                  No hay alertas recientes
                </p>
              )}
            </CardContent>
          </Card>

          {/* Acciones Rápidas */}
          <Card className="bg-white shadow-sm border-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-[#2F2F2F]">Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full bg-[#4A90E2] hover:bg-[#2553A1] text-white justify-start">
                <FileText className="h-4 w-4 mr-2" />
                Generar Reporte
              </Button>
              <Button variant="ghost" className="w-full text-[#4A90E2] hover:bg-[#F0F7FF] justify-start">
                <Users className="h-4 w-4 mr-2" />
                Gestionar Pacientes
              </Button>
              <Button variant="ghost" className="w-full text-[#4A90E2] hover:bg-[#F0F7FF] justify-start">
                <Calendar className="h-4 w-4 mr-2" />
                Ver Calendario
              </Button>
              <Button variant="ghost" className="w-full text-[#4A90E2] hover:bg-[#F0F7FF] justify-start">
                <MessageSquare className="h-4 w-4 mr-2" />
                Consultas Pendientes
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Métricas de rendimiento (placeholder para gráficos futuros) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white shadow-sm border-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-[#2F2F2F]">Tendencias Globales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-[#F8FAFC] rounded-xl flex items-center justify-center">
                <div className="text-center space-y-2">
                  <TrendingUp className="h-12 w-12 text-[#E3E6EA] mx-auto" />
                  <p className="text-[#666666] text-sm">Gráfico de tendencias globales</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-[#2F2F2F]">Distribución de Patrones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-[#F8FAFC] rounded-xl flex items-center justify-center">
                <div className="text-center space-y-2">
                  <BarChart3 className="h-12 w-12 text-[#E3E6EA] mx-auto" />
                  <p className="text-[#666666] text-sm">Análisis de patrones de sueño</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
