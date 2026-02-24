// Componente de cabecera unificado para el dashboard
// Layout unico: izquierda (customContent O titulo+childSelector) + derecha (HeaderUtilityBar)

"use client"

import { cn } from "@/lib/utils"
import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { useState, useEffect, useMemo } from "react"
import { ChildSelector } from "@/components/dashboard/child-selector"
import { usePageHeader } from "@/context/page-header-context"
import { ChildAgeFromContext } from "@/components/ui/child-age-badge"
import { HeaderUtilityBar } from "@/components/dashboard/header-utility-bar"

export function Header() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const { config } = usePageHeader()

  const isAdmin = session?.user?.role === "admin"

  useEffect(() => {
    setMounted(true)
  }, [])

  // Titulo derivado de la ruta actual
  const derivedTitle = useMemo(() => {
    if (config.title && config.title !== "Dashboard") {
      return config.title
    }

    if (!pathname) {
      return config.title || "Dashboard"
    }

    const normalized = pathname.replace(/\/+$/, "")

    const directMatch: Record<string, string> = {
      "/dashboard": isAdmin ? "Dashboard Admin" : "Dashboard Usuario",
      "/dashboard/sleep-statistics": "Estadisticas de Sueno",
      "/dashboard/children": "Mis Sonadores",
      "/dashboard/calendar": "Calendario",
      "/dashboard/assistant": "Asistente IA",
      "/dashboard/patients": "Pacientes",
      "/dashboard/paciente": "Pacientes",
      "/dashboard/consultas": "Consultas",
      "/dashboard/planes": "Planes",
      "/dashboard/notificaciones": "Configuracion",
      "/dashboard/survey": "Encuesta de Sueno",
      "/dashboard/profile": "Perfil",
      "/dashboard/reports": "Reportes",
      "/dashboard/reports/professional": "Reportes Profesionales",
    }

    if (directMatch[normalized]) {
      return directMatch[normalized]
    }

    if (normalized.startsWith("/dashboard/children/") && normalized.includes("/events")) {
      return "Mis Eventos"
    }
    if (normalized.startsWith("/dashboard/children/")) {
      return "Mis Sonadores"
    }
    if (normalized.startsWith("/dashboard/planes/")) {
      return "Planes"
    }
    if (normalized.startsWith("/dashboard/reports/")) {
      return "Reportes"
    }
    if (normalized.startsWith("/dashboard/consultas/")) {
      return "Consultas"
    }
    if (normalized.startsWith("/dashboard/paciente/")) {
      return "Paciente"
    }
    if (normalized.startsWith("/dashboard/patients/")) {
      return "Pacientes"
    }

    return config.title || "Dashboard"
  }, [config.title, pathname, isAdmin])

  if (!mounted) return null

  const safeAreaPaddingTop = "calc(env(safe-area-inset-top, 0px) + 8px)"
  const hasCustomContent = !!config.customContent
  const isAdminDesktop = isAdmin && mounted

  return (
    <header
      className="sticky top-0 z-30 shadow-sm"
      style={{ backgroundColor: "#A0D8D0", minHeight: "64px" }}
    >
      {/* ===== Mobile ===== */}
      <div className="md:hidden px-3 pb-3" style={{ paddingTop: safeAreaPaddingTop }}>
        <div className="flex flex-wrap items-center gap-3">
          {/* Izquierda: child selector (para parent) */}
          <div className="flex flex-1 flex-wrap items-center gap-3 pl-14">
            {config.showChildSelector !== false && (
              <div className="flex min-w-[180px] max-w-[360px] flex-1 items-center gap-2">
                <div className="flex-1 min-w-[160px]">
                  <ChildSelector />
                </div>
              </div>
            )}
          </div>
          {/* Derecha: utilidades */}
          <div className="flex items-center justify-end gap-2 w-full sm:w-auto sm:ml-auto">
            <HeaderUtilityBar />
          </div>
        </div>
      </div>

      {/* ===== Desktop ===== */}
      <div
        className="hidden md:block px-6 pb-2"
        style={{ paddingTop: safeAreaPaddingTop }}
      >
        <div className="flex items-center gap-4 min-h-[48px]">
          {/* ZONA IZQUIERDA */}
          <div className="flex-1 min-w-0">
            {hasCustomContent ? (
              // Patient Hub: breadcrumb + tabs
              config.customContent
            ) : (
              // Paginas normales: titulo + child selector + actions
              <div className="flex items-center gap-4">
                {/* Titulo */}
                <h1 className="text-lg font-bold text-[#1a3a4a] whitespace-nowrap shrink-0">
                  {derivedTitle}
                </h1>

                {/* Actions opcionales */}
                {config.actions && (
                  <div className="flex items-center gap-2 text-white shrink-0">
                    {config.actions}
                  </div>
                )}

                {/* Child selector (solo para parents, no admin) */}
                {!isAdminDesktop && config.showChildSelector !== false && (
                  <div className="flex items-center gap-2 min-w-[180px] max-w-[360px] flex-1">
                    <div className="flex-1 min-w-[160px]">
                      <ChildSelector />
                    </div>
                    <div className="hidden lg:block">
                      <ChildAgeFromContext />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ZONA DERECHA: HeaderUtilityBar (siempre igual) */}
          <div className="shrink-0">
            <HeaderUtilityBar />
          </div>
        </div>
      </div>
    </header>
  )
}
