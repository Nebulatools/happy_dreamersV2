// Componente para seleccionar el niño activo
// Permite al usuario cambiar entre sus hijos registrados

"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { PlusCircle, UserCheck, Baby } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useActiveChild } from "@/context/active-child-context"
import { useSession } from "next-auth/react"

import { createLogger } from "@/lib/logger"
import { extractChildrenFromResponse } from "@/lib/api-response-utils"
import { ChildAvatar } from "@/components/ui/child-avatar"

const logger = createLogger("child-selector")


type Child = {
  _id: string
  firstName: string
  lastName: string
  birthDate?: string
}

export function ChildSelector() {
  const [children, setChildren] = useState<Child[]>([])
  const { activeChildId, setActiveChildId } = useActiveChild()
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()
  const { data: session } = useSession()
  
  // Para admins que seleccionan usuarios
  const isAdmin = session?.user?.role === "admin"
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedUserName, setSelectedUserName] = useState<string | null>(null)

  // Función para cargar los niños desde la API
  const fetchChildren = async (userId?: string | null) => {
    try {
      // No hacer petición si no hay sesión activa
      if (!session || !session.user) {
        logger.info("No hay sesión activa, omitiendo carga de niños")
        setLoading(false)
        return
      }
      
      setLoading(true)
      
      // Construir la URL adecuada según si es admin y hay un usuario seleccionado
      let url = "/api/children"
      if (isAdmin && (userId || selectedUserId)) {
        url = `/api/children?userId=${userId || selectedUserId}`
      }
      
      logger.info(`Fetching children from ${url}`)
      const response = await fetch(url, { cache: "no-store" })
      
      if (!response.ok) {
        throw new Error("Error al cargar los niños")
      }
      
      const responseData = await response.json()
      
      // Usar la función utilidad para extraer los niños
      const childrenData = extractChildrenFromResponse(responseData)
      
      if (childrenData.length === 0 && responseData && !Array.isArray(responseData)) {
        logger.warn('No se pudieron extraer niños de la respuesta:', responseData)
      }
      
      logger.info(`Loaded ${childrenData.length} children`)
      setChildren(childrenData)

      // Si hay niños y no hay uno activo seleccionado, seleccionamos el primero por defecto
      if (childrenData.length > 0 && !activeChildId) {
        setActiveChildId(childrenData[0]._id)
      }
      // Si ya había un niño activo, pero ya no existe en la lista, seleccionamos el primero
      else if (activeChildId && !childrenData.some((child: Child) => child._id === activeChildId)) {
        setActiveChildId(childrenData.length > 0 ? childrenData[0]._id : null)
      }

      setLoading(false)
    } catch (error) {
      logger.error("Error:", error)
      // No mostrar toast si el error es de autorización durante logout
      if (session && session.user) {
        toast({
          title: "Error",
          description: "No se pudieron cargar los niños",
          variant: "destructive",
        })
      }
      setLoading(false)
      setActiveChildId(null)
    }
  }

  // Función para formatear la fecha de nacimiento
  const formatBirthDate = (birthDate: string) => {
    if (!birthDate) return ""
    
    try {
      const date = new Date(birthDate)
      const day = date.getDate().toString().padStart(2, "0")
      const month = (date.getMonth() + 1).toString().padStart(2, "0") 
      const year = date.getFullYear().toString().slice(-2) // Solo los últimos 2 dígitos del año
      
      return ` (${day}/${month}/${year})`
    } catch (error) {
      return ""
    }
  }

  // Efecto simplificado que se ejecuta solo cuando cambia la sesión o el contexto admin
  useEffect(() => {
    if (!session || !session.user) {
      setLoading(false)
      setChildren([])
      setActiveChildId(null)
      return
    }

    if (isAdmin) {
      const savedUserId = localStorage.getItem("admin_selected_user_id")
      const savedUserName = localStorage.getItem("admin_selected_user_name")
      
      if (savedUserId !== selectedUserId) {
        setSelectedUserId(savedUserId)
        setSelectedUserName(savedUserName)
        if (savedUserId) {
          fetchChildren(savedUserId)
        } else {
          setChildren([])
          setActiveChildId(null)
        }
      }
    } else {
      fetchChildren()
    }
  }, [session?.user?.id, isAdmin]) // Solo dependencias esenciales

  // Efecto separado para cambios en localStorage (solo para admins)
  useEffect(() => {
    if (!isAdmin) return

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "admin_selected_user_id") {
        const newUserId = e.newValue
        const newUserName = localStorage.getItem("admin_selected_user_name")
        
        if (newUserId !== selectedUserId) {
          setSelectedUserId(newUserId)
          setSelectedUserName(newUserName)
          if (newUserId) {
            fetchChildren(newUserId)
          } else {
            setChildren([])
            setActiveChildId(null)
          }
        }
      }
    }

    window.addEventListener("storage", handleStorageChange)
    
    return () => {
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [isAdmin, selectedUserId])

  // Obtener el nombre del niño activo
  const getActiveChildName = () => {
    if (!activeChildId) return ""
    const activeChild = children.find(child => child._id === activeChildId)
    return activeChild ? `${activeChild.firstName} ${activeChild.lastName}` : ""
  }

  const handleAddChild = () => {
    // Si es admin y hay un usuario seleccionado, redirigir con el parentId
    if (isAdmin && selectedUserId) {
      router.push(`/dashboard/children/new?parentId=${selectedUserId}`)
    } else {
      router.push("/dashboard/children/new")
    }
  }

  const handleSelectChange = (value: string) => {
    setActiveChildId(value)
  }

  // Renderizar componente con estructura consistente para evitar saltos visuales
  return (
    <div className="flex items-center gap-2">
      {/* Información del usuario seleccionado (solo para admins) */}
      {isAdmin && (
        <div className="text-sm flex items-center min-h-[24px]">
          {selectedUserName ? (
            <>
              <UserCheck className="mr-1 h-3 w-3" />
              <span className="text-muted-foreground">{selectedUserName}</span>
            </>
          ) : (
            <span className="text-amber-600 flex items-center">
              <UserCheck className="mr-2 h-4 w-4" />
              <span>Selecciona un paciente</span>
            </span>
          )}
        </div>
      )}

      {/* Selector de niños - Diseño exacto de Figma */}
      <div className="flex items-center">
        {!isAdmin || (isAdmin && selectedUserId) ? (
          <div className="flex items-center bg-[#F0F7FF] rounded-xl px-4 py-2 h-12 min-w-[131px]">
            {/* Avatar del niño */}
            <div className="flex-shrink-0">
              <ChildAvatar 
                name={getActiveChildName()} 
                className="w-8 h-8 border-2 border-white"
              />
            </div>
            
            {/* Contenido del selector */}
            <div className="ml-2 flex-1 min-w-0">
              <Select 
                value={activeChildId ?? ""} 
                onValueChange={handleSelectChange}
                disabled={loading || children.length === 0}
              >
                <SelectTrigger className="h-auto p-0 border-none bg-transparent hover:bg-transparent focus:ring-0 focus:ring-offset-0 shadow-none [&>svg]:hidden">
                  <div className="flex items-center justify-between w-full">
                    <SelectValue 
                      placeholder={
                        loading ? "Cargando..." : 
                          children.length === 0 ? "Sin niños" : 
                            "Seleccionar"
                      }
                      className="text-[#2553A1] font-medium text-base"
                    />
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3 w-3 text-[#2553A1] ml-2 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {children.map((child) => (
                    <SelectItem key={child._id} value={child._id}>
                      {child.firstName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
