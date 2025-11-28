"use client"

import { useState, useEffect, useMemo } from "react"
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
  Clock, AlertCircle, Search, Loader2,
} from "lucide-react"
import {
  format,
  parseISO,
  differenceInMinutes,
} from "date-fns"
import { es } from "date-fns/locale"

import { createLogger } from "@/lib/logger"
import { cn } from "@/lib/utils"
import { useActiveChild } from "@/context/active-child-context"

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

interface AdminUser {
  _id: string
  name: string
  email: string
  role: string
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

const extractChildrenFromPayload = (payload: any): Child[] => {
  if (!payload) return []
  if (Array.isArray(payload)) return payload as Child[]
  if (Array.isArray(payload.children)) return payload.children as Child[]
  if (Array.isArray(payload.data?.children)) return payload.data.children as Child[]
  if (Array.isArray(payload.data)) return payload.data as Child[]
  return []
}

export default function AdminStatistics() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [period, setPeriod] = useState("week")
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("urgencia")
  
  // Estados para el nuevo sistema de triage
  const [criticalAlerts, setCriticalAlerts] = useState<ChildAlert[]>([])
  const [warningAlerts, setWarningAlerts] = useState<ChildAlert[]>([])
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
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [userChildrenMap, setUserChildrenMap] = useState<Record<string, Child[]>>({})
  const [directoryLoading, setDirectoryLoading] = useState(false)
  const [directoryError, setDirectoryError] = useState<string | null>(null)
  const [childrenPrefetched, setChildrenPrefetched] = useState(false)
  const [childrenLoadingId, setChildrenLoadingId] = useState<string | null>(null)
  const {
    activeChildId,
    activeUserId,
    setActiveChildId,
    setActiveUserId,
    setActiveUserName,
  } = useActiveChild()

  // Cargar datos administrativos
  useEffect(() => {
    loadAdminData()
  }, [period])

