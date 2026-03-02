// Redirect legacy: /dashboard/patients → /dashboard/paciente
// La lista de pacientes ahora vive en el hub de paciente

import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export default async function PatientsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/auth/login")
  redirect("/dashboard/paciente")
}
