// Lista de pacientes con layout Master-Detail Split View
// Panel izquierdo: lista de familias con busqueda
// Panel derecho: detalle de familia seleccionada con grid de ninos

"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Search, ArrowRight, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import { createLogger } from "@/lib/logger"
import { useActiveChild } from "@/context/active-child-context"
import { usePageHeaderConfig } from "@/context/page-header-context"

const logger = createLogger("PacienteListClient")

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
  const [childrenPrefetched, setChildrenPrefetched] = useState(false)

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

  // Precargar todos los ninos
  useEffect(() => {
    if (!users.length || childrenPrefetched) return
    const fetchAllChildren = async () => {
      try {
        const response = await fetch("/api/children")
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
        if (Object.keys(grouped).length) {
          setAllChildrenMap(grouped)
          setUserChildren(prev => ({ ...grouped, ...prev }))
        }
      } catch (error) {
        logger.warn("No se pudieron precargar los ninos", error)
      } finally {
        setChildrenPrefetched(true)
      }
    }
    fetchAllChildren()
  }, [users.length, childrenPrefetched])

  // Cargar los ninos de un usuario especifico
  const loadUserChildren = useCallback(async (userId: string) => {
    try {
      if (userChildren[userId]) return

      let response = await fetch(`/api/children?userId=${userId}`)
      // Retry una vez si falla (race condition de sesion)
      if (!response.ok) {
        await new Promise(r => setTimeout(r, 500))
        response = await fetch(`/api/children?userId=${userId}`)
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
    setActiveChild(child._id, child.parentId, userName)
    router.push(`/dashboard/paciente/${child._id}`)
  }

  // Extraer apellido del nombre completo
  const getLastName = (name: string): string => {
    const parts = name.trim().split(" ")
    return parts.length > 1 ? parts[parts.length - 1] : name
  }

  // Normalizar texto para busqueda sin acentos
  const normalize = (text: string) =>
    text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

  // Contar ninos de un usuario
  const getChildCount = (userId: string): number => {
    return (userChildren[userId] || allChildrenMap[userId] || []).length
  }

  // Filtrar y ordenar usuarios
  const filteredUsers = users
    .filter(user => {
      if (!searchTerm) return true
      const search = normalize(searchTerm)
      const matchesUser = normalize(user.name).includes(search) ||
        normalize(user.email).includes(search)
      const children = userChildren[user._id] || allChildrenMap[user._id] || []
      const matchesChild = children.some(child =>
        normalize(`${child.firstName || ""} ${child.lastName || ""}`).includes(search)
      )
      return matchesUser || matchesChild
    })
    .sort((a, b) => {
      const lastNameA = getLastName(a.name).toLowerCase()
      const lastNameB = getLastName(b.name).toLowerCase()
      return lastNameA.localeCompare(lastNameB, "es")
    })

  // Auto-seleccionar primera familia cuando la lista cambia
  useEffect(() => {
    if (filteredUsers.length === 0) {
      setSelectedUserId(null)
      return
    }
    // Si la familia seleccionada ya no esta en la lista filtrada, seleccionar la primera
    const selectedStillVisible = filteredUsers.some(u => u._id === selectedUserId)
    if (!selectedStillVisible) {
      handleSelectFamily(filteredUsers[0]._id)
    }
  }, [filteredUsers, selectedUserId, handleSelectFamily])

  // Auto-seleccionar la primera familia al cargar usuarios por primera vez
  useEffect(() => {
    if (users.length > 0 && !selectedUserId) {
      // Ordenar por apellido como filteredUsers
      const sorted = [...users].sort((a, b) => {
        const lastNameA = getLastName(a.name).toLowerCase()
        const lastNameB = getLastName(b.name).toLowerCase()
        return lastNameA.localeCompare(lastNameB, "es")
      })
      handleSelectFamily(sorted[0]._id)
    }
  }, [users, selectedUserId, handleSelectFamily])

  // Datos de la familia seleccionada
  const selectedUser = users.find(u => u._id === selectedUserId) || null
  const selectedChildren = useMemo(() => {
    return selectedUserId ? (userChildren[selectedUserId] || []) : []
  }, [selectedUserId, userChildren])
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
                Este usuario no tiene ninos registrados.
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

                    return (
                      <div
                        key={child._id}
                        className="bg-white rounded-[14px] p-5 border border-[#d8efeb] transition-all cursor-pointer hover:shadow-[0_4px_16px_rgba(26,60,74,0.08)] hover:border-[#628BE6] hover:-translate-y-px"
                        onClick={() => handleChildClick(child, selectedUser.name)}
                      >
                        {/* Top: avatar + nombre */}
                        <div className="flex items-center gap-3 mb-3.5">
                          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-base font-bold shrink-0">
                            {child.firstName?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div>
                            <p className="text-base font-bold text-[#1a3a4a]">
                              {child.firstName} {child.lastName}
                            </p>
                          </div>
                        </div>

                        {/* Badge de estado de encuesta */}
                        <div className="mb-3.5">
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
