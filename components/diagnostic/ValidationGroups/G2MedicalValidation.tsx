"use client"

import { Stethoscope, AlertCircle, CheckCircle } from "lucide-react"
import { ValidationGroupCard } from "../ValidationGroupCard"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type {
  MedicalGroupValidation,
  CriterionResult,
  MedicalCondition,
} from "@/lib/diagnostic/types"

interface G2MedicalValidationProps {
  validation: MedicalGroupValidation
  onCriterionClick?: (criterion: CriterionResult) => void
  className?: string
}

// Nombres amigables para cada condicion
const conditionNames: Record<MedicalCondition, string> = {
  reflujo: "Reflujo",
  apnea: "Apnea",
  restless_leg: "Piernas inquietas",
}

// Colores por condicion
const conditionColors: Record<MedicalCondition, string> = {
  reflujo: "text-orange-600",
  apnea: "text-purple-600",
  restless_leg: "text-blue-600",
}

/**
 * ConditionSummary - Resumen de indicadores por condicion medica
 */
function ConditionSummary({
  condition,
  detected,
  pending,
  total,
}: {
  condition: MedicalCondition
  detected: number
  pending: number
  total: number
}) {
  const available = total - pending
  const hasAlert = detected > 0

  return (
    <div
      className={cn(
        "flex items-center justify-between py-2 px-3 rounded-lg",
        "border border-gray-100 bg-gray-50/50"
      )}
    >
      <div className="flex items-center gap-2">
        {hasAlert ? (
          <AlertCircle className="h-4 w-4 text-red-500" />
        ) : (
          <CheckCircle className="h-4 w-4 text-green-500" />
        )}
        <span className={cn("text-sm font-medium", conditionColors[condition])}>
          {conditionNames[condition]}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {hasAlert && (
          <Badge className="bg-red-100 text-red-700 text-xs">
            {detected} detectado{detected !== 1 ? "s" : ""}
          </Badge>
        )}
        {pending > 0 && (
          <Badge variant="outline" className="text-xs text-gray-500">
            {pending} pendiente{pending !== 1 ? "s" : ""}
          </Badge>
        )}
        {!hasAlert && pending === 0 && (
          <span className="text-xs text-gray-500">
            {available}/{total} OK
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * G2MedicalValidation - Componente de validacion del grupo Medico
 *
 * Muestra los indicadores medicos agrupados por condicion:
 * - Reflujo: 10 indicadores
 * - Apnea: 12 indicadores
 * - Piernas inquietas: 6 indicadores
 *
 * Para cada condicion muestra:
 * - Cantidad de indicadores detectados
 * - Cantidad de indicadores pendientes de recolectar
 * - Status visual (alerta si detectado >= 1)
 *
 * @example
 * <G2MedicalValidation
 *   validation={diagnosticResult.groups.G2}
 *   onCriterionClick={(criterion) => openDetailModal(criterion)}
 * />
 */
export function G2MedicalValidation({
  validation,
  onCriterionClick,
  className,
}: G2MedicalValidationProps) {
  const { indicators, detectedCount, pendingCount } = validation

  // Calcular totales por condicion
  const conditions: MedicalCondition[] = ["reflujo", "apnea", "restless_leg"]

  // Total de indicadores detectados
  const totalDetected =
    detectedCount.reflujo + detectedCount.apnea + detectedCount.restless_leg

  // Total de indicadores pendientes
  const totalPending =
    pendingCount.reflujo + pendingCount.apnea + pendingCount.restless_leg

  return (
    <div className={cn("space-y-4", className)}>
      {/* Card principal con criterios */}
      <ValidationGroupCard
        title="Medico"
        icon={Stethoscope}
        status={validation.status}
        criteria={validation.criteria}
        dataCompleteness={validation.dataCompleteness}
        summary={validation.summary}
        onCriterionClick={onCriterionClick}
      />

      {/* Resumen por condicion */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-700">
            Indicadores por condicion
          </h4>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{totalDetected} detectado{totalDetected !== 1 ? "s" : ""}</span>
            <span>|</span>
            <span>{totalPending} pendiente{totalPending !== 1 ? "s" : ""}</span>
          </div>
        </div>

        <div className="space-y-2">
          {conditions.map((condition) => (
            <ConditionSummary
              key={condition}
              condition={condition}
              detected={detectedCount[condition]}
              pending={pendingCount[condition]}
              total={indicators[condition].length}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default G2MedicalValidation
