// Redirect legacy: /dashboard/diagnosticos → /dashboard/paciente
// Los diagnosticos ahora viven dentro del hub de paciente

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function DiagnosticosPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/auth/login")
  if (session.user.role !== "admin") redirect("/dashboard")
  redirect("/dashboard/paciente")
}
