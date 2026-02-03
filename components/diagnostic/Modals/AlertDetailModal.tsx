"use client"

import { ExternalLink, FileText, Calendar, MessageSquare, ClipboardList } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { StatusIndicator } from "@/components/diagnostic/StatusIndicator"
import type { CriterionResult, SourceType } from "@/lib/diagnostic/types"

interface AlertDetailModalProps {
  open: boolean
  onClose: () => void
  groupTitle: string
  criteria: CriterionResult[]
  childId?: string
}

// Iconos por tipo de fuente
const sourceIcons: Record<SourceType, React.ElementType> = {
  survey: FileText,
  event: Calendar,
  chat: MessageSquare,
  plan: ClipboardList,
  calculated: ClipboardList,
}

// Labels en espanol por tipo de fuente
const sourceLabels: Record<SourceType, string> = {
  survey: "Encuesta",
  event: "Evento",
  chat: "Chat",
  plan: "Plan",
  calculated: "Calculado",
}

/**
 * Genera la URL de deep linking segun el tipo de fuente
 */
function getSourceLink(
  criterion: CriterionResult,
  childId?: string
): string | null {
  if (!childId) return null

  switch (criterion.sourceType) {
  case "survey":
    // Link a la tab de encuesta del perfil del nino
    // sourceField indica el campo especifico
    if (criterion.sourceField) {
      return `/dashboard/children/${childId}?tab=survey&field=${criterion.sourceField}`
    }
    return `/dashboard/children/${childId}?tab=survey`

  case "event":
    // Link al calendario filtrado por el evento
    if (criterion.sourceId) {
      return `/dashboard/calendar?eventId=${criterion.sourceId}&childId=${childId}`
    }
    return `/dashboard/calendar?childId=${childId}`

  case "chat":
    // Link al historial de chat
    return `/dashboard/assistant?childId=${childId}`

  case "plan":
    // Link a la seccion de planes
    return `/dashboard/planes?childId=${childId}`

  case "calculated":
    // No hay link directo para datos calculados
    return null

  default:
    return null
  }
}

/**
 * Formatea el valor para mostrar en la UI
 */
function formatValue(value: string | number | boolean | null): string {
  if (value === null || value === undefined) return "No disponible"
  if (typeof value === "boolean") return value ? "Si" : "No"
  if (typeof value === "number") return value.toString()
  return value
}

/**
 * AlertDetailModal - Modal de detalle de alertas de un grupo
 *
 * Muestra una lista de criterios con sus valores, status y links
 * a la fuente del dato (survey, evento, etc.)
 *
 * @example
 * <AlertDetailModal
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   groupTitle="G1 - Horario"
 *   criteria={scheduleValidation.criteria}
 *   childId="abc123"
 * />
 */
export function AlertDetailModal({
  open,
  onClose,
  groupTitle,
  criteria,
  childId,
}: AlertDetailModalProps) {
  // Ordenar criterios: alert primero, luego warning, luego ok
  const sortedCriteria = [...criteria].sort((a, b) => {
    const statusOrder = { alert: 0, warning: 1, ok: 2 }
    return statusOrder[a.status] - statusOrder[b.status]
  })

  // Conteo de alertas
  const alertCount = criteria.filter(c => c.status === "alert").length
  const warningCount = criteria.filter(c => c.status === "warning").length

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {groupTitle}
          </DialogTitle>
          <DialogDescription>
            {alertCount > 0 && (
              <span className="text-red-600 font-medium">
                {alertCount} alerta{alertCount !== 1 ? "s" : ""}
              </span>
            )}
            {alertCount > 0 && warningCount > 0 && " • "}
            {warningCount > 0 && (
              <span className="text-yellow-600 font-medium">
                {warningCount} revision{warningCount !== 1 ? "es" : ""}
              </span>
            )}
            {alertCount === 0 && warningCount === 0 && (
              <span className="text-green-600 font-medium">
                Todos los criterios OK
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Lista scrolleable de criterios */}
        <div className="flex-1 overflow-y-auto -mx-6 px-6 py-2">
          <div className="space-y-3">
            {sortedCriteria.map((criterion) => {
              const SourceIcon = sourceIcons[criterion.sourceType]
              const sourceLink = getSourceLink(criterion, childId)

              return (
                <div
                  key={criterion.id}
                  className={`
                    p-3 rounded-lg border
                    ${criterion.status === "alert"
                      ? "border-red-200 bg-red-50"
                      : criterion.status === "warning"
                        ? "border-yellow-200 bg-yellow-50"
                        : "border-gray-200 bg-gray-50"
                    }
                  `}
                >
                  {/* Header del criterio */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <StatusIndicator status={criterion.status} size="sm" />
                      <span className="font-medium text-sm truncate">
                        {criterion.name}
                      </span>
                    </div>
                    {sourceLink && (
                      <a
                        href={sourceLink}
                        className="flex items-center gap-1 text-xs text-blue-600
                                   hover:text-blue-800 hover:underline shrink-0"
                        title={`Ver en ${sourceLabels[criterion.sourceType]}`}
                      >
                        <SourceIcon className="h-3 w-3" />
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>

                  {/* Mensaje */}
                  <p className="text-sm text-gray-600 mt-1">
                    {criterion.message}
                  </p>

                  {/* Valores */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                    {criterion.dataAvailable ? (
                      <>
                        <span className="text-gray-500">
                          Valor: <span className="font-medium text-gray-700">
                            {formatValue(criterion.value)}
                          </span>
                        </span>
                        {criterion.expected !== null && (
                          <span className="text-gray-500">
                            Esperado: <span className="font-medium text-gray-700">
                              {formatValue(criterion.expected)}
                            </span>
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-amber-600 italic">
                        Dato pendiente de recolectar
                      </span>
                    )}
                    <span className="text-gray-400">
                      Fuente: {sourceLabels[criterion.sourceType]}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AlertDetailModal
