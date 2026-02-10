"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatusIndicator, StatusBadge } from "./StatusIndicator"
import { Info, ChevronRight, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  StatusLevel,
  CriterionResult,
  DataCompleteness,
} from "@/lib/diagnostic/types"
import type { LucideIcon } from "lucide-react"

interface ValidationGroupCardProps {
  title: string
  icon: LucideIcon
  status: StatusLevel
  criteria: CriterionResult[]
  dataCompleteness?: DataCompleteness
  summary?: string
  onCriterionClick?: (criterion: CriterionResult) => void
  className?: string
}

// Estilos de borde por status
const borderColors: Record<StatusLevel, string> = {
  ok: "border-l-green-500",
  warning: "border-l-yellow-500",
  alert: "border-l-red-500",
}

// Mensaje de completitud de datos
function DataCompletenessMessage({
  dataCompleteness,
}: {
  dataCompleteness: DataCompleteness
}) {
  const { available, total, pending } = dataCompleteness
  const percentage = Math.round((available / total) * 100)

  if (available === total) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-600">
        <Info className="h-3 w-3" />
        <span>Datos completos ({total}/{total})</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-xs text-yellow-600">
        <Info className="h-3 w-3" />
        <span>
          {available}/{total} datos disponibles ({percentage}%)
        </span>
      </div>
      {pending.length > 0 && pending.length <= 3 && (
        <div className="text-xs text-gray-500 pl-4">
          Pendientes: {pending.join(", ")}
        </div>
      )}
      {pending.length > 3 && (
        <div className="text-xs text-gray-500 pl-4">
          Pendientes: {pending.slice(0, 2).join(", ")} y {pending.length - 2} mas
        </div>
      )}
    </div>
  )
}

// Item de criterio individual
function CriterionItem({
  criterion,
  onClick,
}: {
  criterion: CriterionResult
  onClick?: () => void
}) {
  const isClickable = onClick && criterion.dataAvailable
  const statusColor =
    criterion.status === "ok"
      ? "text-green-600"
      : criterion.status === "warning"
        ? "text-yellow-600"
        : "text-red-600"

  return (
    <button
      type="button"
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      className={cn(
        "w-full flex items-center justify-between py-2 px-3 rounded-lg text-left",
        "border border-gray-100 bg-gray-50/50",
        isClickable
          ? "hover:bg-gray-100 cursor-pointer transition-colors"
          : "cursor-default",
        !criterion.dataAvailable && "opacity-60"
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <StatusIndicator status={criterion.status} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">
            {criterion.name}
          </p>
          <p className={cn("text-xs truncate", statusColor)}>
            {criterion.message}
          </p>
        </div>
      </div>
      {isClickable && (
        <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
      )}
      {!criterion.dataAvailable && (
        <Badge variant="outline" className="text-xs py-0 ml-2 flex-shrink-0">
          Pendiente
        </Badge>
      )}
    </button>
  )
}

/**
 * ValidationGroupCard - Card generica para grupos de validacion
 *
 * Muestra el estado de un grupo de validacion (G1, G2, G3, G4) con:
 * - Header con icono, titulo y status badge
 * - Lista de criterios clickeables
 * - Indicador de completitud de datos
 *
 * @example
 * <ValidationGroupCard
 *   title="Horario"
 *   icon={Clock}
 *   status="warning"
 *   criteria={scheduleValidation.criteria}
 *   dataCompleteness={scheduleValidation.dataCompleteness}
 *   onCriterionClick={(criterion) => openModal(criterion)}
 * />
 */
export function ValidationGroupCard({
  title,
  icon: Icon,
  status,
  criteria,
  dataCompleteness,
  summary,
  onCriterionClick,
  className,
}: ValidationGroupCardProps) {
  const [expanded, setExpanded] = useState(false)

  // Separar criterios por status para mostrar primero los problematicos
  const alertCriteria = criteria.filter((c) => c.status === "alert")
  const warningCriteria = criteria.filter((c) => c.status === "warning")
  const okCriteria = criteria.filter((c) => c.status === "ok")

  // Ordenar: alertas primero, luego warnings, luego ok
  const sortedCriteria = [...alertCriteria, ...warningCriteria, ...okCriteria]

  // Limitar a 5 criterios visibles, o mostrar todos si expandido
  const maxVisible = 5
  const hasHidden = sortedCriteria.length > maxVisible
  const visibleCriteria = expanded ? sortedCriteria : sortedCriteria.slice(0, maxVisible)
  const hiddenCount = sortedCriteria.length - maxVisible

  return (
    <Card
      className={cn(
        "bg-white shadow-sm border-0 border-l-4",
        borderColors[status],
        className
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <StatusBadge status={status} size="md" />
            <div>
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {title}
              </CardTitle>
              {summary && (
                <p className="text-xs text-gray-500 mt-0.5">{summary}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1">
              {alertCriteria.length > 0 && (
                <Badge className="bg-red-100 text-red-700 text-xs">
                  {alertCriteria.length} alerta{alertCriteria.length !== 1 ? "s" : ""}
                </Badge>
              )}
              {warningCriteria.length > 0 && (
                <Badge className="bg-yellow-100 text-yellow-700 text-xs">
                  {warningCriteria.length} aviso{warningCriteria.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2 space-y-3">
        {/* Lista de criterios */}
        <div className="space-y-2">
          {visibleCriteria.map((criterion) => (
            <CriterionItem
              key={criterion.id}
              criterion={criterion}
              onClick={
                onCriterionClick
                  ? () => onCriterionClick(criterion)
                  : undefined
              }
            />
          ))}
        </div>

        {/* Boton expandir/colapsar criterios */}
        {hasHidden && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-1 text-xs text-blue-600 hover:text-blue-800 py-1.5 rounded-md hover:bg-blue-50 transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                Mostrar menos
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                +{hiddenCount} criterio{hiddenCount !== 1 ? "s" : ""} mas
              </>
            )}
          </button>
        )}

        {/* Mensaje de completitud de datos */}
        {dataCompleteness && (
          <div className="pt-2 border-t border-gray-100">
            <DataCompletenessMessage dataCompleteness={dataCompleteness} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ValidationGroupCard
