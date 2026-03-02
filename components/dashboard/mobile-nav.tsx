"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  BarChart3,
  Calendar,
  User,
  Users,
} from "lucide-react"

interface NavItem {
  href: string
  icon: React.ReactNode
  label: string
  onClick?: () => void
}

export function MobileBottomNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "admin"

  // Items base para parent/user
  const parentItems: NavItem[] = [
    {
      href: "/dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
      label: "Inicio",
    },
    {
      href: "/dashboard/sleep-statistics",
      icon: <BarChart3 className="h-5 w-5" />,
      label: "Estadísticas",
    },
    {
      href: "/dashboard/calendar",
      icon: <Calendar className="h-5 w-5" />,
      label: "Calendario",
    },
    {
      href: "/dashboard/profile",
      icon: <User className="h-5 w-5" />,
      label: "Perfil",
    },
  ]

  // Items para admin: reemplazar Estadísticas por Pacientes
  const adminItems: NavItem[] = [
    {
      href: "/dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
      label: "Inicio",
    },
    {
      href: "/dashboard/paciente",
      icon: <Users className="h-5 w-5" />,
      label: "Pacientes",
    },
    {
      href: "/dashboard/calendar",
      icon: <Calendar className="h-5 w-5" />,
      label: "Calendario",
    },
    {
      href: "/dashboard/profile",
      icon: <User className="h-5 w-5" />,
      label: "Perfil",
    },
  ]

  const navItems = isAdmin ? adminItems : parentItems

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-bottom">
      <nav className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          // Highlight activo: coincidencia exacta o subruta (para /dashboard/paciente/[id])
          const isActive = item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === item.href || pathname.startsWith(item.href + "/")
          
          if (item.onClick) {
            return (
              <button
                key={item.href}
                onClick={item.onClick}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 py-2 min-h-[44px]",
                  "text-gray-600 hover:text-primary transition-colors",
                  isActive && "text-primary"
                )}
              >
                {item.icon}
                <span className="text-[10px] mt-1">{item.label}</span>
              </button>
            )
          }
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-2 min-h-[44px]",
                "text-gray-600 hover:text-primary transition-colors",
                isActive && "text-primary"
              )}
            >
              {item.icon}
              <span className="text-[10px] mt-1">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}