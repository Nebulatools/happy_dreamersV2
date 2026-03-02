// Pagina de consultas - Server component que decide por rol
// Admin: redirect al hub de paciente (consultas ahora viven ahi)
// Parent/User: renderiza la pagina client existente (los padres no usan el hub)

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import ConsultasClientPage from "./ConsultasClientPage"

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ConsultasPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions)

  // Sin sesion -> login
  if (!session?.user) {
    redirect("/auth/login")
  }

  // Admin -> redirect al hub de paciente
  if (session.user.role === "admin") {
    const params = await searchParams
    const childId = typeof params.childId === "string" ? params.childId : undefined

    if (childId) {
      // Si viene con childId, ir directo al tab de consultas del nino
      redirect(`/dashboard/paciente/${childId}?tab=consultas`)
    }

    // Sin childId, ir al listado de pacientes
    redirect("/dashboard/paciente")
  }

  // Parent/User -> renderizar pagina client normalmente
  return <ConsultasClientPage />
}
