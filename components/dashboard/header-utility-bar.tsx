// Barra de utilidades derecha del header
// Siempre muestra: Search, BugCenter, Bell, Avatar+nombre
// Consistente en TODAS las paginas admin

"use client"

import Link from "next/link"
import { useMemo } from "react"
import { signOut, useSession } from "next-auth/react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { Search, Baby, Loader2, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserAvatar } from "@/components/ui/user-avatar"
import { BugCenter } from "@/components/support/BugCenter"
import { Icons } from "@/components/icons"
import { useNotifications } from "@/hooks/use-notifications"
import { useAdminSearch, type ChildResult } from "@/hooks/use-admin-search"
import { createLogger } from "@/lib/logger"

const logger = createLogger("header-utility-bar")

export function HeaderUtilityBar() {
  const { data: session } = useSession()
  const sessionUser = session?.user

  // Hooks compartidos
  const {
    notificationCount,
    notifications,
    notificationsOpen,
    setNotificationsOpen,
    notificationsLoading,
  } = useNotifications()

  const {
    isAdmin,
    searchOpen,
    setSearchOpen,
    searchValue,
    setSearchValue,
    searchResults,
    searchLoading,
    handleSelectChild,
  } = useAdminSearch()

  const accountType = (sessionUser as any)?.accountType || ""
  const userFirstName = useMemo(() => {
    if (!sessionUser?.name) return "Perfil"
    const [firstChunk] = sessionUser.name.split(" ")
    return firstChunk || "Perfil"
  }, [sessionUser?.name])

  const roleLabel = useMemo(() => {
    if (sessionUser?.role === "admin") return "Admin"
    if (sessionUser?.role === "professional") return "Coach"
    if (accountType === "mother") return "Mama"
    if (accountType === "father") return "Papa"
    if (accountType === "caregiver") return "Cuidador"
    return "Perfil"
  }, [sessionUser?.role, accountType])

  const handleSignOut = async () => {
    if (localStorage.getItem("admin_selected_user_id")) {
      localStorage.removeItem("admin_selected_user_id")
      localStorage.removeItem("admin_selected_user_name")
    }
    try {
      await signOut({ redirect: false })
      window.location.href = "/"
    } catch (error) {
      logger.error("Error al cerrar sesion:", error)
      window.location.href = "/"
    }
  }

  // -- Search Popover (solo admin) --
  const searchButton = isAdmin ? (
    <Popover open={searchOpen} onOpenChange={setSearchOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full bg-white/70 backdrop-blur hover:bg-white transition-colors shrink-0"
          aria-label="Buscar paciente"
        >
          <Search className="h-[18px] w-[18px] text-[#2553A1]" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="end">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar nino o padre..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            {searchLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Cargando...</span>
              </div>
            ) : searchValue.trim() === "" ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Escribe para buscar...
              </div>
            ) : searchResults.length === 0 ? (
              <CommandEmpty>No se encontraron resultados.</CommandEmpty>
            ) : (
              <CommandGroup heading="Ninos">
                {searchResults.map((result) => (
                  <CommandItem
                    key={`child-${result.child._id}`}
                    value={`${result.child.firstName} ${result.child.lastName}`}
                    onSelect={() => handleSelectChild(result.child)}
                    className="flex items-center gap-3 py-2"
                  >
                    <Baby className="h-4 w-4 text-[#68A1C8]" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {result.child.firstName} {result.child.lastName}
                      </div>
                      {result.parentName && (
                        <div className="text-xs text-muted-foreground">
                          Padre: {result.parentName}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  ) : null

  // -- BugCenter --
  const bugButton = <BugCenter />

  // -- Notification Bell --
  const notificationButton = (
    <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="relative p-2 min-h-[44px] min-w-[44px] h-auto w-auto flex items-center justify-center rounded-full bg-white/70 backdrop-blur hover:bg-white"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-[18px] w-[15.75px] text-[#2553A1]"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
          </svg>
          {notificationCount > 0 && (
            <div className="absolute top-1 right-1 h-4 w-4 bg-[#DF3F40] rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-medium leading-none">{notificationCount}</span>
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-4 border-b">
          <h3 className="text-sm font-medium text-[#1F2937]">Notificaciones</h3>
          <p className="text-xs text-muted-foreground mt-1">Ultimas solicitudes y avisos</p>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notificationsLoading ? (
            <div className="flex items-center justify-center py-6">
              <Icons.spinner className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No hay notificaciones nuevas
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const createdAt = notification?.createdAt ? new Date(notification.createdAt) : null
                const isZoomTranscript = notification.type === "zoom_transcript"

                return (
                  <div
                    key={notification._id || notification.title}
                    className="p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      if (isZoomTranscript && notification.childId) {
                        setNotificationsOpen(false)
                        window.location.href = `/dashboard/paciente/${notification.childId}?tab=consultas`
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {isZoomTranscript ? (
                          <Video className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Icons.bell className="h-4 w-4 text-[#68A1C8]" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[#1F2937]">
                          {notification.title || "Nueva notificacion"}
                        </p>
                        {notification.message && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                        )}
                        {createdAt && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDistanceToNow(createdAt, { addSuffix: true, locale: es })}
                          </p>
                        )}
                      </div>
                      {notification.status !== "read" && (
                        <span className="inline-flex h-2 w-2 rounded-full bg-[#68A1C8] mt-2" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )

  // -- Profile Menu --
  const profileMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="group flex items-center gap-3 rounded-full border border-white/50 bg-white/80 px-2.5 py-1 pr-3 text-left shadow-sm ring-1 ring-white/40 transition hover:bg-white hover:shadow-md"
          aria-label="Abrir menu de perfil"
        >
          <UserAvatar
            name={sessionUser?.name}
            image={sessionUser?.image}
            className="h-9 w-9 ring-2 ring-white/80 shadow-sm"
            fallbackClassName="bg-[#2553A1]"
          />
          <div className="hidden sm:flex flex-col leading-tight text-[#1F2937]">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#628BE6]">{roleLabel}</span>
            <span className="text-sm font-semibold">{userFirstName}</span>
          </div>
          <Icons.chevronDown className="h-4 w-4 text-[#2553A1] transition group-hover:translate-y-0.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/profile">Perfil</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/configuracion">Configuracion</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>Cerrar sesion</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div className="flex items-center gap-2">
      {searchButton}
      {bugButton}
      {notificationButton}
      {profileMenu}
    </div>
  )
}
