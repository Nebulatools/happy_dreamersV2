// Hook personalizado para gestionar operaciones con niños
// Maneja la obtención, creación, actualización y eliminación de niños

import { useState, useEffect, useCallback } from "react"
import { useToast } from "@/hooks/use-toast"
import { createLogger } from "@/lib/logger"
import type { Child } from "@/types/models"

const logger = createLogger("hooks:use-children")

interface UseChildrenResult {
  children: Child[]
  isLoading: boolean
  error: string | null
  fetchChildren: () => Promise<void>
  createChild: (data: Partial<Child>) => Promise<Child | null>
  updateChild: (id: string, data: Partial<Child>) => Promise<boolean>
  deleteChild: (id: string) => Promise<boolean>
  refreshChildren: () => Promise<void>
}

export function useChildren(): UseChildrenResult {
  const [children, setChildren] = useState<Child[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  
  const fetchChildren = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch("/api/children", {
        headers: {
          "Content-Type": "application/json",
        },
      })
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.data && data.data.children) {
        // Nuevo formato con data wrapper
        setChildren(data.data.children)
      } else if (data.success && data.children) {
        // Formato con success flag
        setChildren(data.children)
      } else if (Array.isArray(data)) {
        // Por compatibilidad con respuestas anteriores
        setChildren(data)
      } else {
        throw new Error("Formato de respuesta inválido")
      }
    } catch (error) {
      logger.error("Error al cargar niños", error)
      setError("Error al cargar la lista de niños")
      toast({
        title: "Error",
        description: "No se pudieron cargar los niños. Por favor, intenta de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])
  
  const createChild = useCallback(async (data: Partial<Child>): Promise<Child | null> => {
    try {
      const response = await fetch("/api/children", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al crear niño")
      }
      
      const result = await response.json()
      
      // Actualizar la lista local
      await fetchChildren()
      
      toast({
        title: "Éxito",
        description: "Niño registrado correctamente",
      })
      
      return result
    } catch (error) {
      logger.error("Error al crear niño", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo registrar el niño",
        variant: "destructive",
      })
      return null
    }
  }, [fetchChildren, toast])
  
  const updateChild = useCallback(async (id: string, data: Partial<Child>): Promise<boolean> => {
    try {
      const response = await fetch("/api/children", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, ...data }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al actualizar niño")
      }
      
      // Actualizar la lista local
      await fetchChildren()
      
      toast({
        title: "Éxito",
        description: "Información actualizada correctamente",
      })
      
      return true
    } catch (error) {
      logger.error("Error al actualizar niño", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo actualizar la información",
        variant: "destructive",
      })
      return false
    }
  }, [fetchChildren, toast])
  
  const deleteChild = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/children/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al eliminar niño")
      }
      
      // Actualizar la lista local
      setChildren(prev => prev.filter(child => child._id !== id))
      
      toast({
        title: "Éxito",
        description: "Niño eliminado correctamente",
      })
      
      return true
    } catch (error) {
      logger.error("Error al eliminar niño", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo eliminar el niño",
        variant: "destructive",
      })
      return false
    }
  }, [toast])
  
  const refreshChildren = useCallback(async () => {
    await fetchChildren()
  }, [fetchChildren])
  
  // Cargar niños al montar el componente
  useEffect(() => {
    fetchChildren()
  }, [fetchChildren])
  
  return {
    children,
    isLoading,
    error,
    fetchChildren,
    createChild,
    updateChild,
    deleteChild,
    refreshChildren,
  }
}