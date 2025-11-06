"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { User, Mail, Calendar, Settings, Save, Phone, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UserAvatar } from "@/components/ui/user-avatar"
import { ChangePasswordForm } from "@/components/profile/ChangePasswordForm"
import { useUser } from "@/context/UserContext"
import { useChildren } from "@/hooks/use-children"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function ProfilePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { userData, isLoading, updateProfile } = useUser()
  const { children } = useChildren()
  const [formData, setFormData] = useState({
    name: userData.name,
    email: userData.email,
    phone: userData.phone,
    role: userData.role,
    accountType: userData.accountType || "",
  })

  // Update formData when userData changes
  useEffect(() => {
    setFormData({
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      role: userData.role,
      accountType: userData.accountType || "",
    })
  }, [userData])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSave = async () => {
    const success = await updateProfile({
      name: formData.name,
      phone: formData.phone,
      accountType: formData.accountType,
    })

    if (success) {
      const hasPhone = formData.phone && formData.phone.trim().length > 0
      const hasAccountType = !!formData.accountType
      if (hasPhone && hasAccountType) {
        router.replace("/dashboard")
      }
    }
  }

  const userInitials = formData.name
    ? formData.name.split(" ").map(n => n[0]).join("").toUpperCase()
    : "U"

  const profileIncomplete = !((formData.phone && formData.phone.trim().length > 0) && formData.accountType)
  const showCompletionReminder = profileIncomplete || searchParams?.has("completeProfile")
  const accountTypeOptions = [
    { value: "father", label: "Padre" },
    { value: "mother", label: "Madre" },
    { value: "caregiver", label: "Cuidador" },
  ]

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

        {showCompletionReminder && (
          <Alert className="bg-orange-50 border-orange-200 text-orange-900 mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Completa tu perfil</AlertTitle>
            <AlertDescription>
              Necesitamos tu teléfono y el tipo de cuenta para personalizar la experiencia.
            </AlertDescription>
          </Alert>
        )}

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
                    <Label htmlFor="accountType">Tipo de cuenta</Label>
                    <Select
                      value={formData.accountType || ""}
                      onValueChange={(value) => handleInputChange("accountType", value)}
                    >
                      <SelectTrigger id="accountType" className="mt-1">
                        <SelectValue placeholder="Selecciona una opción" />
                      </SelectTrigger>
                      <SelectContent>
                        {accountTypeOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

        {/* Change Password Section */}
        <ChangePasswordForm />

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
                  {session?.user?.role === "admin" ? "∞" : children.length}
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
