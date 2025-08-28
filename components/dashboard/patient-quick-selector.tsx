// Selector rápido de paciente → niño con búsqueda integrada
// Diseño moderno tipo combobox para administradores

"use client"

import { useState, useEffect, useMemo } from "react"
import { Check, ChevronsUpDown, Search, User, Baby, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useActiveChild } from "@/context/active-child-context"
import { ChildAvatar } from "@/components/ui/child-avatar"
import { createLogger } from "@/lib/logger"

const logger = createLogger("patient-quick-selector")

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
  birthDate?: string
}

interface PatientQuickSelectorProps {
  className?: string
  onSelectionChange?: (userId: string | null, childId: string | null) => void
}

export function PatientQuickSelector({ 
  className,
  onSelectionChange 
}: PatientQuickSelectorProps) {
  const [open, setOpen] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [userChildren, setUserChildren] = useState<Record<string, Child[]>>({})
  const [loading, setLoading] = useState(true)
  const [loadingChildren, setLoadingChildren] = useState<string | null>(null)
  const [searchValue, setSearchValue] = useState("")
  
  const { toast } = useToast()
  const { 
    activeUserId, 
    setActiveUserId, 
    activeUserName,
    setActiveUserName,
    activeChildId,
    setActiveChildId,
    clearSelection
  } = useActiveChild()

  // Cargar usuarios al iniciar
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/admin/users")
        
        if (!response.ok) {
          throw new Error("Error al cargar los usuarios")
        }
        
        const data = await response.json()
        const filteredUsers = data.filter((user: User) => user.role !== "admin")
        setUsers(filteredUsers)
      } catch (error) {
        logger.error("Error:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los usuarios.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    
    fetchUsers()
  }, [toast])

  // ✅ NUEVO: Cargar niños del usuario activo al inicializar (para refresh)
  useEffect(() => {
    if (activeUserId && users.length > 0) {
      logger.info(`Inicializando: cargando niños para usuario ${activeUserId}`)
      loadUserChildren(activeUserId)
    }
  }, [activeUserId, users.length])

  // Cargar niños de un usuario cuando se expande
  const loadUserChildren = async (userId: string): Promise<Child[]> => {
    if (userChildren[userId]) return userChildren[userId] // Ya cargados
    
    try {
      setLoadingChildren(userId)
      const response = await fetch(`/api/children?userId=${userId}`)
      
      if (!response.ok) {
        throw new Error("Error al cargar los niños")
      }
      
      const data = await response.json()
      const children = Array.isArray(data) ? data : (data?.children || data?.data?.children || [])
      
      setUserChildren(prev => ({
        ...prev,
        [userId]: children
      }))
      
      return children
    } catch (error) {
      logger.error("Error:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los niños del usuario.",
        variant: "destructive",
      })
      return []
    } finally {
      setLoadingChildren(null)
    }
  }

  // Filtrar usuarios basado en búsqueda
  const filteredUsers = useMemo(() => {
    if (!searchValue) return users
    
    const search = searchValue.toLowerCase()
    return users.filter(user => 
      user.name.toLowerCase().includes(search) ||
      user.email.toLowerCase().includes(search)
    )
  }, [users, searchValue])

  // Obtener información del niño activo
  const getActiveChild = () => {
    if (!activeChildId || !activeUserId) return null
    
    const children = userChildren[activeUserId] || []
    return children.find(child => child._id === activeChildId)
  }

  // Manejar selección de usuario
  const handleUserSelect = async (user: User) => {
    logger.info(`Admin seleccionando usuario: ${user.name} (${user._id})`)
    logger.info(`ActiveChildId anterior: ${activeChildId}`)
    
    setActiveUserId(user._id)
    setActiveUserName(user.name)
    setActiveChildId(null) // Limpiar selección de niño
    
    logger.info('ActiveChildId limpiado a null')
    
    // ✅ NOTIFICAR INMEDIATAMENTE que se limpió la selección
    onSelectionChange?.(user._id, null)
    
    // Cargar niños del usuario
    const children = await loadUserChildren(user._id)
    
    logger.info(`Niños cargados para ${user.name}: ${children.length}`)
    
    // Si hay un solo niño, seleccionarlo automáticamente
    if (children.length === 1) {
      logger.info(`Auto-seleccionando único niño: ${children[0].firstName}`)
      handleChildSelect(children[0])
    }
  }

  // Manejar selección de niño
  const handleChildSelect = (child: Child) => {
    setActiveChildId(child._id)
    setOpen(false)
    
    // Notificar cambio
    onSelectionChange?.(activeUserId, child._id)
    
    toast({
      title: "Selección actualizada",
      description: `${child.firstName} ${child.lastName} seleccionado`,
    })
  }

  // Formatear edad del niño (formato compacto)
  const getChildAge = (birthDate?: string) => {
    if (!birthDate) return ""
    
    try {
      const birth = new Date(birthDate)
      const today = new Date()
      const diffTime = today.getTime() - birth.getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays < 30) {
        return `${diffDays}d`
      } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30)
        return `${months}m`
      } else {
        const years = Math.floor(diffDays / 365)
        const remainingMonths = Math.floor((diffDays % 365) / 30)
        return remainingMonths > 0 ? `${years}a ${remainingMonths}m` : `${years}a`
      }
    } catch (error) {
      return ""
    }
  }

  const activeChild = getActiveChild()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "justify-between min-w-[200px] bg-[#DEF1F1] hover:bg-[#c8e3e3] border-0",
            !activeUserId && "text-muted-foreground",
            className
          )}
        >
          {loading ? (
            <span className="flex items-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Cargando...
            </span>
          ) : activeUserId && activeChild ? (
            <span className="flex items-center" style={{ color: '#68A1C8' }}>
              <ChildAvatar 
                name={`${activeChild.firstName} ${activeChild.lastName}`}
                className="mr-2 h-5 w-5"
              />
              <div className="flex flex-col items-start truncate">
                <span className="truncate text-sm">
                  {activeChild.firstName} - {activeUserName}
                </span>
                {activeChild.birthDate && (
                  <span className="text-xs" style={{ color: '#68A1C8', opacity: 0.8 }}>
                    {getChildAge(activeChild.birthDate)}
                  </span>
                )}
              </div>
            </span>
          ) : activeUserId && !activeChild ? (
            <span className="flex items-center" style={{ color: '#68A1C8' }}>
              <User className="mr-2 h-4 w-4" />
              <span className="truncate">{activeUserName} - Seleccionar niño</span>
            </span>
          ) : (
            <span className="flex items-center" style={{ color: '#68A1C8' }}>
              <User className="mr-2 h-4 w-4" />
              Seleccionar paciente
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Buscar paciente por nombre o email..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>No se encontraron pacientes.</CommandEmpty>
            
            {activeUserId && (
              <>
                <CommandGroup heading="Selección actual">
                  <CommandItem
                    onSelect={() => {
                      clearSelection()
                      setOpen(false)
                      onSelectionChange?.(null, null)
                    }}
                    className="text-sm"
                  >
                    Limpiar selección
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
              </>
            )}
            
            <CommandGroup heading="Pacientes">
              {filteredUsers.map((user) => {
                const isExpanded = activeUserId === user._id
                const children = userChildren[user._id] || []
                const isLoadingUser = loadingChildren === user._id
                
                return (
                  <div key={user._id}>
                    <CommandItem
                      value={user.name}
                      onSelect={() => handleUserSelect(user)}
                      className={cn(
                        "flex items-center justify-between",
                        isExpanded && "bg-accent"
                      )}
                    >
                      <div className="flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                      {isExpanded && (
                        <Check className="h-4 w-4" />
                      )}
                    </CommandItem>
                    
                    {/* Mostrar niños si el usuario está expandido */}
                    {isExpanded && (
                      <div className="ml-6 border-l pl-2">
                        {isLoadingUser ? (
                          <div className="py-2 px-2 text-sm text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin inline mr-2" />
                            Cargando niños...
                          </div>
                        ) : children.length > 0 ? (
                          children.map(child => (
                            <CommandItem
                              key={child._id}
                              value={`${child.firstName} ${child.lastName}`}
                              onSelect={() => handleChildSelect(child)}
                              className="py-2"
                            >
                              <Baby className="mr-2 h-3 w-3" />
                              <div className="flex-1">
                                <div className="font-medium text-sm">
                                  {child.firstName} {child.lastName}
                                </div>
                                {child.birthDate && (
                                  <div className="text-xs text-muted-foreground">
                                    {getChildAge(child.birthDate)}
                                  </div>
                                )}
                              </div>
                              {activeChildId === child._id && (
                                <Check className="h-3 w-3" />
                              )}
                            </CommandItem>
                          ))
                        ) : (
                          <div className="py-2 px-2 text-sm text-muted-foreground">
                            Sin niños registrados
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}