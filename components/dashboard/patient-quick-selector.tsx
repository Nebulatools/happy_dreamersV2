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

const extractChildrenFromPayload = (payload: any): Child[] => {
  if (!payload) return []
  if (Array.isArray(payload)) return payload as Child[]
  if (Array.isArray(payload.children)) return payload.children as Child[]
  if (Array.isArray(payload.data?.children)) return payload.data.children as Child[]
  if (Array.isArray(payload.data)) return payload.data as Child[]
  return []
}

export function PatientQuickSelector({ 
  className,
  onSelectionChange 
}: PatientQuickSelectorProps) {
  const [open, setOpen] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [userChildren, setUserChildren] = useState<Record<string, Child[]>>({})
  const [globalChildrenMap, setGlobalChildrenMap] = useState<Record<string, Child[]>>({})
  const [loading, setLoading] = useState(true)
  const [loadingChildren, setLoadingChildren] = useState<string | null>(null)
  const [searchValue, setSearchValue] = useState("")
  const [childrenPrefetched, setChildrenPrefetched] = useState(false)
  
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

  // Precargar niños para habilitar búsqueda por nombre del niño
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
          setGlobalChildrenMap(grouped)
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
      const children = extractChildrenFromPayload(data)
      
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
  useEffect(() => {
    if (!open) {
      setSearchValue("")
    }
  }, [open])

  const filteredUsers = useMemo(() => {
    const search = searchValue.trim().toLowerCase()
    if (!search) return users
    
    const matches = (value?: string) => value?.toLowerCase().includes(search)
    
    return users.filter(user => {
      const matchesUser = matches(user.name) || matches(user.email)
      const children = userChildren[user._id] || globalChildrenMap[user._id] || []
      const matchesChild = children.some(child => 
        `${child.firstName || ''} ${child.lastName || ''}`.toLowerCase().includes(search)
      )
      return matchesUser || matchesChild
    })
  }, [users, searchValue, userChildren, globalChildrenMap])

  const childSearchResults = useMemo(() => {
    const search = searchValue.trim().toLowerCase()
    if (!search) return []
    const mergedEntries = Object.entries({ ...globalChildrenMap, ...userChildren })
    const results: Array<{ child: Child; parentId: string }> = []
    const seen = new Set<string>()
    mergedEntries.forEach(([parentId, kids]) => {
      kids?.forEach(child => {
        if (!child?._id || seen.has(child._id)) return
        const fullName = `${child.firstName || ''} ${child.lastName || ''}`.trim().toLowerCase()
        if (fullName.includes(search)) {
          results.push({ child, parentId })
        }
        seen.add(child._id)
      })
    })
    return results.slice(0, 10)
  }, [searchValue, globalChildrenMap, userChildren])

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
    setSearchValue("")
    
    logger.info('ActiveChildId limpiado a null')
    
    // ✅ NOTIFICAR INMEDIATAMENTE que se limpió la selección
    onSelectionChange?.(user._id, null)
    
    // Cargar niños del usuario
    const children = await loadUserChildren(user._id)
    
    logger.info(`Niños cargados para ${user.name}: ${children.length}`)
    
    // Si hay un solo niño, seleccionarlo automáticamente
    if (children.length === 1) {
      logger.info(`Auto-seleccionando único niño: ${children[0].firstName}`)
      handleChildSelect(children[0], user._id, user.name)
    }
  }

  // Manejar selección de niño
  const handleChildSelect = (child: Child, userIdOverride?: string, userNameOverride?: string) => {
    const resolvedUserId = userIdOverride ?? activeUserId ?? child.parentId ?? null
    if (resolvedUserId && resolvedUserId !== activeUserId) {
      setActiveUserId(resolvedUserId)
    }
    if (userNameOverride && userNameOverride !== activeUserName) {
      setActiveUserName(userNameOverride)
    }
    setActiveChildId(child._id)
    setOpen(false)
    
    // Notificar cambio
    onSelectionChange?.(resolvedUserId ?? null, child._id)
    
    toast({
      title: "Selección actualizada",
      description: `${child.firstName} ${child.lastName} seleccionado`,
    })
    setSearchValue("")
  }

  const handleQuickChildSelect = async (child: Child, parentId: string) => {
    const parentUser = users.find(user => user._id === parentId)
    if (parentUser) {
      setActiveUserId(parentUser._id)
      setActiveUserName(parentUser.name)
    } else {
      setActiveUserId(parentId)
    }
    
    if (!userChildren[parentId]) {
      await loadUserChildren(parentId)
    }
    
    handleChildSelect(child, parentId, parentUser?.name)
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
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Buscar paciente o niño por nombre o email..." 
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
            
            {childSearchResults.length > 0 && (
              <>
                <CommandGroup heading="Niños">
                  {childSearchResults.map(({ child, parentId }) => {
                    const parentUser = users.find(user => user._id === parentId)
                    return (
                      <CommandItem
                        key={child._id}
                        onSelect={() => handleQuickChildSelect(child, parentId)}
                        className="flex items-center gap-2 py-2"
                      >
                        <Baby className="h-4 w-4 text-slate-500" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            {child.firstName} {child.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {parentUser ? parentUser.name : "Tutor"}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {child.birthDate ? getChildAge(child.birthDate) : ""}
                        </span>
                      </CommandItem>
                    )
                  })}
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
