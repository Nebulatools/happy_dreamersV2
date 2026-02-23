// Tab de consultas - Analisis AI con transcript, planes e historial
// Adaptado de app/dashboard/consultas/page.tsx con props directos

"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Stethoscope } from "lucide-react"
import { useSession } from "next-auth/react"
import { TranscriptInput } from "@/components/consultas/TranscriptInput"
import { AnalysisReport } from "@/components/consultas/AnalysisReport"
import { ConsultationHistory } from "@/components/consultas/ConsultationHistory"
import { PlanManager } from "@/components/consultas/PlanManager"
import { ConsultationTabs } from "@/components/consultas/ConsultationTabs"
import { ConsultasErrorBoundary } from "@/components/consultas/ConsultasErrorBoundary"
import { createLogger } from "@/lib/logger"

const logger = createLogger("ConsultasTab")

// Sub-tabs validos
const VALID_SUBTABS = ["transcript", "plan", "analysis", "history"] as const
type ValidSubTab = typeof VALID_SUBTABS[number]

interface ConsultasTabProps {
  childId: string
  parentId: string
  childName: string
  onNavigateToConsultas?: (subtab?: string) => void
}

export default function ConsultasTab({
  childId,
  parentId,
  childName,
  onNavigateToConsultas,
}: ConsultasTabProps) {
  const { data: session } = useSession()
  const { toast } = useToast()
  const searchParams = useSearchParams()

  // Leer subtab desde URL
  const getInitialSubTab = (): ValidSubTab => {
    const subtabParam = searchParams?.get("subtab")
    if (subtabParam && VALID_SUBTABS.includes(subtabParam as ValidSubTab)) {
      return subtabParam as ValidSubTab
    }
    return "transcript"
  }

  const isAdmin = session?.user?.role === "admin"

  const [activeSubTab, setActiveSubTab] = useState<ValidSubTab>(getInitialSubTab)
  const [transcript, setTranscript] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)

  // Sincronizar subtab desde URL
  useEffect(() => {
    const subtabParam = searchParams?.get("subtab")
    if (subtabParam && VALID_SUBTABS.includes(subtabParam as ValidSubTab)) {
      setActiveSubTab(subtabParam as ValidSubTab)
    }
  }, [searchParams])

  // Procesar analisis
  const handleAnalyze = async () => {
    if (!parentId || !childId || !transcript.trim()) {
      toast({
        title: "Informacion incompleta",
        description: "Asegurate de tener un paciente seleccionado y proporciona un transcript.",
        variant: "destructive",
      })
      return
    }

    setIsAnalyzing(true)
    try {
      const startTime = Date.now()

      const response = await fetch("/api/consultas/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: parentId,
          childId,
          transcript: transcript.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al procesar el analisis")
      }

      const result = await response.json()
      const processingTime = Date.now() - startTime
      const analysisWithMetadata = {
        ...result,
        metadata: {
          reportId: result.reportId,
          createdAt: new Date().toISOString(),
          adminName: session?.user?.name || "Admin",
          processingTime: `${processingTime}ms`,
        },
      }

      setAnalysisResult(analysisWithMetadata)

      toast({
        title: "Analisis completado",
        description: "Se ha generado el analisis y plan de mejoramiento.",
      })

      // Cambiar al sub-tab de analisis
      setTimeout(() => setActiveSubTab("analysis"), 100)
    } catch (error) {
      logger.error("Error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo procesar el analisis.",
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Renderizar contenido del sub-tab activo
  const renderSubTabContent = () => {
    switch (activeSubTab) {
      case "transcript":
        return (
          <>
            <TranscriptInput
              value={transcript}
              onChange={setTranscript}
              disabled={isAnalyzing}
              onAnalyzeRequested={handleAnalyze}
              childId={childId}
              childName={childName}
              isAdmin={isAdmin}
            />
            <div className="flex justify-center mt-6">
              <Button
                onClick={handleAnalyze}
                disabled={!transcript.trim() || isAnalyzing}
                size="lg"
                className="min-w-[200px]"
              >
                {isAnalyzing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Stethoscope className="h-4 w-4 mr-2" />
                )}
                {isAnalyzing ? "Analizando..." : "Generar Analisis Completo"}
              </Button>
            </div>
          </>
        )

      case "plan":
        return (
          <PlanManager
            selectedUserId={parentId}
            selectedChildId={childId}
            selectedChildName={childName}
            hasAnalysisResult={!!analysisResult}
            latestReportId={analysisResult?.reportId || null}
          />
        )

      case "analysis":
        return (
          <AnalysisReport
            result={analysisResult}
            isLoading={isAnalyzing}
            userName=""
            childName={childName}
          />
        )

      case "history":
        return (
          <ConsultationHistory
            selectedUserId={parentId}
            selectedChildId={childId}
            selectedChildName={childName}
            visible={true}
          />
        )

      default:
        return null
    }
  }

  return (
    <ConsultasErrorBoundary>
      <div className="space-y-6">
        {/* Sub-tabs de consultas */}
        <ConsultationTabs
          activeTab={activeSubTab}
          onTabChange={(newTab) => {
            if (isAnalyzing) return
            if (VALID_SUBTABS.includes(newTab as ValidSubTab)) {
              setActiveSubTab(newTab as ValidSubTab)
            }
          }}
          userName=""
          childName={childName}
        />

        {/* Contenido del sub-tab activo */}
        {renderSubTabContent()}
      </div>
    </ConsultasErrorBoundary>
  )
}
