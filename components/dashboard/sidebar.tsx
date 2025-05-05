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
import { useState } from "react"
import { LayoutDashboard, Calendar, BarChart3, Users, PlusCircle, Settings, Menu, MessageSquare } from "lucide-react"

interface SidebarNavProps extends React.HTMLAttributes<HTMLDivElement> {
  items: {
    href: string
    title: string
    icon: React.ReactNode
    role?: string[]
  }[]
}

export function Sidebar({ className }: { className?: string }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isAdmin = session?.user?.role === "admin"

  const sidebarNavItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      title: "Calendario",
      href: "/dashboard/calendar",
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      title: "Registrar Evento",
      href: "/dashboard/event",
      icon: <PlusCircle className="h-5 w-5" />,
    },
    {
      title: "Estadísticas",
      href: "/dashboard/stats",
      icon: <BarChart3 className="h-5 w-5" />,
    },
    {
      title: "Asistente IA",
      href: "/dashboard/assistant",
      icon: <MessageSquare className="h-5 w-5" />,
    },
    {
      title: "Pacientes",
      href: "/dashboard/patients",
      icon: <Users className="h-5 w-5" />,
      role: ["admin"],
    },
    {
      title: "Configuración",
      href: "/dashboard/configuracion",
      icon: <Settings className="h-5 w-5" />,
    },
  ]

  // Filtrar elementos según el rol del usuario
  const filteredItems = sidebarNavItems.filter(
    (item) => !item.role || (item.role && item.role.includes(session?.user?.role as string)),
  )

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild className="md:hidden">
          <Button variant="outline" size="icon" className="fixed left-4 top-4 z-40 rounded-full">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Abrir menú</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[240px] sm:w-[280px] pr-0">
          <MobileSidebar items={filteredItems} setOpen={setOpen} />
        </SheetContent>
      </Sheet>
      <div className="hidden border-r bg-background md:block">
        <ScrollArea className="h-[calc(100vh-4rem)] w-[240px] py-6">
          <SidebarNav items={filteredItems} className="px-4" />
        </ScrollArea>
      </div>
    </>
  )
}

function SidebarNav({ items, className }: SidebarNavProps) {
  const pathname = usePathname()

  return (
    <nav className={cn("flex flex-col gap-2", className)}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname === item.href ? "bg-primary text-primary-foreground" : "hover:bg-muted",
          )}
        >
          {item.icon}
          {item.title}
        </Link>
      ))}
    </nav>
  )
}

function MobileSidebar({
  items,
  setOpen,
}: {
  items: {
    href: string
    title: string
    icon: React.ReactNode
    role?: string[]
  }[]
  setOpen: (open: boolean) => void
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
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname === item.href ? "bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {item.icon}
            {item.title}
          </Link>
        ))}
      </nav>
    </div>
  )
}
