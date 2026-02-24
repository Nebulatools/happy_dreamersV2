// Pagina de Configuracion de Cuenta
// Gestion de perfil, seguridad y cerrar sesion

"use client"

import { useState, useEffect } from "react"
import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { usePageHeaderConfig } from "@/context/page-header-context"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useUser } from "@/context/UserContext"
import { LogOut } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface UserProfile {
  name: string
  email: string
  phone: string
  timezone: string
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export default function ConfiguracionPage() {
  const { toast } = useToast()
  const { userData, isLoading: userLoading, updateProfile, changePassword } = useUser()
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [profileData, setProfileData] = useState<UserProfile>({
    name: "",
    email: "",
    phone: "",
    timezone: "America/Monterrey",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  usePageHeaderConfig({
    title: "Configuracion",
    showChildSelector: false,
  })

  // Actualizar profileData cuando cambian los datos del usuario
  useEffect(() => {
    if (userData.name || userData.email || userData.phone) {
      setProfileData(prev => ({
        ...prev,
        name: userData.name || "",
        email: userData.email || "",
        phone: userData.phone || "",
        timezone: userData.timezone || "America/Monterrey",
      }))
    }
  }, [userData])

  const userInitials = profileData.name
    ? profileData.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "MG"

  const handleSaveProfile = async () => {
    await updateProfile({
      name: profileData.name,
      phone: profileData.phone,
      timezone: profileData.timezone,
    })
  }

  const handleUpdatePassword = async () => {
    if (profileData.newPassword !== profileData.confirmPassword) {
      toast({
        title: "Error",
        description: "Las contrasenas no coinciden",
        variant: "destructive",
      })
      return
    }

    const success = await changePassword(profileData.currentPassword, profileData.newPassword)

    if (success) {
      setProfileData(prev => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }))
    }
  }

  const handleLogoutAllDevices = async () => {
    try {
      await signOut({ redirect: false })
      window.location.href = "/"
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cerrar la sesion",
        variant: "destructive",
      })
    }
  }

  // Estado de carga mientras se obtienen datos del usuario
  if (userLoading || (!userData.name && !userData.email)) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#1F2937]">Configuracion de Cuenta</h1>
          <p className="text-gray-600 mt-2">
            Cargando informacion del usuario...
          </p>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2553A1]"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[720px] md:max-w-6xl mx-auto px-4 md:px-6 space-y-6 pb-24 safe-area-bottom min-h-[100svh]">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#1F2937]">Configuracion de Cuenta</h1>
        <p className="text-gray-600 mt-2">
          Gestiona tu perfil y configuracion de seguridad.
        </p>
      </div>

      {/* Seccion 1: Informacion Personal */}
      <Card className="p-6">
        <h2 className="text-lg font-bold mb-6">Informacion Personal</h2>

        {/* Avatar (solo lectura) */}
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src="" alt={profileData.name} />
              <AvatarFallback className="bg-[#BFD7F3] text-[#2F2F2F] text-lg font-medium">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-base font-medium">{profileData.name}</p>
              <p className="text-sm text-gray-500">{profileData.email}</p>
            </div>
          </div>
        </div>

        {/* Formulario de datos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="name">Nombre Completo</Label>
            <Input
              id="name"
              value={profileData.name}
              onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="email">Correo Electronico</Label>
            <Input
              id="email"
              value={profileData.email}
              disabled
              className="mt-1 bg-gray-50"
            />
          </div>

          <div>
            <Label htmlFor="phone">Numero de Telefono</Label>
            <Input
              id="phone"
              value={profileData.phone}
              onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
              placeholder="+34 612 345 678"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="timezone">Zona Horaria</Label>
            <Select
              value={profileData.timezone}
              onValueChange={(value) => setProfileData({ ...profileData, timezone: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecciona tu zona horaria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="America/Monterrey">America/Monterrey (GMT-6)</SelectItem>
                <SelectItem value="America/Mexico_City">America/Mexico_City (GMT-6)</SelectItem>
                <SelectItem value="America/Chicago">America/Chicago (GMT-6)</SelectItem>
                <SelectItem value="America/New_York">America/New_York (GMT-5)</SelectItem>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="Asia/Tokyo">Asia/Tokyo (GMT+9)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">Predeterminado: America/Monterrey.</p>
          </div>
        </div>

        <div className="mt-6">
          <Button
            onClick={handleSaveProfile}
            disabled={userLoading}
            className="hd-gradient-button text-white"
          >
            Guardar Cambios
          </Button>
        </div>
      </Card>

      {/* Seccion 2: Seguridad */}
      <Card className="p-6">
        <h2 className="text-lg font-bold mb-6">Seguridad</h2>

        {/* Cambiar contrasena */}
        <div>
          <h3 className="text-base font-medium mb-4">Cambiar Contrasena</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="currentPassword">Contrasena Actual</Label>
              <Input
                id="currentPassword"
                type="password"
                value={profileData.currentPassword}
                onChange={(e) => setProfileData({ ...profileData, currentPassword: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="newPassword">Nueva Contrasena</Label>
              <Input
                id="newPassword"
                type="password"
                value={profileData.newPassword}
                onChange={(e) => setProfileData({ ...profileData, newPassword: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirmar Nueva Contrasena</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={profileData.confirmPassword}
                onChange={(e) => setProfileData({ ...profileData, confirmPassword: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <Button
            onClick={handleUpdatePassword}
            disabled={userLoading}
            className="mt-4 hd-gradient-button text-white"
          >
            Actualizar Contrasena
          </Button>
        </div>
      </Card>

      {/* Seccion 3: Cerrar Sesion */}
      <Card className="p-6">
        <h2 className="text-lg font-bold mb-4">Sesion</h2>
        <p className="text-sm text-gray-600 mb-4">
          Cierra la sesion en todos los dispositivos donde hayas iniciado sesion.
        </p>
        <Button
          variant="outline"
          onClick={() => setShowLogoutModal(true)}
          className="text-[#2553A1] border-gray-300"
        >
          Cerrar Sesion
        </Button>
      </Card>

      {/* Modal de confirmacion de cierre de sesion */}
      <Dialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <LogOut className="w-6 h-6 text-blue-600" />
            </div>
            <DialogTitle className="text-center">Cerrar Sesion</DialogTitle>
            <DialogDescription className="text-center">
              Estas seguro de que quieres cerrar sesion en todos los dispositivos?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-center">
            <Button
              variant="outline"
              onClick={() => setShowLogoutModal(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleLogoutAllDevices}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Si, Cerrar Sesion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
