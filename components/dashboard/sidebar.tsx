// Componente de barra lateral para el dashboard
// Incluye la navegación principal

"use client"

import type React from "react"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { useActiveChild } from "@/context/active-child-context"
import { LayoutDashboard, Calendar, BarChart3, Users, Settings, Menu, MessageSquare, List, Stethoscope, ClipboardList, HelpCircle, Mail, Bell, FileText } from "lucide-react"
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
  const { activeChildId } = useActiveChild()
  const invalidateEvents = useEventsInvalidation()

  const isAdmin = session?.user?.role === "admin"

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
      title: "Dashboard Admin",
      href: "/dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
      role: ["admin"],
    },
    {
      title: "Estadísticas de Sueño",
      href: "/dashboard/sleep-statistics",
      icon: <BarChart3 className="h-5 w-5" />,
    },
    {
      title: "Mis Soñadores",
      href: "/dashboard/children",
      icon: <Users className="h-5 w-5" />,
      role: ["parent", "user"], // Para parents y users
    },
    {
      title: "Calendario",
      href: "/dashboard/calendar",
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      title: "Mis Eventos",
      href: eventsHref,
      icon: <List className="h-5 w-5" />,
      role: ["parent", "user"], // Para parents y users
      onClick: !activeChildId ? () => {
        toast({
          title: "Selecciona un niño primero",
          description: "Debes seleccionar o registrar un niño para ver sus eventos.",
          variant: "default"
        })
      } : undefined,
    },
    {
      title: "Asistente IA",
      href: "/dashboard/assistant",
      icon: <MessageSquare className="h-5 w-5" />,
    },
    {
      title: "Encuesta de Sueño",
      href: activeChildId ? `/dashboard/survey?childId=${activeChildId}` : "/dashboard/survey",
      icon: <ClipboardList className="h-5 w-5" />,
      role: ["parent", "user"], // Para parents y users
    },
    {
      title: "Pacientes",
      href: "/dashboard/patients",
      icon: <Users className="h-5 w-5" />,
      role: ["admin"],
    },
    {
      title: "Consultas",
      href: "/dashboard/consultas",
      icon: <Stethoscope className="h-5 w-5" />,
      role: ["admin"],
    },
    {
      title: "Planes",
      href: "#",
      icon: <FileText className="h-5 w-5" />,
      role: ["parent", "user"],
      onClick: () => {
        toast({
          title: "Sección en desarrollo",
          description: "La sección de planes de sueño estará disponible próximamente",
        })
      },
    },
    {
      title: "Notificaciones",
      href: "/dashboard/notificaciones",
      icon: <Bell className="h-5 w-5" />,
    },
    {
      title: "Configuración",
      href: "/dashboard/configuracion",
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

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild className="md:hidden">
          <Button variant="outline" size="icon" className="fixed left-4 top-4 z-40 rounded-full">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Abrir menú</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[256px] pr-0" style={{ backgroundColor: '#68A1C8' }}>
          <MobileSidebar items={filteredItems} setOpen={setOpen} onItemClick={handleItemClick} />
        </SheetContent>
      </Sheet>
      <div className="hidden md:block w-[256px] min-h-screen fixed left-0 top-0 bottom-0 border-r border-white/10" style={{ backgroundColor: '#68A1C8' }}>
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="px-6 pt-6 pb-6">
            <div className="flex items-center justify-center">
              <img
                src="/LOGO.svg"
                alt="Happy Dreamers Logo"
                style={{ 
                  width: '163.61px',
                  height: '105px',
                  objectFit: 'contain'
                }}
                draggable={false}
              />
            </div>
          </div>
          
          {/* Navigation */}
          <ScrollArea className="flex-1 px-4">
            {/* Padding inferior para evitar solape con la tarjeta Premium estática */}
            <div className="pb-28">
              <SidebarNav items={filteredItems} className="" onItemClick={handleItemClick} />
            </div>
          </ScrollArea>
          
          {/* Premium Section (si no es admin) */}
          {!isAdmin && (
            <div className="p-4 mx-4 mb-6 bg-white/10 rounded-xl border border-white/20">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-5 h-5 bg-yellow-400 rounded flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-800">Plan Premium</span>
              </div>
              <p className="text-xs text-gray-700 mb-3">
                Accede a todas las funciones y análisis avanzados
              </p>
              <Button 
                size="sm" 
                className="w-full bg-white/30 hover:bg-white/40 text-gray-800 border-0 text-xs"
                onClick={() => {
                  toast({
                    title: "Próximamente disponible",
                    description: "Los planes premium estarán disponibles pronto. ¡Mantente atento!",
                  })
                }}
              >
                Actualizar Plan
              </Button>
            </div>
          )}
          
          {/* Botones de Ayuda y Contacto al final */}
          <div className="p-4 mt-auto border-t border-white/10">
            <button 
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 hover:bg-white/10 w-full mb-1"
              style={{ color: '#DEF1F1', fontFamily: 'Century Gothic, sans-serif' }}
              onClick={() => router.push('/dashboard/ayuda')}
            >
              <HelpCircle className="h-5 w-5" />
              Ayuda
            </button>
            <button 
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 hover:bg-white/10 w-full"
              style={{ color: '#DEF1F1', fontFamily: 'Century Gothic, sans-serif' }}
              onClick={() => router.push('/dashboard/contacto')}
            >
              <Mail className="h-5 w-5" />
              Contacto
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

function SidebarNav({ items, className, onItemClick }: SidebarNavProps) {
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
                item.disabled ? "opacity-50 cursor-not-allowed" : ""
              )}
              style={{ color: '#DEF1F1', fontFamily: 'Century Gothic, sans-serif' }}
            >
              {item.icon}
              {item.title}
            </button>
          )
        }

        return (
          <Link
            key={item.href + item.title}
            href={item.disabled ? "#" : item.href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
              pathname === item.href && !item.disabled 
                ? "" 
                : "hover:bg-white/10",
              item.disabled ? "opacity-50 pointer-events-none cursor-not-allowed" : ""
            )}
            style={{ 
              backgroundColor: pathname === item.href && !item.disabled ? '#DEF1F1' : 'transparent',
              color: pathname === item.href && !item.disabled ? '#68A1C8' : '#DEF1F1',
              fontFamily: 'Century Gothic, sans-serif'
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
            width: '140px',
            height: '90px',
            objectFit: 'contain'
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
                style={{ color: '#DEF1F1', fontFamily: 'Century Gothic, sans-serif' }}
              >
                {item.icon}
                {item.title}
              </button>
            )
          }

          return (
            <Link
              key={item.href + item.title}
              href={item.disabled ? "#" : item.href}
              onClick={() => { if (!item.disabled) setOpen(false) }}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname === item.href && !item.disabled ? "" : "hover:bg-white/10",
                item.disabled ? "opacity-50 pointer-events-none cursor-not-allowed" : ""
              )}
              style={{ 
                backgroundColor: pathname === item.href && !item.disabled ? '#DEF1F1' : 'transparent',
                color: pathname === item.href && !item.disabled ? '#68A1C8' : '#DEF1F1'
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
