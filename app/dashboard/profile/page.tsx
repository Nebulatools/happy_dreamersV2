"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { User, Mail, Calendar, Settings, Save, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UserAvatar } from "@/components/ui/user-avatar"
import { useToast } from "@/hooks/use-toast"

import { createLogger } from "@/lib/logger"

const logger = createLogger("page")


export default function ProfilePage() {
  const { data: session, update } = useSession()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
  })

  useEffect(() => {
    if (session?.user) {
      const sessionData = {
        name: session.user.name || "",
        email: session.user.email || "",
        phone: (session.user as any).phone || "",
        role: session.user.role || "user",
      }
      
      logger.info("Session data loaded", {
        sessionUserData: sessionData,
        sessionPhone: (session.user as any).phone,
        sessionPhoneType: typeof (session.user as any).phone
      })
      
      // Primero cargar desde la sesión
      setFormData(sessionData)
      
      // Luego cargar los datos más recientes desde la base de datos
      loadProfileData()
    }
  }, [session])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const loadProfileData = async () => {
    try {
      logger.info("Loading profile data from API...")
      const response = await fetch("/api/user/profile", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const result = await response.json()
        logger.info("API response received", result)
        
        if (result.success && result.data) {
          logger.info("Setting form data", result.data)
          setFormData(result.data)
        } else {
          logger.warn("API response missing success or data", result)
        }
      } else {
        logger.error("API response not ok", { status: response.status, statusText: response.statusText })
      }
    } catch (error) {
      logger.error("Error loading profile data", error)
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      logger.info("Starting profile save", {
        formData: formData,
        phoneValue: formData.phone,
        phoneLength: formData.phone?.length,
        phoneType: typeof formData.phone
      })

      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()
      logger.info("Save API response", result)

      if (!response.ok) {
        throw new Error(result.error || "Error al actualizar el perfil")
      }

      // Recargar los datos desde la base de datos para mostrar los cambios
      logger.info("Reloading profile data after save...")
      await loadProfileData()

      // También actualizar la sesión
      logger.info("Updating session after save", {
        newName: formData.name,
        newPhone: formData.phone
      })
      await update({
        ...session,
        user: {
          ...session?.user,
          name: formData.name,
          phone: formData.phone,
        },
      })

      toast({
        title: "Perfil actualizado",
        description: result.message || "Tu información ha sido actualizada correctamente",
      })
    } catch (error) {
      logger.error("Error updating profile", error)
      const errorMessage = error instanceof Error ? error.message : "No se pudo actualizar el perfil"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const userInitials = formData.name
    ? formData.name.split(" ").map(n => n[0]).join("").toUpperCase()
    : "U"

  return (
    <div className="min-h-screen bg-blue-50/30 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mi Perfil</h1>
          <p className="text-gray-600">
            Gestiona tu información personal y configuraciones de cuenta
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card className="lg:col-span-1">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <UserAvatar 
                  name={formData.name} 
                  image={null}
                  className="h-24 w-24 text-lg" 
                />
              </div>
              <CardTitle className="text-xl">{formData.name || "Usuario"}</CardTitle>
              <CardDescription className="capitalize">
                {formData.role === "admin" ? "Administrador" : 
                  formData.role === "parent" ? "Padre/Madre" : "Usuario"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  {formData.email}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  {formData.phone && formData.phone.trim().length > 0 
                    ? formData.phone 
                    : "Sin teléfono registrado"}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  Miembro desde {new Date().getFullYear()}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Edit Profile Form */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Información Personal
              </CardTitle>
              <CardDescription>
                Actualiza tu información personal y datos de contacto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => { e.preventDefault(); handleSave() }} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nombre completo</Label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className="mt-1"
                      placeholder="Tu nombre completo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      disabled
                      className="mt-1 bg-gray-50"
                      placeholder="tu@email.com"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      El email no puede ser modificado
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      className="mt-1"
                      placeholder="+52 123 456 7890"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Formato recomendado: +52 123 456 7890
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="role">Tipo de cuenta</Label>
                    <Input
                      id="role"
                      type="text"
                      value={formData.role === "admin" ? "Administrador" : 
                        formData.role === "parent" ? "Padre/Madre" : "Usuario"}
                      disabled
                      className="mt-1 bg-gray-50 capitalize"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button 
                    type="submit"
                    disabled={isLoading}
                    className="bg-gradient-to-r from-blue-500 to-blue-400 hover:from-blue-600 hover:to-blue-500 text-white px-6"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isLoading ? "Guardando..." : "Guardar Cambios"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Debug Information Card */}
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800">🔍 Información de Depuración</CardTitle>
            <CardDescription className="text-yellow-700">
              Datos para diagnosticar el problema del teléfono
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium text-yellow-800">Datos del formulario:</h4>
                <div className="bg-white p-3 rounded border">
                  <div><strong>Nombre:</strong> {formData.name || "vacío"}</div>
                  <div><strong>Email:</strong> {formData.email || "vacío"}</div>
                  <div><strong>Teléfono:</strong> {formData.phone || "vacío"}</div>
                  <div><strong>Role:</strong> {formData.role || "vacío"}</div>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-yellow-800">Datos de la sesión:</h4>
                <div className="bg-white p-3 rounded border">
                  <div><strong>Nombre:</strong> {session?.user?.name || "vacío"}</div>
                  <div><strong>Email:</strong> {session?.user?.email || "vacío"}</div>
                  <div><strong>Teléfono:</strong> {(session?.user as any)?.phone || "vacío"}</div>
                  <div><strong>Role:</strong> {session?.user?.role || "vacío"}</div>
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-white rounded border">
              <h4 className="font-medium text-yellow-800 mb-2">Estado del teléfono:</h4>
              <div className="text-sm space-y-1">
                <div><strong>Teléfono en formData:</strong> "{formData.phone}" (tipo: {typeof formData.phone}, longitud: {formData.phone?.length || 0})</div>
                <div><strong>Teléfono en sesión:</strong> "{(session?.user as any)?.phone || ""}" (tipo: {typeof (session?.user as any)?.phone})</div>
                <div><strong>¿Es truthy en formData?:</strong> {formData.phone ? "Sí" : "No"}</div>
                <div><strong>¿Tiene contenido después de trim?:</strong> {formData.phone && formData.phone.trim().length > 0 ? "Sí" : "No"}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Información de la Cuenta</CardTitle>
            <CardDescription>
              Datos adicionales sobre tu cuenta de Happy Dreamers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {session?.user?.role === "admin" ? "∞" : "3"}
                </div>
                <div className="text-sm text-gray-600">
                  {session?.user?.role === "admin" ? "Acceso completo" : "Niños registrados"}
                </div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {session?.user?.role === "admin" ? "Pro" : "Básico"}
                </div>
                <div className="text-sm text-gray-600">Plan actual</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">24/7</div>
                <div className="text-sm text-gray-600">Soporte disponible</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
