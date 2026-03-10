// Lista de pacientes con layout Master-Detail Split View
// Panel izquierdo: lista de familias con busqueda y tabs de status
// Panel derecho: detalle de familia seleccionada con grid de ninos

"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Search, ArrowRight, Users, Archive, ArchiveRestore, Clock } from "lucide-react"
import { useRouter } from "next/navigation"
import { createLogger } from "@/lib/logger"
import { useActiveChild } from "@/context/active-child-context"
import { usePageHeaderConfig } from "@/context/page-header-context"
import { writeRecentPatient } from "@/hooks/use-admin-search"
import type { PatientStatus } from "@/lib/patient-status"

const logger = createLogger("PacienteListClient")

type StatusFilter = PatientStatus | "all"

interface User {
  _id: string
  name: string
  email: string
  role: string
}

interface Child {
  _id: string
  firstName: string
  lastName: string
  parentId: string
  archived?: boolean
  surveyData?: {
    completed?: boolean
    completedAt?: string
    isPartial?: boolean
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const extractChildrenFromPayload = (payload: any): Child[] => {
  if (!payload) return []
  if (Array.isArray(payload)) return payload as Child[]
  if (Array.isArray(payload.children)) return payload.children as Child[]
  if (Array.isArray(payload.data?.children)) return payload.data.children as Child[]
  if (Array.isArray(payload.data)) return payload.data as Child[]
  return []
}

// Obtener iniciales del nombre (primera letra nombre + primera letra apellido)
const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return (parts[0]?.[0] || "?").toUpperCase()
}

export default function PacienteListClient() {
  const { toast } = useToast()
  const router = useRouter()
  const { setActiveChild } = useActiveChild()
  const [users, setUsers] = useState<User[]>([])
  const [userChildren, setUserChildren] = useState<Record<string, Child[]>>({})
  const [allChildrenMap, setAllChildrenMap] = useState<Record<string, Child[]>>({})
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [archivingChildId, setArchivingChildId] = useState<string | null>(null)
  const [confirmArchive, setConfirmArchive] = useState<{
    childId: string; childName: string; archived: boolean
  } | null>(null)

  // Status computado por nino (desde dashboard-metrics)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active")
  const [childStatusMap, setChildStatusMap] = useState<Record<string, PatientStatus>>({})
  const [statusCounts, setStatusCounts] = useState({ active: 0, inactive: 0, archived: 0 })
  const [childPlanMap, setChildPlanMap] = useState<Record<string, boolean>>({})

  // Contadores para el header
  const counts = useMemo(() => {
    const totalFamilies = users.filter(u => u.role !== "admin").length
    const childrenSource = { ...allChildrenMap, ...userChildren }
    const totalChildren = Object.values(childrenSource).reduce((sum, arr) => sum + arr.length, 0)
    return { totalFamilies, totalChildren }
  }, [users, allChildrenMap, userChildren])

  // Header simplificado — la busqueda vive en el master panel
  usePageHeaderConfig({
    title: "Pacientes",
    showChildSelector: false,
    contentKey: `pacientes-${counts.totalFamilies}`,
    customContent: (
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-[#1a3a4a]">Pacientes</h1>
          {counts.totalFamilies > 0 && (
            <span className="bg-[#1a3a4a]/10 text-[#1a5c55] text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {counts.totalFamilies} {counts.totalFamilies === 1 ? "familia" : "familias"}
            </span>
          )}
        </div>
        <span className="text-sm text-[#1a5c55]/70 font-medium">Panel de administracion</span>
      </div>
    ),
  })

  // Cargar la lista de usuarios al iniciar (con retry para client-side navigation)
  useEffect(() => {
    let cancelled = false

    const fetchWithRetry = async (retries = 3, delay = 400): Promise<Response> => {
      const response = await fetch("/api/admin/users")
      if (!response.ok && retries > 0) {
        await new Promise(r => setTimeout(r, delay))
        if (cancelled) throw new Error("cancelled")
        return fetchWithRetry(retries - 1, delay * 1.5)
      }
      return response
    }

    const fetchUsers = async () => {
      try {
        setLoading(true)
        const response = await fetchWithRetry()

        if (!response.ok) {
          const errorBody = await response.text().catch(() => "sin cuerpo")
          throw new Error(`Error al cargar usuarios: HTTP ${response.status} - ${errorBody}`)
        }

        const data = await response.json()
        if (cancelled) return
        // Excluir a los usuarios admin
        const filteredUsers = data.filter((user: User) => user.role !== "admin")
        setUsers(filteredUsers)
      } catch (error) {
        if (cancelled) return
        logger.error("Error al cargar usuarios", error instanceof Error ? error : new Error(String(error)))
        toast({
          title: "Error",
          description: "No se pudieron cargar los usuarios. Verifica que tengas permisos de administrador.",
          variant: "destructive",
        })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchUsers()
    return () => { cancelled = true }
  }, [toast])

  // Precargar todos los ninos (siempre incluir archivados, filtrar client-side)
  useEffect(() => {
    if (!users.length) return
    const fetchAllChildren = async () => {
      try {
        const response = await fetch("/api/children?includeArchived=true")
        if (!response.ok) {
          throw new Error("Error al precargar ninos")
        }
        const data = await response.json()
        const children = extractChildrenFromPayload(data)
        const grouped = children.reduce<Record<string, Child[]>>((acc, child) => {
          if (!child?.parentId) return acc
          if (!acc[child.parentId]) {
            acc[child.parentId] = []
          }
          acc[child.parentId].push(child)
          return acc
        }, {})
        setAllChildrenMap(grouped)
        setUserChildren(grouped)
      } catch (error) {
        logger.warn("No se pudieron precargar los ninos", error)
      }
    }
    fetchAllChildren()
  }, [users.length])

  // Cargar metricas de dashboard para obtener status por nino
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch("/api/admin/dashboard-metrics")
        if (!response.ok) return
        const data = await response.json()

        // Construir mapa de childId -> status
        const statusMap: Record<string, PatientStatus> = {}
        const planMap: Record<string, boolean> = {}
        if (Array.isArray(data.childMetrics)) {
          for (const metric of data.childMetrics) {
            statusMap[metric.childId] = metric.status
            planMap[metric.childId] = metric.hasPlan === true
          }
        }
        setChildStatusMap(statusMap)
        setChildPlanMap(planMap)

        if (data.statusCounts) {
          setStatusCounts(data.statusCounts)
        }
      } catch (error) {
        logger.warn("No se pudieron cargar metricas de status", error)
      }
    }
    fetchMetrics()
  }, [])

