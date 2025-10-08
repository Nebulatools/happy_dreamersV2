"use client"

import { useEffect, useMemo, useState } from "react"
import { usePageHeaderConfig } from "@/context/page-header-context"
import { useActiveChild } from "@/context/active-child-context"
import { PlanManager } from "@/components/consultas/PlanManager"
import { PlanDisplay } from "@/components/consultas/PlanDisplay"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { useSession } from "next-auth/react"
import { ChevronDown, ChevronUp } from "lucide-react"

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
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set())

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
    // Mostrar planes con status "activo" (después de que admin aplicó)
    return plans.find(p => p.status === "activo") || null
  }, [plans])

  const completedPlans = useMemo(() => {
    if (!plans || plans.length === 0) return []
    // Mostrar planes completados, ordenados por fecha (más reciente primero)
    return plans
      .filter(p => p.status === "completado")
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime()
        const dateB = new Date(b.createdAt || 0).getTime()
        return dateB - dateA
      })
  }, [plans])

  const togglePlan = (planId: string) => {
    setExpandedPlans(prev => {
      const newSet = new Set(prev)
      if (newSet.has(planId)) {
        newSet.delete(planId)
      } else {
        newSet.add(planId)
      }
      return newSet
    })
  }

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

  // Si no hay plan activo ni completados, mostrar mensaje
  if (!activePlan && completedPlans.length === 0) {
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
    <div className="space-y-6">
      {/* Plan Activo */}
      {activePlan ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle>Plan {activePlan.planVersion}</CardTitle>
                  <Badge variant="default" className="bg-green-600">Activo</Badge>
                </div>
                <div className="flex items-center gap-2">
                  {activePlan.createdAt && (
                    <p className="text-xs text-muted-foreground">
                      Creado: {new Date(activePlan.createdAt).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </p>
                  )}
                  <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
                    Refrescar
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Mostrar plan completo con el mismo componente que usa el admin */}
          <PlanDisplay plan={activePlan as any} />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Plan Activo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-2">Aún no hay un plan activo para este niño.</p>
            <p className="text-xs text-slate-500">
              El plan aparecerá aquí una vez que sea aprobado y aplicado por el equipo médico.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Historial de Planes Completados */}
      {completedPlans.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Historial de Planes</h3>
            <Badge variant="secondary">{completedPlans.length}</Badge>
          </div>

          {completedPlans.map((plan) => {
            const isExpanded = expandedPlans.has(plan._id.toString())

            return (
              <Card key={plan._id.toString()} className="overflow-hidden">
                <CardHeader
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => togglePlan(plan._id.toString())}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base">Plan {plan.planVersion}</CardTitle>
                      <Badge variant="secondary">Completado</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      {plan.createdAt && (
                        <p className="text-sm text-muted-foreground">
                          {new Date(plan.createdAt).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </p>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0">
                    <PlanDisplay plan={plan as any} />
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