  const loadAdminData = async () => {
    try {
      setIsLoading(true)

      // Usar el nuevo endpoint optimizado para métricas del dashboard admin
      const metricsResponse = await fetch("/api/admin/dashboard-metrics")

      if (!metricsResponse.ok) {
        throw new Error("Error al cargar métricas del dashboard")
      }

      const metricsData = await metricsResponse.json()
      const { totalChildren, activeToday } = metricsData

      // TODO: Integrar con el backend real para alertas de Zuli
      // Los datos de triage deben venir del endpoint que proporcionará las alertas categorizadas por Zuli

      // Por ahora, inicializar arrays vacíos para alertas críticas y warnings
      const mockCriticalAlerts: ChildAlert[] = []
      const mockWarningAlerts: ChildAlert[] = []

      const todayActivePatients: Child[] = []

      setCriticalAlerts(mockCriticalAlerts)
      setWarningAlerts(mockWarningAlerts)
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

  useEffect(() => {
    if (session?.user?.role !== "admin") {
      setAdminUsers([])
      return
    }

    const fetchDirectoryUsers = async () => {
      try {
        setDirectoryLoading(true)
        setDirectoryError(null)
        const response = await fetch("/api/admin/users")
        if (!response.ok) {
          throw new Error("Error al cargar usuarios")
        }
        const data = await response.json()
        const filtered = (Array.isArray(data) ? data : []).filter((user: AdminUser) => user.role !== "admin")
        setAdminUsers(filtered)
      } catch (error) {
        logger.error("No se pudieron cargar los usuarios para el directorio", error)
        setAdminUsers([])
        setDirectoryError("No se pudo cargar la lista de pacientes. Intenta nuevamente.")
      } finally {
        setDirectoryLoading(false)
      }
    }

    fetchDirectoryUsers()
  }, [session?.user?.role])

  useEffect(() => {
    if (!adminUsers.length || childrenPrefetched) return
    let isMounted = true

    const fetchAllChildren = async () => {
      try {
        const response = await fetch("/api/children")
        if (!response.ok) {
          throw new Error("Error al precargar niños")
        }
        const payload = await response.json()
        const children = extractChildrenFromPayload(payload)
        if (!isMounted || !children.length) return
        const grouped = children.reduce<Record<string, Child[]>>((acc, child) => {
          if (!child?.parentId) return acc
          if (!acc[child.parentId]) acc[child.parentId] = []
          acc[child.parentId].push(child)
          return acc
        }, {})
        setUserChildrenMap(prev => ({ ...grouped, ...prev }))
      } catch (error) {
        logger.warn("No se pudieron precargar todos los niños", error)
      } finally {
        if (isMounted) {
          setChildrenPrefetched(true)
        }
      }
    }

    fetchAllChildren()
    return () => {
      isMounted = false
    }
  }, [adminUsers, childrenPrefetched])

  const ensureUserChildren = async (userId: string) => {
    if (userChildrenMap[userId]) {
      return userChildrenMap[userId]
    }
    try {
      setChildrenLoadingId(userId)
      const response = await fetch(`/api/children?userId=${userId}`)
      if (!response.ok) {
        throw new Error("Error al cargar niños")
      }
      const payload = await response.json()
      const children = extractChildrenFromPayload(payload)
      setUserChildrenMap(prev => ({ ...prev, [userId]: children }))
      return children
    } catch (error) {
      logger.error("No se pudieron cargar los niños del usuario", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los niños de este usuario.",
        variant: "destructive",
      })
      return []
    } finally {
      setChildrenLoadingId(null)
    }
  }

  const handleParentFocus = async (user: AdminUser) => {
    await ensureUserChildren(user._id)
    setActiveUserId(user._id)
    setActiveUserName(user.name)
    setActiveChildId(null)
    toast({
      title: "Tutor sincronizado",
      description: `${user.name} está listo para elegir uno de sus niños.`,
      duration: 2500,
    })
  }

  const handleChildSelection = async (user: AdminUser, child: Child) => {
    await ensureUserChildren(user._id)
    setActiveUserId(user._id)
    setActiveUserName(user.name)
    setActiveChildId(child._id)
    toast({
      title: "Paciente seleccionado",
      description: `${child.firstName} ${child.lastName} quedó activo en el dashboard.`,
      duration: 2500,
    })
  }

  const formatChildAge = (birthDate?: string) => {
    if (!birthDate) return ""
    try {
      const birth = new Date(birthDate)
      const diffDays = Math.floor((Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays < 30) return `${diffDays}d`
      if (diffDays < 365) return `${Math.floor(diffDays / 30)}m`
      const years = Math.floor(diffDays / 365)
      const months = Math.floor((diffDays % 365) / 30)
      return months > 0 ? `${years}a ${months}m` : `${years}a`
    } catch {
      return ""
    }
  }

  const directoryFamilies = useMemo(() => {
    if (!adminUsers.length) return [] as Array<{ user: AdminUser; children: Child[] }>
    const search = searchTerm.trim().toLowerCase()
    return adminUsers.map(user => {
      const children = userChildrenMap[user._id] || []
      if (!search) {
        return { user, children }
      }
      const parentMatches = user.name.toLowerCase().includes(search) || user.email.toLowerCase().includes(search)
      const childMatches = children.some(child => `${child.firstName || ""} ${child.lastName || ""}`.trim().toLowerCase().includes(search))
      if (parentMatches || childMatches) {
        return { user, children }
      }
      return null
    }).filter(Boolean) as Array<{ user: AdminUser; children: Child[] }>
  }, [adminUsers, userChildrenMap, searchTerm])

  const totalDirectoryChildren = useMemo(() => {
    return directoryFamilies.reduce((sum, entry) => sum + entry.children.length, 0)
  }, [directoryFamilies])

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
                  <p className="text-sm text-[#666666]" style={{ fontFamily: "Century Gothic, sans-serif" }}>Total de Pacientes</p>
                  <p className="text-3xl font-bold text-[#2F2F2F]">{metrics.totalPatients}</p>
                </div>
                <div className="h-10 w-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50" style={{ fontFamily: "Century Gothic, sans-serif" }}>Registrados</Badge>
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
                  <p className="text-sm text-[#666666]" style={{ fontFamily: "Century Gothic, sans-serif" }}>Resumen de Alertas</p>
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
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="relative flex-1 md:max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Buscar tutor o niño..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-gray-100 text-gray-700">
                    {directoryFamilies.length} {directoryFamilies.length === 1 ? "familia" : "familias"}
                  </Badge>
                  <Badge className="bg-blue-50 text-blue-700">
                    {totalDirectoryChildren} {totalDirectoryChildren === 1 ? "niño" : "niños"}
                  </Badge>
                </div>
              </div>

              <Card className="bg-white shadow-sm border-0">
                <CardContent className="p-0">
                  {directoryLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                      <Loader2 className="h-6 w-6 animate-spin mb-3" />
                      <p>Cargando pacientes...</p>
                    </div>
                  ) : directoryError ? (
                    <div className="py-12 px-6 text-center text-sm text-muted-foreground">
                      {directoryError}
                    </div>
                  ) : directoryFamilies.length === 0 ? (
                    <div className="py-12 px-6 text-center text-sm text-muted-foreground">
                      No encontramos pacientes que coincidan con la búsqueda.
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {directoryFamilies.map(({ user, children }) => {
                        const isUserSelected = activeUserId === user._id
                        return (
                          <div key={user._id} className="p-4 space-y-4">
                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                              <div>
                                <p className="text-base font-semibold text-[#2F2F2F]">{user.name}</p>
                                <p className="text-sm text-[#666666]">{user.email}</p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge className="bg-gray-100 text-gray-700">
                                  {children.length} {children.length === 1 ? "niño" : "niños"}
                                </Badge>
                                {isUserSelected && (
                                  <Badge className="bg-green-100 text-green-700">
                                    Tutor activo
                                  </Badge>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleParentFocus(user)}
                                >
                                  Sincronizar tutor
                                </Button>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              {children.length > 0 ? (
                                children.map((child) => {
                                  const isChildSelected = activeChildId === child._id
                                  return (
                                    <button
                                      key={child._id}
                                      type="button"
                                      className={cn(
                                        "w-full border rounded-lg p-3 text-left transition flex items-center justify-between gap-3",
                                        isChildSelected
                                          ? "border-[#68A1C8] bg-[#DEF1F1]"
                                          : "border-gray-200 hover:border-[#68A1C8]/60 hover:bg-gray-50"
                                      )}
                                      onClick={() => handleChildSelection(user, child)}
                                    >
                                      <div>
                                        <p className="text-sm font-semibold text-[#2F2F2F]">
                                          {child.firstName} {child.lastName}
                                        </p>
                                        <p className="text-xs text-[#666666]">
                                          {formatChildAge(child.birthDate) || "Edad no disponible"}
                                        </p>
                                      </div>
                                      {isChildSelected && (
                                        <CheckCircle className="h-4 w-4 text-[#68A1C8]" />
                                      )}
                                    </button>
                                  )
                                })
                              ) : (
                                <div className="text-sm text-muted-foreground">
                                  Este tutor aún no tiene niños registrados.
                                </div>
                              )}
                              {childrenLoadingId === user._id && (
                                <div className="flex items-center text-sm text-muted-foreground gap-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Recuperando niños...
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
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