  // Cargar los ninos de un usuario especifico
  const loadUserChildren = useCallback(async (userId: string) => {
    try {
      if (userChildren[userId]) return

      let response = await fetch(`/api/children?userId=${userId}&includeArchived=true`)
      // Retry una vez si falla (race condition de sesion)
      if (!response.ok) {
        await new Promise(r => setTimeout(r, 500))
        response = await fetch(`/api/children?userId=${userId}&includeArchived=true`)
      }
      if (!response.ok) {
        throw new Error("Error al cargar los ninos del usuario")
      }

      const data = await response.json()
      const children = extractChildrenFromPayload(data)
      setUserChildren(prev => ({ ...prev, [userId]: children }))
      setAllChildrenMap(prev => ({ ...prev, [userId]: children }))
    } catch (error) {
      logger.error("Error:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los ninos del usuario.",
        variant: "destructive",
      })
    }
  }, [userChildren, toast])

  // Seleccionar una familia y cargar sus ninos
  const handleSelectFamily = useCallback((userId: string) => {
    setSelectedUserId(userId)
    loadUserChildren(userId)
  }, [loadUserChildren])

  // Al hacer clic en un nino: setActiveChild + navegar al hub
  const handleChildClick = (child: Child, userName: string) => {
    // Registrar en recientes para que aparezca en el search del header
    writeRecentPatient({
      childId: child._id,
      childName: `${child.firstName} ${child.lastName}`.trim(),
      parentId: child.parentId,
      parentName: userName,
    })
    setActiveChild(child._id, child.parentId, userName)
    router.push(`/dashboard/paciente/${child._id}`)
  }

  // Archivar o desarchivar un nino
  const handleToggleArchive = async (childId: string, archived: boolean) => {
    setArchivingChildId(childId)
    try {
      const response = await fetch("/api/admin/children/archive", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId, archived }),
      })

      if (!response.ok) {
        throw new Error("Error al actualizar estado de archivo")
      }

      // Actualizar el campo archived del nino en estado local
      const updateChildInMap = (map: Record<string, Child[]>) => {
        const updated = { ...map }
        for (const userId of Object.keys(updated)) {
          updated[userId] = updated[userId].map(c =>
            c._id === childId ? { ...c, archived } : c
          )
        }
        return updated
      }

      setUserChildren(prev => updateChildInMap(prev))
      setAllChildrenMap(prev => updateChildInMap(prev))

      // Actualizar status map
      setChildStatusMap(prev => ({
        ...prev,
        [childId]: archived ? "archived" : "active",
      }))

      // Actualizar contadores
      setStatusCounts(prev => {
        const newCounts = { ...prev }
        if (archived) {
          // Mover de active/inactive a archived
          const prevStatus = childStatusMap[childId] || "active"
          if (prevStatus !== "archived") {
            newCounts[prevStatus] = Math.max(0, newCounts[prevStatus] - 1)
            newCounts.archived++
          }
        } else {
          // Mover de archived a active (al desarchivar)
          newCounts.archived = Math.max(0, newCounts.archived - 1)
          newCounts.active++
        }
        return newCounts
      })

      toast({
        title: archived ? "Paciente archivado" : "Paciente restaurado",
        description: archived
          ? "Aparece en la tab 'Archivados'"
          : "El paciente aparece de nuevo como activo",
      })
    } catch (error) {
      logger.error("Error al archivar/desarchivar:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del paciente.",
        variant: "destructive",
      })
    } finally {
      setArchivingChildId(null)
      setConfirmArchive(null)
    }
  }

  // Extraer apellido del nombre completo
  // Normalizar texto para busqueda sin acentos
  const normalize = (text: string) =>
    text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

  // Contar ninos de un usuario (filtrado por status)
  const getChildCount = (userId: string): number => {
    const children = userChildren[userId] || allChildrenMap[userId] || []
    if (statusFilter === "all") return children.length
    return children.filter(c => {
      const childStatus = childStatusMap[c._id]
      return childStatus === statusFilter
    }).length
  }

  // Filtrar y ordenar usuarios (filtrado por status de sus ninos)
  const filteredUsers = useMemo(() => {
    return users
      .filter(user => {
        // Filtro de busqueda
        if (searchTerm) {
          const search = normalize(searchTerm)
          const matchesUser = normalize(user.name).includes(search) ||
            normalize(user.email).includes(search)
          const children = userChildren[user._id] || allChildrenMap[user._id] || []
          const matchesChild = children.some(child =>
            normalize(`${child.firstName || ""} ${child.lastName || ""}`).includes(search)
          )
          if (!matchesUser && !matchesChild) return false
        }

        // Filtro por status de ninos
        if (statusFilter !== "all") {
          const children = userChildren[user._id] || allChildrenMap[user._id] || []
          const hasMatchingChild = children.some(c => childStatusMap[c._id] === statusFilter)
          if (!hasMatchingChild) return false
        }

        return true
      })
      .sort((a, b) => {
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase(), "es")
      })
  }, [users, searchTerm, statusFilter, userChildren, allChildrenMap, childStatusMap])

  // Auto-seleccionar primera familia cuando la lista cambia
  useEffect(() => {
    if (filteredUsers.length === 0) {
      setSelectedUserId(null)
      return
    }
    // Si la familia seleccionada ya no esta en la lista filtrada, seleccionar la primera
    const selectedStillVisible = filteredUsers.some(u => u._id === selectedUserId)
    if (!selectedStillVisible) {
      const firstId = filteredUsers[0]._id
      setSelectedUserId(firstId)
      loadUserChildren(firstId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredUsers, selectedUserId])

  // Auto-seleccionar la primera familia al cargar usuarios por primera vez
  useEffect(() => {
    if (users.length > 0 && !selectedUserId) {
      const sorted = [...users].sort((a, b) => {
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase(), "es")
      })
      const firstId = sorted[0]._id
      setSelectedUserId(firstId)
      loadUserChildren(firstId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, selectedUserId])

  // Datos de la familia seleccionada
  const selectedUser = users.find(u => u._id === selectedUserId) || null
  const selectedChildren = useMemo(() => {
    if (!selectedUserId) return []
    const children = userChildren[selectedUserId] || []
    // Si hay filtro de status, filtrar ninos tambien en el detail panel
    if (statusFilter === "all") return children
    return children.filter(c => childStatusMap[c._id] === statusFilter)
  }, [selectedUserId, userChildren, statusFilter, childStatusMap])
  const isLoadingChildren = selectedUserId ? !userChildren[selectedUserId] : false

  // Stats de encuestas para la familia seleccionada
  const surveyStats = useMemo(() => {
    let completed = 0
    let inProgress = 0
    let pending = 0
    for (const child of selectedChildren) {
      const isCompleted = child.surveyData?.completed === true ||
        (!!child.surveyData?.completedAt && child.surveyData?.isPartial !== true)
      if (isCompleted) completed++
      else if (child.surveyData) inProgress++
      else pending++
    }
    return { completed, inProgress, pending }
  }, [selectedChildren])

  // Navegacion con teclado en el buscador
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredUsers.length === 0) return
    const currentIdx = filteredUsers.findIndex(u => u._id === selectedUserId)

    if (e.key === "ArrowDown") {
      e.preventDefault()
      const next = Math.min(currentIdx + 1, filteredUsers.length - 1)
      handleSelectFamily(filteredUsers[next]._id)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      const prev = Math.max(currentIdx - 1, 0)
      handleSelectFamily(filteredUsers[prev]._id)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
        <span>Cargando usuarios...</span>
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
        <Users className="h-12 w-12 mb-3 text-muted-foreground/40" />
        <p className="text-muted-foreground">No hay usuarios registrados en el sistema.</p>
      </div>
    )
  }

  const totalAll = statusCounts.active + statusCounts.inactive + statusCounts.archived

  const statusTabs: { key: StatusFilter; label: string; count: number }[] = [
    { key: "active", label: "Activos", count: statusCounts.active },
    { key: "inactive", label: "Inactivos", count: statusCounts.inactive },
    { key: "archived", label: "Archivados", count: statusCounts.archived },
    { key: "all", label: "Todos", count: totalAll },
  ]

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* ── Master Panel (izquierda) ── */}
      <div className="w-[340px] min-w-[340px] bg-white border-r border-[#d8efeb] flex flex-col">
        {/* Buscador */}
        <div className="px-4 pt-4 pb-3 border-b border-[#e8f4f1]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8ab5ad] pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por nombre, nino o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full h-[38px] pl-10 pr-4 rounded-lg bg-[#f7fcfb] border border-[#d0e8e3] text-sm text-[#1a3a4a] placeholder:text-[#8ab5ad] focus:outline-none focus:ring-2 focus:ring-[#628BE6]/20 focus:border-[#628BE6] focus:bg-white transition-all"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Tabs de status */}
        <div className="flex gap-1 px-3 pt-2 pb-1.5 border-b border-[#e8f4f1]">
          {statusTabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={[
                "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all",
                statusFilter === tab.key
                  ? "bg-[#2553A1] text-white"
                  : "text-[#7a9e97] hover:bg-[#f0faf8] hover:text-[#1a3a4a]",
              ].join(" ")}
            >
              {tab.label}
              <span className={[
                "ml-1 text-[10px]",
                statusFilter === tab.key ? "text-white/80" : "text-[#a0bbb6]",
              ].join(" ")}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Header de lista */}
        <div className="px-4 pt-2.5 pb-1.5 flex justify-between items-center">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8ab5ad]">
            Familias
          </span>
          <span className="text-[11px] text-[#a0bbb6] font-medium">
            {filteredUsers.length} {filteredUsers.length === 1 ? "resultado" : "resultados"}
          </span>
        </div>

        {/* Lista scrollable */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 scrollbar-thin">
          {filteredUsers.length === 0 ? (
            <div className="py-10 text-center">
              <Search className="h-8 w-8 mx-auto mb-2 text-[#8ab5ad]/40" />
              <p className="text-sm text-[#8ab5ad]">No se encontraron familias</p>
            </div>
          ) : (
            filteredUsers.map(user => {
              const childCount = getChildCount(user._id)
              const isSelected = user._id === selectedUserId

              return (
                <button
                  key={user._id}
                  onClick={() => handleSelectFamily(user._id)}
                  className={`w-full text-left px-3 py-3 rounded-[10px] mb-0.5 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#e6f5f2] [box-shadow:inset_3px_0_0_0_#2553A1]"
                      : "hover:bg-[#f0faf8]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Avatar */}
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#628BE6] to-[#2553A1] flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {getInitials(user.name)}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1a3a4a] leading-tight truncate">
                        {user.name}
                      </p>
                      <p className="text-xs text-[#7a9e97] truncate leading-snug">
                        {user.email}
                      </p>
                    </div>
                    {/* Badge conteo ninos */}
                    {childCount > 0 && (
                      <span className="text-[11px] font-semibold text-[#628BE6] bg-[#628BE6]/10 px-2 py-0.5 rounded-full shrink-0">
                        {childCount}
                      </span>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ── Detail Panel (derecha) ── */}
      <div className="flex-1 overflow-y-auto bg-[#f0faf8] p-8">
        {!selectedUser ? (
          <div className="flex flex-col items-center justify-center h-full text-[#8ab5ad] gap-3">
            <Users className="h-12 w-12 opacity-40" />
            <p className="text-sm">Selecciona una familia para ver el detalle</p>
          </div>
        ) : isLoadingChildren ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#628BE6]" />
            <p className="text-sm text-[#8ab5ad]">Cargando ninos...</p>
          </div>
        ) : (
          <div key={selectedUser._id} className="animate-[fadeSlideIn_0.25s_ease-out]">
            {/* Header de familia */}
            <div className="flex items-center gap-4 mb-7">
              <div className="h-[52px] w-[52px] rounded-full bg-gradient-to-br from-[#628BE6] to-[#2553A1] flex items-center justify-center text-white text-xl font-bold shrink-0">
                {getInitials(selectedUser.name)}
              </div>
              <div className="flex-1">
                <h2 className="text-[22px] font-bold text-[#1a3a4a] tracking-tight leading-tight">
                  {selectedUser.name}
                </h2>
                <p className="text-sm text-[#7a9e97] mt-0.5">{selectedUser.email}</p>
                <div className="flex gap-3 mt-1.5">
                  <span className="text-xs font-medium text-[#5a8a80] flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {selectedChildren.length} {selectedChildren.length === 1 ? "nino" : "ninos"}
                  </span>
                  {surveyStats.completed > 0 && (
                    <span className="text-xs font-medium text-[#5a8a80] flex items-center gap-1">
                      <span className="h-[7px] w-[7px] rounded-full bg-[#22a064] inline-block" />
                      {surveyStats.completed} completada{surveyStats.completed > 1 ? "s" : ""}
                    </span>
                  )}
                  {surveyStats.inProgress > 0 && (
                    <span className="text-xs font-medium text-[#5a8a80] flex items-center gap-1">
                      <span className="h-[7px] w-[7px] rounded-full bg-[#628BE6] inline-block" />
                      {surveyStats.inProgress} en progreso
                    </span>
                  )}
                  {surveyStats.pending > 0 && (
                    <span className="text-xs font-medium text-[#5a8a80] flex items-center gap-1">
                      <span className="h-[7px] w-[7px] rounded-full bg-[#b0a080] inline-block" />
                      {surveyStats.pending} sin encuesta
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Seccion de ninos */}
            {selectedChildren.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                {statusFilter === "all"
                  ? "Este usuario no tiene ninos registrados."
                  : `Este usuario no tiene ninos con status "${statusFilter === "active" ? "activo" : statusFilter === "inactive" ? "inactivo" : "archivado"}".`
                }
              </p>
            ) : (
              <>
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#8ab5ad] mb-4">
                  Ninos de la familia
                </h3>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
                  {selectedChildren.map(child => {
                    const surveyCompleted = child.surveyData?.completed === true ||
                      (!!child.surveyData?.completedAt && child.surveyData?.isPartial !== true)
                    const childStatus = childStatusMap[child._id] || "active"
                    const isArchived = childStatus === "archived"
                    const isInactive = childStatus === "inactive"
                    const hasPlan = childPlanMap[child._id] === true
                    const isArchiving = archivingChildId === child._id

                    return (
                      <div
                        key={child._id}
                        className={[
                          "bg-white rounded-[14px] p-5 border",
                          "transition-all cursor-pointer",
                          "hover:shadow-[0_4px_16px_rgba(26,60,74,0.08)]",
                          "hover:-translate-y-px",
                          isArchived
                            ? "border-[#d8efeb]/60 opacity-55 hover:opacity-80 hover:border-[#8ab5ad]"
                            : isInactive
                              ? "border-[#d8efeb]/80 opacity-70 hover:opacity-90 hover:border-[#8ab5ad]"
                              : "border-[#d8efeb] hover:border-[#628BE6]",
                        ].join(" ")}
                        onClick={() => handleChildClick(child, selectedUser.name)}
                      >
                        {/* Top: avatar + nombre + boton archivar */}
                        <div className="flex items-center gap-3 mb-3.5">
                          <div className={[
                            "h-11 w-11 rounded-xl flex items-center",
                            "justify-center text-white text-base",
                            "font-bold shrink-0",
                            isArchived
                              ? "bg-gradient-to-br from-gray-400 to-gray-500"
                              : isInactive
                                ? "bg-gradient-to-br from-gray-400 to-blue-400"
                                : "bg-gradient-to-br from-blue-500 to-purple-500",
                          ].join(" ")}>
                            {child.firstName?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-base font-bold leading-tight truncate ${
                              isArchived ? "text-[#1a3a4a]/50" : "text-[#1a3a4a]"
                            }`}>
                              {child.firstName} {child.lastName}
                            </p>
                          </div>
                          {/* Boton archivar/desarchivar */}
                          <button
                            type="button"
                            title={isArchived ? "Restaurar paciente" : "Archivar paciente"}
                            disabled={isArchiving}
                            onClick={(e) => {
                              e.stopPropagation()
                              setConfirmArchive({
                                childId: child._id,
                                childName: `${child.firstName} ${child.lastName}`.trim(),
                                archived: !isArchived,
                              })
                            }}
                            className={`shrink-0 p-1.5 rounded-lg transition-all ${
                              isArchived
                                ? "text-[#628BE6] hover:bg-[#628BE6]/10"
                                : "text-[#8ab5ad] hover:bg-[#8ab5ad]/10 hover:text-[#5a8a80]"
                            }`}
                          >
                            {isArchiving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : isArchived ? (
                              <ArchiveRestore className="h-4 w-4" />
                            ) : (
                              <Archive className="h-4 w-4" />
                            )}
                          </button>
                        </div>

                        {/* Badges de status */}
                        <div className="flex flex-wrap gap-1.5 mb-3.5">
                          {/* Badge archivado */}
                          {isArchived && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-500">
                              <Archive className="h-3 w-3" />
                              Archivado
                            </span>
                          )}

                          {/* Badge inactivo */}
                          {isInactive && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-500">
                              <Clock className="h-3 w-3" />
                              Sin actividad reciente
                            </span>
                          )}

                          {/* Badge sin plan (solo activos sin plan) */}
                          {!isArchived && !isInactive && !hasPlan && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700">
                              <span className="h-[7px] w-[7px] rounded-full bg-amber-500" />
                              Sin plan
                            </span>
                          )}

                          {/* Badge de encuesta */}
                          {surveyCompleted ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-[#22a064]/10 text-[#1a7a4c]">
                              <span className="h-[7px] w-[7px] rounded-full bg-[#22a064]" />
                              Encuesta completada
                            </span>
                          ) : child.surveyData ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-[#628BE6]/10 text-[#2553A1]">
                              <span className="h-[7px] w-[7px] rounded-full bg-[#628BE6]" />
                              Encuesta en progreso
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-[#b4a082]/10 text-[#8a7a60]">
                              <span className="h-[7px] w-[7px] rounded-full bg-[#b0a080]" />
                              Sin encuesta
                            </span>
                          )}
                        </div>

                        {/* Boton Ver perfil */}
                        <div className="flex justify-end">
                          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-[#d0e8e3] rounded-lg text-xs font-semibold text-[#2553A1] bg-white hover:bg-[#2553A1] hover:border-[#2553A1] hover:text-white transition-all group/btn">
                            Ver perfil
                            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5" />
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Dialog de confirmacion para archivar/desarchivar */}
      {confirmArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setConfirmArchive(null)}
          />
          {/* Dialog */}
          <div className="relative bg-white rounded-2xl shadow-xl p-6 max-w-sm mx-4 animate-[fadeSlideIn_0.2s_ease-out]">
            <div className="flex items-center gap-3 mb-4">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                confirmArchive.archived
                  ? "bg-[#8ab5ad]/10 text-[#5a8a80]"
                  : "bg-[#628BE6]/10 text-[#2553A1]"
              }`}>
                {confirmArchive.archived ? (
                  <Archive className="h-5 w-5" />
                ) : (
                  <ArchiveRestore className="h-5 w-5" />
                )}
              </div>
              <h3 className="text-base font-bold text-[#1a3a4a]">
                {confirmArchive.archived ? "Archivar paciente" : "Restaurar paciente"}
              </h3>
            </div>
            <p className="text-sm text-[#5a8a80] mb-6">
              {confirmArchive.archived
                ? `Archivar a ${confirmArchive.childName}? Podras verlo en la tab "Archivados".`
                : `Restaurar a ${confirmArchive.childName}? Volvera a aparecer en la lista activa.`
              }
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmArchive(null)}
                className="px-4 py-2 text-sm font-medium text-[#5a8a80] bg-[#f0faf8] rounded-lg hover:bg-[#e0f0ed] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!!archivingChildId}
                onClick={() =>
                  handleToggleArchive(confirmArchive.childId, confirmArchive.archived)
                }
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
                  confirmArchive.archived
                    ? "bg-[#5a8a80] text-white hover:bg-[#4a7a70]"
                    : "bg-[#2553A1] text-white hover:bg-[#1a4391]"
                }`}
              >
                {archivingChildId && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {confirmArchive.archived ? "Archivar" : "Restaurar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animacion CSS para el detail panel */}
      <style jsx global>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
