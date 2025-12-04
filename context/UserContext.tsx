"use client"

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react"
import { useSession } from "next-auth/react"
import { useToast } from "@/hooks/use-toast"
import { createLogger } from "@/lib/logger"
import { detectBrowserTimezone, DEFAULT_TIMEZONE } from "@/lib/datetime"

const logger = createLogger("UserContext")

interface UserData {
  name: string
  email: string
  phone: string
  role: string
  accountType: "father" | "mother" | "caregiver" | "" | undefined
  timezone: string
}

interface UserContextType {
  userData: UserData
  isLoading: boolean
  updateProfile: (data: Partial<UserData>) => Promise<boolean>
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>
  refreshUserData: () => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const { data: session, update: updateSession } = useSession()
  const { toast } = useToast()
  const [userData, setUserData] = useState<UserData>({
    name: "",
    email: "",
    phone: "",
    role: "user",
    accountType: "",
    timezone: DEFAULT_TIMEZONE,
  })
  const [isLoading, setIsLoading] = useState(false)
  const hasCheckedTimezone = useRef(false)

  // Detectar y guardar timezone automaticamente si el usuario no tiene una
  const autoDetectAndSaveTimezone = async (currentTimezone: string | undefined) => {
    // Solo ejecutar una vez por sesion
    if (hasCheckedTimezone.current) return
    hasCheckedTimezone.current = true

    // Si el usuario ya tiene timezone configurada, no hacer nada
    if (currentTimezone && currentTimezone !== DEFAULT_TIMEZONE) {
      return
    }

    // Detectar timezone del navegador
    const detectedTimezone = detectBrowserTimezone()
    logger.info("Timezone detectada:", detectedTimezone)

    // Si la detectada es diferente al default, guardarla automaticamente
    if (detectedTimezone !== DEFAULT_TIMEZONE && detectedTimezone !== currentTimezone) {
      try {
        const response = await fetch("/api/user/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ timezone: detectedTimezone }),
        })

        if (response.ok) {
          setUserData(prev => ({ ...prev, timezone: detectedTimezone }))
        }
      } catch (error) {
        logger.error("Error guardando timezone:", error)
      }
    }
  }

  useEffect(() => {
    if (session?.user) {
      const sessionTimezone = session.user.timezone || DEFAULT_TIMEZONE
      const sessionData = {
        name: session.user.name || "",
        email: session.user.email || "",
        phone: session.user.phone || "",
        role: session.user.role || "user",
        accountType: session.user.accountType || "",
        timezone: sessionTimezone,
      }

      setUserData(sessionData)

      // Load fresh data from API
      refreshUserData()

      // Detectar timezone automaticamente si es necesario
      autoDetectAndSaveTimezone(sessionTimezone)
    }
  }, [session])

  const refreshUserData = async () => {
    try {
      const response = await fetch("/api/user/profile", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setUserData(result.data)
        }
      }
    } catch (error) {
      logger.error("Error refreshing user data", error)
    }
  }

  const updateProfile = async (data: Partial<UserData>): Promise<boolean> => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Error al actualizar el perfil")
      }

      // Update local state
      setUserData(prev => ({ ...prev, ...data }))

      // Update session
      await updateSession({
        ...session,
        user: {
          ...session?.user,
          ...data,
        },
      })

      // Refresh data from API to ensure consistency
      await refreshUserData()

      toast({
        title: "Perfil actualizado",
        description: result.message || "Tu información ha sido actualizada correctamente",
      })

      return true
    } catch (error) {
      logger.error("Error updating profile", error)
      const errorMessage = error instanceof Error ? error.message : "No se pudo actualizar el perfil"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/user/change-password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Error al cambiar la contraseña")
      }

      toast({
        title: "Contraseña actualizada",
        description: result.message || "Tu contraseña ha sido cambiada correctamente",
      })

      return true
    } catch (error) {
      logger.error("Error changing password", error)
      const errorMessage = error instanceof Error ? error.message : "No se pudo cambiar la contraseña"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const value: UserContextType = {
    userData,
    isLoading,
    updateProfile,
    changePassword,
    refreshUserData,
  }

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}
