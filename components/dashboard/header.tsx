// Componente de cabecera para el dashboard
// Incluye el selector de niños, perfil de usuario y toggle de tema

"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserAvatar } from "@/components/ui/user-avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { useState, useEffect } from "react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { ChildSelector } from "@/components/dashboard/child-selector"
import { usePageHeader } from "@/context/page-header-context"
import { ChildAgeFromContext } from "@/components/ui/child-age-badge"
import { Icons } from "@/components/icons"
import { Video, FileText } from "lucide-react"

import { createLogger } from "@/lib/logger"

const logger = createLogger("header")


export function Header() {
  const { data: session } = useSession()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const { config } = usePageHeader()
  const [notificationCount, setNotificationCount] = useState(0)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    setMounted(true)
  }, [])

  // Cargar conteo de notificaciones pendientes
  useEffect(() => {
    let isMountedComponent = true

    const fetchNotificationCount = async () => {
      if (!isMountedComponent) return
      if (!session?.user?.email) return

      try {
        const response = await fetch('/api/notifications/count')
        if (response.ok) {
          const data = await response.json()
          setNotificationCount(data.count || 0)
        }
      } catch (error) {
        logger.error('Error fetching notification count:', error)
      }
    }

    fetchNotificationCount()

    // Para admins, actualizar más frecuentemente para capturar nuevos transcripts de Zoom
    const refreshInterval = session?.user?.role === 'admin' ? 30000 : 60000 // 30s para admins, 60s para otros
    const interval = setInterval(fetchNotificationCount, refreshInterval)

    const handleNotificationsUpdated = () => {
      fetchNotificationCount()
    }

    window.addEventListener('notificationsUpdated', handleNotificationsUpdated)
    
    return () => {
      isMountedComponent = false
      clearInterval(interval)
      window.removeEventListener('notificationsUpdated', handleNotificationsUpdated)
    }
  }, [session])

  const fetchNotificationsList = async () => {
    if (!session?.user?.id) return
    setNotificationsLoading(true)

    try {
      const response = await fetch('/api/notifications/history?limit=10')
      if (!response.ok) throw new Error('Error cargando notificaciones')

      const data = await response.json()
      const list = data.notifications || []
      setNotifications(list)

      const toMark = list
        .filter((item: any) =>
          item?.status === 'delivered' &&
          ['invitation', 'invitation_response'].includes(item?.type)
        )
        .map((item: any) => item?._id)
        .filter(Boolean)

      if (toMark.length > 0) {
        await Promise.all(toMark.map((id: string) =>
          fetch('/api/notifications/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notificationId: id, action: 'read' })
          })
        ))

        window.dispatchEvent(new CustomEvent('notificationsUpdated'))
        setNotifications((current) => current.map((item: any) =>
          toMark.includes(item._id)
            ? { ...item, status: 'read', readAt: new Date().toISOString() }
            : item
        ))
      }
    } catch (error) {
      logger.error('Error loading notifications list:', error)
    } finally {
      setNotificationsLoading(false)
    }
  }

  useEffect(() => {
    if (notificationsOpen) {
      fetchNotificationsList()

      // Para admins, auto-refrescar la lista de notificaciones mientras está abierta
      if (session?.user?.role === 'admin') {
        const refreshInterval = setInterval(fetchNotificationsList, 15000) // Cada 15 segundos
        return () => clearInterval(refreshInterval)
      }
    }
  }, [notificationsOpen, session?.user?.role])

  if (!mounted) return null

  const handleSignOut = async () => {
    // Limpiar localStorage para evitar problemas al cerrar sesión
    if (localStorage.getItem("admin_selected_user_id")) {
      localStorage.removeItem("admin_selected_user_id")
      localStorage.removeItem("admin_selected_user_name")
    }

    // Usar window.location.href para forzar una redirección completa
    // que limpie correctamente el estado de la aplicación
    try {
      await signOut({ redirect: false })
      window.location.href = "/"
    } catch (error) {
      logger.error("Error al cerrar sesión:", error)
      // En caso de error, forzar redirección de todos modos
      window.location.href = "/"
    }
  }

  const userInitials = session?.user?.name
    ? session.user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
    : "U"

  return (
    <header className="sticky top-0 z-30 shadow-sm" style={{ backgroundColor: '#A0D8D0' }}>
      <div className="flex h-16 md:h-20 items-center justify-between px-3 md:px-6">
        {/* Título y acciones dinámicas a la izquierda */}
        <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
          <div className="min-w-0">
            <h1 className="truncate text-white" style={{ fontFamily: 'Gotham, sans-serif', fontSize: '16px', fontWeight: 'normal' }}>
              {config.title}
            </h1>
            {config.subtitle && (
              <p className="text-sm text-white/80 truncate">
                {config.subtitle}
              </p>
            )}
          </div>
          
          {/* Área para acciones/filtros dinámicos */}
          {config.actions && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {config.actions}
            </div>
          )}
        </div>
        
        {/* Controles a la derecha - configurables */}
        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
          {/* Search Button - funcional y mejorado */}
          {config.showSearch !== false && (
            <div className="hidden lg:flex items-center bg-[#DEF1F1] rounded-[30px] px-4 py-2 h-12 w-[200px] xl:w-[289px] cursor-pointer hover:bg-[#c8e3e3] transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-[#68A1C8] flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                placeholder="Buscar..."
                className="ml-2.5 bg-transparent text-[#68A1C8] text-base font-medium placeholder:text-[#68A1C8] placeholder:opacity-70 border-none outline-none flex-1"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          
          {/* Child Selector con diseño de Figma */}
          {config.showChildSelector !== false && (
            <div className="flex items-center gap-2">
              <ChildSelector />
              {/* Edad del niño - Siempre visible como solicitó la Dra. Mariana */}
              <ChildAgeFromContext />
            </div>
          )}
          
          {/* Notification Button con badge - exactamente como en Figma */}
          {config.showNotifications !== false && (
            <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="relative p-2 min-h-[44px] min-w-[44px] h-auto w-auto flex items-center justify-center"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-[18px] w-[15.75px] text-[#666666]"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                  </svg>
                  {notificationCount > 0 && (
                    <div className="absolute top-1 right-1 h-4 w-4 bg-[#DF3F40] rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-normal leading-none">{notificationCount}</span>
                    </div>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="p-4 border-b">
                  <h3 className="text-sm font-medium text-[#1F2937]">Notificaciones</h3>
                  <p className="text-xs text-muted-foreground mt-1">Últimas solicitudes y avisos</p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notificationsLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Icons.spinner className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      No hay notificaciones nuevas
                    </div>
                  ) : (
                    <div className="divide-y">
                      {notifications.map((notification) => {
                        const createdAt = notification?.createdAt ? new Date(notification.createdAt) : null
                        const isZoomTranscript = notification.type === 'zoom_transcript'

                        return (
                          <div
                            key={notification._id || notification.title}
                            className="p-4 hover:bg-gray-50 cursor-pointer"
                            onClick={() => {
                              // Navegar a consultas si es transcript de Zoom
                              if (isZoomTranscript && notification.childId) {
                                // Guardar el childId en localStorage para que se seleccione automáticamente
                                if (notification.childId) {
                                  localStorage.setItem("admin_selected_child_id", notification.childId.toString())
                                  if (notification.metadata?.childName) {
                                    localStorage.setItem("admin_selected_child_name", notification.metadata.childName)
                                  }
                                }
                                setNotificationsOpen(false)
                                router.push('/dashboard/consultas')
                              }
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-1">
                                {isZoomTranscript ? (
                                  <Video className="h-4 w-4 text-blue-600" />
                                ) : (
                                  <Icons.bell className="h-4 w-4 text-[#68A1C8]" />
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-[#1F2937]">
                                  {notification.title || 'Nueva notificación'}
                                </p>
                                {notification.message && (
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {notification.message}
                                  </p>
                                )}
                                {createdAt && (
                                  <p className="text-xs text-muted-foreground mt-2">
                                    {formatDistanceToNow(createdAt, { addSuffix: true, locale: es })}
                                  </p>
                                )}
                              </div>
                              {notification.status !== 'read' && (
                                <span className="inline-flex h-2 w-2 rounded-full bg-[#68A1C8] mt-2" />
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}
          
          {/* Profile Avatar con dropdown - como en Figma */}
          <div className="flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative p-0 min-h-[44px] min-w-[44px] flex items-center">
                  <UserAvatar 
                    name={session?.user?.name} 
                    image={session?.user?.image}
                    className="h-8 w-8 md:h-9 md:w-9" 
                  />
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3 text-[#666666] ml-1 hidden sm:block"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile">Perfil</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/configuracion">Configuración</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>Cerrar sesión</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}
