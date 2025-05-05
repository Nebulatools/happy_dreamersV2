// Componente para seleccionar el niño activo
// Permite al usuario cambiar entre sus hijos registrados

"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useActiveChild } from "@/context/active-child-context"

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

  useEffect(() => {
    // Cargar los niños desde la API
    const fetchChildren = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/children')
        
        if (!response.ok) {
          throw new Error('Error al cargar los niños')
        }
        
        const data = await response.json()
        setChildren(data)

        // Si hay niños y no hay uno activo seleccionado, seleccionamos el primero por defecto
        if (data.length > 0 && !activeChildId) {
          setActiveChildId(data[0]._id)
        }
        // Si ya había un niño activo, pero ya no existe en la lista (p.ej. fue eliminado),
        // y aún quedan niños, seleccionamos el primero. Si no quedan niños, ponemos null.
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
  }, [toast, setActiveChildId, activeChildId])

  const handleAddChild = () => {
    router.push("/dashboard/children/new")
  }

  const handleSelectChange = (value: string) => {
    setActiveChildId(value)
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
      <Button variant="outline" size="sm" className="gap-1" onClick={handleAddChild}>
        <PlusCircle className="h-4 w-4" />
        <span>Agregar niño</span>
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2">
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
