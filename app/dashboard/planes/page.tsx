"use client"

import { useEffect, useMemo, useState } from "react"
import { usePageHeaderConfig } from "@/context/page-header-context"
import { useActiveChild } from "@/context/active-child-context"
import { PlanManager } from "@/components/consultas/PlanManager"
import { PlanDisplay } from "@/components/consultas/PlanDisplay"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useSession } from "next-auth/react"

interface PlanSchedule {
  bedtime?: string
  wakeTime?: string
  naps?: Array<{ time: string; duration?: number; description?: string }>
}

interface ChildPlan {
  _id: string
  planNumber: number
  planVersion: string
  status: string
  createdAt?: string
  schedule: PlanSchedule
  objectives?: string[]
  recommendations?: string[]
}

export default function PlanesPage() {
  const { activeChildId } = useActiveChild()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'admin'
  const { activeUserId, activeUserName } = useActiveChild()
  const [loading, setLoading] = useState(true)
  const [plans, setPlans] = useState<ChildPlan[]>([])
  const [error, setError] = useState<string | null>(null)

  usePageHeaderConfig({
    title: "Planes de Sueño",
    showSearch: false,
    showChildSelector: true,
    showNotifications: true,
  })

  useEffect(() => {
    const fetchPlans = async () => {
      const userParam = isAdmin && activeUserId ? activeUserId : session?.user?.id
      if (!activeChildId || !userParam) {
        setLoading(false)
        return
      }
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/consultas/plans?childId=${activeChildId}&userId=${userParam}`)
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          throw new Error(data?.error || "No se pudieron cargar los planes")
        }
        const data = await res.json()
        setPlans(data.plans || [])
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error desconocido")
      } finally {
        setLoading(false)
      }
    }
    fetchPlans()
  }, [activeChildId, session?.user?.id, isAdmin, activeUserId])

  // Cargar nombre del niño para admin (igual que en /consultas)
  const [childName, setChildName] = useState<string>("")
  useEffect(() => {
    const loadChildName = async () => {
      if (!isAdmin || !activeUserId || !activeChildId) return
      try {
        const response = await fetch(`/api/children?userId=${activeUserId}`)
        if (!response.ok) return
        const data = await response.json()
        const children = Array.isArray(data) ? data : (data?.children || data?.data?.children || [])
        const child = children.find((c: any) => c._id === activeChildId)
        if (child) setChildName(`${child.firstName || ''} ${child.lastName || ''}`.trim())
      } catch {}
    }
    loadChildName()
  }, [isAdmin, activeUserId, activeChildId])

  const activePlan = useMemo(() => {
    if (!plans || plans.length === 0) return null
    // SOLO mostrar planes con status "activo" (después de que admin aplicó)
    // NO mostrar borradores ni completados
    return plans.find(p => p.status === "activo") || null
  }, [plans])

  // Para administradores, siempre mostrar el mismo gestor de planes que en /consultas (tab Plan),
  // incluso si aún no hay usuario/niño seleccionado. El propio PlanManager maneja el estado vacío.
  if (isAdmin) {
    return (
      <PlanManager
        selectedUserId={activeUserId}
        selectedChildId={activeChildId}
        selectedChildName={childName || null}
        hasAnalysisResult={false}
        latestReportId={null}
      />
    )
  }

  if (!activeChildId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Planes de Sueño</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">Selecciona un niño para ver su plan de sueño.</p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Planes de Sueño</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!activePlan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Planes de Sueño</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 mb-2">Aún no hay un plan activo para este niño.</p>
          <p className="text-xs text-slate-500">
            El plan aparecerá aquí una vez que sea aprobado y aplicado por el equipo médico.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Encabezado con información del plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Plan {activePlan.planVersion}</CardTitle>
              {activePlan.createdAt && (
                <p className="text-xs text-muted-foreground">
                  Creado: {new Date(activePlan.createdAt).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
              Refrescar
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Mostrar plan completo con el mismo componente que usa el admin */}
      <PlanDisplay plan={activePlan as any} />
    </div>
  )
}
