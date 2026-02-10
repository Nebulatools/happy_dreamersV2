"use client"

import {
  Cloud,
  Thermometer,
  Droplets,
  Tv,
  Baby,
  Users,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react"
import { ValidationGroupCard } from "../ValidationGroupCard"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type {
  EnvironmentalGroupValidation,
  CriterionResult,
  StatusLevel,
} from "@/lib/diagnostic/types"

interface G4EnvironmentalValidationProps {
  validation: EnvironmentalGroupValidation
  onCriterionClick?: (criterion: CriterionResult) => void
  className?: string
}

// Iconos por factor ambiental
const factorIcons: Record<string, React.ComponentType<{ className?: string }>> =
  {
    g4_screen_time: Tv,
    g4_temperature: Thermometer,
    g4_humidity: Droplets,
    g4_postpartum_depression: AlertTriangle,
    g4_cosleeping: Baby,
    g4_room_sharing: Users,
    g4_recent_changes: RefreshCw,
  }

// Colores por categoria de keyword
const keywordCategoryColors: Record<string, string> = {
  school: "bg-blue-100 text-blue-700",
  sibling: "bg-pink-100 text-pink-700",
  moving: "bg-orange-100 text-orange-700",
  family: "bg-purple-100 text-purple-700",
  travel: "bg-cyan-100 text-cyan-700",
  health: "bg-red-100 text-red-700",
}

// Nombres amigables para categorias
const categoryNames: Record<string, string> = {
  school: "Escuela",
  sibling: "Hermanos",
  moving: "Mudanza",
  family: "Familia",
  travel: "Viaje",
  health: "Salud",
}

/**
 * FactorSummary - Resumen visual de un factor ambiental individual
 */
function FactorSummary({
  criterion,
  onClick,
}: {
  criterion: CriterionResult
  onClick?: () => void
}) {
  const Icon = factorIcons[criterion.id] || Cloud
  const statusIcon =
    criterion.status === "ok" ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : criterion.status === "warning" ? (
      <AlertTriangle className="h-4 w-4 text-yellow-500" />
    ) : (
      <AlertCircle className="h-4 w-4 text-red-500" />
    )

  // Determinar si el dato esta disponible
  if (!criterion.dataAvailable) {
    return (
      <div
        className={cn(
          "flex items-center justify-between py-2 px-3 rounded-lg",
          "border border-dashed border-gray-200 bg-gray-50/30"
        )}
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-gray-300" />
          <span className="text-sm text-gray-400">{criterion.name}</span>
        </div>
        <Badge className="bg-gray-100 text-gray-400 text-xs">Pendiente</Badge>
      </div>
    )
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between py-2 px-3 rounded-lg",
        "border transition-colors",
        criterion.status === "ok"
          ? "border-green-100 bg-green-50/30 hover:bg-green-50/50"
          : criterion.status === "warning"
            ? "border-yellow-100 bg-yellow-50/30 hover:bg-yellow-50/50"
            : "border-red-100 bg-red-50/30 hover:bg-red-50/50",
        onClick && "cursor-pointer"
      )}
    >
      <div className="flex items-center gap-2">
        {statusIcon}
        <Icon className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">
          {criterion.name}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={cn(
            "text-xs",
            criterion.status === "ok"
              ? "text-green-600"
              : criterion.status === "warning"
                ? "text-yellow-600"
                : "text-red-600"
          )}
        >
          {criterion.message}
        </span>
      </div>
    </button>
  )
}

/**
 * KeywordsDetected - Grid de keywords detectadas en notas/chats
 */
function KeywordsDetected({ keywords }: { keywords: string[] }) {
  if (keywords.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <CheckCircle className="h-4 w-4" />
        <span>No se detectaron cambios recientes importantes</span>
      </div>
    )
  }

  // Agrupar keywords por categoria (formato: "categoria:keyword")
  const groupedKeywords = keywords.reduce<Record<string, string[]>>(
    (acc, kw) => {
      // Intentar extraer categoria del keyword
      // Formato esperado: palabra que coincide con alguna categoria conocida
      let category = "other"
      for (const cat of Object.keys(categoryNames)) {
        if (kw.toLowerCase().includes(cat)) {
          category = cat
          break
        }
      }
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(kw)
      return acc
    },
    {}
  )

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-yellow-500" />
        <span className="text-sm font-medium text-gray-700">
          Cambios detectados ({keywords.length})
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {keywords.map((keyword, index) => {
          // Determinar color basado en categoria
          let colorClass = "bg-gray-100 text-gray-700"
          for (const [cat, color] of Object.entries(keywordCategoryColors)) {
            if (keyword.toLowerCase().includes(cat)) {
              colorClass = color
              break
            }
          }

          return (
            <Badge key={`${keyword}-${index}`} className={cn("text-xs", colorClass)}>
              {keyword}
            </Badge>
          )
        })}
      </div>

      {/* Mostrar categorias detectadas */}
      {Object.keys(groupedKeywords).length > 0 && (
        <p className="text-xs text-gray-500">
          Categorias:{" "}
          {Object.keys(groupedKeywords)
            .map((cat) => categoryNames[cat] || cat)
            .join(", ")}
        </p>
      )}
    </div>
  )
}

