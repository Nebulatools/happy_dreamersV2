"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Edit, Trash2, Users, Baby } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

interface Child {
  _id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  createdAt: string;
  updatedAt?: string;
  surveyData?: any;
  parentId?: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  children?: Child[];
}

export default function ConfiguracionPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { toast } = useToast()
  const [children, setChildren] = useState<Child[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editFormData, setEditFormData] = useState({
    firstName: "",
    lastName: "",
    birthDate: "",
  })

  const isAdmin = session?.user?.role === "admin"

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (isAdmin) {
          // Admin: cargar todos los usuarios con sus niños
          const usersResponse = await fetch("/api/admin/users")
          if (!usersResponse.ok) {
            throw new Error("Error al cargar los usuarios")
          }
          const usersData = await usersResponse.json()
          
          // Cargar niños para cada usuario
          const usersWithChildren = await Promise.all(
            usersData.map(async (user: User) => {
              try {
                const childrenResponse = await fetch(`/api/children?userId=${user._id}`)
                if (childrenResponse.ok) {
                  const userChildren = await childrenResponse.json()
                  return { ...user, children: userChildren }
                }
                return { ...user, children: [] }
              } catch (error) {
                console.error(`Error loading children for user ${user._id}:`, error)
                return { ...user, children: [] }
              }
            })
          )
          
          setUsers(usersWithChildren.filter(user => user.role !== 'admin'))
        } else {
          // Usuario regular: cargar solo sus niños
          const response = await fetch("/api/children")
          if (!response.ok) {
            throw new Error("Error al cargar los niños")
          }
          const data = await response.json()
          setChildren(data)
        }
      } catch (error) {
        console.error("Error:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos. Inténtalo de nuevo.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (session) {
      fetchData()
    }
  }, [session, toast, isAdmin])

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return "N/A"
    
    const birth = new Date(birthDate)
    const now = new Date()
    
    let years = now.getFullYear() - birth.getFullYear()
    const months = now.getMonth() - birth.getMonth()
    
    if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
      years--
    }
    
    // Para niños menores de 1 año, mostrar meses
    if (years === 0) {
      let monthsAge = now.getMonth() - birth.getMonth()
      if (now.getDate() < birth.getDate()) {
        monthsAge--
      }
      if (monthsAge < 0) {
        monthsAge += 12
      }
      return `${monthsAge} ${monthsAge === 1 ? 'mes' : 'meses'}`
    }
    
    return `${years} ${years === 1 ? 'año' : 'años'}`
  }

  const handleEditChild = (child: Child) => {
    setSelectedChild(child)
    setEditFormData({
      firstName: child.firstName,
      lastName: child.lastName,
      birthDate: child.birthDate.split('T')[0], // Formato YYYY-MM-DD para input date
    })
    setIsEditing(true)
  }

  const handleDeleteChild = (child: Child) => {
    setSelectedChild(child)
    setIsDeleting(true)
  }

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditFormData({
      ...editFormData,
      [e.target.name]: e.target.value,
    })
  }

  const saveChildChanges = async () => {
    if (!selectedChild) return

    try {
      const response = await fetch(`/api/children`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedChild._id,
          ...editFormData,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al actualizar el niño")
      }

      // Actualizar la lista de niños
      setChildren(prevChildren => prevChildren.map(child => {
        if (child._id === selectedChild._id) {
          return {
            ...child,
            firstName: editFormData.firstName,
            lastName: editFormData.lastName,
            birthDate: editFormData.birthDate,
          }
        }
        return child
      }))

      toast({
        title: "Cambios guardados",
        description: "La información del niño ha sido actualizada correctamente.",
      })

      setIsEditing(false)
    } catch (error: any) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la información. Inténtalo de nuevo.",
        variant: "destructive",
      })
    }
  }

  const deleteChild = async () => {
    if (!selectedChild) return

    try {
      const response = await fetch(`/api/children?id=${selectedChild._id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al eliminar el niño")
      }

      // Eliminar el niño de la lista
      setChildren(prevChildren => prevChildren.filter(child => child._id !== selectedChild._id))

      toast({
        title: "Niño eliminado",
        description: "El niño ha sido eliminado correctamente.",
      })

      setIsDeleting(false)
    } catch (error: any) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el niño. Inténtalo de nuevo.",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <p>Cargando información...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">
          Administra tus datos y los perfiles de tus niños
        </p>
      </div>

      {isAdmin ? (
        // Vista para administradores: todos los usuarios con sus niños
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Todos los Usuarios y Niños
            </CardTitle>
            <CardDescription>
              Vista completa de todos los usuarios registrados y sus niños
            </CardDescription>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground">No hay usuarios registrados</p>
              </div>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {users.map((user) => (
                  <AccordionItem key={user._id} value={user._id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 text-left">
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                          <div className="text-xs text-muted-foreground">
                            {user.children?.length || 0} {(user.children?.length || 0) === 1 ? 'niño' : 'niños'} registrado(s)
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {user.children && user.children.length > 0 ? (
                        <div className="pl-6 space-y-3">
                          {user.children.map((child) => (
                            <div key={child._id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                              <div className="flex items-center gap-3">
                                <Baby className="h-4 w-4 text-gray-500" />
                                <div>
                                  <div className="font-medium text-sm">
                                    {child.firstName} {child.lastName}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {calculateAge(child.birthDate)} • Registrado: {format(new Date(child.createdAt), "PPP", { locale: es })}
                                  </div>
                                  <div className="text-xs">
                                    {child.surveyData ? (
                                      <span className="text-green-600">✓ Encuesta completa</span>
                                    ) : (
                                      <span className="text-amber-600">⚠ Encuesta pendiente</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="pl-6 py-4 text-sm text-muted-foreground">
                          Este usuario no tiene niños registrados
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>
      ) : (
        // Vista para usuarios regulares: sus propios niños
        <Card>
          <CardHeader>
            <CardTitle>Niños Registrados</CardTitle>
            <CardDescription>
              Aquí puedes ver y administrar los niños que has registrado
            </CardDescription>
          </CardHeader>
          <CardContent>
            {children.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground">No hay niños registrados</p>
                <Button 
                  className="mt-4" 
                  onClick={() => router.push("/dashboard/children/new")}
                >
                  Registrar Niño
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Edad</TableHead>
                    <TableHead>Fecha de registro</TableHead>
                    <TableHead>Estado de encuesta</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {children.map((child) => (
                    <TableRow key={child._id}>
                      <TableCell className="font-medium">
                        {child.firstName} {child.lastName}
                      </TableCell>
                      <TableCell>{calculateAge(child.birthDate)}</TableCell>
                      <TableCell>
                        {format(new Date(child.createdAt), "PPP", { locale: es })}
                      </TableCell>
                      <TableCell>
                        {child.surveyData ? (
                          <span className="text-green-600">Completa</span>
                        ) : (
                          <span className="text-amber-600">Pendiente</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEditChild(child)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="text-red-600"
                          onClick={() => handleDeleteChild(child)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              className="ml-auto" 
              onClick={() => router.push("/dashboard/children/new")}
            >
              Registrar Nuevo Niño
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Diálogo de edición */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Información</DialogTitle>
            <DialogDescription>
              Actualiza los datos básicos del niño
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nombre</Label>
              <Input
                id="firstName"
                name="firstName"
                value={editFormData.firstName}
                onChange={handleEditFormChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Apellido</Label>
              <Input
                id="lastName"
                name="lastName"
                value={editFormData.lastName}
                onChange={handleEditFormChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthDate">Fecha de nacimiento</Label>
              <Input
                id="birthDate"
                name="birthDate"
                type="date"
                value={editFormData.birthDate}
                onChange={handleEditFormChange}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancelar
            </Button>
            <Button onClick={saveChildChanges}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación de eliminación */}
      <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar a {selectedChild?.firstName} {selectedChild?.lastName}? 
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleting(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={deleteChild}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 