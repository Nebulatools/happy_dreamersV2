// Hub principal del paciente - Client component con tabs
// Inyecta su header (back + nombre + tabs) en el header global via customContent
// Todos los tabs se montan siempre y se ocultan con hidden

"use client"

import { useMemo, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, BarChart3, Stethoscope, CalendarDays, MessageSquare, ClipboardList } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePageHeaderConfig } from "@/context/page-header-context"
import ResumenTab from "./tabs/ResumenTab"
import ConsultasTab from "./tabs/ConsultasTab"
import BitacoraTab from "./tabs/BitacoraTab"
import EncuestaTab from "./tabs/EncuestaTab"
import DiagnosticPanelClient from "@/app/dashboard/diagnosticos/[childId]/DiagnosticPanelClient"

// Tabs disponibles
const TABS = [
  { id: "resumen", label: "Resumen", icon: BarChart3 },
  { id: "diagnostico", label: "Diagnostico", icon: Stethoscope },
  { id: "bitacora", label: "Bitacora", icon: CalendarDays },
  { id: "consultas", label: "Consultas", icon: MessageSquare },
  { id: "encuesta", label: "Encuesta", icon: ClipboardList },
] as const

type TabId = typeof TABS[number]["id"]

interface PatientHubClientProps {
  childId: string
  childData: {
    firstName: string
    lastName: string
    birthDate: string
    parentId: string
  }
}

// Calcular edad en meses
function calculateAgeText(birthDate: string): string {
  if (!birthDate) return ""
  try {
    const birth = new Date(birthDate)
    const now = new Date()
    let months = (now.getFullYear() - birth.getFullYear()) * 12
    months += now.getMonth() - birth.getMonth()
    if (now.getDate() < birth.getDate()) months--
    if (months < 0) months = 0
    const years = Math.floor(months / 12)
    const remainingMonths = months % 12
    if (years > 0) {
      return `${years}a ${remainingMonths}m`
    }
    return `${months}m`
  } catch {
    return ""
  }
}

export default function PatientHubClient({ childId, childData }: PatientHubClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Tab activo desde URL, default "resumen"
  const activeTab = useMemo(() => {
    const tabParam = searchParams?.get("tab") as TabId | null
    if (tabParam && TABS.some(t => t.id === tabParam)) {
      return tabParam
    }
    return "resumen" as TabId
  }, [searchParams])

  const childName = `${childData.firstName} ${childData.lastName}`.trim()
  const ageText = calculateAgeText(childData.birthDate)

  // Cambiar tab sin push al history
  const handleTabChange = useCallback((tabId: string) => {
    const params = new URLSearchParams(searchParams?.toString() || "")
    params.set("tab", tabId)
    router.replace(`/dashboard/paciente/${childId}?${params.toString()}`)
  }, [searchParams, router, childId])

  // Callback para navegar a consultas desde otros tabs
  const handleNavigateToConsultas = useCallback((subtab?: string) => {
    const params = new URLSearchParams()
    params.set("tab", "consultas")
    if (subtab) params.set("subtab", subtab)
    router.replace(`/dashboard/paciente/${childId}?${params.toString()}`)
  }, [router, childId])

  // Inyectar el header del paciente en el header global
  // El header global renderiza customContent en vez de su contenido normal
  usePageHeaderConfig({
    title: `Paciente - ${childName}`,
    showSearch: true,
    showChildSelector: false,
    showNotifications: false,
    customContent: (
      <div>
        {/* Fila 1: back + nombre + edad */}
        <div className="flex items-center gap-2 mb-1.5">
          <Link
            href="/dashboard/paciente"
            className="flex items-center gap-1 text-sm text-white/70 hover:text-white transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            Pacientes
          </Link>
          <span className="text-white/30">|</span>
          <h1 className="text-base font-semibold text-white truncate">{childName}</h1>
          {ageText && (
            <span className="text-sm text-white/70 shrink-0">· {ageText}</span>
          )}
        </div>

        {/* Fila 2: tabs */}
        <div className="flex gap-0.5 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-t-md transition-colors whitespace-nowrap",
                  isActive
                    ? "bg-[#DEF1F1] text-[#2553A1]"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>
    ),
  })

  return (
    <div className="min-h-screen">
      {/* Contenido de los tabs - patron hidden */}
      <div className="container py-3">
        <div className={activeTab === "resumen" ? "" : "hidden"}>
          <ResumenTab childId={childId} />
        </div>
        <div className={activeTab === "diagnostico" ? "" : "hidden"}>
          <DiagnosticPanelClient childId={childId} embedded={true} />
        </div>
        <div className={activeTab === "bitacora" ? "" : "hidden"}>
          <BitacoraTab childId={childId} />
        </div>
        <div className={activeTab === "consultas" ? "" : "hidden"}>
          <ConsultasTab
            childId={childId}
            parentId={childData.parentId}
            childName={childName}
            onNavigateToConsultas={handleNavigateToConsultas}
          />
        </div>
        <div className={activeTab === "encuesta" ? "" : "hidden"}>
          <EncuestaTab childId={childId} childName={childName} />
        </div>
      </div>
    </div>
  )
}
