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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { useState, useEffect } from "react"
import { ChildSelector } from "@/components/dashboard/child-selector"

import { createLogger } from "@/lib/logger"

const logger = createLogger("header")


export function Header() {
  const { data: session } = useSession()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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
    <header className="sticky top-0 z-30 bg-white shadow-sm">
      <div className="flex h-20 items-center justify-between px-6">
        {/* Título a la izquierda - como en Figma */}
        <div>
          <h1 className="text-xl font-bold text-[#2F2F2F]">Dashboard</h1>
        </div>
        
        {/* Controles a la derecha - exactamente como en Figma */}
        <div className="flex items-center gap-4">
          {/* Search Button - funcional y mejorado */}
          <div className="flex items-center bg-[#F0F7FF] rounded-[30px] px-4 py-2 h-12 w-[289px] cursor-pointer hover:bg-[#E8F4FF] transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-[#2553A1] flex-shrink-0"
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
              className="ml-2.5 bg-transparent text-[#2553A1] text-base font-medium placeholder:text-[#2553A1] placeholder:opacity-70 border-none outline-none flex-1"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          {/* Child Selector con diseño de Figma */}
          <div className="flex items-center">
            <ChildSelector />
          </div>
          
          {/* Notification Button con badge - exactamente como en Figma */}
          <Button variant="ghost" className="relative p-2 h-9 w-6">
            {/* Ícono de notificación con dimensiones exactas de Figma */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-[18px] w-[15.75px] text-[#666666]"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
            </svg>
            {/* Badge con dimensiones exactas de Figma: 16x16px */}
            <div className="absolute -top-1 -right-1 h-4 w-4 bg-[#DF3F40] rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-normal leading-none">3</span>
            </div>
          </Button>
          
          {/* Profile Avatar con dropdown - como en Figma */}
          <div className="flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative p-0">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src="/placeholder-user.jpg" alt={session?.user?.name || "Usuario"} />
                    <AvatarFallback className="bg-gray-200">{userInitials}</AvatarFallback>
                  </Avatar>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3 text-[#666666] ml-1"
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
