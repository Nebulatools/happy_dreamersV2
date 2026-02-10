"use client"

import { Clock } from "lucide-react"
import { ValidationGroupCard } from "../ValidationGroupCard"
import type { GroupValidation, CriterionResult } from "@/lib/diagnostic/types"

interface G1ScheduleValidationProps {
  validation: GroupValidation
  onCriterionClick?: (criterion: CriterionResult) => void
  className?: string
}

/**
 * G1ScheduleValidation - Componente de validacion del grupo Horario
 *
 * Muestra los criterios de validacion del grupo G1 (Horario):
 * - Hora de despertar vs plan
 * - Limite minimo de despertar (6AM)
 * - Duracion de noche vs esperada por edad
 * - Cantidad de siestas vs esperada
 * - Duracion de siestas vs maximo permitido
 * - Hora de acostarse vs plan
 * - Ventanas de vigilia vs esperadas por edad
 *
 * @example
 * <G1ScheduleValidation
 *   validation={diagnosticResult.groups.G1}
 *   onCriterionClick={(criterion) => openDetailModal(criterion)}
 * />
 */
export function G1ScheduleValidation({
  validation,
  onCriterionClick,
  className,
}: G1ScheduleValidationProps) {
  return (
    <ValidationGroupCard
      title="Horario"
      icon={Clock}
      status={validation.status}
      criteria={validation.criteria}
      dataCompleteness={validation.dataCompleteness}
      summary={validation.summary}
      onCriterionClick={onCriterionClick}
      className={className}
    />
  )
}

export default G1ScheduleValidation
