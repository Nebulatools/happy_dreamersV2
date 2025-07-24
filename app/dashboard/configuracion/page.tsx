// Página de Configuración de Cuenta según diseño de Figma
// Gestión de perfil, seguridad y preferencias de notificación

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { ToggleSwitch } from "@/components/ui/toggle-switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Camera,
  Trash2,
  LogOut,
  AlertTriangle,
} from "lucide-react"
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
  language: string
  currentPassword: string
  newPassword: string
  confirmPassword: string
  twoFactorEnabled: boolean
  sleepReminders: boolean
  weeklyTips: boolean
  appUpdates: boolean
  marketingEmails: boolean
}

export default function ConfiguracionPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [profileData, setProfileData] = useState<UserProfile>({
    name: "",
    email: "",
    phone: "",
    language: "es",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    twoFactorEnabled: false,
    sleepReminders: true,
    weeklyTips: true,
    appUpdates: false,
    marketingEmails: false,
  })

  useEffect(() => {
    if (session?.user) {
      setProfileData(prev => ({
        ...prev,
        name: session.user.name || "",
        email: session.user.email || "",
        phone: (session.user as any).phone || "",
      }))
    }
  }, [session])

  const userInitials = profileData.name
    ? profileData.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "MG"

  const handleSaveProfile = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: profileData.name,
          phone: profileData.phone,
          language: profileData.language,
        }),
      })

      if (!response.ok) {
        throw new Error("Error al actualizar el perfil")
      }

      toast({
        title: "Cambios guardados",
        description: "Tu información personal ha sido actualizada",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdatePassword = async () => {
    if (profileData.newPassword !== profileData.confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/user/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: profileData.currentPassword,
          newPassword: profileData.newPassword,
        }),
      })

      if (!response.ok) {
        throw new Error("Error al actualizar la contraseña")
      }

      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña ha sido cambiada exitosamente",
      })

      // Limpiar campos de contraseña
      setProfileData(prev => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }))
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la contraseña",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogoutAllDevices = async () => {
    try {
      await signOut({ callbackUrl: "/auth/signin" })
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión en todos los dispositivos",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cerrar la sesión",
        variant: "destructive",
      })
    }
  }

  const handleDeleteAccount = async () => {
    try {
      const response = await fetch("/api/user/account", {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Error al eliminar la cuenta")
      }

      await signOut({ callbackUrl: "/auth/signin" })
      toast({
        title: "Cuenta eliminada",
        description: "Tu cuenta ha sido eliminada permanentemente",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la cuenta",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#1F2937]">Configuración de Cuenta</h1>
        <p className="text-gray-600 mt-2">
          Gestiona tu perfil, preferencias y configuración de seguridad.
        </p>
      </div>

      {/* Sección 1: Información Personal */}
      <Card className="p-6">
        <h2 className="text-lg font-bold mb-6">Información Personal</h2>
        
        {/* Foto de perfil */}
        <div className="mb-6">
          <h3 className="text-base font-medium mb-2">Foto de perfil</h3>
          <div className="flex items-center gap-6">
            <Avatar className="w-16 h-16">
              <AvatarImage src="" alt={profileData.name} />
              <AvatarFallback className="bg-[#BFD7F3] text-[#2F2F2F] text-lg font-medium">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Usa una foto o imagen que sea de al menos 132px x 132px.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-[#2553A1]">
                  Cambiar foto
                </Button>
                <Button variant="outline" size="sm">
                  Eliminar
                </Button>
              </div>
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
            <Label htmlFor="email">Correo Electrónico</Label>
            <Input
              id="email"
              value={profileData.email}
              disabled
              className="mt-1 bg-gray-50"
            />
          </div>
          
          <div>
            <Label htmlFor="phone">Número de Teléfono</Label>
            <Input
              id="phone"
              value={profileData.phone}
              onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
              placeholder="+34 612 345 678"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="language">Idioma Preferido</Label>
            <Select
              value={profileData.language}
              onValueChange={(value) => setProfileData({ ...profileData, language: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="pt">Português</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-6">
          <Button
            onClick={handleSaveProfile}
            disabled={isLoading}
            className="hd-gradient-button text-white"
          >
            Guardar Cambios
          </Button>
        </div>
      </Card>

      {/* Sección 2: Seguridad */}
      <Card className="p-6">
        <h2 className="text-lg font-bold mb-6">Seguridad</h2>
        
        {/* Cambiar contraseña */}
        <div className="mb-8">
          <h3 className="text-base font-medium mb-4">Cambiar Contraseña</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="currentPassword">Contraseña Actual</Label>
              <Input
                id="currentPassword"
                type="password"
                value={profileData.currentPassword}
                onChange={(e) => setProfileData({ ...profileData, currentPassword: e.target.value })}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="newPassword">Nueva Contraseña</Label>
              <Input
                id="newPassword"
                type="password"
                value={profileData.newPassword}
                onChange={(e) => setProfileData({ ...profileData, newPassword: e.target.value })}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
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
            disabled={isLoading}
            className="mt-4 hd-gradient-button text-white"
          >
            Actualizar Contraseña
          </Button>
        </div>

        {/* Verificación en dos pasos */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-medium">Verificación en Dos Pasos</h3>
              <p className="text-sm text-gray-600 mt-1">
                Añade una capa extra de seguridad a tu cuenta requiriendo un código adicional al iniciar sesión.
              </p>
            </div>
            <ToggleSwitch
              checked={profileData.twoFactorEnabled}
              onCheckedChange={(checked) => setProfileData({ ...profileData, twoFactorEnabled: checked })}
            />
          </div>
        </div>
      </Card>

      {/* Sección 3: Preferencias de Notificación */}
      <Card className="p-6">
        <h2 className="text-lg font-bold mb-6">Preferencias de Notificación</h2>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-medium">Recordatorios de Sueño</h3>
              <p className="text-sm text-gray-600">
                Recibe notificaciones para registrar los patrones de sueño de tu hijo/a.
              </p>
            </div>
            <ToggleSwitch
              checked={profileData.sleepReminders}
              onCheckedChange={(checked) => setProfileData({ ...profileData, sleepReminders: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-medium">Consejos Semanales</h3>
              <p className="text-sm text-gray-600">
                Recibe consejos personalizados para mejorar el sueño de tu hijo/a.
              </p>
            </div>
            <ToggleSwitch
              checked={profileData.weeklyTips}
              onCheckedChange={(checked) => setProfileData({ ...profileData, weeklyTips: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-medium">Actualizaciones de la Aplicación</h3>
              <p className="text-sm text-gray-600">
                Recibe notificaciones sobre nuevas características y mejoras.
              </p>
            </div>
            <ToggleSwitch
              checked={profileData.appUpdates}
              onCheckedChange={(checked) => setProfileData({ ...profileData, appUpdates: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-medium">Correos Electrónicos de Marketing</h3>
              <p className="text-sm text-gray-600">
                Recibe ofertas especiales y noticias sobre nuestros servicios.
              </p>
            </div>
            <ToggleSwitch
              checked={profileData.marketingEmails}
              onCheckedChange={(checked) => setProfileData({ ...profileData, marketingEmails: checked })}
            />
          </div>
        </div>
      </Card>

      {/* Sección 4: Acciones de Cuenta */}
      <Card className="p-6">
        <h2 className="text-lg font-bold mb-6">Acciones de Cuenta</h2>
        
        <div className="space-y-6">
          {/* Cerrar sesión */}
          <div className="pb-6 border-b">
            <h3 className="text-base font-medium mb-2">Cerrar Sesión en Todos los Dispositivos</h3>
            <p className="text-sm text-gray-600 mb-4">
              Cierra la sesión en todos los dispositivos donde hayas iniciado sesión.
            </p>
            <Button
              variant="outline"
              onClick={() => setShowLogoutModal(true)}
              className="text-[#2553A1] border-gray-300"
            >
              Cerrar Sesión
            </Button>
          </div>

          {/* Eliminar cuenta */}
          <div>
            <h3 className="text-base font-medium text-red-600 mb-2">Eliminar Cuenta</h3>
            <p className="text-sm text-gray-600 mb-4">
              Elimina permanentemente tu cuenta y todos tus datos. Esta acción no se puede deshacer.
            </p>
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(true)}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              Eliminar Cuenta
            </Button>
          </div>
        </div>
      </Card>

      {/* Modal de confirmación de cierre de sesión */}
      <Dialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <LogOut className="w-6 h-6 text-blue-600" />
            </div>
            <DialogTitle className="text-center">Cerrar Sesión</DialogTitle>
            <DialogDescription className="text-center">
              ¿Estás seguro de que quieres cerrar sesión en todos los dispositivos?
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
              Sí, Cerrar Sesión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación de eliminación */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <DialogTitle className="text-center text-xl">Confirmar Eliminación</DialogTitle>
            <DialogDescription className="text-center space-y-3">
              <p className="text-black">
                ¿Estás seguro de que quieres eliminar a <strong>{profileData.name || "tu cuenta"}</strong>?
              </p>
              <p className="text-[#FFC8C8]">
                Esta acción no se puede deshacer y se perderán todos los datos asociados.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-center">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              className="min-w-[120px]"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              className="min-w-[120px]"
            >
              Sí, Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}