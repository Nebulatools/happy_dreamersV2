"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Edit, FilePlus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useActiveChild } from "@/context/active-child-context"

interface DiagnosticCTAsProps {
  childId: string
  planId?: string
  parentId?: string
  parentName?: string
  className?: string
}

/**
 * EditPlanButton - Navega a editar el plan existente
 *
 * Redirige a la pagina de consultas con el tab de plan seleccionado
 * y el contexto del nino para continuar la edicion.
 * Sincroniza el contexto antes de navegar para evitar desincronizacion.
 *
 * @example
 * <EditPlanButton childId="abc123" planId="plan456" parentId="user789" />
 */
export function EditPlanButton({
  childId,
  planId,
  parentId,
  parentName,
  className,
}: {
  childId: string
  planId?: string
  parentId?: string
  parentName?: string
  className?: string
}) {
  const router = useRouter()
  const { setActiveChild } = useActiveChild()

  const handleClick = () => {
    // Sincronizar contexto antes de navegar (si tenemos parentId)
    if (parentId) {
      setActiveChild(childId, parentId, parentName || "")
    }

    const params = new URLSearchParams()
    params.set("childId", childId)
    params.set("tab", "plan")
    if (planId) {
      params.set("planId", planId)
    }
    if (parentId) {
      params.set("parentId", parentId)
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
 * Redirige a la pagina de consultas con el tab de transcript (para ingresar nuevo transcript)
 * y luego generar un plan. Sincroniza el contexto antes de navegar.
 *
 * @example
 * <GenerateNewPlanButton childId="abc123" parentId="user789" />
 */
export function GenerateNewPlanButton({
  childId,
  parentId,
  parentName,
  className,
}: {
  childId: string
  parentId?: string
  parentName?: string
  className?: string
}) {
  const router = useRouter()
  const { setActiveChild } = useActiveChild()

  const handleClick = () => {
    // Sincronizar contexto antes de navegar (si tenemos parentId)
    if (parentId) {
      setActiveChild(childId, parentId, parentName || "")
    }

    const params = new URLSearchParams()
    params.set("childId", childId)
    params.set("tab", "transcript")
    params.set("action", "new-plan")
    if (parentId) {
      params.set("parentId", parentId)
    }
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
 * <DiagnosticCTAs childId="abc123" planId="plan456" parentId="user789" />
 */
export function DiagnosticCTAs({
  childId,
  planId,
  parentId,
  parentName,
  className,
}: DiagnosticCTAsProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row gap-3 pt-4",
        className
      )}
    >
      <EditPlanButton
        childId={childId}
        planId={planId}
        parentId={parentId}
        parentName={parentName}
      />
      <GenerateNewPlanButton
        childId={childId}
        parentId={parentId}
        parentName={parentName}
      />
    </div>
  )
}

export default DiagnosticCTAs
