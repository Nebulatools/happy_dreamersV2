// Redirect legacy: /dashboard/patients/[id] → /dashboard/paciente/[id]
// El detalle de paciente ahora vive en el hub de paciente

import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PatientDetailPage({ params }: PageProps) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/auth/login")
  redirect(`/dashboard/paciente/${id}`)
}
