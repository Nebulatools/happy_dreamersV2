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

  // Cargar niños de un usuario cuando se expande
  const loadUserChildren = async (userId: string) => {
    if (userChildren[userId]) return // Ya cargados
    
    try {
      setLoadingChildren(userId)
      const response = await fetch(`/api/children?userId=${userId}`)
      
      if (!response.ok) {
        throw new Error("Error al cargar los niños")
      }
      
      const data = await response.json()
      setUserChildren(prev => ({
        ...prev,
        [userId]: Array.isArray(data) ? data : (data?.children || data?.data?.children || [])
      }))
    } catch (error) {
      logger.error("Error:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los niños del usuario.",
        variant: "destructive",
      })
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
    setActiveUserId(user._id)
    setActiveUserName(user.name)
    setActiveChildId(null) // Limpiar selección de niño
    
    // Cargar niños del usuario
    await loadUserChildren(user._id)
    
    // Si el usuario solo tiene un niño, seleccionarlo automáticamente
    const children = userChildren[user._id] || []
    if (children.length === 1) {
      handleChildSelect(children[0])
    }
    
    // Notificar cambio
    onSelectionChange?.(user._id, null)
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

  // Formatear edad del niño
  const getChildAge = (birthDate?: string) => {
    if (!birthDate) return ""
    
    const birth = new Date(birthDate)
    const today = new Date()
    const monthsDiff = (today.getFullYear() - birth.getFullYear()) * 12 + 
                      (today.getMonth() - birth.getMonth())
    
    if (monthsDiff < 12) {
      return `${monthsDiff} meses`
    } else {
      const years = Math.floor(monthsDiff / 12)
      const months = monthsDiff % 12
      return months > 0 ? `${years} años ${months} meses` : `${years} años`
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
            "justify-between min-w-[200px]",
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
            <span className="flex items-center">
              <ChildAvatar 
                name={`${activeChild.firstName} ${activeChild.lastName}`}
                className="mr-2 h-5 w-5"
              />
              <span className="truncate">
                {activeChild.firstName} - {activeUserName}
              </span>
            </span>
          ) : activeUserId && !activeChild ? (
            <span className="flex items-center">
              <User className="mr-2 h-4 w-4" />
              <span className="truncate">{activeUserName} - Seleccionar niño</span>
            </span>
          ) : (
            <span className="flex items-center">
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