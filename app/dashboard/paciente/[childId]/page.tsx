// Hub unificado del paciente - Server component con auth guard
// Fetch datos basicos del nino y renderiza PatientHubClient

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import PatientHubClient from "./PatientHubClient"

interface PageProps {
  params: Promise<{ childId: string }>
}

export default async function PatientHubPage({ params }: PageProps) {
  const { childId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/auth/login")
  if (session.user.role !== "admin") redirect("/dashboard")

  // Fetch datos basicos del nino
  let childData = null
  try {
    const { db } = await connectToDatabase()
    const child = await db.collection("children").findOne(
      { _id: new ObjectId(childId) },
      { projection: { firstName: 1, lastName: 1, birthDate: 1, parentId: 1 } }
    )
    if (child) {
      childData = {
        firstName: child.firstName || "",
        lastName: child.lastName || "",
        birthDate: child.birthDate || "",
        parentId: child.parentId?.toString() || "",
      }
    }
  } catch (error) {
    console.error("Error fetching child data:", error)
  }

  if (!childData) {
    redirect("/dashboard/paciente")
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <PatientHubClient childId={childId} childData={childData} />
    </Suspense>
  )
}
