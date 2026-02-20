// Pagina de lista de pacientes (solo admin)
// Server component con auth guard

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import PacienteListClient from "./PacienteListClient"

export default async function PacientePage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/auth/login")
  if (session.user.role !== "admin") redirect("/dashboard")

  return <PacienteListClient />
}
