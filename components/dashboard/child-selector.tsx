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
  id: string
  name: string
  lastName: string
}

export function ChildSelector() {
  const [children, setChildren] = useState<Child[]>([])
  const [selectedChild, setSelectedChild] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    // Aquí cargaríamos los hijos del usuario desde la API
    // Por ahora, usamos datos de ejemplo
    const fetchChildren = async () => {
      try {
        // Simulamos una llamada a la API
        setTimeout(() => {
          const mockChildren = [
            { id: "1", name: "Ana", lastName: "García" },
            { id: "2", name: "Luis", lastName: "Pérez" },
          ]
          setChildren(mockChildren)

          // Si hay niños, seleccionamos el primero por defecto
          if (mockChildren.length > 0) {
            setSelectedChild(mockChildren[0].id)
          }

          setLoading(false)
        }, 500)
      } catch (error) {
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
    // Aquí podríamos actualizar el contexto global o hacer una llamada a la API
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
            <SelectItem key={child.id} value={child.id}>
              {child.name} {child.lastName}
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
