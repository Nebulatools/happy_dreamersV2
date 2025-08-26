"use client"

// Página de configuración de notificaciones

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useActiveChild } from "@/context/active-child-context"
import { NotificationSettings } from "@/components/notifications/NotificationSettings"
import { NotificationTester } from "@/components/notifications/NotificationTester"
import { Icons } from "@/components/icons"
import { toast } from "sonner"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

interface Child {
  _id: string
  firstName: string
  lastName: string
  birthDate: string
  name?: string // Campo agregado dinámicamente
}

interface NotificationLogItem {
  _id: string
  type: string
  status: string
  title: string
  message: string
  scheduledFor: string
  sentAt?: string
  readAt?: string
  childId: {
    _id: string
    name: string
  }
}

export default function NotificacionesPage() {
  const { data: session } = useSession()
  const { activeChildId, activeUserId } = useActiveChild()
  const [children, setChildren] = useState<Child[]>([])
  const [selectedChild, setSelectedChild] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<NotificationLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0
  })
  
  // Debug log para verificar el contexto
  useEffect(() => {
    console.log("NotificacionesPage - Context values:", {
      activeUserId,
      activeChildId,
      sessionRole: session?.user?.role,
      loading
    })
  }, [activeUserId, activeChildId, session, loading])

  // Cargar lista de niños basada en el contexto
  useEffect(() => {
    // Para admins, cargar cuando hay un usuario seleccionado
    if (session?.user.role === 'admin' && activeUserId) {
      loadChildren()
    } else if (session?.user.role === 'admin' && !activeUserId) {
      // Admin sin selección - no cargar nada
      setChildren([])
      setLoading(false)
    } else if (session?.user.role && session?.user.role !== 'admin') {
      // Para usuarios normales, cargar sus propios hijos
      loadUserChildren()
    }
  }, [session, activeUserId, activeChildId])

  const loadChildren = async () => {
    try {
      // Para admins, cargar los niños del usuario seleccionado
      const url = session?.user.role === 'admin' && activeUserId 
        ? `/api/children?userId=${activeUserId}`
        : "/api/children"
        
      const response = await fetch(url)
      if (!response.ok) throw new Error("Error cargando niños")
      
      const data = await response.json()
      const childrenData = data.children || []
      
      // Mapear los datos para incluir el nombre completo
      const formattedChildren = childrenData.map((child: any) => ({
        ...child,
        name: `${child.firstName || ''} ${child.lastName || ''}`.trim() || 'Sin nombre'
      }))
      
      setChildren(formattedChildren)
      
      // Si hay un niño activo en el contexto, seleccionarlo
      if (activeChildId && formattedChildren.find((c: Child) => c._id === activeChildId)) {
        setSelectedChild(activeChildId)
      } else if (formattedChildren.length > 0) {
        setSelectedChild(formattedChildren[0]._id)
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error al cargar los perfiles")
    } finally {
      setLoading(false)
    }
  }
  
  const loadUserChildren = async () => {
    try {
      const response = await fetch("/api/children")
      if (!response.ok) throw new Error("Error cargando niños")
      
      const data = await response.json()
      const childrenData = data.children || []
      
      // Mapear los datos para incluir el nombre completo
      const formattedChildren = childrenData.map((child: any) => ({
        ...child,
        name: `${child.firstName || ''} ${child.lastName || ''}`.trim() || 'Sin nombre'
      }))
      
      setChildren(formattedChildren)
      
      // Seleccionar el primer niño por defecto
      if (formattedChildren.length > 0) {
        setSelectedChild(formattedChildren[0]._id)
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error al cargar los perfiles")
    } finally {
      setLoading(false)
    }
  }

  // Cargar historial de notificaciones cuando cambia el niño seleccionado
  useEffect(() => {
    if (selectedChild) {
      loadNotificationHistory()
    }
  }, [selectedChild])

  const loadNotificationHistory = async () => {
    try {
      const response = await fetch(`/api/notifications/history?childId=${selectedChild}&limit=20`)
      if (!response.ok) throw new Error("Error cargando historial")
      
      const data = await response.json()
      setNotifications(data.notifications || [])
      setStats(data.stats || {
        total: 0,
        sent: 0,
        delivered: 0,
        read: 0,
        failed: 0
      })
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error al cargar el historial de notificaciones")
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch("/api/notifications/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notificationId,
          action: "read"
        })
      })
      
      if (!response.ok) throw new Error("Error marcando notificación")
      
      toast.success("Notificación marcada como leída")
      loadNotificationHistory()
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error al marcar notificación")
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      scheduled: { variant: "outline", label: "Programada" },
      sent: { variant: "default", label: "Enviada" },
      delivered: { variant: "secondary", label: "Entregada" },
      read: { variant: "good", label: "Leída" },
      failed: { variant: "destructive", label: "Fallida" },
      cancelled: { variant: "outline", label: "Cancelada" }
    }
    
    const config = variants[status] || { variant: "outline", label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "bedtime":
        return <Icons.moon className="h-4 w-4" />
      case "naptime":
        return <Icons.sun className="h-4 w-4" />
      case "wake_window":
        return <Icons.clock className="h-4 w-4" />
      case "routine_start":
        return <Icons.calendar className="h-4 w-4" />
      default:
        return <Icons.bell className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Icons.spinner className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const selectedChildData = children.find(c => c._id === selectedChild)

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#1F2937]">Notificaciones</h1>
        <p className="text-gray-600 mt-2">
          Configura recordatorios automáticos para los horarios de sueño
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Enviadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.sent}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Entregadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Leídas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.read}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fallidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Mostrar mensaje apropiado según el contexto */}
      {session?.user.role === 'admin' && !activeUserId ? (
        <Card>
          <CardContent className="text-center py-8">
            <Icons.alertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">
              Selecciona un paciente primero
            </p>
            <p className="text-muted-foreground">
              Usa el selector en la parte superior de la página para elegir un usuario y niño
            </p>
          </CardContent>
        </Card>
      ) : children.length === 0 && !loading ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              No hay perfiles de niños registrados para este usuario.
            </p>
            {session?.user.role !== 'admin' && (
              <Button className="mt-4" onClick={() => window.location.href = "/dashboard/children"}>
                Agregar Niño
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Tabs value={selectedChild || undefined} onValueChange={setSelectedChild}>
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${children.length}, 1fr)` }}>
            {children.map(child => (
              <TabsTrigger key={child._id} value={child._id}>
                {child.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {children.map(child => (
            <TabsContent key={child._id} value={child._id} className="space-y-6">
              {/* Componente de prueba */}
              {process.env.NODE_ENV === 'development' && (
                <NotificationTester
                  childId={child._id}
                  childName={child.name}
                />
              )}

              {/* Configuración de notificaciones */}
              <NotificationSettings 
                childId={child._id} 
                childName={child.name}
              />

              {/* Historial de notificaciones */}
              <Card>
                <CardHeader>
                  <CardTitle>Historial de Notificaciones</CardTitle>
                  <CardDescription>
                    Últimas notificaciones enviadas para {child.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {notifications.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">
                      No hay notificaciones en el historial
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {notifications.map(notification => (
                        <div
                          key={notification._id}
                          className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-gray-50"
                        >
                          <div className="mt-1">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-sm">
                                  {notification.title}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  {formatDistanceToNow(new Date(notification.scheduledFor), { 
                                    addSuffix: true,
                                    locale: es 
                                  })}
                                </p>
                              </div>
                              <div className="flex flex-col items-end space-y-2">
                                {getStatusBadge(notification.status)}
                                {notification.status === "delivered" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => markAsRead(notification._id)}
                                  >
                                    Marcar leída
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  )
}