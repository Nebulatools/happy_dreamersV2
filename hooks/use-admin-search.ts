// Hook de busqueda para admin - centrado en ninos
// Busca por nombre del nino O nombre del padre
// Click en resultado → navega directo a /dashboard/paciente/{childId}

"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useActiveChild } from "@/context/active-child-context"
import { useToast } from "@/hooks/use-toast"
import { createLogger } from "@/lib/logger"

const logger = createLogger("use-admin-search")

interface SearchUser {
  _id: string
  name: string
  email: string
}

export interface SearchChild {
  _id: string
  firstName: string
  lastName: string
  parentId: string
}

// Cada resultado de busqueda es un nino con el nombre de su padre
export interface ChildResult {
  child: SearchChild
  parentName: string
}

export function useAdminSearch() {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const { setActiveUserId, setActiveUserName, setActiveChildId } = useActiveChild()

  const isAdmin = session?.user?.role === "admin"

  const [searchOpen, setSearchOpen] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [users, setUsers] = useState<SearchUser[]>([])
  const [allChildren, setAllChildren] = useState<SearchChild[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  // Cargar datos al montar (solo admin)
  useEffect(() => {
    if (!isAdmin || !session?.user?.id) return

    const fetchData = async () => {
      try {
        setSearchLoading(true)
        const [usersRes, childrenRes] = await Promise.all([
          fetch("/api/admin/users"),
          fetch("/api/children"),
        ])

        if (usersRes.ok) {
          const data = await usersRes.json()
          const filtered = data.filter((u: any) => u.role !== "admin")
          setUsers(filtered)
        }

        if (childrenRes.ok) {
          const data = await childrenRes.json()
          // createSuccessResponse envuelve en { success, data: { children } }
          const payload = data?.data ?? data
          const children: SearchChild[] = Array.isArray(payload) ? payload : payload?.children || []
          setAllChildren(children)
        }
      } catch (error) {
        logger.error("Error loading search data:", error)
      } finally {
        setSearchLoading(false)
      }
    }

    fetchData()
  }, [isAdmin, session?.user?.id])

  // Mapa de parentId a nombre del padre
  const parentNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const user of users) {
      map[user._id] = user.name
    }
    return map
  }, [users])

  // Resultados: siempre ninos, buscables por nombre del nino o del padre
  const searchResults = useMemo((): ChildResult[] => {
    const search = searchValue.trim().toLowerCase()
    if (!search) return []

    const results: ChildResult[] = []

    for (const child of allChildren) {
      const childFullName = `${child.firstName || ""} ${child.lastName || ""}`.toLowerCase()
      const parentName = (parentNameMap[child.parentId] || "").toLowerCase()

      // Matchea si el query coincide con nombre del nino O nombre del padre
      if (childFullName.includes(search) || parentName.includes(search)) {
        results.push({
          child,
          parentName: parentNameMap[child.parentId] || "",
        })
      }
    }

    return results.slice(0, 15)
  }, [searchValue, allChildren, parentNameMap])

  // Click en un nino → navegar directo al hub del paciente
  const handleSelectChild = useCallback((child: SearchChild) => {
    setActiveUserId(child.parentId)
    setActiveUserName(parentNameMap[child.parentId] || "")
    setActiveChildId(child._id)
    setSearchOpen(false)
    setSearchValue("")

    router.push(`/dashboard/paciente/${child._id}`)
  }, [parentNameMap, setActiveUserId, setActiveUserName, setActiveChildId, router])

  return {
    isAdmin,
    searchOpen,
    setSearchOpen,
    searchValue,
    setSearchValue,
    searchResults,
    searchLoading,
    handleSelectChild,
  }
}
