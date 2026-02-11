"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Loader2, AlertCircle, Info } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useActiveChild } from "@/context/active-child-context"

// Componentes del panel de diagnostico
import ProfileHeader from "@/components/diagnostic/ProfileHeader"
import { G1ScheduleValidation } from "@/components/diagnostic/ValidationGroups/G1ScheduleValidation"
import { G2MedicalValidation } from "@/components/diagnostic/ValidationGroups/G2MedicalValidation"
import { G3NutritionValidation } from "@/components/diagnostic/ValidationGroups/G3NutritionValidation"
import { G4EnvironmentalValidation } from "@/components/diagnostic/ValidationGroups/G4EnvironmentalValidation"
import { AlertDetailModal } from "@/components/diagnostic/Modals/AlertDetailModal"
import { PasanteAISection } from "@/components/diagnostic/AIAnalysis/PasanteAISection"
import { DiagnosticCTAs } from "@/components/diagnostic/DiagnosticCTAs"

// Tipos
import type {
  DiagnosticResult,
  CriterionResult,
  Alert,
} from "@/lib/diagnostic/types"

interface DiagnosticPanelClientProps {
  childId: string
}

// Estados posibles del componente
type ViewState = "loading" | "error" | "success"

interface ChildData {
  _id: string
  firstName: string
  lastName?: string
  birthDate?: string
  parentId: string
}

interface PlanData {
  planId: string
  planVersion: string
  status: string
  startDate?: string
}

/**
 * DiagnosticPanelClient - Cliente del panel de diagnostico
 *
 * Orquesta todos los componentes del panel de diagnostico:
 * - ProfileHeader: datos del nino y estado general
 * - ValidationGroups (G1-G4): cards de validacion por grupo
 * - AlertDetailModal: modal de detalle al hacer click en un criterio
 * - PasanteAISection: seccion de analisis AI on-demand
 * - DiagnosticCTAs: botones de editar plan y generar nuevo
 *
 * Estados:
 * - loading: cargando datos del diagnostico
 * - error: error al cargar (red de error, etc)
 * - success: diagnostico cargado correctamente (parcial o completo)
 */
