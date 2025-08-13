// Componente para gestionar planes de niños en consultas
// Maneja la generación de Plan 0 y planes subsecuentes basados en transcript analysis

"use client"

import { useState, useEffect } from "react"
import { createLogger } from "@/lib/logger"

const logger = createLogger('PlanManager')
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Calendar, Plus, Clock, Target, CheckCircle, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { PlanDisplay } from "./PlanDisplay"
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
  const [generatingPlan, setGeneratingPlan] = useState(false)
  const [selectedPlanIndex, setSelectedPlanIndex] = useState<number | null>(null)
  const [historyReports, setHistoryReports] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Cargar planes y reportes del historial cuando se selecciona un niño
  useEffect(() => {
    // Validar que tenemos los IDs necesarios
    if (selectedUserId && selectedChildId) {
      logger.debug(`Cargando planes para usuario: ${selectedUserId}, niño: ${selectedChildId}`)
      loadPlans()
      loadHistoryReports()
    } else {
      logger.debug("Limpiando estado - no hay usuario o niño seleccionado")
      setPlans([])
      setHistoryReports([])
      setSelectedPlanIndex(null)
    }
  }, [selectedUserId, selectedChildId])

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

  // Generar nuevo plan
  const generatePlan = async (planType: "initial" | "transcript_based", reportId?: string) => {
    if (!selectedUserId || !selectedChildId) return

    const effectiveReportId = reportId || nextPlanInfo.reportId

    if (planType === "transcript_based" && !effectiveReportId) {
      toast({
        title: "Error",
        description: "Se requiere un análisis de transcript previo para generar un plan actualizado.",
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

      if (planType === "transcript_based" && effectiveReportId) {
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
      
      // Actualizar la lista de planes
      await loadPlans()
      
      // Verificar que el resultado tiene la estructura esperada
      const planNumber = result?.plan?.planNumber ?? 'Nuevo'
      const childNameForToast = selectedChildName || 'el niño'
      
      toast({
        title: "Plan generado exitosamente",
        description: `Se ha creado el ${planType === "initial" ? "Plan Inicial" : `Plan ${planNumber}`} para ${childNameForToast}.`,
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

  // Determinar qué tipo de plan se puede generar
  const getNextPlanInfo = () => {
    const hasInitialPlan = plans.some(p => p.planNumber === 0)
    
    if (!hasInitialPlan) {
      return {
        canGenerate: true,
        planType: "initial" as const,
        buttonText: "Generar Plan Inicial",
        description: "Crear el primer plan basado en survey, estadísticas y conocimiento especializado",
        reportId: null
      }
    }
    
    // SOLO permitir generar plan si hay análisis reciente Y no ha sido usado
    if (hasAnalysisResult && latestReportId) {
      // Verificar si el análisis reciente ya fue usado para generar un plan
      const isLatestReportAlreadyUsed = plans.some(plan => 
        plan.transcriptAnalysis?.reportId?.toString() === latestReportId
      )
      
      if (!isLatestReportAlreadyUsed) {
        const nextPlanNumber = Math.max(...plans.map(p => p.planNumber)) + 1
        return {
          canGenerate: true,
          planType: "transcript_based" as const,
          buttonText: `Generar Plan ${nextPlanNumber}`,
          description: "Crear un plan actualizado basado en el último análisis de transcript",
          reportId: latestReportId
        }
      }
    }
    
    // Si no hay análisis reciente nuevo, deshabilitar el botón
    return {
      canGenerate: false,
      planType: "transcript_based" as const,
      buttonText: "Sin análisis nuevos",
      description: "Genere un nuevo análisis de transcript para crear un plan actualizado",
      reportId: null
    }
  }

  const nextPlanInfo = getNextPlanInfo()

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
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button
                      onClick={() => generatePlan(nextPlanInfo.planType)}
                      disabled={!nextPlanInfo.canGenerate || generatingPlan}
                      size="lg"
                      className="min-w-[200px]"
                    >
                      {generatingPlan ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      {generatingPlan ? "Generando..." : nextPlanInfo.buttonText}
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{nextPlanInfo.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
                        <span className="font-semibold">Plan {plan.planNumber}</span>
                        <Badge variant={plan.planType === "initial" ? "default" : "secondary"}>
                          {plan.planType === "initial" ? "Inicial" : "Actualización"}
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
        <PlanDisplay 
          plan={plans[selectedPlanIndex]} 
          key={plans[selectedPlanIndex]._id?.toString() || `plan-${selectedPlanIndex}`}
        />
      )}
    </div>
  )
}