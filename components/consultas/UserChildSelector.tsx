// Componente para selección jerárquica Usuario → Niño
// Optimizado para consultas rápidas del admin

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { 
  Users, 
  User, 
  Baby, 
  Search, 
  Loader2,
  ChevronRight,
  Calendar,
  Mail,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { differenceInDays } from "date-fns"

import { createLogger } from "@/lib/logger"

const logger = createLogger("UserChildSelector")


interface User {
  _id: string
  name: string
  email: string
  role: string
  createdAt?: string
}

interface Child {
  _id: string
  firstName: string
  lastName: string
  parentId: string
  birthDate?: string
  createdAt?: string
}

interface UserChildSelectorProps {
  selectedUser: User | null
  selectedChild: Child | null
  onUserSelect: (user: User) => void
  onChildSelect: (child: Child) => void
  userChildren: Child[]
  loading?: boolean
  mode?: "standalone" | "wizard"
  currentStep?: number
}

export function UserChildSelector({
  selectedUser,
  selectedChild,
  onUserSelect,
  onChildSelect,
  userChildren,
  loading = false,
  mode = "standalone",
  currentStep = 1,
}: UserChildSelectorProps) {
  const { toast } = useToast()
  
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loadingUsers, setLoadingUsers] = useState(true)


  // Cargar usuarios al iniciar
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true)
        const response = await fetch("/api/admin/users")
        
        if (!response.ok) {
          throw new Error("Error al cargar los usuarios")
        }
        
        const data = await response.json()
        const filteredUsers = data.filter((user: User) => user.role !== "admin")
        setUsers(filteredUsers)
        setFilteredUsers(filteredUsers)
      } catch (error) {
        logger.error("Error:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los usuarios.",
          variant: "destructive",
        })
      } finally {
        setLoadingUsers(false)
      }
    }
    
    fetchUsers()
  }, [toast])

  // Filtrar usuarios por búsqueda
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users)
    } else {
      const filtered = users.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredUsers(filtered)
    }
  }, [searchTerm, users])

  // Calcular edad del niño en meses
  const calculateAgeInMonths = (birthDate?: string) => {
    if (!birthDate) return null
    const age = Math.floor(differenceInDays(new Date(), new Date(birthDate)) / 30.44)
    return age
  }

  // Formatear fecha de registro
  const formatRegistrationDate = (date?: string) => {
    if (!date) return "Fecha no disponible"
    return new Date(date).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  if (loadingUsers) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2 text-gray-400" />
            <span className="text-gray-500">Cargando usuarios...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // En modo wizard, solo mostrar el paso actual
  if (mode === "wizard") {
    // Paso 1: Selección de Usuario
    if (currentStep === 1) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Seleccionar Usuario
            </CardTitle>
            <CardDescription>
              Busca y selecciona el usuario para la consulta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Lista de usuarios */}
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map(user => (
                    <Button
                      key={user._id}
                      variant="outline"
                      className={`w-full justify-start h-auto p-4 ${
                        selectedUser?._id === user._id 
                          ? "bg-blue-50 border-blue-300 hover:bg-blue-100" 
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => onUserSelect(user)}
                    >
                      <div className="flex items-start gap-3 w-full">
                        <User className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 text-left">
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-gray-700 flex items-center gap-1">
                            <Mail className="h-3 w-3 text-gray-600" />
                            {user.email}
                          </div>
                          <div className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                            <Calendar className="h-3 w-3 text-gray-500" />
                            Registro: {formatRegistrationDate(user.createdAt)}
                          </div>
                        </div>
                        {selectedUser?._id === user._id && (
                          <ChevronRight className="h-4 w-4 flex-shrink-0" />
                        )}
                      </div>
                    </Button>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="font-medium">No se encontraron usuarios</p>
                    {searchTerm && (
                      <p className="text-sm text-gray-400">Intenta con otros términos de búsqueda</p>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Usuario seleccionado */}
            {selectedUser && (
              <div className="p-3 bg-primary/10 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-xs">
                    Usuario Seleccionado
                  </Badge>
                  <span className="font-medium">{selectedUser.name}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )
    }

    // Paso 2: Selección de Niño
    if (currentStep === 2 && selectedUser) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Baby className="h-5 w-5" />
              Seleccionar Niño
            </CardTitle>
            <CardDescription>
              Elige el niño específico de {selectedUser.name} para la consulta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2 text-gray-400" />
                <span className="text-gray-500">Cargando niños...</span>
              </div>
            ) : userChildren.length > 0 ? (
              <>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {userChildren.map(child => {
                      const ageInMonths = calculateAgeInMonths(child.birthDate)
                      
                      return (
                        <Button
                          key={child._id}
                          variant="outline"
                          className={`w-full justify-start h-auto p-4 ${
                            selectedChild?._id === child._id 
                              ? "bg-green-50 border-green-300 hover:bg-green-100" 
                              : "hover:bg-gray-50"
                          }`}
                          onClick={() => onChildSelect(child)}
                        >
                          <div className="flex items-start gap-3 w-full">
                            <Baby className="h-5 w-5 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 text-left">
                              <div className="font-medium">
                                {child.firstName} {child.lastName}
                              </div>
                              {ageInMonths !== null && (
                                <div className="text-sm text-gray-700">
                                  {ageInMonths} meses de edad
                                </div>
                              )}
                              <div className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                                <Calendar className="h-3 w-3 text-gray-500" />
                                Registro: {formatRegistrationDate(child.createdAt)}
                              </div>
                            </div>
                            {selectedChild?._id === child._id && (
                              <ChevronRight className="h-4 w-4 flex-shrink-0" />
                            )}
                          </div>
                        </Button>
                      )
                    })}
                  </div>
                </ScrollArea>

                {/* Niño seleccionado */}
                {selectedChild && (
                  <div className="p-3 bg-primary/10 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="text-xs">
                        Niño Seleccionado
                      </Badge>
                      <span className="font-medium">
                        {selectedChild.firstName} {selectedChild.lastName}
                      </span>
                      {calculateAgeInMonths(selectedChild.birthDate) && (
                        <Badge variant="secondary" className="text-xs">
                          {calculateAgeInMonths(selectedChild.birthDate)} meses
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Baby className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="font-medium">Este usuario no tiene niños registrados</p>
                <p className="text-sm text-gray-400">Solicita al usuario que registre primero a su niño</p>
              </div>
            )}
          </CardContent>
        </Card>
      )
    }

    // No debería llegar aquí en modo wizard
    return null
  }

  // Modo standalone (original)
  return (
    <div className="space-y-4">
      {/* Selección de Usuario */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            1. Seleccionar Usuario
          </CardTitle>
          <CardDescription>
            Busca y selecciona el usuario para la consulta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Lista de usuarios */}
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {filteredUsers.length > 0 ? (
                filteredUsers.map(user => (
                  <Button
                    key={user._id}
                    variant="outline"
                    className={`w-full justify-start h-auto p-4 ${
                      selectedUser?._id === user._id 
                        ? "bg-blue-50 border-blue-300 hover:bg-blue-100" 
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => onUserSelect(user)}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <User className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 text-left">
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-gray-700 flex items-center gap-1">
                          <Mail className="h-3 w-3 text-gray-600" />
                          {user.email}
                        </div>
                        <div className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3 text-gray-500" />
                          Registro: {formatRegistrationDate(user.createdAt)}
                        </div>
                      </div>
                      {selectedUser?._id === user._id && (
                        <ChevronRight className="h-4 w-4 flex-shrink-0" />
                      )}
                    </div>
                  </Button>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="font-medium">No se encontraron usuarios</p>
                  {searchTerm && (
                    <p className="text-sm text-gray-400">Intenta con otros términos de búsqueda</p>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Usuario seleccionado */}
          {selectedUser && (
            <div className="p-3 bg-primary/10 rounded-lg border">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-xs">
                  Usuario Seleccionado
                </Badge>
                <span className="font-medium">{selectedUser.name}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selección de Niño */}
      {selectedUser && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Baby className="h-5 w-5" />
              2. Seleccionar Niño
            </CardTitle>
            <CardDescription>
              Elige el niño específico de {selectedUser.name} para la consulta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2 text-gray-400" />
                <span className="text-gray-500">Cargando niños...</span>
              </div>
            ) : userChildren.length > 0 ? (
              <div className="space-y-2">
                {userChildren.map(child => {
                  const ageInMonths = calculateAgeInMonths(child.birthDate)
                  
                  return (
                    <Button
                      key={child._id}
                      variant="outline"
                      className={`w-full justify-start h-auto p-4 ${
                        selectedChild?._id === child._id 
                          ? "bg-green-50 border-green-300 hover:bg-green-100" 
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => onChildSelect(child)}
                    >
                      <div className="flex items-start gap-3 w-full">
                        <Baby className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 text-left">
                          <div className="font-medium">
                            {child.firstName} {child.lastName}
                          </div>
                          {ageInMonths !== null && (
                            <div className="text-sm text-gray-700">
                              {ageInMonths} meses de edad
                            </div>
                          )}
                          <div className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                            <Calendar className="h-3 w-3 text-gray-500" />
                            Registro: {formatRegistrationDate(child.createdAt)}
                          </div>
                        </div>
                        {selectedChild?._id === child._id && (
                          <ChevronRight className="h-4 w-4 flex-shrink-0" />
                        )}
                      </div>
                    </Button>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Baby className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="font-medium">Este usuario no tiene niños registrados</p>
                <p className="text-sm text-gray-400">Solicita al usuario que registre primero a su niño</p>
              </div>
            )}

            {/* Niño seleccionado */}
            {selectedChild && (
              <div className="p-3 bg-primary/10 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-xs">
                    Niño Seleccionado
                  </Badge>
                  <span className="font-medium">
                    {selectedChild.firstName} {selectedChild.lastName}
                  </span>
                  {calculateAgeInMonths(selectedChild.birthDate) && (
                    <Badge variant="secondary" className="text-xs">
                      {calculateAgeInMonths(selectedChild.birthDate)} meses
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Resumen de selección */}
      {selectedUser && selectedChild && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-800">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="font-medium">Listo para consulta</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              Consulta para <strong>{selectedChild.firstName} {selectedChild.lastName}</strong> 
              {" "}de <strong>{selectedUser.name}</strong>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}