// Componente para gestionar planes de niños en consultas
// Maneja la generación de Plan 0 y planes subsecuentes basados en transcript analysis

"use client"

import { useState, useEffect } from "react"
import { createLogger } from "@/lib/logger"

const logger = createLogger('PlanManager')
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Calendar, Plus, Clock, Target, CheckCircle, AlertCircle, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { EditablePlanDisplay } from "./EditablePlanDisplay"
import { ChildPlan } from "@/types/models"

interface PlanManagerProps {
  selectedUserId: string | null
  selectedChildId: string | null
  selectedChildName: string | null
  hasAnalysisResult: boolean
  latestReportId: string | null
}

export function PlanManager({
  selectedUserId,
  selectedChildId,
  selectedChildName,
  hasAnalysisResult,
  latestReportId,
}: PlanManagerProps) {
  const { toast } = useToast()
  
  const [plans, setPlans] = useState<ChildPlan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null)
  const [generatingPlan, setGeneratingPlan] = useState(false)
  const [selectedPlanIndex, setSelectedPlanIndex] = useState<number | null>(null)
  const [historyReports, setHistoryReports] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  
  // Estados para validaciones de plan
  const [planValidations, setPlanValidations] = useState<{
    initial: any
    event_based: any
    transcript_refinement: any
  }>({
    initial: null,
    event_based: null,
    transcript_refinement: null
  })
  const [loadingValidations, setLoadingValidations] = useState(false)

  // Cargar planes y reportes del historial cuando se selecciona un niño
  useEffect(() => {
    // Validar que tenemos los IDs necesarios
    if (selectedUserId && selectedChildId) {
      logger.debug(`Cargando planes para usuario: ${selectedUserId}, niño: ${selectedChildId}`)
      loadPlans()
      loadHistoryReports()
      validatePlanCapabilities()
    } else {
      logger.debug("Limpiando estado - no hay usuario o niño seleccionado")
      setPlans([])
      setHistoryReports([])
      setSelectedPlanIndex(null)
      setPlanValidations({
        initial: null,
        event_based: null,
        transcript_refinement: null
      })
    }
  }, [selectedUserId, selectedChildId])

  // Validar capacidades de generar planes
  const validatePlanCapabilities = async () => {
    if (!selectedUserId || !selectedChildId) return

    try {
      setLoadingValidations(true)
      const planTypes = ['initial', 'event_based', 'transcript_refinement']
      const validations: any = {}

      // Ejecutar validaciones en paralelo
      const validationPromises = planTypes.map(async (planType) => {
        const response = await fetch('/api/consultas/plans', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: selectedUserId,
            childId: selectedChildId,
            planType
          }),
        })

        if (response.ok) {
          const data = await response.json()
          validations[planType] = data
        } else {
          validations[planType] = {
            canGenerate: false,
            reason: 'Error al validar',
            planType
          }
        }
      })

      await Promise.all(validationPromises)
      setPlanValidations(validations)
    } catch (error) {
      logger.error('Error validando capacidades de plan:', error)
      setPlanValidations({
        initial: { canGenerate: false, reason: 'Error de validación' },
        event_based: { canGenerate: false, reason: 'Error de validación' },
        transcript_refinement: { canGenerate: false, reason: 'Error de validación' }
      })
    } finally {
      setLoadingValidations(false)
    }
  }

  // Cargar reportes del historial
  const loadHistoryReports = async () => {
    if (!selectedChildId) return

    try {
      setLoadingHistory(true)
      const response = await fetch(`/api/consultas/history?childId=${selectedChildId}`)
      
      if (!response.ok) {
        throw new Error('Error al cargar el historial')
      }
      
      const data = await response.json()
      setHistoryReports(data.consultations || [])
    } catch (error) {
      logger.error('Error cargando historial', error)
      setHistoryReports([])
    } finally {
      setLoadingHistory(false)
    }
  }

  // Cargar planes existentes del niño
  const loadPlans = async () => {
    if (!selectedUserId || !selectedChildId) return

    try {
      setLoadingPlans(true)
      const response = await fetch(
        `/api/consultas/plans?userId=${selectedUserId}&childId=${selectedChildId}`
      )

      if (!response.ok) {
        throw new Error("Error al cargar los planes")
      }

      const data = await response.json()
      setPlans(data.plans || [])
      
      // Seleccionar el plan más reciente por defecto
      if (data.plans && data.plans.length > 0) {
        setSelectedPlanIndex(data.plans.length - 1)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los planes del niño.",
        variant: "destructive",
      })
    } finally {
      setLoadingPlans(false)
    }
  }

  // Eliminar plan (solo admin desde UI de administrador)
  const deletePlan = async (planId: string) => {
    if (!planId) return
    const confirmed = typeof window !== 'undefined' ? window.confirm('¿Eliminar este plan de forma permanente?') : true
    if (!confirmed) return

    try {
      setDeletingPlanId(planId)
      const response = await fetch(`/api/consultas/plans/${planId}`, { method: 'DELETE' })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'No se pudo eliminar el plan')
      }

      // Refrescar lista y selección
      await loadPlans()
      setSelectedPlanIndex((prev) => {
        if (prev === null) return prev
        // Si el índice apuntaba a un plan al final, moverlo hacia atrás
        return Math.max(0, Math.min((plans.length - 2), prev))
      })

      toast({
        title: 'Plan eliminado',
        description: 'El plan se eliminó correctamente.'
      })
    } catch (error) {
      logger.error('Error eliminando plan:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo eliminar el plan',
        variant: 'destructive'
      })
    } finally {
      setDeletingPlanId(null)
    }
  }

  // Generar nuevo plan
  const generatePlan = async (planType: "initial" | "event_based" | "transcript_refinement", reportId?: string) => {
    if (!selectedUserId || !selectedChildId) return

    // Validar que se puede generar el tipo de plan solicitado (revalida en tiempo real)
    // 1) Usar estado actual
    let validation = planValidations[planType]
    // 2) Revalidar contra el backend para evitar condiciones de carrera
    try {
      const validateResp = await fetch('/api/consultas/plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId, childId: selectedChildId, planType })
      })
      if (validateResp.ok) {
        const validateData = await validateResp.json()
        // Refrescar todo el mapa de validaciones manteniendo las otras
        setPlanValidations(prev => ({ ...prev, [planType]: validateData }))
        validation = validateData
      }
    } catch (e) {
      // Si falla la revalidación, usamos el estado previo
    }

    if (!validation || !validation.canGenerate) {
      toast({
        title: "No disponible",
        description: validation?.reason || "Este tipo de plan no puede generarse ahora",
        variant: "destructive",
      })
      return
    }

    const effectiveReportId = reportId || validation.additionalInfo?.latestReportId

    if (planType === "transcript_refinement" && !effectiveReportId) {
      toast({
        title: "Error",
        description: "Se requiere un análisis de transcript previo para generar un refinamiento.",
        variant: "destructive",
      })
      return
    }

    try {
      setGeneratingPlan(true)
      
      const requestBody: any = {
        userId: selectedUserId,
        childId: selectedChildId,
        planType,
      }

      if (planType === "transcript_refinement" && effectiveReportId) {
        requestBody.reportId = effectiveReportId
      }

      const response = await fetch("/api/consultas/plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al generar el plan")
      }

      const result = await response.json()
      
      // Actualizar la lista de planes y validaciones
      await loadPlans()
      await validatePlanCapabilities()
      
      // Verificar que el resultado tiene la estructura esperada
      const planVersion = result?.plan?.planVersion ?? 'Nuevo'
      const childNameForToast = selectedChildName || 'el niño'
      
      const planTypeNames = {
        initial: "Plan Inicial",
        event_based: `Plan ${planVersion} (Progresión)`,
        transcript_refinement: `Plan ${planVersion} (Refinamiento)`
      }
      
      toast({
        title: "Plan generado exitosamente",
        description: `Se ha creado el ${planTypeNames[planType]} para ${childNameForToast}.`,
      })
    } catch (error) {
      logger.error("Error generando plan:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo generar el plan.",
        variant: "destructive",
      })
    } finally {
      setGeneratingPlan(false)
    }
  }

  // Obtener información de planes disponibles basada en validaciones
  const getAvailablePlans = () => {
    const availablePlans = []

    // Plan Inicial
    const initialValidation = planValidations.initial
    if (initialValidation) {
      availablePlans.push({
        planType: "initial" as const,
        canGenerate: initialValidation.canGenerate,
        buttonText: "Generar Plan Inicial",
        description: initialValidation.canGenerate 
          ? "Crear el primer plan basado en survey, estadísticas y conocimiento especializado"
          : initialValidation.reason,
        nextVersion: initialValidation.nextVersion,
        validation: initialValidation
      })
    }

    // Plan basado en eventos
    const eventValidation = planValidations.event_based
    if (eventValidation) {
      availablePlans.push({
        planType: "event_based" as const,
        canGenerate: eventValidation.canGenerate,
        buttonText: eventValidation.canGenerate 
          ? `Generar Plan ${eventValidation.nextVersion} (Progresión)`
          : "Plan de Progresión",
        description: eventValidation.reason,
        nextVersion: eventValidation.nextVersion,
        validation: eventValidation
      })
    }

    // Plan de refinamiento con transcript
    const transcriptValidation = planValidations.transcript_refinement
    if (transcriptValidation) {
      availablePlans.push({
        planType: "transcript_refinement" as const,
        canGenerate: transcriptValidation.canGenerate,
        buttonText: transcriptValidation.canGenerate
          ? `Generar Plan ${transcriptValidation.nextVersion} (Refinamiento)`
          : "Plan de Refinamiento",
        description: transcriptValidation.reason,
        nextVersion: transcriptValidation.nextVersion,
        validation: transcriptValidation
      })
    }

    return availablePlans
  }

  const availablePlans = getAvailablePlans()

  if (!selectedUserId || !selectedChildId) {
    return (
      <Card>
        <CardContent className="py-16">
          <div className="text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Selecciona un Usuario y Niño</h3>
            <p className="text-muted-foreground">
              Para gestionar planes, primero selecciona un usuario y luego el niño específico.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con información y botón de generar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Planes para {selectedChildName}
              </CardTitle>
              <CardDescription>
                {plans.length > 0 
                  ? `${plans.length} plan${plans.length > 1 ? 'es' : ''} generado${plans.length > 1 ? 's' : ''}`
                  : "No hay planes generados aún"
                }
              </CardDescription>
            </div>
            
{loadingValidations ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Validando opciones...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full max-w-3xl">
                {availablePlans.map((planOption) => (
                  <div key={planOption.planType} className="flex flex-col items-stretch">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={() => generatePlan(planOption.planType)}
                            disabled={!planOption.canGenerate || generatingPlan}
                            size="sm"
                            variant={planOption.canGenerate ? "default" : "outline"}
                            className="min-w-[160px] text-xs"
                          >
                            {generatingPlan ? (
                              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                            ) : (
                              <Plus className="h-3 w-3 mr-2" />
                            )}
                            {generatingPlan ? "Generando..." : planOption.buttonText}
                          </Button>
                        </TooltipTrigger>
                        {planOption.canGenerate && planOption.description && (
                          <TooltipContent>
                            <p className="max-w-xs">{planOption.description}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                    {!planOption.canGenerate && planOption.description && (
                      <div className="mt-1 text-[11px] text-muted-foreground leading-snug">
                        {planOption.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardHeader>

        {/* Lista de planes existentes */}
        {loadingPlans ? (
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Cargando planes...</span>
            </div>
          </CardContent>
        ) : plans.length > 0 ? (
          <CardContent>
            <div className="grid gap-3">
              {plans.map((plan, index) => (
                <div
                  key={plan._id?.toString()}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedPlanIndex === index
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedPlanIndex(index)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Plan {plan.planVersion || plan.planNumber}</span>
                        <Badge variant={plan.planType === "initial" ? "default" : 
                                      plan.planType === "event_based" ? "secondary" : "outline"}>
                          {plan.planType === "initial" ? "Inicial" : 
                           plan.planType === "event_based" ? "Progresión" : "Refinamiento"}
                        </Badge>
                        {plan.status === "active" && (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Activo
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {new Date(plan.createdAt).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); deletePlan(String(plan._id)) }}
                        disabled={deletingPlanId === String(plan._id)}
                        title="Eliminar plan"
                      >
                        <Trash2 className={`h-4 w-4 ${deletingPlanId === String(plan._id) ? 'text-muted-foreground' : 'text-destructive'}`} />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground">
                      {plan.objectives.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          {plan.objectives[0]}
                          {plan.objectives.length > 1 && ` (+${plan.objectives.length - 1} más)`}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        ) : (
          <CardContent>
            <div className="text-center py-8">
              <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                No hay planes generados para este niño.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Genera el plan inicial para comenzar.
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Mostrar plan seleccionado */}
      {selectedPlanIndex !== null && plans && plans.length > selectedPlanIndex && plans[selectedPlanIndex] && (
        <EditablePlanDisplay 
          plan={plans[selectedPlanIndex]} 
          key={plans[selectedPlanIndex]._id?.toString() || `plan-${selectedPlanIndex}`}
          onSave={async (updatedPlan) => {
            // Recargar los planes después de guardar
            await loadPlans()
            toast({
              title: "Plan actualizado",
              description: "Los cambios se han guardado correctamente.",
            })
          }}
        />
      )}
    </div>
  )
}
