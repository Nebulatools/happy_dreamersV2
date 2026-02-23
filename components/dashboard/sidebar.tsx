// Componente de barra lateral para el dashboard
// Incluye la navegación principal

"use client"

import type React from "react"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { signOut, useSession } from "next-auth/react"
import { useState, useEffect, useMemo, useCallback } from "react"
import { useActiveChild } from "@/context/active-child-context"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import {
  LayoutDashboard,
  Calendar,
  BarChart3,
  Users,
  Settings,
  Menu,
  MessageSquare,
  List,
  Stethoscope,
  ClipboardList,
  HelpCircle,
  Mail,
  FileText,
  ChevronLeft,
  ChevronRight,
  Activity,
  Bell,
  Bug,
  LogOut,
  User,
  Video,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { UserAvatar } from "@/components/ui/user-avatar"
import { BugCenter } from "@/components/support/BugCenter"
import { Icons } from "@/components/icons"
import { useEventsInvalidation } from "@/hooks/use-events-cache"
import { useToast } from "@/hooks/use-toast"
import { createLogger } from "@/lib/logger"

const logger = createLogger("sidebar")

interface SidebarNavProps extends React.HTMLAttributes<HTMLDivElement> {
  items: {
    href: string
    title: string
    icon: React.ReactNode
    role?: string[]
    disabled?: boolean
    onClick?: () => void
  }[]
  onItemClick?: (item: any) => void
}

export function Sidebar({ className }: { className?: string }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [children, setChildren] = useState([])
  const [collapsed, setCollapsed] = useState(false)
  const { activeChildId } = useActiveChild()
  const invalidateEvents = useEventsInvalidation()

  const isAdmin = session?.user?.role === "admin"
  const sessionUser = session?.user

  // Nombre del usuario para el sidebar
  const userFirstName = useMemo(() => {
    if (!sessionUser?.name) return "Perfil"
    const [firstChunk] = sessionUser.name.split(" ")
    return firstChunk || "Perfil"
  }, [sessionUser?.name])

  const roleLabel = useMemo(() => {
    if (sessionUser?.role === "admin") return "ADMIN"
    if (sessionUser?.role === "professional") return "COACH"
    return ""
  }, [sessionUser?.role])

  // Notificaciones (admin sidebar)
  const [notificationCount, setNotificationCount] = useState(0)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    if (!isAdmin || !session?.user?.email) return
    let isMounted = true

    const fetchCount = async () => {
      if (!isMounted) return
      try {
        const response = await fetch("/api/notifications/count")
        if (response.ok) {
          const data = await response.json()
          setNotificationCount(data.count || 0)
        }
      } catch (error) {
        logger.error("Error fetching notification count:", error)
      }
    }

    fetchCount()
    const interval = setInterval(fetchCount, 30000)

    const handleUpdated = () => fetchCount()
    window.addEventListener("notificationsUpdated", handleUpdated)

    return () => {
      isMounted = false
      clearInterval(interval)
      window.removeEventListener("notificationsUpdated", handleUpdated)
    }
  }, [isAdmin, session?.user?.email])

  const fetchNotificationsList = useCallback(async () => {
    if (!session?.user?.id) return
    setNotificationsLoading(true)
    try {
      const response = await fetch("/api/notifications/history?limit=10")
      if (!response.ok) throw new Error("Error cargando notificaciones")
      const data = await response.json()
      const list = data.notifications || []
      setNotifications(list)

      const toMark = list
        .filter((item: any) => item?.status === "delivered" && ["invitation", "invitation_response"].includes(item?.type))
        .map((item: any) => item?._id)
        .filter(Boolean)

      if (toMark.length > 0) {
        await Promise.all(toMark.map((id: string) =>
          fetch("/api/notifications/history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notificationId: id, action: "read" }),
          })
        ))
        window.dispatchEvent(new CustomEvent("notificationsUpdated"))
        setNotifications((current) => current.map((item: any) =>
          toMark.includes(item._id) ? { ...item, status: "read", readAt: new Date().toISOString() } : item
        ))
      }
    } catch (error) {
      logger.error("Error loading notifications list:", error)
    } finally {
      setNotificationsLoading(false)
    }
  }, [session?.user?.id])

  useEffect(() => {
    if (notificationsOpen && isAdmin) {
      fetchNotificationsList()
      const refreshInterval = setInterval(fetchNotificationsList, 15000)
      return () => clearInterval(refreshInterval)
    }
  }, [notificationsOpen, isAdmin, fetchNotificationsList])

  const handleSignOut = async () => {
    if (localStorage.getItem("admin_selected_user_id")) {
      localStorage.removeItem("admin_selected_user_id")
      localStorage.removeItem("admin_selected_user_name")
    }
    try {
      await signOut({ redirect: false })
      window.location.href = "/"
    } catch (error) {
      logger.error("Error al cerrar sesion:", error)
      window.location.href = "/"
    }
  }

  const eventsHref = activeChildId ? `/dashboard/children/${activeChildId}/events` : "/dashboard/children"
  const isEventsLinkDisabled = false // Ya no lo deshabilitamos, redirigimos

  const sidebarNavItems = [
    {
      title: "Dashboard Usuario",
      href: "/dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
      role: ["parent", "user"],
    },
    {
      title: "Panel General",
      href: "/dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
      role: ["admin"],
    },
    {
      title: "Estadísticas de Sueño",
      href: "/dashboard/sleep-statistics",
      icon: <BarChart3 className="h-5 w-5" />,
      role: ["parent", "user"],
    },
    {
      title: "Mis Soñadores",
      href: "/dashboard/children",
      icon: <Users className="h-5 w-5" />,
      role: ["parent", "user"],
    },
    {
      title: "Bitácora",
      href: "/dashboard/calendar",
      icon: <Calendar className="h-5 w-5" />,
      role: ["parent", "user"],
    },
    {
      title: "Mis Eventos",
      href: eventsHref,
      icon: <List className="h-5 w-5" />,
      role: ["parent", "user"],
      onClick: !activeChildId ? () => {
        toast({
          title: "Selecciona un niño primero",
          description: "Debes seleccionar o registrar un niño para ver sus eventos.",
          variant: "default",
        })
      } : undefined,
    },
    {
      title: "Cuestionario de Sueño",
      href: activeChildId ? `/dashboard/survey?childId=${activeChildId}` : "/dashboard/survey",
      icon: <ClipboardList className="h-5 w-5" />,
      role: ["parent", "user"],
    },
    {
      title: "Pacientes",
      href: "/dashboard/paciente",
      icon: <Users className="h-5 w-5" />,
      role: ["admin"],
    },
    {
      title: "Asistente IA",
      href: "/dashboard/assistant",
      icon: <MessageSquare className="h-5 w-5" />,
      role: ["admin"],
    },
    {
      title: "Planes",
      href: "/dashboard/planes",
      icon: <FileText className="h-5 w-5" />,
      role: ["parent", "user"],
    },
    {
      title: "Configuración",
      href: "/dashboard/notificaciones",
      icon: <Settings className="h-5 w-5" />,
    },
  ]

  // Cargar children cuando se abre el modal
  useEffect(() => {
    if (eventModalOpen && session?.user?.email) {
      fetch("/api/children")
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setChildren(data.children)
          }
        })
        .catch(error => logger.error("Error al obtener niños", error))
    }
  }, [eventModalOpen, session?.user?.email])

  // Filtrar elementos según el rol del usuario
  const filteredItems = sidebarNavItems.filter(
    (item) => !item.role || (item.role && item.role.includes(session?.user?.role as string))
  )

  const handleItemClick = (item: any) => {
    if (item.onClick) {
      item.onClick()
    }
  }

  // Restaurar estado de colapso desde localStorage
  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = window.localStorage.getItem("sidebarCollapsed")
    const initialCollapsed = stored === "true"
    setCollapsed(initialCollapsed)
  }, [])

  // Sincronizar ancho mediante variable CSS global
  useEffect(() => {
    if (typeof document === "undefined") return
    const width = collapsed ? "72px" : "256px"
    document.documentElement.style.setProperty("--sidebar-width", width)
    if (typeof window !== "undefined") {
      window.localStorage.setItem("sidebarCollapsed", collapsed ? "true" : "false")
    }
  }, [collapsed])

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild className="md:hidden">
          <Button variant="outline" size="icon" className="fixed left-4 top-4 z-40 rounded-full">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Abrir menú</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[256px] pr-0" style={{ backgroundColor: "#68A1C8" }}>
          {/* Título accesible oculto para lectores de pantalla */}
          <SheetHeader>
            <SheetTitle className="sr-only">Menú</SheetTitle>
          </SheetHeader>
          <MobileSidebar items={filteredItems} setOpen={setOpen} onItemClick={handleItemClick} />
        </SheetContent>
      </Sheet>
      <div
        className="hidden md:block w-[256px] min-h-screen fixed left-0 top-0 bottom-0 border-r border-white/10 z-30 transition-[width] duration-200"
        style={{ backgroundColor: "#68A1C8", width: "var(--sidebar-width, 256px)" }}
      >
        <div className="flex flex-col h-full">
          {/* Logo + toggle */}
          <div className="px-4 pt-4 pb-4 flex items-center justify-between gap-2">
            <div className="flex-1 flex items-center justify-center">
              <img
                src="/LOGO.svg"
                alt="Happy Dreamers Logo"
                style={{
                  width: collapsed ? "40px" : "163.61px",
                  height: collapsed ? "40px" : "105px",
                  objectFit: "contain",
                }}
                draggable={false}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="ml-2 h-8 w-8 rounded-full border-white/40 bg-white/10 hover:bg-white/20"
              onClick={() => setCollapsed((prev) => !prev)}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4 text-[#DEF1F1]" />
              ) : (
                <ChevronLeft className="h-4 w-4 text-[#DEF1F1]" />
              )}
              <span className="sr-only">Alternar tamaño del menú</span>
            </Button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-2">
            <div className="pb-4">
              <SidebarNav
                items={filteredItems}
                className=""
                onItemClick={handleItemClick}
                collapsed={collapsed}
              />
            </div>
          </ScrollArea>

          {/* Utilidades admin (Profile, Notifications, BugCenter) */}
          {isAdmin && (
            <div className="p-3 mt-auto border-t border-white/10 space-y-1">
              {/* Profile dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:bg-white/10 w-full",
                      collapsed ? "justify-center" : "justify-start",
                    )}
                    style={{ color: "#DEF1F1", fontFamily: "Century Gothic, sans-serif" }}
                  >
                    <UserAvatar
                      name={sessionUser?.name}
                      image={sessionUser?.image}
                      className="h-7 w-7 ring-2 ring-white/40"
                      fallbackClassName="bg-[#2553A1] text-xs"
                    />
                    {!collapsed && (
                      <div className="flex flex-col text-left leading-tight overflow-hidden">
                        <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{roleLabel}</span>
                        <span className="text-sm font-medium truncate">{userFirstName}</span>
                      </div>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="end" className="w-48">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{sessionUser?.name}</span>
                      <span className="text-xs text-muted-foreground">{sessionUser?.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/profile">
                      <User className="h-4 w-4 mr-2" />
                      Perfil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/notificaciones">
                      <Settings className="h-4 w-4 mr-2" />
                      Configuracion
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Cerrar sesion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Notification bell */}
              <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:bg-white/10 w-full relative",
                      collapsed ? "justify-center" : "justify-start",
                    )}
                    style={{ color: "#DEF1F1", fontFamily: "Century Gothic, sans-serif" }}
                  >
                    <div className="relative">
                      <Bell className="h-5 w-5" />
                      {notificationCount > 0 && (
                        <div className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-[#DF3F40] rounded-full flex items-center justify-center">
                          <span className="text-[10px] text-white font-bold leading-none">{notificationCount}</span>
                        </div>
                      )}
                    </div>
                    {!collapsed && (
                      <span className="flex-1 text-left">Notificaciones</span>
                    )}
                    {!collapsed && notificationCount > 0 && (
                      <span className="text-xs bg-[#DF3F40] text-white rounded-full px-1.5 py-0.5 font-medium">{notificationCount}</span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent side="right" align="end" className="w-80 p-0">
                  <div className="p-4 border-b">
                    <h3 className="text-sm font-medium text-[#1F2937]">Notificaciones</h3>
                    <p className="text-xs text-muted-foreground mt-1">Ultimas solicitudes y avisos</p>
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
                          const isZoomTranscript = notification.type === "zoom_transcript"
                          return (
                            <div
                              key={notification._id || notification.title}
                              className="p-3 hover:bg-gray-50 cursor-pointer"
                              onClick={() => {
                                if (isZoomTranscript && notification.childId) {
                                  setNotificationsOpen(false)
                                  router.push(`/dashboard/paciente/${notification.childId}?tab=consultas`)
                                }
                              }}
                            >
                              <div className="flex items-start gap-2">
                                <div className="mt-0.5">
                                  {isZoomTranscript ? (
                                    <Video className="h-3.5 w-3.5 text-blue-600" />
                                  ) : (
                                    <Bell className="h-3.5 w-3.5 text-[#68A1C8]" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-[#1F2937] truncate">
                                    {notification.title || "Nueva notificacion"}
                                  </p>
                                  {notification.message && (
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notification.message}</p>
                                  )}
                                  {createdAt && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {formatDistanceToNow(createdAt, { addSuffix: true, locale: es })}
                                    </p>
                                  )}
                                </div>
                                {notification.status !== "read" && (
                                  <span className="inline-flex h-2 w-2 rounded-full bg-[#68A1C8] mt-1.5 shrink-0" />
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

              {/* BugCenter */}
              <div className={cn(
                "flex items-center rounded-xl",
                collapsed ? "justify-center" : "justify-start",
              )}>
                <BugCenter variant="sidebar" collapsed={collapsed} />
              </div>
            </div>
          )}

          {/* Botones de Ayuda y Contacto al final */}
          <div className={cn("p-3 border-t border-white/10", !isAdmin && "mt-auto")}>
            <button
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 hover:bg-white/10 w-full mb-1",
                collapsed ? "justify-center" : "justify-start",
              )}
              style={{ color: "#DEF1F1", fontFamily: "Century Gothic, sans-serif" }}
              onClick={() => router.push("/dashboard/ayuda")}
            >
              <HelpCircle className="h-5 w-5" />
              {!collapsed && "Ayuda"}
            </button>
            <button
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 hover:bg-white/10 w-full",
                collapsed ? "justify-center" : "justify-start",
              )}
              style={{ color: "#DEF1F1", fontFamily: "Century Gothic, sans-serif" }}
              onClick={() => router.push("/dashboard/contacto")}
            >
              <Mail className="h-5 w-5" />
              {!collapsed && "Contacto"}
            </button>
          </div>
        </div>
      </div>

      {/* Event Registration Modal (mantenido para compatibilidad) */}
      {/* <EventRegistrationModal
        isOpen={eventModalOpen}
        onClose={() => setEventModalOpen(false)}
        childId={activeChildId || undefined}
        children={children}
        onEventCreated={() => {
          invalidateEvents() // Invalidar cache de eventos en todas las páginas
          setEventModalOpen(false)
        }}
      /> */}
    </>
  )
}

