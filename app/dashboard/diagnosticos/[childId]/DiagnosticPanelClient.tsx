"use client"

import { useState, useEffect } from "react"
import { Loader2, AlertCircle, ClipboardList } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

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
type ViewState = "loading" | "error" | "blocked" | "success"

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
 * - blocked: nino sin plan activo
 * - success: diagnostico cargado correctamente
 */
export default function DiagnosticPanelClient({ childId }: DiagnosticPanelClientProps) {
  const { toast } = useToast()

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

          // Caso especial: sin plan activo
          if (data.code === "NO_ACTIVE_PLAN") {
            // Intentar cargar datos basicos del nino para mostrar algo
            await fetchChildBasicData()
            setViewState("blocked")
            return
          }

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

        setPlanData({
          planId: data.planId,
          planVersion: data.planVersion,
          status: "active",
          startDate: undefined,
        })

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

  // Cargar datos basicos del nino (cuando no hay plan activo)
  const fetchChildBasicData = async () => {
    try {
      // Intentar obtener datos basicos del nino
      const response = await fetch(`/api/children/${childId}`)
      if (response.ok) {
        const data = await response.json()
        setChildData(data.child || data)
      }
    } catch {
      // Si falla, usar datos minimos
      setChildData({
        _id: childId,
        firstName: "Nino",
        parentId: "",
      })
    }
  }

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

  // Estado: Blocked (sin plan activo)
  if (viewState === "blocked") {
    return (
      <div className="container py-8 space-y-6">
        {/* Header con datos basicos del nino */}
        {childData && (
          <ProfileHeader
            child={childData}
            plan={undefined}
            surveyDataAvailable={false}
            overallStatus="warning"
          />
        )}

        {/* Mensaje de bloqueo */}
        <Card className="max-w-lg mx-auto border-yellow-200 bg-yellow-50">
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">
              Sin plan activo
            </h3>
            <p className="text-yellow-700 mb-6">
              Este nino no tiene un plan de sueno activo.
              Para ver el diagnostico, primero genera un plan.
            </p>
            <DiagnosticCTAs childId={childId} parentId={childData?.parentId} />
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
          planVersion={diagnosticResult.planVersion}
          planStatus="active"
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
