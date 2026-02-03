// Pagina de diagnosticos (solo para administradores)
// Lista de ninos con acceso rapido al panel de diagnostico

"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { ChildAvatar } from "@/components/ui/child-avatar"
import {
  ClipboardList,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  ChevronRight,
} from "lucide-react"

interface ChildWithPlan {
  _id: string
  firstName: string
  lastName?: string
  birthDate?: string
  parentId: string
  parentName?: string
  hasActivePlan: boolean
  planVersion?: string
}

export default function DiagnosticosPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(true)
  const [children, setChildren] = useState<ChildWithPlan[]>([])
  const [error, setError] = useState<string | null>(null)

  // Verificar que el usuario es admin
  useEffect(() => {
    if (session && session.user.role !== "admin") {
      toast({
        title: "Acceso denegado",
        description: "Solo los administradores pueden acceder a esta pagina.",
        variant: "destructive",
      })
      return
    }
  }, [session, toast])

  // Cargar lista de ninos
  useEffect(() => {
    const fetchChildren = async () => {
      if (!session?.user || session.user.role !== "admin") {
        setIsLoading(false)
        return
      }

      try {
        // Obtener todos los ninos (admin tiene acceso a todos)
        const response = await fetch("/api/admin/children")

        if (!response.ok) {
          // Fallback a endpoint normal si el admin endpoint no existe
          const fallbackResponse = await fetch("/api/children?all=true")
          if (!fallbackResponse.ok) {
            throw new Error("Error al cargar lista de ninos")
          }
          const fallbackData = await fallbackResponse.json()
          const childrenArray = fallbackData.children || fallbackData.data || fallbackData || []
          setChildren(Array.isArray(childrenArray) ? childrenArray : [])
          setIsLoading(false)
          return
        }

        const data = await response.json()
        const childrenArray = data.children || data.data || data || []
        setChildren(Array.isArray(childrenArray) ? childrenArray : [])
      } catch (err) {
        console.error("Error loading children:", err)
        setError(err instanceof Error ? err.message : "Error desconocido")
      } finally {
        setIsLoading(false)
      }
    }

    fetchChildren()
  }, [session])

  // Acceso denegado para no-admins
  if (session?.user.role !== "admin") {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <p>Acceso denegado. Solo los administradores pueden acceder a esta pagina.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Calcular edad en texto legible
  const formatAge = (birthDate?: string): string => {
    if (!birthDate) return ""
    try {
      const birth = new Date(birthDate)
      const diffDays = Math.floor((Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays < 30) return `${diffDays} dias`
      if (diffDays < 365) {
        const months = Math.floor(diffDays / 30)
        return `${months} ${months === 1 ? "mes" : "meses"}`
      }
      const years = Math.floor(diffDays / 365)
      const months = Math.floor((diffDays % 365) / 30)
      if (months > 0) return `${years}a ${months}m`
      return `${years} ${years === 1 ? "ano" : "anos"}`
    } catch {
      return ""
    }
  }

  // Navegar al panel de diagnostico del nino
  const handleChildClick = (childId: string) => {
    router.push(`/dashboard/diagnosticos/${childId}`)
  }

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ClipboardList className="h-8 w-8" />
          Panel de Diagnostico
        </h1>
        <p className="text-muted-foreground">
          Selecciona un nino para ver su diagnostico
        </p>
      </div>

      {/* Estado: Loading */}
      {isLoading && (
        <Card className="max-w-md mx-auto">
          <CardContent className="py-16 text-center">
            <Loader2 className="h-12 w-12 mx-auto text-gray-400 animate-spin mb-4" />
            <p className="text-gray-600">Cargando lista de ninos...</p>
          </CardContent>
        </Card>
      )}

      {/* Estado: Error */}
      {!isLoading && error && (
        <Card className="max-w-md mx-auto border-red-200">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
            <h3 className="text-lg font-semibold text-red-700 mb-2">
              Error al cargar
            </h3>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Estado: Lista vacia */}
      {!isLoading && !error && children.length === 0 && (
        <Card className="max-w-md mx-auto">
          <CardContent className="py-16 text-center">
            <ClipboardList className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
            <h3 className="text-xl font-semibold mb-2">
              No hay ninos registrados
            </h3>
            <p className="text-muted-foreground">
              Aun no hay ninos en el sistema.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Lista de ninos */}
      {!isLoading && !error && children.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {children.map((child) => {
            const fullName = `${child.firstName}${child.lastName ? ` ${child.lastName}` : ""}`
            const ageText = formatAge(child.birthDate)

            return (
              <Card
                key={child._id}
                className="cursor-pointer hover:shadow-md transition-shadow border-gray-200
                           hover:border-indigo-300"
                onClick={() => handleChildClick(child._id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <ChildAvatar
                      name={fullName}
                      className="h-12 w-12 flex-shrink-0"
                    />

                    {/* Info del nino */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {fullName}
                      </h3>
                      {ageText && (
                        <p className="text-sm text-gray-500">{ageText}</p>
                      )}
                      {child.parentName && (
                        <p className="text-xs text-gray-400 truncate">
                          Padre: {child.parentName}
                        </p>
                      )}
                    </div>

                    {/* Badge de plan y flecha */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {child.hasActivePlan ? (
                        <Badge className="bg-green-100 text-green-700 text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Plan activo
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-700 text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          Sin plan
                        </Badge>
                      )}
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Contador */}
      {!isLoading && !error && children.length > 0 && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            {children.length} nino{children.length !== 1 ? "s" : ""} registrado{children.length !== 1 ? "s" : ""}
            {" | "}
            {children.filter(c => c.hasActivePlan).length} con plan activo
          </p>
        </div>
      )}
    </div>
  )
}