function SidebarNav({
  items,
  className,
  onItemClick,
  collapsed,
}: SidebarNavProps & { collapsed?: boolean }) {
  const pathname = usePathname()

  return (
    <nav className={cn("flex flex-col gap-1", className)}>
      {items.map((item) => {
        if (item.onClick) {
          return (
            <button
              key={item.href + item.title}
              onClick={item.disabled ? undefined : () => onItemClick?.(item)}
              disabled={item.disabled}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 text-left w-full",
                collapsed ? "justify-center px-3" : "",
                item.disabled ? "opacity-50 cursor-not-allowed" : ""
              )}
              style={{ color: "#DEF1F1", fontFamily: "Century Gothic, sans-serif" }}
            >
              {item.icon}
              {!collapsed && item.title}
            </button>
          )
        }

        // Highlight activo: coincidencia exacta o subruta
        // Excepcion para /dashboard: solo match exacto (evita que se ilumine siempre)
        const isActive = item.href === "/dashboard"
          ? pathname === "/dashboard"
          : pathname === item.href || pathname.startsWith(item.href + "/")

        return (
          <Link
            key={item.href + item.title}
            href={item.disabled ? "#" : item.href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
              collapsed ? "justify-center px-3" : "",
              isActive && !item.disabled
                ? ""
                : "hover:bg-white/10",
              item.disabled ? "opacity-50 pointer-events-none cursor-not-allowed" : ""
            )}
            style={{
              backgroundColor: isActive && !item.disabled ? "#DEF1F1" : "transparent",
              color: isActive && !item.disabled ? "#68A1C8" : "#DEF1F1",
              fontFamily: "Century Gothic, sans-serif",
            }}
            aria-disabled={item.disabled}
            tabIndex={item.disabled ? -1 : undefined}
          >
            {item.icon}
            {!collapsed && item.title}
          </Link>
        )
      })}
    </nav>
  )
}

