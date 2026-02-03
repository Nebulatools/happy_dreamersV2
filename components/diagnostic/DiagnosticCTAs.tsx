"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Edit, FilePlus } from "lucide-react"
import { cn } from "@/lib/utils"

interface DiagnosticCTAsProps {
  childId: string
  planId?: string
  className?: string
}

/**
 * EditPlanButton - Navega a editar el plan existente
 *
 * Redirige a la pagina de consultas con el tab de plan seleccionado
 * y el contexto del nino para continuar la edicion.
 *
 * @example
 * <EditPlanButton childId="abc123" planId="plan456" />
 */
export function EditPlanButton({
  childId,
  planId,
  className,
}: {
  childId: string
  planId?: string
  className?: string
}) {
  const router = useRouter()

  const handleClick = () => {
    const params = new URLSearchParams()
    params.set("childId", childId)
    params.set("tab", "plan")
    if (planId) {
      params.set("planId", planId)
    }
    router.push(`/dashboard/consultas?${params.toString()}`)
  }

  return (
    <Button
      onClick={handleClick}
      variant="outline"
      className={cn(
        "border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300",
        className
      )}
    >
      <Edit className="h-4 w-4 mr-2" />
      Editar Plan
    </Button>
  )
}

/**
 * GenerateNewPlanButton - Navega a generar un nuevo plan
 *
 * Redirige a la pagina de consultas con el tab de analisis
 * para iniciar el proceso de generacion de un nuevo plan.
 *
 * @example
 * <GenerateNewPlanButton childId="abc123" />
 */
export function GenerateNewPlanButton({
  childId,
  className,
}: {
  childId: string
  className?: string
}) {
  const router = useRouter()

  const handleClick = () => {
    const params = new URLSearchParams()
    params.set("childId", childId)
    params.set("tab", "analysis")
    params.set("action", "new-plan")
    router.push(`/dashboard/consultas?${params.toString()}`)
  }

  return (
    <Button
      onClick={handleClick}
      className={cn(
        "bg-green-600 hover:bg-green-700 text-white",
        className
      )}
    >
      <FilePlus className="h-4 w-4 mr-2" />
      Generar Nuevo Plan
    </Button>
  )
}

/**
 * DiagnosticCTAs - Botones de accion del panel de diagnostico
 *
 * Agrupa los botones de "Editar Plan" y "Generar Nuevo Plan"
 * en una fila responsiva al final del panel de diagnostico.
 *
 * @example
 * <DiagnosticCTAs childId="abc123" planId="plan456" />
 */
export function DiagnosticCTAs({
  childId,
  planId,
  className,
}: DiagnosticCTAsProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row gap-3 pt-4",
        className
      )}
    >
      <EditPlanButton childId={childId} planId={planId} />
      <GenerateNewPlanButton childId={childId} />
    </div>
  )
}

export default DiagnosticCTAs
