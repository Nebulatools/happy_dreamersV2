// Pagina de diagnosticos (solo para administradores)
// Server component: verifica auth y rol, redirige no-admins a /dashboard
// Delega logica de redireccion por nino activo al client component

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import DiagnosticosClient from "./DiagnosticosClient"

export default async function DiagnosticosPage() {
  const session = await getServerSession(authOptions)

  // Sin sesion -> login
  if (!session?.user) {
    redirect("/auth/login")
  }

  // No-admin -> dashboard (sin error, redirect limpio)
  if (session.user.role !== "admin") {
    redirect("/dashboard")
  }

  // Admin -> renderizar cliente con logica de redireccion por nino activo
  return <DiagnosticosClient />
}
