// Componente que proporciona el contexto de autenticación a toda la aplicación
// Utiliza NextAuth para gestionar la sesión del usuario

"use client"

import type React from "react"

import { SessionProvider } from "next-auth/react"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