function MobileSidebar({
  items,
  setOpen,
  onItemClick,
}: {
  items: {
    href: string
    title: string
    icon: React.ReactNode
    role?: string[]
    disabled?: boolean
    onClick?: () => void
  }[]
  setOpen: (open: boolean) => void
  onItemClick?: (item: any) => void
}) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col gap-6 py-2">
      <Link href="/dashboard" className="flex items-center justify-center px-4" onClick={() => setOpen(false)}>
        <img
          src="/LOGO.svg"
          alt="Happy Dreamers Logo"
          style={{ 
            width: "140px",
            height: "90px",
            objectFit: "contain",
          }}
          draggable={false}
        />
      </Link>
      <nav className="flex flex-col gap-2 px-2">
        {items.map((item) => {
          if (item.onClick) {
            return (
              <button
                key={item.href + item.title}
                onClick={() => {
                  if (!item.disabled) {
                    onItemClick?.(item)
                    setOpen(false)
                  }
                }}
                disabled={item.disabled}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors text-left w-full",
                  "hover:bg-white/10",
                  item.disabled ? "opacity-50 cursor-not-allowed" : ""
                )}
                style={{ color: "#DEF1F1", fontFamily: "Century Gothic, sans-serif" }}
              >
                {item.icon}
                {item.title}
              </button>
            )
          }

          // Highlight activo: coincidencia exacta o subruta
          const isActiveMobile = item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === item.href || pathname.startsWith(item.href + "/")

          return (
            <Link
              key={item.href + item.title}
              href={item.disabled ? "#" : item.href}
              onClick={() => { if (!item.disabled) setOpen(false) }}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActiveMobile && !item.disabled ? "" : "hover:bg-white/10",
                item.disabled ? "opacity-50 pointer-events-none cursor-not-allowed" : ""
              )}
              style={{
                backgroundColor: isActiveMobile && !item.disabled ? "#DEF1F1" : "transparent",
                color: isActiveMobile && !item.disabled ? "#68A1C8" : "#DEF1F1",
              }}
              aria-disabled={item.disabled}
              tabIndex={item.disabled ? -1 : undefined}
            >
              {item.icon}
              {item.title}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
