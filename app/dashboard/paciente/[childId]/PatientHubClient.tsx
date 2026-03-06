// Hub principal del paciente - Client component con tabs
// Inyecta su header (back + nombre + tabs) en el header global via customContent
// Todos los tabs se montan siempre y se ocultan con hidden

"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, BarChart3, Stethoscope, CalendarDays, MessageSquare, ClipboardList, FileText, Archive, ArchiveRestore, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useActiveChild } from "@/context/active-child-context"
import { usePageHeaderConfig } from "@/context/page-header-context"
import ResumenTab from "./tabs/ResumenTab"
import ConsultasTab from "./tabs/ConsultasTab"
import BitacoraTab from "./tabs/BitacoraTab"
import EncuestaTab from "./tabs/EncuestaTab"
import DiagnosticPanelClient from "@/app/dashboard/diagnosticos/[childId]/DiagnosticPanelClient"
import DocumentosTab from "./tabs/DocumentosTab"

// Tabs disponibles
const TABS = [
  { id: "resumen", label: "Resumen", icon: BarChart3 },
  { id: "diagnostico", label: "Diagnostico", icon: Stethoscope },
  { id: "bitacora", label: "Bitacora", icon: CalendarDays },
  { id: "consultas", label: "Consultas", icon: MessageSquare },
  { id: "encuesta", label: "Encuesta", icon: ClipboardList },
  { id: "documentos", label: "Documentos", icon: FileText },
] as const

type TabId = typeof TABS[number]["id"]

interface PatientHubClientProps {
  childId: string
  childData: {
    firstName: string
    lastName: string
    birthDate: string
    parentId: string
    archived?: boolean
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
  const { activeChildId, setActiveChildId, setActiveUserId } = useActiveChild()
  const [isArchived, setIsArchived] = useState(childData.archived === true)
  const [isRestoringArchive, setIsRestoringArchive] = useState(false)

  // Restaurar paciente archivado
  const handleRestore = async () => {
    setIsRestoringArchive(true)
    try {
      const response = await fetch("/api/admin/children/archive", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId, archived: false }),
      })
      if (response.ok) {
        setIsArchived(false)
      }
    } catch (error) {
      console.error("Error restoring child:", error)
    } finally {
      setIsRestoringArchive(false)
    }
  }

  // Sincronizar el contexto global con el childId de la URL
  // Resuelve: admin selecciona otro nino pero el contexto sigue con el anterior
  useEffect(() => {
    if (childId && childId !== activeChildId) {
      setActiveChildId(childId)
    }
    if (childData.parentId) {
      setActiveUserId(childData.parentId)
    }
  }, [childId, childData.parentId]) // eslint-disable-line react-hooks/exhaustive-deps

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
    contentKey: activeTab,
    showChildSelector: false,
    customContent: (
      <div>
        {/* Fila 1: back + nombre + edad */}
        <div className="flex items-center gap-2 mb-2">
          <Link
            href="/dashboard/paciente"
            className="flex items-center gap-1 text-sm text-[#1a5c55] hover:text-[#0d3d38] transition-colors shrink-0 font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Pacientes
          </Link>
          <span className="text-[#1a5c55]/30 text-lg font-light">|</span>
          <h1 className="text-base font-bold text-[#1a3a4a] truncate">{childName}</h1>
          {ageText && (
            <span className="text-sm text-[#1a5c55] font-medium shrink-0">· {ageText}</span>
          )}
        </div>

        {/* Fila 2: tabs */}
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap",
                  isActive
                    ? "bg-white text-[#2553A1] shadow-sm"
                    : "text-[#1a5c55] hover:text-[#0d3d38] hover:bg-white/40"
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
      {/* Banner de paciente archivado */}
      {isArchived && (
        <div className="container pt-3 pb-0">
          <div className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-xl px-5 py-3">
            <div className="flex items-center gap-2.5 text-sm text-gray-500 font-medium">
              <Archive className="h-4 w-4 text-gray-400" />
              Este paciente esta archivado
            </div>
            <button
              type="button"
              disabled={isRestoringArchive}
              onClick={handleRestore}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#2553A1] text-white hover:bg-[#1a4391] transition-colors disabled:opacity-60"
            >
              {isRestoringArchive ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ArchiveRestore className="h-3.5 w-3.5" />
              )}
              Restaurar
            </button>
          </div>
        </div>
      )}

      {/* Contenido de los tabs - render condicional para evitar crash entre tabs */}
      <div className="container py-3">
        {activeTab === "resumen" && (
          <ResumenTab childId={childId} />
        )}
        {activeTab === "diagnostico" && (
          <DiagnosticPanelClient childId={childId} embedded={true} />
        )}
        {activeTab === "bitacora" && (
          <BitacoraTab childId={childId} />
        )}
        {activeTab === "consultas" && (
          <ConsultasTab
            childId={childId}
            parentId={childData.parentId}
            childName={childName}
            onNavigateToConsultas={handleNavigateToConsultas}
          />
        )}
        {activeTab === "encuesta" && (
          <EncuestaTab childId={childId} childName={childName} />
        )}
        {activeTab === "documentos" && (
          <DocumentosTab childId={childId} />
        )}
      </div>
    </div>
  )
}