/**
 * FactorStatusSummary - Resumen de estado de factores (X ok, Y alertas, Z pendientes)
 */
function FactorStatusSummary({
  factors,
}: {
  factors: Record<string, CriterionResult>
}) {
  const factorList = Object.values(factors)
  const okCount = factorList.filter(
    (f) => f.status === "ok" && f.dataAvailable
  ).length
  const alertCount = factorList.filter(
    (f) => f.status !== "ok" && f.dataAvailable
  ).length
  const pendingCount = factorList.filter((f) => !f.dataAvailable).length

  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {okCount > 0 && (
        <span className="flex items-center gap-1 text-green-600">
          <CheckCircle className="h-3 w-3" />
          {okCount} OK
        </span>
      )}
      {alertCount > 0 && (
        <span className="flex items-center gap-1 text-yellow-600">
          <AlertTriangle className="h-3 w-3" />
          {alertCount} alertas
        </span>
      )}
      {pendingCount > 0 && (
        <span className="flex items-center gap-1 text-gray-400">
          <Cloud className="h-3 w-3" />
          {pendingCount} pendientes
        </span>
      )}
    </div>
  )
}

/**
 * G4EnvironmentalValidation - Componente de validacion del grupo Ambiental
 *
 * Muestra los criterios de validacion del grupo G4 (Ambiental):
 * - Tiempo de pantalla vs limite (60 min/dia, 0 antes de dormir)
 * - Temperatura del cuarto vs rango optimo (22-25C)
 * - Humedad del cuarto vs rango optimo (40-60%) - Pendiente Sprint 4B
 * - Indicadores de depresion post-parto
 * - Colecho detectado
 * - Cuarto compartido
 * - Cambios recientes importantes (keywords en notas/chats)
 *
 * Tambien muestra:
 * - Grid de factores con iconos y status individual
 * - Keywords detectadas agrupadas por categoria
 *
 * @example
 * <G4EnvironmentalValidation
 *   validation={diagnosticResult.groups.G4}
 *   onCriterionClick={(criterion) => openDetailModal(criterion)}
 * />
 */
export function G4EnvironmentalValidation({
  validation,
  onCriterionClick,
  className,
}: G4EnvironmentalValidationProps) {
  const { detectedKeywords, factors } = validation

  // Ordenar factores: primero alertas, luego warnings, luego ok, luego pendientes
  const sortedFactors = Object.entries(factors).sort((a, b) => {
    const statusOrder: Record<StatusLevel, number> = {
      alert: 0,
      warning: 1,
      ok: 2,
    }
    const aAvailable = a[1].dataAvailable ? 0 : 1
    const bAvailable = b[1].dataAvailable ? 0 : 1

    // Primero por disponibilidad (disponibles primero)
    if (aAvailable !== bAvailable) return aAvailable - bAvailable

    // Luego por status
    return statusOrder[a[1].status] - statusOrder[b[1].status]
  })

  return (
    <div className={cn("space-y-4", className)}>
      {/* Card principal con criterios */}
      <ValidationGroupCard
        title="Entorno"
        icon={Cloud}
        status={validation.status}
        criteria={validation.criteria}
        dataCompleteness={validation.dataCompleteness}
        summary={validation.summary}
        onCriterionClick={onCriterionClick}
      />

      {/* Resumen de factores ambientales */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-700">
            Factores ambientales
          </h4>
          <FactorStatusSummary factors={factors} />
        </div>

        <div className="space-y-2">
          {sortedFactors.map(([key, criterion]) => (
            <FactorSummary
              key={key}
              criterion={criterion}
              onClick={
                onCriterionClick ? () => onCriterionClick(criterion) : undefined
              }
            />
          ))}
        </div>
      </div>

      {/* Keywords detectadas (cambios recientes) */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <KeywordsDetected keywords={detectedKeywords} />
      </div>
    </div>
  )
}

export default G4EnvironmentalValidation
