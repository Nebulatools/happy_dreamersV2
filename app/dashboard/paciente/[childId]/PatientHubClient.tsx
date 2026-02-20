// Hub principal del paciente - Client component con tabs
// Todos los tabs se montan siempre y se ocultan con hidden

"use client"

import { useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, BarChart3, Stethoscope, CalendarDays, MessageSquare, ClipboardList } from "lucide-react"
import { cn } from "@/lib/utils"
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
  const handleTabChange = (tabId: TabId) => {
    const params = new URLSearchParams(searchParams?.toString() || "")
    params.set("tab", tabId)
    router.replace(`/dashboard/paciente/${childId}?${params.toString()}`)
  }

  // Callback para navegar a consultas desde otros tabs
  const handleNavigateToConsultas = (subtab?: string) => {
    const params = new URLSearchParams()
    params.set("tab", "consultas")
    if (subtab) params.set("subtab", subtab)
    router.replace(`/dashboard/paciente/${childId}?${params.toString()}`)
  }

  return (
    <div className="min-h-screen">
      {/* Header con back link y nombre del nino */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container py-3">
          <div className="flex items-center gap-3 mb-3">
            <Link
              href="/dashboard/paciente"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Pacientes
            </Link>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium">
              {childData.firstName?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div>
              <h1 className="text-xl font-bold">{childName}</h1>
              {ageText && (
                <p className="text-sm text-muted-foreground">{ageText}</p>
              )}
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 overflow-x-auto pb-0">
            {TABS.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-md transition-colors whitespace-nowrap",
                    isActive
                      ? "bg-background text-foreground border border-b-0 border-border"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Contenido de los tabs - patron hidden */}
      <div className="container py-6">
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