export default function DiagnosticPanelClient({ childId }: DiagnosticPanelClientProps) {
  const { toast } = useToast()
  const router = useRouter()
  const { activeChildId, isInitialized } = useActiveChild()
  const hasInitializedRef = useRef(false)

  // Si el admin limpia la seleccion o cambia de nino, redirigir
  useEffect(() => {
    if (!isInitialized) return

    // Saltar el valor inicial (persistido de localStorage)
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true
      return
    }

    // Seleccion limpiada → volver a pantalla de seleccion
    if (!activeChildId) {
      router.push("/dashboard/diagnosticos")
      return
    }

    // Cambio a otro nino → navegar a su panel
    if (activeChildId !== childId) {
      router.push(`/dashboard/diagnosticos/${activeChildId}`)
    }
  }, [activeChildId, isInitialized, router, childId])

  // Estados
  const [viewState, setViewState] = useState<ViewState>("loading")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null)
  const [childData, setChildData] = useState<ChildData | null>(null)
  const [planData, setPlanData] = useState<PlanData | null>(null)
  const [surveyDataAvailable, setSurveyDataAvailable] = useState(false)

  // Estado del modal de detalle
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState("")
  const [modalCriteria, setModalCriteria] = useState<CriterionResult[]>([])

  // Cargar diagnostico
  useEffect(() => {
    const fetchDiagnostic = async () => {
      setViewState("loading")
      setErrorMessage(null)

      try {
        const response = await fetch(`/api/admin/diagnostics/${childId}`)

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Error al cargar diagnostico")
        }

        const data = await response.json()
        setDiagnosticResult(data)

        // Extraer datos del nino y plan del resultado
        setChildData({
          _id: childId,
          firstName: data.childName.split(" ")[0] || data.childName,
          lastName: data.childName.split(" ").slice(1).join(" ") || undefined,
          birthDate: data.childBirthDate, // Ahora viene del API
          parentId: "", // No necesario para mostrar
        })

        if (data.planId) {
          setPlanData({
            planId: data.planId,
            planVersion: data.planVersion,
            status: "active",
            startDate: undefined,
          })
        } else {
          setPlanData(null)
        }

        // Determinar si tiene datos de survey
        // Basado en completeness de G2 y G4 que usan survey
        const g2Completeness = data.groups.G2?.dataCompleteness?.available || 0
        const g4Completeness = data.groups.G4?.dataCompleteness?.available || 0
        setSurveyDataAvailable(g2Completeness > 0 || g4Completeness > 0)

        setViewState("success")
      } catch (error) {
        console.error("Error fetching diagnostic:", error)
        setErrorMessage(error instanceof Error ? error.message : "Error desconocido")
        setViewState("error")
      }
    }

    fetchDiagnostic()
  }, [childId])

  // Handler para abrir modal de detalle
  const handleCriterionClick = (criterion: CriterionResult, groupTitle: string) => {
    // Encontrar todos los criterios del grupo para mostrar en modal
    let criteria: CriterionResult[] = []

    if (diagnosticResult) {
      switch (groupTitle) {
      case "G1 - Horario":
        criteria = diagnosticResult.groups.G1.criteria
        break
      case "G2 - Medico":
        criteria = diagnosticResult.groups.G2.criteria
        break
      case "G3 - Alimentacion":
        criteria = diagnosticResult.groups.G3.criteria
        break
      case "G4 - Entorno":
        criteria = diagnosticResult.groups.G4.criteria
        break
      default:
        criteria = [criterion]
      }
    }

    setModalTitle(groupTitle)
    setModalCriteria(criteria)
    setModalOpen(true)
  }

  // Extraer alertas criticas para ProfileHeader
  const criticalAlerts: Alert[] = diagnosticResult?.alerts.filter(
    (a) => a.severity === "alert"
  ) || []

  // ============================================
  // RENDERS POR ESTADO
  // ============================================

  // Estado: Loading
  if (viewState === "loading") {
    return (
      <div className="container py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="py-16 text-center">
            <Loader2 className="h-12 w-12 mx-auto text-gray-400 animate-spin mb-4" />
            <p className="text-gray-600">Cargando diagnostico...</p>
            <p className="text-sm text-gray-400 mt-2">
              Analizando eventos, encuesta y plan
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Estado: Error
  if (viewState === "error") {
    return (
      <div className="container py-8">
        <Card className="max-w-md mx-auto border-red-200">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
            <h3 className="text-lg font-semibold text-red-700 mb-2">
              Error al cargar diagnostico
            </h3>
            <p className="text-gray-600 mb-6">{errorMessage}</p>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="border-red-200 text-red-700 hover:bg-red-50"
            >
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Estado: Success (diagnostico cargado)
  if (viewState === "success" && diagnosticResult) {
    return (
      <div className="container py-8 space-y-6">
        {/* Header del nino */}
        <ProfileHeader
          child={childData || {
            _id: childId,
            firstName: diagnosticResult.childName.split(" ")[0] || diagnosticResult.childName,
            lastName: diagnosticResult.childName.split(" ").slice(1).join(" ") || undefined,
            birthDate: diagnosticResult.childBirthDate,
          }}
          plan={planData || undefined}
          surveyDataAvailable={surveyDataAvailable}
          criticalAlerts={criticalAlerts}
          overallStatus={diagnosticResult.overallStatus}
        />

        {/* Banner de datos faltantes (diagnostico parcial) */}
        {diagnosticResult.missingDataSources && diagnosticResult.missingDataSources.length > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    Diagnostico parcial - Datos faltantes:
                  </p>
                  <ul className="mt-1 text-sm text-blue-700 list-disc list-inside">
                    {diagnosticResult.missingDataSources.map((source: string, i: number) => (
                      <li key={i}>{source}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Grid de grupos de validacion (2x2) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* G1 - Horario */}
          <G1ScheduleValidation
            validation={diagnosticResult.groups.G1}
            onCriterionClick={(criterion) =>
              handleCriterionClick(criterion, "G1 - Horario")
            }
          />

          {/* G2 - Medico */}
          <G2MedicalValidation
            validation={diagnosticResult.groups.G2}
            onCriterionClick={(criterion) =>
              handleCriterionClick(criterion, "G2 - Medico")
            }
          />

          {/* G3 - Alimentacion */}
          <G3NutritionValidation
            validation={diagnosticResult.groups.G3}
            onCriterionClick={(criterion) =>
              handleCriterionClick(criterion, "G3 - Alimentacion")
            }
          />

          {/* G4 - Entorno */}
          <G4EnvironmentalValidation
            validation={diagnosticResult.groups.G4}
            onCriterionClick={(criterion) =>
              handleCriterionClick(criterion, "G4 - Entorno")
            }
          />
        </div>

        {/* Seccion Pasante AI */}
        <PasanteAISection
          childId={childId}
          childName={diagnosticResult.childName}
          childAgeMonths={diagnosticResult.childAgeMonths}
          diagnosticResult={diagnosticResult}
          planVersion={diagnosticResult.planVersion || "sin plan"}
          planStatus={diagnosticResult.planId ? "active" : "sin plan"}
          recentEventsCount={diagnosticResult.groups.G1.criteria.length}
          surveyDataAvailable={surveyDataAvailable}
          freeTextData={diagnosticResult.freeTextData}
        />

        {/* CTAs finales */}
        <div className="flex justify-end border-t pt-6">
          <DiagnosticCTAs
            childId={childId}
            planId={diagnosticResult.planId}
            parentId={diagnosticResult.parentId}
          />
        </div>

        {/* Modal de detalle */}
        <AlertDetailModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          groupTitle={modalTitle}
          criteria={modalCriteria}
          childId={childId}
        />
      </div>
    )
  }

  // Fallback
  return null
}
