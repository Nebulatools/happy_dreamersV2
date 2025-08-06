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
import { PatientQuickSelector } from "@/components/dashboard/patient-quick-selector"

const logger = createLogger("child-selector")


type Child = {
  _id: string
  firstName: string
  lastName: string
  birthDate?: string
}

export function ChildSelector() {
  const [children, setChildren] = useState<Child[]>([])
  const { 
    activeChildId, 
    setActiveChildId, 
    activeUserId,
    activeUserName,
    isInitialized 
  } = useActiveChild()
  const [loading, setLoading] = useState(true)
  
  // Estado local para forzar el valor del dropdown
  const [displayValue, setDisplayValue] = useState<string>("")
  const router = useRouter()
  const { toast } = useToast()
  const { data: session } = useSession()
  
  // Para admins que seleccionan usuarios
  const isAdmin = session?.user?.role === "admin"

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
      if (isAdmin && (userId || activeUserId)) {
        url = `/api/children?userId=${userId || activeUserId}`
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

      // SOLO cambiar si el niño guardado NO existe en la lista
      // NO cambiar automáticamente a ningún niño por defecto
      if (activeChildId && !childrenData.some((child: Child) => child._id === activeChildId)) {
        const savedId = localStorage.getItem('activeChildId')
        if (savedId && childrenData.some((child: Child) => child._id === savedId)) {
          // Existe en localStorage y en la lista, usarlo
          setActiveChildId(savedId)
        } else {
          // No existe ni guardado ni en lista, usar el primero
          setActiveChildId(childrenData[0]._id)
        }
      }
      // Si NO hay activeChildId pero HAY algo guardado, restaurarlo
      else if (!activeChildId && childrenData.length > 0) {
        const savedId = localStorage.getItem('activeChildId')
        if (savedId && childrenData.some((child: Child) => child._id === savedId)) {
          setActiveChildId(savedId)
        } else {
          setActiveChildId(childrenData[0]._id)
        }
      }

      setLoading(false)
    } catch (error) {
      logger.error("Error cargando niños:", error instanceof Error ? error.message : "Error desconocido")
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

  // Función para calcular la edad del niño
  const getChildAge = (birthDate: string) => {
    if (!birthDate) return ""
    
    try {
      const birth = new Date(birthDate)
      const today = new Date()
      const diffTime = today.getTime() - birth.getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays < 30) {
        return `${diffDays}d`
      } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30)
        return `${months}m`
      } else {
        const years = Math.floor(diffDays / 365)
        const remainingMonths = Math.floor((diffDays % 365) / 30)
        return remainingMonths > 0 ? `${years}a ${remainingMonths}m` : `${years}a`
      }
    } catch (error) {
      return ""
    }
  }

  // Efecto simplificado para cargar niños
  useEffect(() => {
    if (!session || !session.user) {
      setLoading(false)
      setChildren([])
      return
    }

    if (isAdmin) {
      // Para admins, solo cargar si hay un usuario seleccionado
      if (activeUserId) {
        fetchChildren(activeUserId)
      } else {
        setChildren([])
        setLoading(false)
      }
    } else {
      // Para usuarios normales, cargar sus propios niños
      fetchChildren()
    }
  }, [session?.user?.id, isAdmin, activeUserId])

  // Obtener el nombre del niño activo
  const getActiveChildName = () => {
    if (!activeChildId) return ""
    const activeChild = children.find(child => child._id === activeChildId)
    return activeChild ? `${activeChild.firstName} ${activeChild.lastName}` : ""
  }

  // Obtener datos completos del niño activo
  const getActiveChildData = () => {
    if (!activeChildId) return null
    return children.find(child => child._id === activeChildId) || null
  }

  const handleAddChild = () => {
    // Si es admin y hay un usuario seleccionado, redirigir con el parentId
    if (isAdmin && activeUserId) {
      router.push(`/dashboard/children/new?parentId=${activeUserId}`)
    } else {
      router.push("/dashboard/children/new")
    }
  }

  const handleSelectChange = (value: string) => {
    setActiveChildId(value)
    setDisplayValue(value)
    // FORZAR guardado inmediato
    localStorage.setItem('activeChildId', value)
  }
  
  // Sincronizar displayValue con activeChildId cuando cambie
  useEffect(() => {
    if (activeChildId) {
      setDisplayValue(activeChildId)
    }
  }, [activeChildId])
  
  // Al inicializar, restaurar desde localStorage DIRECTAMENTE
  useEffect(() => {
    const saved = localStorage.getItem('activeChildId')
    if (saved && saved !== 'null') {
      setDisplayValue(saved)
      if (activeChildId !== saved) {
        setActiveChildId(saved)
      }
    }
  }, [isInitialized])

  // Si es admin, usar el nuevo PatientQuickSelector
  if (isAdmin) {
    return <PatientQuickSelector className="min-w-[280px]" />
  }

  // Para usuarios normales, mantener el selector original
  return (
    <div className="flex items-center gap-2">
      {/* Selector de niños para usuarios normales */}
      <div className="flex items-center">
        {children.length > 0 ? (
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
                value={displayValue || activeChildId || ""} 
                onValueChange={handleSelectChange}
                disabled={loading || children.length === 0}
              >
                <SelectTrigger className="h-auto p-0 border-none bg-transparent hover:bg-transparent focus:ring-0 focus:ring-offset-0 shadow-none [&>svg]:hidden">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex flex-col items-start">
                      {(() => {
                        const activeChild = getActiveChildData()
                        if (loading) {
                          return <span className="text-[#2553A1] font-medium text-base">Cargando...</span>
                        }
                        if (children.length === 0) {
                          return <span className="text-[#2553A1] font-medium text-base">Sin niños</span>
                        }
                        if (activeChild) {
                          return (
                            <>
                              <span className="text-[#2553A1] font-medium text-base">
                                {activeChild.firstName}
                              </span>
                              {activeChild.birthDate && (
                                <span className="text-xs text-[#666666] leading-none">
                                  {getChildAge(activeChild.birthDate)}
                                </span>
                              )}
                            </>
                          )
                        }
                        return <span className="text-[#2553A1] font-medium text-base">Seleccionar</span>
                      })()}
                    </div>
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
                      <div className="flex flex-col">
                        <span>{child.firstName}</span>
                        {child.birthDate && (
                          <span className="text-xs text-gray-500">
                            {getChildAge(child.birthDate)}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          // Mostrar botón para agregar niño si no hay niños
          <Button
            onClick={handleAddChild}
            variant="outline"
            size="sm"
            className="h-12"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Agregar niño
          </Button>
        )}
      </div>
    </div>
  )
}
