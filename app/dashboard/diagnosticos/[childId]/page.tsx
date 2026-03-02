// Redirect legacy: /dashboard/diagnosticos/[childId] → /dashboard/paciente/[childId]?tab=diagnostico
// Los diagnosticos ahora viven dentro del hub de paciente

import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

interface PageProps {
  params: Promise<{ childId: string }>
}

export default async function DiagnosticChildPage({ params }: PageProps) {
  const { childId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/auth/login")
  redirect(`/dashboard/paciente/${childId}?tab=diagnostico`)
}
