// Pagina de diagnosticos (solo para administradores)
// Redirige automaticamente al panel del nino activo seleccionado

"use client"

import { useSession } from "next-auth/react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useActiveChild } from "@/context/active-child-context"
import {
  ClipboardList,
  Loader2,
  ArrowUp,
  ShieldAlert,
} from "lucide-react"

export default function DiagnosticosPage() {
  const { data: session, status } = useSession()
  const { toast } = useToast()
  const router = useRouter()
  const { activeChildId, isInitialized } = useActiveChild()

  // Verificar que el usuario es admin
  useEffect(() => {
    if (session && session.user.role !== "admin") {
      toast({
        title: "Acceso denegado",
        description: "Solo los administradores pueden acceder a esta pagina.",
        variant: "destructive",
      })
    }
  }, [session, toast])

  // Redirigir al panel del nino activo si hay uno seleccionado
  useEffect(() => {
    if (activeChildId && session?.user.role === "admin") {
      router.push(`/dashboard/diagnosticos/${activeChildId}`)
    }
  }, [activeChildId, session, router])

  // Loading mientras carga sesion o contexto de nino activo
  if (status === "loading" || !isInitialized) {
    return (
      <div className="container py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="py-16 text-center">
            <Loader2 className="h-12 w-12 mx-auto text-gray-400 animate-spin mb-4" />
            <p className="text-gray-600">Cargando...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Acceso denegado para no-admins
  if (session?.user.role !== "admin") {
    return (
      <div className="container py-8">
        <Card className="max-w-md mx-auto border-red-200">
          <CardContent className="py-12 text-center">
            <ShieldAlert className="h-16 w-16 mx-auto text-red-400 mb-6" />
            <h3 className="text-xl font-semibold text-red-700 mb-2">
              Acceso Restringido
            </h3>
            <p className="text-gray-600">
              Solo los administradores pueden acceder al Panel de Diagnostico.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Si hay nino activo, mostramos loading mientras redirige
  if (activeChildId) {
    return (
      <div className="container py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="py-16 text-center">
            <Loader2 className="h-12 w-12 mx-auto text-indigo-500 animate-spin mb-4" />
            <p className="text-gray-600">Abriendo panel de diagnostico...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Estado: No hay nino seleccionado - pedir que seleccione uno
  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ClipboardList className="h-8 w-8" />
          Panel de Diagnostico
        </h1>
        <p className="text-muted-foreground">
          Motor de validacion clinica para pacientes
        </p>
      </div>

      {/* Instruccion para seleccionar nino */}
      <Card className="max-w-lg mx-auto">
        <CardContent className="py-12 text-center">
          <div className="relative">
            <ClipboardList className="h-16 w-16 mx-auto text-indigo-400 mb-6" />

            {/* Flecha animada apuntando al selector */}
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <ArrowUp className="h-8 w-8 text-indigo-500 animate-bounce" />
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-3">
            Selecciona un paciente
          </h3>
          <p className="text-muted-foreground mb-4">
            Usa el selector de pacientes en la barra superior para elegir
            el nino cuyo diagnostico deseas ver.
          </p>
          <div className="bg-indigo-50 rounded-lg p-4 text-sm text-indigo-700">
            <strong>Tip:</strong> El selector muestra todos los pacientes.
            Puedes buscar por nombre o email del padre.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
