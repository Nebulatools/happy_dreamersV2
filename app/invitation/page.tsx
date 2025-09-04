"use client"

// Página de Aceptación de Invitaciones
// Maneja el flujo cuando un usuario hace clic en el link de invitación

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession, signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Icons } from "@/components/icons"
import { toast } from "sonner"

interface InvitationData {
  email: string
  childName: string
  invitedByName: string
  role: string
  permissions: {
    canViewEvents: boolean
    canCreateEvents: boolean
    canEditEvents: boolean
    canViewReports: boolean
    canEditProfile: boolean
    canViewPlan: boolean
  }
  relationshipDescription?: string
  expiresAt: string
}

function InvitationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const token = searchParams.get("token")
  
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cargar información de la invitación
  useEffect(() => {
    const fetchInvitation = async () => {
      if (!token) {
        setError("Token de invitación no válido")
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/invitation?token=${token}`)
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Invitación no válida")
        }
        
        const data = await response.json()
        setInvitation(data.invitation)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchInvitation()
  }, [token])

  // Aceptar invitación
  const handleAcceptInvitation = async () => {
    if (!token) return
    
    setAccepting(true)
    try {
      const response = await fetch("/api/invitation/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ token })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Error al aceptar invitación")
      }

      const data = await response.json()
      toast.success("¡Invitación aceptada exitosamente!")
      
      // Redirigir al perfil del niño
      router.push(`/dashboard/children/${data.childId}`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setAccepting(false)
    }
  }

  // Obtener descripción del rol
  const getRoleDescription = (role: string) => {
    switch (role) {
      case "viewer":
        return "Solo lectura"
      case "caregiver":
        return "Cuidador"
      case "editor":
        return "Editor completo"
      default:
        return role
    }
  }

  // Mostrar loader mientras carga
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F9FF]">
        <div className="text-center">
          <Icons.spinner className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Cargando invitación...</p>
        </div>
      </div>
    )
  }

  // Mostrar error si hay alguno
  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F9FF] p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600">Invitación No Válida</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              {error || "La invitación que intentas acceder no es válida o ha expirado."}
            </p>
            <Button onClick={() => router.push("/")} className="w-full">
              Ir al Inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Si el usuario no está autenticado
  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F9FF] p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="text-4xl mb-4">🌙</div>
            <CardTitle>Invitación a Happy Dreamers</CardTitle>
            <CardDescription>
              {invitation.invitedByName} te ha invitado a tener acceso al perfil de {invitation.childName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-[#F0F7FF] rounded-lg p-4">
              <h3 className="font-semibold mb-2">Detalles de la invitación:</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Niño/a:</span>
                  <span className="font-medium">{invitation.childName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tipo de acceso:</span>
                  <Badge>{getRoleDescription(invitation.role)}</Badge>
                </div>
                {invitation.relationshipDescription && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Relación:</span>
                    <span className="font-medium">{invitation.relationshipDescription}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Nota:</strong> Necesitas iniciar sesión o crear una cuenta para aceptar esta invitación.
              </p>
            </div>

            <div className="space-y-2">
              <Button 
                onClick={() => signIn(undefined, { callbackUrl: `/invitation?token=${token}` })}
                className="w-full"
              >
                Iniciar Sesión
              </Button>
              <Button 
                onClick={() => router.push(`/auth/register?invitation=${token}`)}
                variant="outline"
                className="w-full"
              >
                Crear Cuenta Nueva
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Si el usuario está autenticado y el email coincide
  if (status === "authenticated" && session?.user?.email) {
    const emailMatches = session.user.email.toLowerCase() === invitation.email.toLowerCase()
    
    if (!emailMatches) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F5F9FF] p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-yellow-600">Email No Coincide</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Esta invitación es para <strong>{invitation.email}</strong>, 
                pero estás conectado como <strong>{session.user.email}</strong>.
              </p>
              <p className="text-gray-600 mb-4">
                Por favor, cierra sesión e inicia con el email correcto.
              </p>
              <Button 
                onClick={() => signOut({ callbackUrl: `/invitation?token=${token}` })}
                className="w-full"
              >
                Cerrar Sesión
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F9FF] p-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="text-4xl mb-4">🌙</div>
            <CardTitle>¡Bienvenido a Happy Dreamers!</CardTitle>
            <CardDescription>
              {invitation.invitedByName} te ha invitado a tener acceso al perfil de {invitation.childName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-[#F0F7FF] rounded-lg p-4">
              <h3 className="font-semibold mb-3">Con este acceso podrás:</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                {invitation.permissions.canViewEvents && (
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 mr-2 text-green-500" />
                    Ver eventos y patrones de sueño
                  </li>
                )}
                {invitation.permissions.canCreateEvents && (
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 mr-2 text-green-500" />
                    Registrar nuevos eventos de sueño
                  </li>
                )}
                {invitation.permissions.canEditEvents && (
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 mr-2 text-green-500" />
                    Editar eventos existentes
                  </li>
                )}
                {invitation.permissions.canViewReports && (
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 mr-2 text-green-500" />
                    Ver reportes y estadísticas
                  </li>
                )}
                {invitation.permissions.canViewPlan && (
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 mr-2 text-green-500" />
                    Consultar el plan de sueño personalizado
                  </li>
                )}
                {invitation.permissions.canEditProfile && (
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 mr-2 text-green-500" />
                    Actualizar información del perfil
                  </li>
                )}
              </ul>
            </div>

            <div className="flex space-x-3">
              <Button 
                onClick={handleAcceptInvitation}
                disabled={accepting}
                className="flex-1"
              >
                {accepting ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    Aceptando...
                  </>
                ) : (
                  "Aceptar Invitación"
                )}
              </Button>
              <Button 
                onClick={() => router.push("/dashboard")}
                variant="outline"
                disabled={accepting}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}

// Importar signOut también
import { signOut } from "next-auth/react"

// Componente principal con Suspense
export default function InvitationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#F5F9FF]">
        <div className="text-center">
          <Icons.spinner className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Cargando invitación...</p>
        </div>
      </div>
    }>
      <InvitationContent />
    </Suspense>
  )
}