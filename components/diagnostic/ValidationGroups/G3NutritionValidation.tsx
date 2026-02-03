"use client"

import { Utensils, CheckCircle, AlertCircle, Milk, Salad } from "lucide-react"
import { ValidationGroupCard } from "../ValidationGroupCard"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type {
  NutritionGroupValidation,
  CriterionResult,
  NutritionGroup,
} from "@/lib/diagnostic/types"

interface G3NutritionValidationProps {
  validation: NutritionGroupValidation
  onCriterionClick?: (criterion: CriterionResult) => void
  className?: string
}

// Nombres amigables para grupos nutricionales
const groupNames: Record<NutritionGroup, string> = {
  proteina: "Proteina",
  carbohidrato: "Carbohidrato",
  grasa: "Grasa",
  fibra: "Fibra",
}

// Colores por grupo nutricional
const groupColors: Record<NutritionGroup, string> = {
  proteina: "bg-red-100 text-red-700",
  carbohidrato: "bg-amber-100 text-amber-700",
  grasa: "bg-yellow-100 text-yellow-700",
  fibra: "bg-green-100 text-green-700",
}

/**
 * FeedingSummary - Resumen de conteo de tomas (leche o solidos)
 */
function FeedingSummary({
  type,
  count,
  required,
  status,
}: {
  type: "milk" | "solid"
  count: number
  required: number
  status: "ok" | "warning" | "alert"
}) {
  const isOk = status === "ok"
  const Icon = type === "milk" ? Milk : Salad
  const label = type === "milk" ? "Tomas de leche" : "Comidas solidas"

  return (
    <div
      className={cn(
        "flex items-center justify-between py-2 px-3 rounded-lg",
        "border border-gray-100 bg-gray-50/50"
      )}
    >
      <div className="flex items-center gap-2">
        {isOk ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <AlertCircle className="h-4 w-4 text-red-500" />
        )}
        <Icon className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={cn(
            "text-sm font-semibold",
            isOk ? "text-green-600" : "text-red-600"
          )}
        >
          {count}/{required}
        </span>
        {!isOk && (
          <Badge className="bg-red-100 text-red-700 text-xs">
            Falta{required - count > 1 ? "n" : ""} {required - count}
          </Badge>
        )}
      </div>
    </div>
  )
}

/**
 * NutritionGroupsGrid - Grid de grupos nutricionales cubiertos vs requeridos
 */
function NutritionGroupsGrid({
  covered,
  required,
}: {
  covered: NutritionGroup[]
  required: NutritionGroup[]
}) {
  // Todos los grupos posibles
  const allGroups: NutritionGroup[] = [
    "proteina",
    "carbohidrato",
    "grasa",
    "fibra",
  ]

  // Calcular cuales faltan
  const missing = required.filter((g) => !covered.includes(g))
  const coveredCount = required.filter((g) => covered.includes(g)).length
  const requiredCount = required.length

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          Grupos nutricionales
        </span>
        <span
          className={cn(
            "text-xs font-medium",
            missing.length === 0 ? "text-green-600" : "text-yellow-600"
          )}
        >
          {coveredCount}/{requiredCount} cubiertos
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {allGroups.map((group) => {
          const isCovered = covered.includes(group)
          const isRequired = required.includes(group)

          return (
            <Badge
              key={group}
              className={cn(
                "text-xs",
                isCovered
                  ? groupColors[group]
                  : isRequired
                    ? "bg-gray-100 text-gray-400 border border-dashed border-gray-300"
                    : "bg-gray-50 text-gray-300"
              )}
            >
              {isCovered && <CheckCircle className="h-3 w-3 mr-1" />}
              {groupNames[group]}
              {isRequired && !isCovered && " (requerido)"}
            </Badge>
          )
        })}
      </div>

      {missing.length > 0 && (
        <p className="text-xs text-yellow-600">
          Faltan: {missing.map((g) => groupNames[g]).join(", ")}
        </p>
      )}
    </div>
  )
}

/**
 * G3NutritionValidation - Componente de validacion del grupo Alimentacion
 *
 * Muestra los criterios de validacion del grupo G3 (Alimentacion):
 * - Conteo de tomas de leche vs requerido por edad
 * - Limite de onzas de leche (solo 12+ meses)
 * - Conteo de comidas solidas vs requerido
 * - Intervalo maximo entre comidas
 * - Grupos nutricionales cubiertos vs requeridos
 *
 * Tambien muestra un resumen visual de:
 * - Tomas de leche del dia
 * - Comidas solidas del dia
 * - Grid de grupos nutricionales cubiertos
 *
 * @example
 * <G3NutritionValidation
 *   validation={diagnosticResult.groups.G3}
 *   onCriterionClick={(criterion) => openDetailModal(criterion)}
 * />
 */
export function G3NutritionValidation({
  validation,
  onCriterionClick,
  className,
}: G3NutritionValidationProps) {
  const {
    milkFeedings,
    solidFeedings,
    nutritionGroupsCovered,
    nutritionGroupsRequired,
  } = validation

  return (
    <div className={cn("space-y-4", className)}>
      {/* Card principal con criterios */}
      <ValidationGroupCard
        title="Alimentacion"
        icon={Utensils}
        status={validation.status}
        criteria={validation.criteria}
        dataCompleteness={validation.dataCompleteness}
        summary={validation.summary}
        onCriterionClick={onCriterionClick}
      />

      {/* Resumen de alimentacion del dia */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <h4 className="text-sm font-semibold text-gray-700">Resumen del dia</h4>

        <div className="space-y-2">
          {/* Tomas de leche */}
          <FeedingSummary
            type="milk"
            count={milkFeedings.count}
            required={milkFeedings.required}
            status={milkFeedings.status}
          />

          {/* Comidas solidas */}
          <FeedingSummary
            type="solid"
            count={solidFeedings.count}
            required={solidFeedings.required}
            status={solidFeedings.status}
          />
        </div>

        {/* Grupos nutricionales */}
        <div className="pt-2 border-t border-gray-100">
          <NutritionGroupsGrid
            covered={nutritionGroupsCovered}
            required={nutritionGroupsRequired}
          />
        </div>
      </div>
    </div>
  )
}

export default G3NutritionValidation
