"use client"

// Componente para gestionar cuidadores con acceso compartido
// Permite agregar, listar, editar y eliminar accesos

import { useState, useEffect } from "react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
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
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [existingUsers, setExistingUsers] = useState<any[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [searchEmail, setSearchEmail] = useState<string>("")
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
    permissions: {
      viewer: false,
      caregiver: true,
      editor: false
    },
    relationshipType: "familiar",
    relationshipDescription: "",
    expiresAt: ""
  })

  // Cargar lista de cuidadores
  const loadCaregivers = async () => {
    try {
      const response = await fetch(`/api/children/${childId}/access`)
      const data = await response.json()
      
      if (!response.ok) {
        console.error("Error del servidor:", data)
        // Si no tiene permisos, simplemente no mostrar cuidadores
        if (response.status === 403 || data.error?.includes("permisos")) {
          setCaregivers([])
          return
        }
        throw new Error(data.error || "Error cargando cuidadores")
      }
      
      setCaregivers(data.caregivers || [])
    } catch (error) {
      console.error("Error:", error)
      // Solo mostrar toast si es un error real, no de permisos
      if (error.message && !error.message.includes("permisos")) {
        toast.error("Error al cargar los cuidadores")
      }
      setCaregivers([])
    }
  }

  // Cargar invitaciones pendientes
  const loadInvitations = async () => {
    try {
      const response = await fetch(`/api/children/${childId}/invitations`)
      const data = await response.json()
      
      if (!response.ok) {
        console.error("Error del servidor:", data)
        // Si no tiene permisos, simplemente no mostrar invitaciones
        if (response.status === 403 || data.error?.includes("permisos")) {
          setInvitations([])
          return
        }
        throw new Error(data.error || "Error cargando invitaciones")
      }
      
      setInvitations(data.invitations || [])
    } catch (error) {
      console.error("Error:", error)
      // Solo mostrar toast si es un error real, no de permisos
      if (error.message && !error.message.includes("permisos")) {
        toast.error("Error al cargar las invitaciones")
      }
      setInvitations([])
    }
  }

  // Buscar usuarios existentes por email
  const searchUsers = async (email: string) => {
    if (!email || email.length < 3) {
      setExistingUsers([])
      return
    }
    
    try {
      const response = await fetch(`/api/users/search?email=${encodeURIComponent(email)}`)
      if (response.ok) {
        const data = await response.json()
        setExistingUsers(data.users || [])
      }
    } catch (error) {
      console.error("Error buscando usuarios:", error)
      setExistingUsers([])
    }
  }

  // Vincular usuario existente
  const handleLinkExistingUser = async () => {
    if (!selectedUserId) {
      toast.error("Por favor selecciona un usuario")
      return
    }
    
    try {
      const response = await fetch(`/api/children/${childId}/access/link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId: selectedUserId,
          role: "caregiver",
          relationshipType: "familiar"
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al vincular usuario")
      }

      const result = await response.json()
      if (result.message) {
        toast.success(result.message)
      } else {
        toast.success("Invitación enviada al usuario seleccionado")
      }
      setLinkDialogOpen(false)
      setSelectedUserId("")
      setSearchEmail("")
      setExistingUsers([])
      loadAllData()
    } catch (error: any) {
      toast.error(error.message)
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
          role: formData.permissions.editor ? "editor" : 
                formData.permissions.caregiver ? "caregiver" : "viewer",
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
        permissions: {
          viewer: false,
          caregiver: true,
          editor: false
        },
        relationshipType: "familiar",
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
    console.log("Usuario no es propietario del perfil", { childId, isOwner })
    return (
      <Card>
        <CardHeader>
          <CardTitle>Acceso Compartido</CardTitle>
          <CardDescription>
            Solo el propietario del perfil puede gestionar los accesos compartidos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            <p>Para gestionar los cuidadores, debes ser el propietario del perfil de {childName}.</p>
            <p className="mt-2">Si crees que esto es un error, contacta al propietario del perfil.</p>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  console.log("Usuario ES propietario del perfil", { childId, isOwner })

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
          <div className="flex gap-2">
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Icons.mail className="mr-2 h-4 w-4" />
                  Invitar por Email
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
                  <Label>Permisos</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="viewer"
                        checked={formData.permissions.viewer}
                        onCheckedChange={(checked) => 
                          setFormData({
                            ...formData,
                            permissions: {
                              viewer: !!checked,
                              caregiver: false,
                              editor: false
                            }
                          })
                        }
                      />
                      <Label 
                        htmlFor="viewer" 
                        className="text-sm font-normal cursor-pointer"
                      >
                        Solo lectura
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="caregiver"
                        checked={formData.permissions.caregiver}
                        onCheckedChange={(checked) => 
                          setFormData({
                            ...formData,
                            permissions: {
                              viewer: false,
                              caregiver: !!checked,
                              editor: false
                            }
                          })
                        }
                      />
                      <Label 
                        htmlFor="caregiver" 
                        className="text-sm font-normal cursor-pointer"
                      >
                        Crear eventos
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="editor"
                        checked={formData.permissions.editor}
                        onCheckedChange={(checked) => 
                          setFormData({
                            ...formData,
                            permissions: {
                              viewer: false,
                              caregiver: false,
                              editor: !!checked
                            }
                          })
                        }
                      />
                      <Label 
                        htmlFor="editor" 
                        className="text-sm font-normal cursor-pointer"
                      >
                        Acceso completo
                      </Label>
                    </div>
                  </div>
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
                      <SelectItem value="familiar">Familiar</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
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
            
            <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Icons.userPlus className="mr-2 h-4 w-4" />
                  Vincular a Soñador
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Vincular Usuario Existente</DialogTitle>
                  <DialogDescription>
                    Busca y vincula un usuario ya registrado para darle acceso al perfil de {childName}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="search">Buscar por email</Label>
                    <Input
                      id="search"
                      type="email"
                      placeholder="ejemplo@correo.com"
                      value={searchEmail}
                      onChange={(e) => {
                        setSearchEmail(e.target.value)
                        searchUsers(e.target.value)
                      }}
                    />
                  </div>

                  {existingUsers.length > 0 && (
                    <div className="space-y-2">
                      <Label>Usuarios encontrados</Label>
                      <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-2">
                        {existingUsers.map((user) => (
                          <div
                            key={user._id}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedUserId === user._id
                                ? "bg-blue-50 border-blue-300"
                                : "hover:bg-gray-50"
                            }`}
                            onClick={() => setSelectedUserId(user._id)}
                          >
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.image} />
                                <AvatarFallback>
                                  {user.name?.charAt(0).toUpperCase() || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="font-medium">{user.name}</div>
                                <div className="text-sm text-muted-foreground">{user.email}</div>
                              </div>
                              {selectedUserId === user._id && (
                                <Icons.check className="h-5 w-5 text-blue-600" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchEmail.length >= 3 && existingUsers.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      No se encontraron usuarios con ese email
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setLinkDialogOpen(false)
                    setSelectedUserId("")
                    setSearchEmail("")
                    setExistingUsers([])
                  }}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleLinkExistingUser}
                    disabled={!selectedUserId}
                  >
                    Vincular Usuario
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
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
                        <Badge variant="secondary">
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
