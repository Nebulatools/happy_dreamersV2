"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useUser } from "@/context/UserContext"

interface ProfileCompletionGuardProps {
  enforceForRoles?: string[]
}

export function ProfileCompletionGuard({ enforceForRoles = ["parent", "professional"] }: ProfileCompletionGuardProps) {
  const { userData, isLoading } = useUser()
  const router = useRouter()
  const pathname = usePathname()

  const requiresEnforcement = enforceForRoles.includes(userData.role)
  const isProfileRoute = pathname?.startsWith("/dashboard/profile")
  const missingPhone = !userData.phone || userData.phone.trim().length === 0
  const missingAccountType = !userData.accountType || userData.accountType === ""

  useEffect(() => {
    if (isLoading || !requiresEnforcement) return

    if ((missingPhone || missingAccountType) && !isProfileRoute) {
      router.replace("/dashboard/profile?completeProfile=1")
    }
  }, [
    isLoading,
    requiresEnforcement,
    missingPhone,
    missingAccountType,
    isProfileRoute,
    router,
  ])

  return null
}
