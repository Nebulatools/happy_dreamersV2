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

  useEffect(() => {
    // Si es admin, verificar si hay un usuario seleccionado en localStorage
    if (isAdmin) {
      const savedUserId = localStorage.getItem('admin_selected_user_id')
      const savedUserName = localStorage.getItem('admin_selected_user_name')
      
      if (savedUserId) {
        setSelectedUserId(savedUserId)
        setSelectedUserName(savedUserName)
      }
    }
    
    // Cargar los niños desde la API
    const fetchChildren = async () => {
      try {
        setLoading(true)
        
        // Construir la URL adecuada según si es admin y hay un usuario seleccionado
        let url = '/api/children'
        if (isAdmin && selectedUserId) {
          url = `/api/children?userId=${selectedUserId}`
        }
        
        const response = await fetch(url)
        
        if (!response.ok) {
          throw new Error('Error al cargar los niños')
        }
        
        const data = await response.json()
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
        toast({
          title: "Error",
          description: "No se pudieron cargar los niños",
          variant: "destructive",
        })
        setLoading(false)
        setActiveChildId(null)
      }
    }

    fetchChildren()
  }, [toast, setActiveChildId, activeChildId, isAdmin, selectedUserId])

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

  // Si es admin y no hay usuario seleccionado, mostrar mensaje
  if (isAdmin && !selectedUserId) {
    return (
      <div className="text-sm text-amber-600 flex items-center">
        <UserCheck className="mr-2 h-4 w-4" />
        <span>Por favor, selecciona un paciente</span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Select disabled>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Cargando..." />
          </SelectTrigger>
        </Select>
      </div>
    )
  }

  if (children.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        {isAdmin && selectedUserName && (
          <div className="text-sm flex items-center">
            <UserCheck className="mr-1 h-3 w-3" />
            <span className="text-muted-foreground">{selectedUserName}</span>
          </div>
        )}
        <Button variant="outline" size="sm" className="gap-1" onClick={handleAddChild}>
          <PlusCircle className="h-4 w-4" />
          <span>Agregar niño</span>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {isAdmin && selectedUserName && (
        <div className="text-sm flex items-center">
          <UserCheck className="mr-1 h-3 w-3" />
          <span className="text-muted-foreground">{selectedUserName}</span>
        </div>
      )}
      <Select value={activeChildId ?? ""} onValueChange={handleSelectChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Seleccionar niño" />
        </SelectTrigger>
        <SelectContent>
          {children.map((child) => (
            <SelectItem key={child._id} value={child._id}>
              {child.firstName} {child.lastName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleAddChild}>
        <PlusCircle className="h-4 w-4" />
        <span className="sr-only">Agregar niño</span>
      </Button>
    </div>
  )
}
