"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChildAvatar } from "@/components/ui/child-avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useSession } from "next-auth/react"
import {
  Users, TrendingUp, AlertTriangle,
  Activity, CheckCircle,
  ChevronRight,
  Clock, AlertCircle, Search, Loader2,
} from "lucide-react"
import {
  format,
  parseISO,
  formatDistanceToNow,
} from "date-fns"
import { es } from "date-fns/locale"

import { createLogger } from "@/lib/logger"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

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

interface NewUserInfo {
  _id: string
  name: string
  email: string
  createdAt: string
}

interface NewChildInfo {
  _id: string
  firstName: string
  lastName: string
  createdAt: string
}

interface ChildMetric {
  childId: string
  childName: string
  apellidoContacto: string
  parentId: string
  isActive: boolean
  hasPlan: boolean
  hasRecentActivity: boolean
  status: "active" | "inactive" | "archived"
  lastEventDate: string | null
}

interface RecentActivityChild {
  childId: string
  childName: string
  apellidoContacto: string
  lastEventType: string
  lastEventTime: string
}

interface DashboardMetrics {
  totalPatients: number
  activeToday: number
  statusCounts: { active: number; inactive: number; archived: number }
  newUsersThisMonth: number
  newUsersList: NewUserInfo[]
  newChildrenThisMonth: number
  newChildrenList: NewChildInfo[]
  alerts: {
    critical: number
    warning: number
    ok: number
  }
}

// Mapa de nombres legibles para tipos de evento
const eventTypeLabels: Record<string, string> = {
  sleep: "Registro de sueno",
  nap: "Siesta",
  wake: "Despertar",
  night_waking: "Despertar nocturno",
  feeding: "Alimentacion",
  medication: "Medicamento",
  extra_activities: "Actividad extra",
}

