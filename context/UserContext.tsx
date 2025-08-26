"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useSession } from "next-auth/react"
import { useToast } from "@/hooks/use-toast"
import { createLogger } from "@/lib/logger"

const logger = createLogger("UserContext")

interface UserData {
  name: string
  email: string
  phone: string
  role: string
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
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (session?.user) {
      const sessionData = {
        name: session.user.name || "",
        email: session.user.email || "",
        phone: (session.user as any).phone || "",
        role: session.user.role || "user",
      }
      
      logger.info("Loading user data from session", sessionData)
      setUserData(sessionData)
      
      // Load fresh data from API
      refreshUserData()
    }
  }, [session])

  const refreshUserData = async () => {
    try {
      logger.info("Refreshing user data from API...")
      const response = await fetch("/api/user/profile", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const result = await response.json()
        logger.info("API response received", result)
        
        if (result.success && result.data) {
          logger.info("Updating user data from API", result.data)
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
      logger.info("Updating profile", data)

      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()
      logger.info("Profile update API response", result)

      if (!response.ok) {
        throw new Error(result.error || "Error al actualizar el perfil")
      }

      // Update local state
      setUserData(prev => ({ ...prev, ...data }))

      // Update session
      logger.info("Updating session after profile save")
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
      logger.info("Changing password")

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
      logger.info("Password change API response", result)

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
