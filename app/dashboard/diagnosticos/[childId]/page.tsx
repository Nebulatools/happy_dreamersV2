// Pagina de diagnostico para un nino especifico (admin-only)
// Server component que verifica sesion y renderiza el cliente

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { Card, CardContent } from "@/components/ui/card"
import { ShieldAlert, ClipboardList } from "lucide-react"
import DiagnosticPanelClient from "./DiagnosticPanelClient"

interface PageProps {
  params: Promise<{
    childId: string
  }>
}

export default async function DiagnosticChildPage({ params }: PageProps) {
  const { childId } = await params
  const session = await getServerSession(authOptions)

  // Verificar que el usuario esta autenticado
  if (!session?.user) {
    return (
      <div className="container py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="py-12 text-center">
            <ShieldAlert className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Acceso denegado
            </h3>
            <p className="text-gray-500">
              Debes iniciar sesion para acceder a esta pagina.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Verificar que el usuario es admin
  if (session.user.role !== "admin") {
    return (
      <div className="container py-8">
        <Card className="max-w-md mx-auto border-red-200">
          <CardContent className="py-12 text-center">
            <ShieldAlert className="h-12 w-12 mx-auto text-red-400 mb-4" />
            <h3 className="text-lg font-semibold text-red-700 mb-2">
              Acceso restringido
            </h3>
            <p className="text-gray-600">
              Solo los administradores pueden acceder al panel de diagnostico.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Verificar que se proporciono un childId valido
  if (!childId || childId === "undefined") {
    return (
      <div className="container py-8">
        <Card className="max-w-md mx-auto border-yellow-200">
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto text-yellow-400 mb-4" />
            <h3 className="text-lg font-semibold text-yellow-700 mb-2">
              Nino no especificado
            </h3>
            <p className="text-gray-600">
              Por favor, selecciona un nino desde la lista de diagnosticos.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Renderizar el panel de diagnostico
  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header de la pagina */}
      <div className="border-b bg-white">
        <div className="container py-4">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-6 w-6 text-indigo-600" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Panel de Diagnostico
              </h1>
              <p className="text-sm text-gray-500">
                Validacion de eventos, encuesta y reglas clinicas
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Panel de diagnostico (client component) */}
      <DiagnosticPanelClient childId={childId} />
    </div>
  )
}