export default function AdminStatistics() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("urgencia")

  // Estados para el sistema de triage
  const [criticalAlerts, setCriticalAlerts] = useState<ChildAlert[]>([])
  const [warningAlerts, setWarningAlerts] = useState<ChildAlert[]>([])

  // Estados para datos del API
  const [childMetrics, setChildMetrics] = useState<ChildMetric[]>([])
  const [recentActivityChildren, setRecentActivityChildren] = useState<RecentActivityChild[]>([])

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalPatients: 0,
    activeToday: 0,
    statusCounts: { active: 0, inactive: 0, archived: 0 },
    newUsersThisMonth: 0,
    newUsersList: [],
    newChildrenThisMonth: 0,
    newChildrenList: [],
    alerts: {
      critical: 0,
      warning: 0,
      ok: 0,
    },
  })

  // Cargar datos administrativos
  useEffect(() => {
    loadAdminData()
  }, [])

  const loadAdminData = async () => {
    try {
      setIsLoading(true)

      // Usar el endpoint optimizado para metricas del dashboard admin
      const metricsResponse = await fetch("/api/admin/dashboard-metrics")

      if (!metricsResponse.ok) {
        throw new Error("Error al cargar metricas del dashboard")
      }

      const metricsData = await metricsResponse.json()
      const { totalChildren, activeToday, newUsersThisMonth, newUsersList, newChildrenThisMonth, newChildrenList } = metricsData

      // Guardar childMetrics y actividad reciente del API
      setChildMetrics(metricsData.childMetrics || [])
      setRecentActivityChildren(metricsData.recentActivityChildren || [])

      // Separar alertas por severidad desde el backend
      const allAlerts: ChildAlert[] = metricsData.childAlerts || []
      setCriticalAlerts(allAlerts.filter((a: ChildAlert) => a.severity === "critical"))
      setWarningAlerts(allAlerts.filter((a: ChildAlert) => a.severity === "warning"))

      // Actualizar metricas con datos reales del endpoint
      setMetrics({
        totalPatients: totalChildren,
        activeToday: activeToday,
        statusCounts: metricsData.statusCounts || { active: 0, inactive: 0, archived: 0 },
        newUsersThisMonth: newUsersThisMonth || 0,
        newUsersList: newUsersList || [],
        newChildrenThisMonth: newChildrenThisMonth || 0,
        newChildrenList: newChildrenList || [],
        alerts: metricsData.alerts || { critical: 0, warning: 0, ok: totalChildren },
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

  // Lista filtrada de todos los pacientes para el tab "Todos"
  const filteredChildren = useMemo(() => {
    if (!childMetrics.length) return []
    const search = searchTerm.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    if (!search) return childMetrics
    return childMetrics.filter(child => {
      const name = child.childName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      const apellido = child.apellidoContacto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      return name.includes(search) || apellido.includes(search)
    })
  }, [childMetrics, searchTerm])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Buenos dias"
    if (hour < 18) return "Buenas tardes"
    return "Buenas noches"
  }

  // Navegacion a paciente
  const handlePatientClick = (childId: string) => {
    router.push(`/dashboard/paciente/${childId}`)
  }

  // Navegacion a crear plan
  const handleCreatePlan = (childId: string) => {
    router.push(`/dashboard/paciente/${childId}?tab=consultas`)
  }

  // Navegacion a revisar bitacora
  const handleReviewLog = (childId: string) => {
    router.push(`/dashboard/paciente/${childId}?tab=bitacora`)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Activity className="h-16 w-16 text-muted-foreground animate-pulse" />
        <h2 className="text-2xl font-bold">Cargando Dashboard Administrativo</h2>
        <p className="text-muted-foreground text-center">
          Obteniendo metricas y datos de todos los pacientes...
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-6 pt-2 pb-6" style={{ backgroundColor: "#DEF1F1" }}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Saludo personalizado para admin */}
        <div className="space-y-2">
          <h1
            className="greeting-title"
            style={{
              fontFamily: "Ludicrous, sans-serif",
              color: "#68A1C8",
              fontWeight: "normal",
              fontSize: "48px",
            }}
          >
            {getGreeting()}, Coach {session?.user?.name?.split(" ")[0] || "Admin"}!
          </h1>
          <p className="text-[#666666]" style={{ fontFamily: "Century Gothic, sans-serif" }}>
            Aqui esta el resumen de tus pacientes y casos que requieren atencion.
          </p>
        </div>

        {/* Metricas Simplificadas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total de Pacientes */}
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-[#666666]" style={{ fontFamily: "Century Gothic, sans-serif" }}>Total de Pacientes</p>
                  <p className="text-3xl font-bold text-[#2F2F2F]">{metrics.totalPatients}</p>
                </div>
                <div className="h-10 w-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50" style={{ fontFamily: "Century Gothic, sans-serif" }}>Registrados</Badge>
                {metrics.statusCounts.archived > 0 && (
                  <span className="text-xs text-gray-400" style={{ fontFamily: "Century Gothic, sans-serif" }}>
                    ({metrics.statusCounts.archived} archivados)
                  </span>
                )}
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                      style={{ fontFamily: "Century Gothic, sans-serif" }}
                    >
                      +{metrics.newUsersThisMonth} este mes
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="start">
                    <div className="p-4 space-y-3">
                      <h4 className="font-medium text-sm text-[#2F2F2F]" style={{ fontFamily: "Century Gothic, sans-serif" }}>
                        Nuevos registros (ultimos 30 dias)
                      </h4>
                      {metrics.newUsersThisMonth > 0 ? (
                        <>
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-[#666666] uppercase tracking-wide">Usuarios</p>
                            {metrics.newUsersList.map(user => (
                              <div key={user._id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-1.5 last:border-0">
                                <div>
                                  <span className="font-medium text-[#2F2F2F]">{user.name}</span>
                                  <span className="text-[#999999] ml-2 text-xs">{user.email}</span>
                                </div>
                                <span className="text-xs text-[#999999] whitespace-nowrap ml-2">
                                  {user.createdAt ? format(parseISO(user.createdAt), "d MMM", { locale: es }) : "—"}
                                </span>
                              </div>
                            ))}
                          </div>
                          {metrics.newChildrenThisMonth > 0 && (
                            <div className="space-y-2 pt-1">
                              <p className="text-xs font-medium text-[#666666] uppercase tracking-wide">Ninos</p>
                              {metrics.newChildrenList.map(child => (
                                <div key={child._id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-1.5 last:border-0">
                                  <span className="font-medium text-[#2F2F2F]">{child.firstName} {child.lastName}</span>
                                  <span className="text-xs text-[#999999] whitespace-nowrap ml-2">
                                    {child.createdAt ? format(parseISO(child.createdAt), "d MMM", { locale: es }) : "—"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-[#999999]" style={{ fontFamily: "Century Gothic, sans-serif" }}>
                          Sin nuevos registros este mes
                        </p>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>

          {/* Planes de Seguimiento Activos */}
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-[#666666]" style={{ fontFamily: "Century Gothic, sans-serif" }}>Planes de Seguimiento Activos</p>
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
                <span className="text-xs text-[#666666]" style={{ fontFamily: "Century Gothic, sans-serif" }} title="Pacientes con planes activos o actividad reciente">
                  planes activos o actividad en 7 dias
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Resumen de Alertas */}
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-[#666666]" style={{ fontFamily: "Century Gothic, sans-serif" }}>Resumen de Alertas</p>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5">
                      <div className="h-4 w-4 bg-red-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-red-600">{metrics.alerts.critical}</span>
                      </div>
                      <div className="h-3 w-3 rounded-full bg-red-500" />
                    </span>
                    <span className="flex items-center gap-1.5">
                      <div className="h-4 w-4 bg-yellow-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-yellow-600">{metrics.alerts.warning}</span>
                      </div>
                      <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    </span>
                    <span className="flex items-center gap-1.5">
                      <div className="h-4 w-4 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-green-600">{metrics.alerts.ok}</span>
                      </div>
                      <div className="h-3 w-3 rounded-full bg-green-500" />
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
              value="actividad"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Activity className="h-4 w-4 mr-2" />
              Actividad Reciente
              {recentActivityChildren.length > 0 && (
                <Badge className="ml-2 bg-blue-100 text-blue-700 h-5 px-1.5">
                  {recentActivityChildren.length}
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
            {/* ACCION URGENTE (Alertas Criticas) */}
            {criticalAlerts.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-[#2F2F2F]">ACCION URGENTE</h2>
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
                              <span className="font-medium">Diagnostico Clave de Zuli:</span> {alert.diagnosis}
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

            {/* NECESITAN REVISION (Alertas de Advertencia) */}
            {warningAlerts.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-[#2F2F2F]">NECESITAN REVISION</h2>
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
                              <span className="font-medium">Observacion Clave:</span> {alert.diagnosis}
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
                              Revisar Bitacora
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
                    <p className="text-[#666666]">Todos los pacientes estan estables por el momento.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab de Actividad Reciente */}
          <TabsContent value="actividad" className="mt-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-[#2F2F2F]">Pacientes con Actividad Reciente</h2>
              <p className="text-sm text-[#666666]">Ultimas 48 horas de registros</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentActivityChildren.length > 0 ? recentActivityChildren.map((child) => (
                  <Card key={child.childId} className="bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handlePatientClick(child.childId)}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <ChildAvatar
                          name={child.childName}
                          className="h-10 w-10"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#3A3A3A] font-medium truncate">
                            {child.childName}
                          </p>
                          {child.apellidoContacto && (
                            <p className="text-xs text-[#999999]">
                              Fam. {child.apellidoContacto}
                            </p>
                          )}
                          <p className="text-xs text-[#666666] mt-0.5">
                            {eventTypeLabels[child.lastEventType] || child.lastEventType}
                            {" - "}
                            {(() => {
                              try {
                                return formatDistanceToNow(parseISO(child.lastEventTime), { addSuffix: true, locale: es })
                              } catch {
                                return ""
                              }
                            })()}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-[#999999] flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                )) : (
                  <Card className="col-span-full">
                    <CardContent className="py-16">
                      <div className="text-center space-y-3">
                        <Activity className="h-12 w-12 text-gray-400 mx-auto" />
                        <h3 className="text-lg font-medium text-[#2F2F2F]">Sin actividad reciente</h3>
                        <p className="text-[#666666]">No hay registros de pacientes en las ultimas 48 horas.</p>
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
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="relative flex-1 md:max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Buscar por nombre o apellido..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-gray-100 text-gray-700">
                    {filteredChildren.length} {filteredChildren.length === 1 ? "paciente" : "pacientes"}
                  </Badge>
                </div>
              </div>

              <Card className="bg-white shadow-sm border-0">
                <CardContent className="p-0">
                  {childMetrics.length === 0 ? (
                    <div className="py-12 px-6 text-center text-sm text-muted-foreground">
                      No hay pacientes registrados.
                    </div>
                  ) : filteredChildren.length === 0 ? (
                    <div className="py-12 px-6 text-center text-sm text-muted-foreground">
                      No encontramos pacientes que coincidan con la busqueda.
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {filteredChildren.map((child) => (
                        <button
                          key={child.childId}
                          type="button"
                          className="w-full p-4 text-left transition hover:bg-gray-50 flex items-center justify-between gap-3"
                          onClick={() => handlePatientClick(child.childId)}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <ChildAvatar
                              name={child.childName}
                              className="h-9 w-9 flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#2F2F2F] truncate">
                                {child.childName}
                              </p>
                              {child.apellidoContacto && (
                                <p className="text-xs text-[#666666]">
                                  Fam. {child.apellidoContacto}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {child.status === "archived" && (
                              <Badge className="bg-gray-100 text-gray-500 text-xs">
                                Archivado
                              </Badge>
                            )}
                            {child.status === "inactive" && (
                              <Badge className="bg-gray-50 text-gray-400 text-xs">
                                Inactivo
                              </Badge>
                            )}
                            {child.hasPlan && (
                              <Badge className="bg-green-50 text-green-700 text-xs">
                                Plan activo
                              </Badge>
                            )}
                            {child.hasRecentActivity && child.status !== "archived" && (
                              <Badge className="bg-blue-50 text-blue-700 text-xs">
                                Actividad reciente
                              </Badge>
                            )}
                            <ChevronRight className="h-4 w-4 text-[#999999]" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
