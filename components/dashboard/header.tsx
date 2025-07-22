// Componente de cabecera para el dashboard
// Incluye el selector de niños, perfil de usuario y toggle de tema

"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import { ThemeToggle } from "@/components/theme-toggle"
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
    if (localStorage.getItem('admin_selected_user_id')) {
      localStorage.removeItem('admin_selected_user_id')
      localStorage.removeItem('admin_selected_user_name')
    }

    // Usar window.location.href para forzar una redirección completa
    // que limpie correctamente el estado de la aplicación
    try {
      await signOut({ redirect: false })
      window.location.href = "/"
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
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
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white shadow-sm">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-6 flex-1">
          <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-[#4A90E2]"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </Link>
          <div className="flex-1 max-w-md">
            <ChildSelector />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder.svg" alt={session?.user?.name || "Usuario"} />
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
    </header>
  )
}
