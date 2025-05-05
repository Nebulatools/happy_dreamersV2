// Componente para seleccionar el niño activo
// Permite al usuario cambiar entre sus hijos registrados

"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

type Child = {
  _id: string
  firstName: string
  lastName: string
}

export function ChildSelector() {
  const [children, setChildren] = useState<Child[]>([])
  const [selectedChild, setSelectedChild] = useState<string>("")
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

        // Si hay niños, seleccionamos el primero por defecto
        if (data.length > 0) {
          setSelectedChild(data[0]._id)
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
      }
    }

    fetchChildren()
  }, [toast])

  const handleAddChild = () => {
    router.push("/dashboard/children/new")
  }

  const handleSelectChange = (value: string) => {
    setSelectedChild(value)
    // Si quisiéramos actualizar un contexto global o hacer una redirección
    // router.push(`/dashboard?childId=${value}`)
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
      <Select value={selectedChild} onValueChange={handleSelectChange}>
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
