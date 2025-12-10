// Pagina de detalle de un nino para el administrador
// Muestra informacion del nino y permite ver/editar encuestas

import { redirect, notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import Link from "next/link"
import { ArrowLeft, Calendar, User, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AdminChildDetailClient } from "./AdminChildDetailClient"

interface PageProps {
  params: Promise<{ childId: string }>
}

// Calcular edad en anos y meses
function calculateAge(birthDate: string): string {
  const birth = new Date(birthDate)
  const today = new Date()

  let years = today.getFullYear() - birth.getFullYear()
  let months = today.getMonth() - birth.getMonth()

  if (months < 0) {
    years--
    months += 12
  }

  if (today.getDate() < birth.getDate()) {
    months--
    if (months < 0) {
      years--
      months += 12
    }
  }

  if (years === 0) {
    return `${months} ${months === 1 ? "mes" : "meses"}`
  }

  if (months === 0) {
    return `${years} ${years === 1 ? "ano" : "anos"}`
  }

  return `${years} ${years === 1 ? "ano" : "anos"} y ${months} ${months === 1 ? "mes" : "meses"}`
}

// Formatear fecha
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

async function getChildWithParent(childId: string) {
  const { db } = await connectToDatabase()

  // Obtener nino con datos del padre
  const child = await db.collection("children").aggregate([
    { $match: { _id: new ObjectId(childId) } },
    {
      $lookup: {
        from: "users",
        localField: "parentId",
        foreignField: "_id",
        as: "parent",
      },
    },
    { $unwind: { path: "$parent", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        firstName: 1,
        lastName: 1,
        birthDate: 1,
        surveyData: 1,
        currentSleepState: 1,
        activePlan: 1,
        createdAt: 1,
        updatedAt: 1,
        parentId: 1,
        "parent.name": 1,
        "parent.email": 1,
      },
    },
  ]).toArray()

  if (!child.length) {
    return null
  }

  return child[0]
}

export default async function AdminChildDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions)

  // Verificar autenticacion
  if (!session || !session.user) {
    redirect("/auth/login")
  }

  // Verificar rol de admin
  if (session.user.role !== "admin") {
    redirect("/dashboard")
  }

  const { childId } = await params

  // Validar formato de ObjectId
  if (!ObjectId.isValid(childId)) {
    notFound()
  }

  const child = await getChildWithParent(childId)

  if (!child) {
    notFound()
  }

  const childAge = child.birthDate ? calculateAge(child.birthDate) : "No especificado"
  const childFullName = `${child.firstName} ${child.lastName || ""}`.trim()
  const parentName = child.parent?.name || "No especificado"
  const parentEmail = child.parent?.email || ""

  // Enriquecer surveyData con flags estandar
  const surveyData = child.surveyData
    ? {
      ...child.surveyData,
      completed:
        child.surveyData.completed ??
        (!!child.surveyData.completedAt && child.surveyData.isPartial !== true),
      lastUpdated: child.surveyData.lastUpdated ?? child.updatedAt ?? child.createdAt,
    }
    : null

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      {/* Navegacion */}
      <div className="mb-6">
        <Link href="/dashboard/patients">
          <Button variant="ghost" className="gap-2 -ml-2">
            <ArrowLeft className="h-4 w-4" />
            Volver a Pacientes
          </Button>
        </Link>
      </div>

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/dashboard" className="hover:text-foreground">
          Dashboard
        </Link>
        <span>/</span>
        <Link href="/dashboard/patients" className="hover:text-foreground">
          Pacientes
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{childFullName}</span>
      </nav>

      {/* Header del nino */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-2xl font-semibold">
                {child.firstName.charAt(0).toUpperCase()}
              </div>
              <div>
                <CardTitle className="text-2xl">{childFullName}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4" />
                  {childAge}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {surveyData?.completed ? (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                  Encuesta Completada
                </Badge>
              ) : (
                <Badge variant="secondary">
                  Encuesta Pendiente
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Padre/Madre</p>
                <p className="font-medium">{parentName}</p>
                {parentEmail && (
                  <p className="text-sm text-muted-foreground">{parentEmail}</p>
                )}
              </div>
            </div>
            {child.birthDate && (
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Fecha de Nacimiento</p>
                  <p className="font-medium">{formatDate(child.birthDate)}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Registrado</p>
                <p className="font-medium">
                  {child.createdAt ? formatDate(child.createdAt) : "No especificado"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs de contenido - Client Component para interactividad */}
      <AdminChildDetailClient
        childId={childId}
        childName={childFullName}
        surveyData={surveyData}
      />
    </div>
  )
}
