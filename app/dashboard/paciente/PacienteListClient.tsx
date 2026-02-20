// Lista de pacientes para el hub unificado
// Reutiliza la logica de patients/page.tsx pero navega a /dashboard/paciente/[childId]

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Search, ChevronRight, FileText } from "lucide-react"
import { useRouter } from "next/navigation"
import { createLogger } from "@/lib/logger"
import { useActiveChild } from "@/context/active-child-context"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const logger = createLogger("PacienteListClient")

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
  surveyData?: {
    completed?: boolean
    completedAt?: string
    isPartial?: boolean
  }
}

const extractChildrenFromPayload = (payload: any): Child[] => {
  if (!payload) return []
  if (Array.isArray(payload)) return payload as Child[]
  if (Array.isArray(payload.children)) return payload.children as Child[]
  if (Array.isArray(payload.data?.children)) return payload.data.children as Child[]
  if (Array.isArray(payload.data)) return payload.data as Child[]
  return []
}

export default function PacienteListClient() {
  const { toast } = useToast()
  const router = useRouter()
  const { setActiveChild } = useActiveChild()
  const [users, setUsers] = useState<User[]>([])
  const [userChildren, setUserChildren] = useState<Record<string, Child[]>>({})
  const [allChildrenMap, setAllChildrenMap] = useState<Record<string, Child[]>>({})
  const [loading, setLoading] = useState(true)
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
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

  // Precargar todos los ninos
  useEffect(() => {
    if (!users.length || childrenPrefetched) return
    const fetchAllChildren = async () => {
      try {
        const response = await fetch("/api/children")
        if (!response.ok) {
          throw new Error("Error al precargar ninos")
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
        logger.warn("No se pudieron precargar los ninos", error)
      } finally {
        setChildrenPrefetched(true)
      }
    }
    fetchAllChildren()
  }, [users.length, childrenPrefetched])

  // Cargar los ninos de un usuario cuando se expande su acordeon
  const loadUserChildren = async (userId: string) => {
    try {
      if (userChildren[userId]) return

      const response = await fetch(`/api/children?userId=${userId}`)
      if (!response.ok) {
        throw new Error("Error al cargar los ninos del usuario")
      }

      const data = await response.json()
      const children = extractChildrenFromPayload(data)
      setUserChildren(prev => ({ ...prev, [userId]: children }))
      setAllChildrenMap(prev => ({ ...prev, [userId]: children }))
    } catch (error) {
      logger.error("Error:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los ninos del usuario.",
        variant: "destructive",
      })
    }
  }

  const handleAccordionChange = (userId: string) => {
    setExpandedUser(expandedUser === userId ? null : userId)
    loadUserChildren(userId)
  }

  // Al hacer clic en un nino: setActiveChild + navegar al hub
  const handleChildClick = (child: Child, userName: string) => {
    setActiveChild(child._id, child.parentId, userName)
    router.push(`/dashboard/paciente/${child._id}`)
  }

  // Extraer apellido del nombre completo
  const getLastName = (name: string): string => {
    const parts = name.trim().split(" ")
    return parts.length > 1 ? parts[parts.length - 1] : name
  }

  // Filtrar y ordenar usuarios
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
        <p className="text-muted-foreground">Selecciona un paciente para ver su hub completo</p>
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
            <CardDescription>Selecciona un nino para acceder a su hub</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Buscador de pacientes */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar paciente o nino por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {filteredUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No se encontraron pacientes que coincidan con la busqueda.
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
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4">
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">Email: {user.email}</p>

                        <div className="pt-2">
                          <h4 className="text-sm font-medium mb-2">Ninos registrados:</h4>

                          {userChildren[user._id] ? (
                            userChildren[user._id].length > 0 ? (
                              <div className="space-y-2">
                                {userChildren[user._id].map(child => {
                                  const surveyCompleted = child.surveyData?.completed === true ||
                                    (!!child.surveyData?.completedAt && child.surveyData?.isPartial !== true)

                                  return (
                                    <button
                                      key={child._id}
                                      onClick={() => handleChildClick(child, user.name)}
                                      className="block w-full text-left"
                                    >
                                      <div className="p-3 border rounded-md flex items-center justify-between hover:bg-accent/50 hover:border-primary/30 transition-colors cursor-pointer group">
                                        <div className="flex items-center gap-3">
                                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                                            {child.firstName?.charAt(0)?.toUpperCase() || "?"}
                                          </div>
                                          <span className="font-medium">{child.firstName} {child.lastName}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {surveyCompleted ? (
                                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                              <FileText className="h-3 w-3 mr-1" />
                                              Encuesta completada
                                            </Badge>
                                          ) : child.surveyData ? (
                                            <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                                              <FileText className="h-3 w-3 mr-1" />
                                              Encuesta en progreso
                                            </Badge>
                                          ) : (
                                            <Badge variant="outline" className="text-muted-foreground">
                                              <FileText className="h-3 w-3 mr-1" />
                                              Sin encuesta
                                            </Badge>
                                          )}
                                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                        </div>
                                      </div>
                                    </button>
                                  )
                                })}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">Este usuario no tiene ninos registrados.</p>
                            )
                          ) : (
                            <div className="flex items-center">
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              <span className="text-sm">Cargando ninos...</span>
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
