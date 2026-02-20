// Redirect legacy: /dashboard/patients/child/[childId] → /dashboard/paciente/[childId]
// El detalle de nino ahora vive en el hub de paciente

import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

interface PageProps {
  params: Promise<{ childId: string }>
}

export default async function AdminChildDetailPage({ params }: PageProps) {
  const { childId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/auth/login")
  redirect(`/dashboard/paciente/${childId}`)
}
