// Pagina de diagnosticos (solo para administradores)
// Panel de validacion que cruza bitacora con survey y reglas clinicas

"use client"

import { useSession } from "next-auth/react"
import { useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { ClipboardList, ArrowUp } from "lucide-react"

export default function DiagnosticosPage() {
  const { data: session } = useSession()
  const { toast } = useToast()

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

  // Estado vacio - seleccionar paciente
  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ClipboardList className="h-8 w-8" />
          Panel de Diagnostico
        </h1>
        <p className="text-muted-foreground">
          Valida el progreso del nino cruzando bitacora, survey y reglas clinicas
        </p>
      </div>

      <Card className="max-w-md mx-auto">
        <CardContent className="py-16 text-center">
          <ClipboardList className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
          <h3 className="text-xl font-semibold mb-2">
            Selecciona un paciente
          </h3>
          <p className="text-muted-foreground mb-6">
            Usa el selector en la parte superior para elegir un paciente
          </p>
          <div className="flex justify-center">
            <ArrowUp className="h-8 w-8 text-muted-foreground animate-bounce" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
