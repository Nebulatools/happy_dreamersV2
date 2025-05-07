// Componente para seleccionar el niño activo
// Permite al usuario cambiar entre sus hijos registrados

"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { PlusCircle, UserCheck } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useActiveChild } from "@/context/active-child-context"
import { useSession } from "next-auth/react"

type Child = {
  _id: string
  firstName: string
  lastName: string
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
      // No hacer petición si no hay sesión activa o si está cargando
      if (!session || !session.user) {
        console.log('No hay sesión activa, omitiendo carga de niños')
        setLoading(false)
        return
      }
      
      setLoading(true)
      
      // Construir la URL adecuada según si es admin y hay un usuario seleccionado
      let url = '/api/children'
      if (isAdmin && (userId || selectedUserId)) {
        url = `/api/children?userId=${userId || selectedUserId}`
      }
      
      console.log(`Fetching children from ${url}`)
      const response = await fetch(url, { cache: 'no-store' })
      
      if (!response.ok) {
        throw new Error('Error al cargar los niños')
      }
      
      const data = await response.json()
      console.log(`Loaded ${data.length} children`)
      setChildren(data)

      // Si hay niños y no hay uno activo seleccionado, seleccionamos el primero por defecto
      if (data.length > 0 && !activeChildId) {
        setActiveChildId(data[0]._id)
      }
      // Si ya había un niño activo, pero ya no existe en la lista, seleccionamos el primero
      else if (activeChildId && !data.some((child: Child) => child._id === activeChildId)) {
        setActiveChildId(data.length > 0 ? data[0]._id : null)
      }

      setLoading(false)
    } catch (error) {
      console.error('Error:', error)
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

  // Verificar localStorage al montar y en cada cambio de ruta
  useEffect(() => {
    // No hacer nada si no hay sesión activa
    if (!session || !session.user) {
      setLoading(false)
      setChildren([])
      setActiveChildId(null)
      return
    }
    
    const checkLocalStorage = () => {
      if (isAdmin) {
        const savedUserId = localStorage.getItem('admin_selected_user_id')
        const savedUserName = localStorage.getItem('admin_selected_user_name')
        
        if (savedUserId && savedUserId !== selectedUserId) {
          console.log(`Updated selected user from localStorage: ${savedUserId}`)
          setSelectedUserId(savedUserId)
          setSelectedUserName(savedUserName)
          fetchChildren(savedUserId)
        } else if (!savedUserId && selectedUserId) {
          // Si no hay usuario en localStorage pero hay uno seleccionado, limpiamos
          setSelectedUserId(null)
          setSelectedUserName(null)
          setChildren([])
        } else if (savedUserId && children.length === 0) {
          // Si hay ID pero no niños, intentamos cargar de nuevo
          fetchChildren(savedUserId)
        }
      } else {
        // No es admin, cargamos sus propios niños
        fetchChildren()
      }
    }
    
    // Revisar al montar el componente
    checkLocalStorage()
    
    // Configurar evento de almacenamiento para detectar cambios en localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'admin_selected_user_id') {
        checkLocalStorage()
      }
    }
    
    // Verificar si estamos en una página que requiere actualización basada en URL params
    const checkForRefreshParam = () => {
      if (window.location.search.includes('refresh=')) {
        console.log('Detected refresh parameter, refreshing children list')
        checkLocalStorage()
      }
    }

    // Crear un MutationObserver para detectar cambios en el DOM que podrían indicar una navegación
    const observer = new MutationObserver(() => {
      // Solo revisar si la sesión sigue activa
      if (session && session.user) {
        checkLocalStorage()
      }
    })

    // Iniciar la observación de cambios en el DOM
    observer.observe(document.documentElement, { 
      childList: true, 
      subtree: true 
    })
    
    // Comprobar ahora si hay un parámetro de refresh
    checkForRefreshParam()
    
    // Agregar listeners para eventos de navegación y cambios en localStorage
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('focus', checkLocalStorage)
    window.addEventListener('popstate', checkLocalStorage)
    
    // Limpiar al desmontar
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('focus', checkLocalStorage)
      window.removeEventListener('popstate', checkLocalStorage)
      observer.disconnect()
    }
  }, [isAdmin, toast, setActiveChildId, activeChildId, selectedUserId, children.length, session])

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

      {/* Selector de niños o mensaje/botón según el estado */}
      <div className="flex items-center gap-2">
        {!isAdmin || (isAdmin && selectedUserId) ? (
          <>
            {/* Selector de niños o mensaje de cargando */}
            <Select 
              value={activeChildId ?? ""} 
              onValueChange={handleSelectChange}
              disabled={loading || children.length === 0}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={
                  loading ? "Cargando..." : 
                  children.length === 0 ? "Sin niños" : 
                  "Seleccionar niño"
                } />
              </SelectTrigger>
              <SelectContent>
                {children.map((child) => (
                  <SelectItem key={child._id} value={child._id}>
                    {child.firstName} {child.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Botón de agregar niño */}
            <Button 
              variant="outline" 
              size="icon" 
              className="h-9 w-9" 
              onClick={handleAddChild}
            >
              <PlusCircle className="h-4 w-4" />
              <span className="sr-only">Agregar niño</span>
            </Button>
          </>
        ) : null}
      </div>
    </div>
  )
}
