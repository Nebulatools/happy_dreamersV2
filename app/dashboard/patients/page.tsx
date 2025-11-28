// Página de pacientes (solo para administradores)
// Muestra una lista de todos los pacientes registrados

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Users, Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { createLogger } from "@/lib/logger"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const logger = createLogger("page")

interface User {
  _id: string
  name: string
  email: string
  role: string
}

interface Child {
  _id: string
  firstName: string
  lastName: string
  parentId: string
}

const extractChildrenFromPayload = (payload: any): Child[] => {
  if (!payload) return []
  if (Array.isArray(payload)) return payload as Child[]
  if (Array.isArray(payload.children)) return payload.children as Child[]
  if (Array.isArray(payload.data?.children)) return payload.data.children as Child[]
  if (Array.isArray(payload.data)) return payload.data as Child[]
  return []
}

export default function PatientsPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [userChildren, setUserChildren] = useState<Record<string, Child[]>>({})
  const [allChildrenMap, setAllChildrenMap] = useState<Record<string, Child[]>>({})
  const [loading, setLoading] = useState(true)
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [childrenPrefetched, setChildrenPrefetched] = useState(false)

  // Cargar la lista de usuarios al iniciar
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/admin/users")
        
        if (!response.ok) {
          throw new Error("Error al cargar los usuarios")
        }
        
        const data = await response.json()
        // Excluir a los usuarios admin
        const filteredUsers = data.filter((user: User) => user.role !== "admin")
        setUsers(filteredUsers)
        
        // Verificar si hay un usuario seleccionado en localStorage
        const savedUserId = localStorage.getItem("admin_selected_user_id")
        if (savedUserId) {
          setSelectedUser(savedUserId)
        }
      } catch (error) {
        logger.error("Error:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los usuarios. Verifica que tengas permisos de administrador.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    
    fetchUsers()
  }, [toast])

  useEffect(() => {
    if (!users.length || childrenPrefetched) return
    const fetchAllChildren = async () => {
      try {
        const response = await fetch("/api/children")
        if (!response.ok) {
          throw new Error("Error al precargar niños")
        }
        const data = await response.json()
        const children = extractChildrenFromPayload(data)
        const grouped = children.reduce<Record<string, Child[]>>((acc, child) => {
          if (!child?.parentId) return acc
          if (!acc[child.parentId]) {
            acc[child.parentId] = []
          }
          acc[child.parentId].push(child)
          return acc
        }, {})
        if (Object.keys(grouped).length) {
          setAllChildrenMap(grouped)
          setUserChildren(prev => ({ ...grouped, ...prev }))
        }
      } catch (error) {
        logger.warn("No se pudieron precargar los niños", error)
      } finally {
        setChildrenPrefetched(true)
      }
    }
    fetchAllChildren()
  }, [users.length, childrenPrefetched])

  // Cargar los niños de un usuario cuando se expande su acordeón
  const loadUserChildren = async (userId: string) => {
    try {
      // Si ya cargamos los niños de este usuario, no hacemos la petición de nuevo
      if (userChildren[userId]) {
        return
      }
      
      const response = await fetch(`/api/children?userId=${userId}`)
      
      if (!response.ok) {
        throw new Error("Error al cargar los niños del usuario")
      }
      
      const data = await response.json()
      const children = extractChildrenFromPayload(data)
      setUserChildren(prev => ({
        ...prev,
        [userId]: children,
      }))
      setAllChildrenMap(prev => ({
        ...prev,
        [userId]: children,
      }))
    } catch (error) {
      logger.error("Error:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los niños del usuario.",
        variant: "destructive",
      })
    }
  }

  // Manejar el clic en un usuario para expandir/contraer su acordeón
  const handleAccordionChange = (userId: string) => {
    setExpandedUser(expandedUser === userId ? null : userId)
    loadUserChildren(userId)
  }

  // Manejar la selección de un usuario
  const handleSelectUser = (userId: string, userName: string) => {
    setSelectedUser(userId)
    
    // Guardar el ID y nombre del usuario seleccionado en localStorage
    localStorage.setItem("admin_selected_user_id", userId)
    localStorage.setItem("admin_selected_user_name", userName)
    
    // Disparar un evento personalizado para notificar a otros componentes
    const event = new StorageEvent("storage", {
      key: "admin_selected_user_id",
      newValue: userId,
      oldValue: null,
      storageArea: localStorage,
    })
    window.dispatchEvent(event)
    
    toast({
      title: "Usuario seleccionado",
      description: `Has seleccionado a ${userName}. Ahora podrás ver sus niños en el selector.`,
      duration: 3000,
    })
    
    // Forzar una recarga completa de la página para actualizar todos los componentes
    // Agregar un parámetro de tiempo para evitar caché
    const timestamp = new Date().getTime()
    window.location.href = `/dashboard?refresh=${timestamp}`
  }

  // Extraer apellido del nombre completo (ultima palabra)
  const getLastName = (name: string): string => {
    const parts = name.trim().split(" ")
    return parts.length > 1 ? parts[parts.length - 1] : name
  }

  // Filtrar usuarios basándose en el término de búsqueda y ordenar A-Z por apellido
  const filteredUsers = users
    .filter(user => {
      if (!searchTerm) return true
      const search = searchTerm.toLowerCase()
      const matchesUser = user.name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search)
      const children = userChildren[user._id] || allChildrenMap[user._id] || []
      const matchesChild = children.some(child =>
        `${child.firstName || ""} ${child.lastName || ""}`.toLowerCase().includes(search)
      )
      return matchesUser || matchesChild
    })
    .sort((a, b) => {
      const lastNameA = getLastName(a.name).toLowerCase()
      const lastNameB = getLastName(b.name).toLowerCase()
      return lastNameA.localeCompare(lastNameB, "es")
    })

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
        <span>Cargando usuarios...</span>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Mis Pacientes</h1>
        <p className="text-muted-foreground">Selecciona un paciente para ver y gestionar sus niños</p>
      </div>

      {users.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <p>No hay usuarios registrados en el sistema.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Lista de Pacientes</CardTitle>
            <CardDescription>Selecciona un paciente para acceder a sus niños</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Buscador de pacientes */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar paciente o niño por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {filteredUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No se encontraron pacientes que coincidan con la búsqueda.
              </p>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {filteredUsers.map(user => (
                  <AccordionItem key={user._id} value={user._id}>
                    <AccordionTrigger 
                      onClick={() => handleAccordionChange(user._id)}
                      className="px-4 hover:bg-accent/30 rounded-md"
                    >
                      <div className="flex items-center">
                        <span className="font-medium">{user.name}</span>
                        {selectedUser === user._id && (
                          <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          Seleccionado
                          </span>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4">
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">Email: {user.email}</p>
                      
                        <Button 
                          variant={selectedUser === user._id ? "secondary" : "default"} 
                          className="w-full"
                          onClick={() => handleSelectUser(user._id, user.name)}
                        >
                          {selectedUser === user._id ? "Usuario seleccionado" : "Seleccionar este usuario"}
                        </Button>
                      
                        <div className="pt-2">
                          <h4 className="text-sm font-medium mb-2">Niños registrados:</h4>
                        
                          {userChildren[user._id] ? (
                            userChildren[user._id].length > 0 ? (
                              <div className="space-y-2">
                                {userChildren[user._id].map(child => (
                                  <div 
                                    key={child._id} 
                                    className="p-3 border rounded-md flex items-center"
                                  >
                                    <span>{child.firstName} {child.lastName}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">Este usuario no tiene niños registrados.</p>
                            )
                          ) : (
                            <div className="flex items-center">
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              <span className="text-sm">Cargando niños...</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
