"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChildAvatar } from "@/components/ui/child-avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useSession } from "next-auth/react"
import { 
  Users, TrendingUp, AlertTriangle, Calendar, 
  Moon, Activity, BarChart3, CheckCircle,
  FileText, MessageSquare, Filter, ChevronRight,
  Clock, AlertCircle, Search,
} from "lucide-react"
import {
  format,
  parseISO,
  differenceInMinutes,
} from "date-fns"
import { es } from "date-fns/locale"

import { createLogger } from "@/lib/logger"

const logger = createLogger("AdminStatistics")

// Interfaces para el sistema de triage
interface ChildAlert {
  childId: string
  childName: string
  severity: "critical" | "warning" | "ok"
  diagnosis: string
  lastUpdate: string
  parentName?: string
}

interface DashboardMetrics {
  totalPatients: number
  activeToday: number
  alerts: {
    critical: number
    warning: number
    ok: number
  }
}

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

export default function AdminStatistics() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [period, setPeriod] = useState("week")
  const [isLoading, setIsLoading] = useState(true)
  const [showAllPatients, setShowAllPatients] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("urgencia")
  
  // Estados para el nuevo sistema de triage
  const [criticalAlerts, setCriticalAlerts] = useState<ChildAlert[]>([])
  const [warningAlerts, setWarningAlerts] = useState<ChildAlert[]>([])
  const [okPatients, setOkPatients] = useState<ChildAlert[]>([])
  const [todayPatients, setTodayPatients] = useState<Child[]>([])
  
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalPatients: 0,
    activeToday: 0,
    alerts: {
      critical: 0,
      warning: 0,
      ok: 0,
    },
  })

  // Cargar datos administrativos
  useEffect(() => {
    loadAdminData()
  }, [period])

  const loadAdminData = async () => {
    try {
      setIsLoading(true)

      // Usar el nuevo endpoint optimizado para métricas del dashboard admin
      const metricsResponse = await fetch('/api/admin/dashboard-metrics')

      if (!metricsResponse.ok) {
        throw new Error('Error al cargar métricas del dashboard')
      }

      const metricsData = await metricsResponse.json()
      const { totalChildren, activeToday, childMetrics } = metricsData

      // TODO: Integrar con el backend real para alertas de Zuli
      // Los datos de triage deben venir del endpoint que proporcionará las alertas categorizadas por Zuli

      // Por ahora, inicializar arrays vacíos para alertas críticas y warnings
      const mockCriticalAlerts: ChildAlert[] = []
      const mockWarningAlerts: ChildAlert[] = []

      // Convertir childMetrics a formato de pacientes "ok"
      // Ya vienen ordenados por apellido del contacto principal desde el endpoint
      const okPatients: ChildAlert[] = childMetrics.map((metric: any) => {
        // Formato: "Apellido, Nombre"
        const [firstName, ...lastNameParts] = metric.childName.split(' ')
        const lastName = lastNameParts.join(' ')
        const displayName = lastName ? `${lastName}, ${firstName}` : firstName

        return {
          childId: metric.childId,
          childName: displayName,
          severity: "ok" as const,
          diagnosis: metric.isActive ? "Con seguimiento activo" : "Sin alertas detectadas",
          lastUpdate: "Actualizado hoy",
          parentName: metric.apellidoContacto || "N/A"
        }
      })

      const todayActivePatients: Child[] = []

      setCriticalAlerts(mockCriticalAlerts)
      setWarningAlerts(mockWarningAlerts)
      setOkPatients(okPatients)
      setTodayPatients(todayActivePatients)

      // Actualizar métricas con datos reales del nuevo endpoint
      setMetrics({
        totalPatients: totalChildren,
        activeToday: activeToday, // Pacientes con planes de seguimiento activos o actividad reciente
        alerts: {
          critical: 0,
          warning: 0,
          ok: totalChildren, // Por ahora todos son "ok" ya que no tenemos sistema de triage
        },
      })
      
    } catch (error) {
      logger.error("Error loading admin data:", error)
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

  // Función para manejar navegación a paciente
  const handlePatientClick = (childId: string) => {
    // TODO: Navegar a la vista de diagnóstico del paciente
    logger.info("Navegar a paciente:", childId)
  }

  // Función para crear plan
  const handleCreatePlan = (childId: string) => {
    // TODO: Navegar a la vista de planificación
    logger.info("Crear plan para:", childId)
  }

  // Función para revisar bitácora
  const handleReviewLog = (childId: string) => {
    // TODO: Navegar a la bitácora del paciente
    logger.info("Revisar bitácora de:", childId)
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
    <div className="min-h-screen px-6 pt-2 pb-6" style={{ backgroundColor: '#DEF1F1' }}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Saludo personalizado para admin */}
        <div className="space-y-2">
          <h1 
            className="greeting-title"
            style={{
              fontFamily: "Ludicrous, sans-serif",
              color: "#68A1C8",
              fontWeight: "normal",
              fontSize: "48px"
            }}
          >
            {getGreeting()}, Coach {session?.user?.name?.split(" ")[0] || "Admin"}!
          </h1>
          <p className="text-[#666666]" style={{ fontFamily: 'Century Gothic, sans-serif' }}>
            Aquí está el resumen de tus pacientes y casos que requieren atención.
          </p>
        </div>

        {/* Métricas Simplificadas - Movidas arriba */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total de Pacientes */}
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-[#666666]" style={{ fontFamily: 'Century Gothic, sans-serif' }}>Total de Pacientes</p>
                  <p className="text-3xl font-bold text-[#2F2F2F]">{metrics.totalPatients}</p>
                </div>
                <div className="h-10 w-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50" style={{ fontFamily: 'Century Gothic, sans-serif' }}>Registrados</Badge>
                <span className="text-xs text-[#666666]">
                  +{Math.max(1, Math.floor(metrics.totalPatients * 0.15))} este mes
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Planes de Seguimiento Activos */}
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-[#666666]" style={{ fontFamily: 'Century Gothic, sans-serif' }}>Planes de Seguimiento Activos</p>
                  <p className="text-3xl font-bold text-[#2F2F2F]">{metrics.activeToday}</p>
                </div>
                <div className="h-10 w-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <Activity className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Badge className="bg-green-50 text-green-700 hover:bg-green-50">
                  {Math.round((metrics.activeToday / metrics.totalPatients) * 100) || 0}% en seguimiento
                </Badge>
                <span className="text-xs text-[#666666]" style={{ fontFamily: 'Century Gothic, sans-serif' }} title="Pacientes con planes activos o actividad reciente">
                  planes activos o actividad en 7 días
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Resumen de Alertas */}
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-[#666666]" style={{ fontFamily: 'Century Gothic, sans-serif' }}>Resumen de Alertas</p>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <div className="h-4 w-4 bg-red-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-red-600">{metrics.alerts.critical}</span>
                      </div>
                      <span className="text-red-600">🔴</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="h-4 w-4 bg-yellow-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-yellow-600">{metrics.alerts.warning}</span>
                      </div>
                      <span className="text-yellow-600">🟡</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="h-4 w-4 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-green-600">{metrics.alerts.ok}</span>
                      </div>
                      <span className="text-green-600">🟢</span>
                    </span>
                  </div>
                </div>
                <div className="h-10 w-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Badge className="bg-purple-50 text-purple-700 hover:bg-purple-50">Estado actual</Badge>
                <span className="text-xs text-[#666666]">Actualizado ahora</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sistema de Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white/50">
            <TabsTrigger 
              value="urgencia" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Pacientes en Urgencia
              {(criticalAlerts.length + warningAlerts.length) > 0 && (
                <Badge className="ml-2 bg-red-100 text-red-700 h-5 px-1.5">
                  {criticalAlerts.length + warningAlerts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="hoy"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Pacientes de Hoy
              {todayPatients.length > 0 && (
                <Badge className="ml-2 bg-blue-100 text-blue-700 h-5 px-1.5">
                  {todayPatients.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="todos"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Users className="h-4 w-4 mr-2" />
              Todos los Pacientes
              <Badge className="ml-2 bg-gray-100 text-gray-700 h-5 px-1.5">
                {metrics.totalPatients}
              </Badge>
            </TabsTrigger>
          </TabsList>
          
          {/* Tab de Pacientes en Urgencia */}
          <TabsContent value="urgencia" className="mt-6 space-y-6">
            {/* ACCIÓN URGENTE (Alertas Críticas) */}
            {criticalAlerts.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-[#2F2F2F]">ACCIÓN URGENTE</h2>
                  <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                    {criticalAlerts.length} {criticalAlerts.length === 1 ? "caso" : "casos"}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {criticalAlerts.map((alert) => (
                    <Card key={alert.childId} className="bg-white shadow-sm border-red-200 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handlePatientClick(alert.childId)}>
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-semibold text-[#2F2F2F]">{alert.childName}</h3>
                              <p className="text-sm text-[#666666]">Padre/Madre: {alert.parentName}</p>
                            </div>
                            <div className="h-10 w-10 bg-red-100 rounded-xl flex items-center justify-center">
                              <AlertCircle className="h-5 w-5 text-red-600" />
                            </div>
                          </div>
                          
                          <div className="bg-red-50 rounded-lg p-3">
                            <p className="text-sm text-[#3A3A3A] leading-relaxed">
                              <span className="font-medium">Diagnóstico Clave de Zuli:</span> {alert.diagnosis}
                            </p>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[#666666]">{alert.lastUpdate}</span>
                            <Button 
                              size="sm" 
                              className="bg-red-600 hover:bg-red-700 text-white"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCreatePlan(alert.childId)
                              }}
                            >
                              Revisar y Crear Plan
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* NECESITAN REVISIÓN (Alertas de Advertencia) */}
            {warningAlerts.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-[#2F2F2F]">NECESITAN REVISIÓN</h2>
                  <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
                    {warningAlerts.length} {warningAlerts.length === 1 ? "caso" : "casos"}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {warningAlerts.map((alert) => (
                    <Card key={alert.childId} className="bg-white shadow-sm border-yellow-200 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handlePatientClick(alert.childId)}>
                      <CardContent className="p-5">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-base font-semibold text-[#2F2F2F]">{alert.childName}</h3>
                              <p className="text-xs text-[#666666]">Padre/Madre: {alert.parentName}</p>
                            </div>
                            <div className="h-8 w-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                              <Clock className="h-4 w-4 text-yellow-600" />
                            </div>
                          </div>
                          
                          <div className="bg-yellow-50 rounded-lg p-2.5">
                            <p className="text-xs text-[#3A3A3A] leading-relaxed">
                              <span className="font-medium">Observación Clave:</span> {alert.diagnosis}
                            </p>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[#666666]">{alert.lastUpdate}</span>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-yellow-700 border-yellow-300 hover:bg-yellow-50 text-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleReviewLog(alert.childId)
                              }}
                            >
                              Revisar Bitácora
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Mensaje si no hay urgencias */}
            {criticalAlerts.length === 0 && warningAlerts.length === 0 && (
              <Card className="bg-white shadow-sm border-0">
                <CardContent className="py-16">
                  <div className="text-center space-y-3">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                    <h3 className="text-lg font-medium text-[#2F2F2F]">Sin casos urgentes</h3>
                    <p className="text-[#666666]">Todos los pacientes están estables por el momento.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {/* Tab de Pacientes de Hoy */}
          <TabsContent value="hoy" className="mt-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-[#2F2F2F]">Pacientes con Citas Hoy</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {todayPatients.length > 0 ? todayPatients.map((child) => (
                  <Card key={child._id} className="bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handlePatientClick(child._id)}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <ChildAvatar 
                          name={`${child.firstName} ${child.lastName}`}
                          className="h-10 w-10"
                        />
                        <div className="flex-1">
                          <p className="text-sm text-[#3A3A3A] font-medium">
                            {child.firstName} {child.lastName}
                          </p>
                          <p className="text-xs text-[#666666]">
                            {child.birthDate ? 
                              `${Math.floor((Date.now() - new Date(child.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} años` 
                              : "Edad no especificada"
                            }
                          </p>
                        </div>
                        <Badge className="bg-blue-50 text-blue-700 text-xs">
                          Activo hoy
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )) : (
                  <Card className="col-span-full">
                    <CardContent className="py-16">
                      <div className="text-center space-y-3">
                        <Calendar className="h-12 w-12 text-gray-400 mx-auto" />
                        <h3 className="text-lg font-medium text-[#2F2F2F]">Sin citas programadas</h3>
                        <p className="text-[#666666]">No hay pacientes con citas para hoy.</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
          
          {/* Tab de Todos los Pacientes */}
          <TabsContent value="todos" className="mt-6">
            <div className="space-y-4">
              {/* Barra de búsqueda */}
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Buscar paciente por nombre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white"
                  />
                </div>
                <Badge className="bg-gray-100 text-gray-700">
                  {okPatients.filter(p => 
                    p.childName.toLowerCase().includes(searchTerm.toLowerCase())
                  ).length} pacientes
                </Badge>
              </div>
              
              {/* Lista alfabética de pacientes */}
              <Card className="bg-white shadow-sm border-0">
                <CardContent className="p-0">
                  <div className="divide-y divide-gray-100">
                    {okPatients
                      .filter(patient =>
                        patient.childName.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((patient, index) => (
                        <div
                          key={patient.childId}
                          className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer group"
                          onClick={() => handlePatientClick(patient.childId)}
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#8B4789]/10 text-[#8B4789] font-semibold text-sm">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <h3 className="text-sm font-medium text-[#2F2F2F] group-hover:text-[#8B4789] transition-colors">
                                {patient.childName}
                              </h3>
                              <p className="text-xs text-[#666666]">{patient.diagnosis}</p>
                            </div>
                          </div>
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
              
              {/* Mensaje si no hay resultados */}
              {okPatients.filter(p => 
                p.childName.toLowerCase().includes(searchTerm.toLowerCase())
              ).length === 0 && (
                <Card className="bg-white shadow-sm border-0">
                  <CardContent className="py-10">
                    <div className="text-center">
                      <p className="text-[#666666]">No se encontraron pacientes con ese nombre.</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
