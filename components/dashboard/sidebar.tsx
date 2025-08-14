// Componente de barra lateral para el dashboard
// Incluye la navegación principal

"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { useActiveChild } from "@/context/active-child-context"
import { LayoutDashboard, Calendar, BarChart3, Users, PlusCircle, Settings, Menu, MessageSquare, List, Stethoscope, ClipboardList, HelpCircle, Mail } from "lucide-react"
// TEMPORALMENTE COMENTADO - Sistema de eventos en reset
// import { EventRegistrationModal, QuickEventSelector } from "@/components/events"
import { useEventsInvalidation } from "@/hooks/use-events-cache"
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
  const [open, setOpen] = useState(false)
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [quickSelectorOpen, setQuickSelectorOpen] = useState(false)
  const [children, setChildren] = useState([])
  const { activeChildId } = useActiveChild()
  const invalidateEvents = useEventsInvalidation()

  const isAdmin = session?.user?.role === "admin"

  const eventsHref = activeChildId ? `/dashboard/children/${activeChildId}/events` : "#"
  const isEventsLinkDisabled = !activeChildId

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
      disabled: isEventsLinkDisabled,
      role: ["parent", "user"], // Para parents y users
    },
    {
      title: "Registrar Evento",
      href: "#",
      icon: <PlusCircle className="h-5 w-5" />,
      role: ["parent", "user"], // Para parents y users
      onClick: () => setQuickSelectorOpen(true),
      disabled: !activeChildId,
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
      title: "Configuración",
      href: "/dashboard/configuracion",
      icon: <Settings className="h-5 w-5" />,
    },
  ]

  // Cargar children cuando se abre el modal o el quick selector
  useEffect(() => {
    if ((eventModalOpen || quickSelectorOpen) && session?.user?.email) {
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
        <SheetContent side="left" className="w-[256px] pr-0 hd-gradient-primary">
          <MobileSidebar items={filteredItems} setOpen={setOpen} onItemClick={handleItemClick} />
        </SheetContent>
      </Sheet>
      <div className="hidden md:block w-[256px] min-h-screen fixed left-0 top-0 bottom-0 hd-gradient-primary border-r border-white/10">
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="px-6 pt-6 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/40 rounded-xl flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5 text-gray-800"
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-gray-800">Happy Dreamers</h1>
            </div>
          </div>
          
          {/* Navigation */}
          <ScrollArea className="flex-1 px-4">
            <SidebarNav items={filteredItems} className="" onItemClick={handleItemClick} />
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
              <Button size="sm" className="w-full bg-white/30 hover:bg-white/40 text-gray-800 border-0 text-xs">
                Actualizar Plan
              </Button>
            </div>
          )}
          
          {/* Botones de Ayuda y Contacto al final */}
          <div className="p-4 mt-auto border-t border-white/10">
            <button className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 text-gray-700 hover:bg-white/20 hover:text-gray-900 w-full mb-1">
              <HelpCircle className="h-5 w-5" />
              Ayuda
            </button>
            <button className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 text-gray-700 hover:bg-white/20 hover:text-gray-900 w-full">
              <Mail className="h-5 w-5" />
              Contacto
            </button>
          </div>
        </div>
      </div>

      {/* TEMPORALMENTE COMENTADO - Sistema de eventos en reset */}
      {/* Quick Event Selector */}
      {/* <QuickEventSelector
        isOpen={quickSelectorOpen}
        onClose={() => setQuickSelectorOpen(false)}
        childId={activeChildId || ""}
        children={children}
        onEventCreated={() => {
          invalidateEvents() // Invalidar cache de eventos en todas las páginas
          setQuickSelectorOpen(false)
        }}
      /> */}
      
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
                "text-gray-700 hover:bg-white/20 hover:text-gray-900",
                item.disabled ? "opacity-50 cursor-not-allowed" : ""
              )}
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
                ? "bg-white/30 text-gray-900 backdrop-blur-sm border border-white/50" 
                : "text-gray-700 hover:bg-white/20 hover:text-gray-900",
              item.disabled ? "opacity-50 pointer-events-none cursor-not-allowed" : ""
            )}
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
      <Link href="/dashboard" className="flex items-center gap-2 px-4" onClick={() => setOpen(false)}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6 text-primary"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
        <span className="font-bold">Happy Dreamers</span>
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
                  "hover:bg-muted",
                  item.disabled ? "opacity-50 cursor-not-allowed" : ""
                )}
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
                pathname === item.href && !item.disabled ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                item.disabled ? "opacity-50 pointer-events-none cursor-not-allowed" : ""
              )}
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
