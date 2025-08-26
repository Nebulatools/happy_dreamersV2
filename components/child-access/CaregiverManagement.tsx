"use client"

// Componente para gestionar cuidadores con acceso compartido
// Permite agregar, listar, editar y eliminar accesos

import { useState, useEffect } from "react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Icons } from "@/components/icons"
import { toast } from "sonner"
import { UserChildAccess, PendingInvitation } from "@/types/models"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface CaregiverManagementProps {
  childId: string
  childName: string
  isOwner: boolean
}

interface CaregiverWithUser extends UserChildAccess {
  user?: {
    _id: string
    name: string
    email: string
    image?: string
  }
}

export function CaregiverManagement({ 
  childId, 
  childName,
  isOwner 
}: CaregiverManagementProps) {
  const [caregivers, setCaregivers] = useState<CaregiverWithUser[]>([])
  const [invitations, setInvitations] = useState<PendingInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; caregiver: CaregiverWithUser | null }>({
    open: false,
    caregiver: null
  })
  const [cancelInvitationDialog, setCancelInvitationDialog] = useState<{ 
    open: boolean; 
    invitation: PendingInvitation | null 
  }>({
    open: false,
    invitation: null
  })

  // Estado para el formulario de agregar cuidador
  const [formData, setFormData] = useState({
    email: "",
    role: "caregiver",
    relationshipType: "family",
    relationshipDescription: "",
    expiresAt: ""
  })

  // Cargar lista de cuidadores
  const loadCaregivers = async () => {
    try {
      const response = await fetch(`/api/children/${childId}/access`)
      if (!response.ok) {
        throw new Error("Error cargando cuidadores")
      }
      const data = await response.json()
      setCaregivers(data.caregivers || [])
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error al cargar los cuidadores")
    }
  }

  // Cargar invitaciones pendientes
  const loadInvitations = async () => {
    try {
      const response = await fetch(`/api/children/${childId}/invitations`)
      if (!response.ok) {
        throw new Error("Error cargando invitaciones")
      }
      const data = await response.json()
      setInvitations(data.invitations || [])
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error al cargar las invitaciones")
    }
  }

  // Cargar todos los datos
  const loadAllData = async () => {
    setLoading(true)
    await Promise.all([loadCaregivers(), loadInvitations()])
    setLoading(false)
  }

  useEffect(() => {
    loadAllData()
  }, [childId])

  // Agregar nuevo cuidador
  const handleAddCaregiver = async () => {
    try {
      const response = await fetch(`/api/children/${childId}/access`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: formData.email,
          role: formData.role,
          relationshipType: formData.relationshipType,
          relationshipDescription: formData.relationshipDescription,
          expiresAt: formData.expiresAt || null
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al agregar cuidador")
      }

      // Si el response incluye un mensaje de invitación, mostrarlo diferente
      if (response.ok) {
        const result = await response.json()
        if (result.error && result.error.includes("Invitación enviada")) {
          toast.info(result.error)
        } else {
          toast.success("Cuidador agregado exitosamente")
        }
      }
      
      setAddDialogOpen(false)
      setFormData({
        email: "",
        role: "caregiver",
        relationshipType: "family",
        relationshipDescription: "",
        expiresAt: ""
      })
      loadAllData()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  // Eliminar cuidador
  const handleDeleteCaregiver = async () => {
    if (!deleteDialog.caregiver) return

    try {
      const response = await fetch(
        `/api/children/${childId}/access?userId=${deleteDialog.caregiver.userId}`,
        {
          method: "DELETE"
        }
      )

      if (!response.ok) {
        throw new Error("Error al eliminar acceso")
      }

      toast.success("Acceso revocado exitosamente")
      setDeleteDialog({ open: false, caregiver: null })
      loadAllData()
    } catch (error) {
      toast.error("Error al revocar acceso")
    }
  }

  // Cancelar invitación pendiente
  const handleCancelInvitation = async () => {
    if (!cancelInvitationDialog.invitation) return

    try {
      const response = await fetch(
        `/api/children/${childId}/invitations?invitationId=${cancelInvitationDialog.invitation._id}`,
        {
          method: "DELETE"
        }
      )

      if (!response.ok) {
        throw new Error("Error al cancelar invitación")
      }

      toast.success("Invitación cancelada exitosamente")
      setCancelInvitationDialog({ open: false, invitation: null })
      loadAllData()
    } catch (error) {
      toast.error("Error al cancelar invitación")
    }
  }

  // Obtener color del badge según el rol
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "viewer":
        return "secondary"
      case "caregiver":
        return "default"
      case "editor":
        return "destructive"
      default:
        return "outline"
    }
  }

  // Obtener descripción del rol
  const getRoleDescription = (role: string) => {
    switch (role) {
      case "viewer":
        return "Solo lectura"
      case "caregiver":
        return "Puede registrar eventos"
      case "editor":
        return "Acceso completo"
      default:
        return role
    }
  }

  if (!isOwner) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Acceso Compartido</CardTitle>
          <CardDescription>
            Solo el propietario del perfil puede gestionar los accesos compartidos
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Cuidadores con Acceso</CardTitle>
            <CardDescription>
              Gestiona quién puede ver y registrar eventos para {childName}
            </CardDescription>
          </div>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Icons.userPlus className="mr-2 h-4 w-4" />
                Agregar Cuidador
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Agregar Nuevo Cuidador</DialogTitle>
                <DialogDescription>
                  Otorga acceso a otro usuario para ver o editar el perfil de {childName}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email del cuidador</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="ejemplo@correo.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Nivel de acceso</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Solo lectura</SelectItem>
                      <SelectItem value="caregiver">Puede registrar eventos</SelectItem>
                      <SelectItem value="editor">Acceso completo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="relationship">Tipo de relación</Label>
                  <Select
                    value={formData.relationshipType}
                    onValueChange={(value) => setFormData({ ...formData, relationshipType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="parent">Padre/Madre</SelectItem>
                      <SelectItem value="grandparent">Abuelo/a</SelectItem>
                      <SelectItem value="babysitter">Niñera</SelectItem>
                      <SelectItem value="family">Familiar</SelectItem>
                      <SelectItem value="professional">Profesional</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción (opcional)</Label>
                  <Input
                    id="description"
                    placeholder="Ej: Tía María, Niñera de fin de semana"
                    value={formData.relationshipDescription}
                    onChange={(e) => setFormData({ ...formData, relationshipDescription: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expires">Acceso temporal hasta (opcional)</Label>
                  <Input
                    id="expires"
                    type="date"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddCaregiver}>
                  Agregar Cuidador
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Icons.spinner className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="active">
                Activos ({caregivers.length})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pendientes ({invitations.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="active" className="space-y-4">
              {caregivers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay cuidadores con acceso compartido.
                  <br />
                  Agrega cuidadores para que puedan ayudarte a registrar eventos.
                </div>
              ) : (
                <div className="space-y-4">
                  {caregivers.map((caregiver) => (
                    <div
                      key={caregiver._id.toString()}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarImage src={caregiver.user?.image} />
                          <AvatarFallback>
                            {caregiver.user?.name?.charAt(0).toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{caregiver.user?.name || "Usuario"}</div>
                          <div className="text-sm text-muted-foreground">
                            {caregiver.user?.email}
                          </div>
                          {caregiver.relationshipDescription && (
                            <div className="text-sm text-muted-foreground">
                              {caregiver.relationshipDescription}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Badge variant={getRoleBadgeVariant(caregiver.role as string)}>
                          {getRoleDescription(caregiver.role as string)}
                        </Badge>
                        {caregiver.expiresAt && (
                          <Badge variant="outline">
                            Hasta {new Date(caregiver.expiresAt).toLocaleDateString()}
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteDialog({ open: true, caregiver })}
                        >
                          <Icons.trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="pending" className="space-y-4">
              {invitations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay invitaciones pendientes.
                </div>
              ) : (
                <div className="space-y-4">
                  {invitations.map((invitation) => (
                    <div
                      key={invitation._id.toString()}
                      className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50 border-yellow-200"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-full bg-yellow-200 flex items-center justify-center">
                          <Icons.mail className="h-5 w-5 text-yellow-700" />
                        </div>
                        <div>
                          <div className="font-medium">{invitation.email}</div>
                          <div className="text-sm text-muted-foreground">
                            Invitado hace {formatDistanceToNow(new Date(invitation.createdAt), { 
                              addSuffix: true,
                              locale: es 
                            })}
                          </div>
                          {invitation.relationshipDescription && (
                            <div className="text-sm text-muted-foreground">
                              {invitation.relationshipDescription}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Badge variant="warning">
                          Esperando aceptación
                        </Badge>
                        <Badge variant={getRoleBadgeVariant(invitation.role)}>
                          {getRoleDescription(invitation.role)}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setCancelInvitationDialog({ open: true, invitation })}
                        >
                          <Icons.close className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>

      <AlertDialog 
        open={deleteDialog.open} 
        onOpenChange={(open) => !open && setDeleteDialog({ open: false, caregiver: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción revocará el acceso de {deleteDialog.caregiver?.user?.name || "este usuario"} al 
              perfil de {childName}. El usuario ya no podrá ver ni registrar eventos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCaregiver}>
              Revocar Acceso
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog 
        open={cancelInvitationDialog.open} 
        onOpenChange={(open) => !open && setCancelInvitationDialog({ open: false, invitation: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar invitación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción cancelará la invitación enviada a {cancelInvitationDialog.invitation?.email}.
              El enlace de invitación dejará de funcionar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Mantener Invitación</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelInvitation}>
              Cancelar Invitación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}