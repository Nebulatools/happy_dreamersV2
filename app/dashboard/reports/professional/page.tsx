"use client"

// Página para edición profesional de reportes

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { ProfessionalReportEditor } from "@/components/reports/ProfessionalReportEditor"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/icons"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { 
  FileText, 
  User, 
  Calendar, 
  ArrowLeft,
  Share2,
  Download,
  CheckCircle,
} from "lucide-react"
import Link from "next/link"

export default function ProfessionalReportPage() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const reportId = searchParams.get("id")
  const consultaId = searchParams.get("consultaId")
  
  const [loading, setLoading] = useState(true)
  const [reportData, setReportData] = useState<any>(null)
  const [professionalReport, setProfessionalReport] = useState<any>(null)
  const [isProfessional, setIsProfessional] = useState(false)

  useEffect(() => {
    if (session?.user) {
      checkUserRole()
      if (reportId || consultaId) {
        loadReport()
      }
    }
  }, [session, reportId, consultaId])

  const checkUserRole = async () => {
    try {
      const response = await fetch("/api/user/profile")
      if (response.ok) {
        const data = await response.json()
        setIsProfessional(
          data.user?.role === "professional" || 
          data.user?.role === "admin"
        )
      }
    } catch (error) {
      console.error("Error verificando rol:", error)
    }
  }

  const loadReport = async () => {
    try {
      setLoading(true)

      // Si hay reportId, cargar el reporte profesional existente
      if (reportId) {
        const response = await fetch(`/api/reports/professional?id=${reportId}`)
        if (!response.ok) {
          throw new Error("Error cargando reporte profesional")
        }
        
        const data = await response.json()
        setProfessionalReport(data.report)
        setReportData(data.report.originalData)
      } 
      // Si hay consultaId, cargar los datos de la consulta original
      else if (consultaId) {
        const response = await fetch(`/api/consultas/${consultaId}`)
        if (!response.ok) {
          throw new Error("Error cargando consulta")
        }
        
        const data = await response.json()
        
        // Formatear datos de la consulta para el editor
        setReportData({
          analysis: data.consulta.analysis,
          recommendations: data.consulta.recommendations,
          childContext: data.consulta.childContext,
          metadata: {
            reportId: data.consulta._id,
            createdAt: data.consulta.createdAt,
            adminName: data.consulta.adminName || "Sistema",
          },
        })
        
        // Verificar si ya existe un reporte profesional para esta consulta
        const profResponse = await fetch(
          `/api/reports/professional?originalReportId=${consultaId}`
        )
        if (profResponse.ok) {
          const profData = await profResponse.json()
          if (profData.reports && profData.reports.length > 0) {
            setProfessionalReport(profData.reports[0])
          }
        }
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error al cargar el reporte")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (data: any) => {
    try {
      let response
      
      if (professionalReport?._id) {
        // Actualizar reporte existente
        response = await fetch("/api/reports/professional", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reportId: professionalReport._id,
            editedData: data.editedData,
            privacy: data.privacy,
            editReason: "Actualización profesional del reporte",
          }),
        })
      } else {
        // Crear nuevo reporte profesional
        response = await fetch("/api/reports/professional", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            originalReportId: consultaId || reportData.metadata?.reportId,
            childId: reportData.childContext?.childId,
            userId: reportData.childContext?.userId,
            originalData: reportData,
            editedData: data.editedData,
            privacy: data.privacy,
          }),
        })
      }

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error guardando reporte")
      }

      const result = await response.json()
      setProfessionalReport(result.report)
      
      toast.success("Reporte guardado exitosamente", {
        description: `Versión ${result.report.version} creada`,
      })
      
      return result.report
    } catch (error: any) {
      console.error("Error guardando:", error)
      toast.error(error.message || "Error al guardar el reporte")
      throw error
    }
  }

  const handleApprove = async (reportId: string) => {
    try {
      const response = await fetch("/api/reports/professional", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          action: "approve",
        }),
      })

      if (!response.ok) {
        throw new Error("Error aprobando reporte")
      }

      const result = await response.json()
      setProfessionalReport(result.report)
      
      toast.success("Reporte aprobado", {
        description: "El reporte está listo para compartir con los padres",
      })
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error al aprobar el reporte")
      throw error
    }
  }

  const handleSign = async (reportId: string, signatureData: any) => {
    try {
      const response = await fetch("/api/reports/professional", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          action: "sign",
          signatureData,
        }),
      })

      if (!response.ok) {
        throw new Error("Error firmando reporte")
      }

      const result = await response.json()
      setProfessionalReport(result.report)
      
      toast.success("Reporte firmado digitalmente", {
        description: "El reporte ha sido validado con su firma profesional",
      })
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error al firmar el reporte")
      throw error
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Icons.spinner className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!reportData) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No se encontró el reporte</h3>
              <p className="text-gray-500 mb-4">
                El reporte solicitado no existe o no tienes permisos para verlo.
              </p>
              <Link href="/dashboard/consultas">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver a Consultas
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Verificar permisos
  if (!isProfessional && professionalReport && !professionalReport.privacy?.parentCanView) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <Icons.lock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Reporte no disponible</h3>
              <p className="text-gray-500 mb-4">
                Este reporte aún no ha sido aprobado para visualización.
              </p>
              <Link href="/dashboard">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver al Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1F2937]">
            {isProfessional ? "Editor de Reporte Profesional" : "Reporte Profesional"}
          </h1>
          <p className="text-gray-600 mt-2">
            {isProfessional 
              ? "Revise y edite el análisis con su criterio profesional"
              : "Análisis profesional del sueño de su hijo"
            }
          </p>
        </div>
        
        <div className="flex gap-2">
          <Link href="/dashboard/consultas">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
          
          {professionalReport?.status === "approved" && (
            <>
              {professionalReport.privacy?.parentCanDownload && (
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Descargar PDF
                </Button>
              )}
              <Button variant="outline">
                <Share2 className="h-4 w-4 mr-2" />
                Compartir
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Información del paciente */}
      {reportData.childContext && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Información del Paciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Nombre</p>
                  <p className="font-medium">{reportData.childContext.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Edad</p>
                  <p className="font-medium">{reportData.childContext.ageInMonths} meses</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Eventos registrados</p>
                  <p className="font-medium">{reportData.childContext.totalEvents}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estado del reporte */}
      {professionalReport && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">
                    Reporte Profesional {professionalReport.status === "approved" ? "Aprobado" : "En Edición"}
                  </p>
                  <p className="text-sm text-blue-700">
                    Versión {professionalReport.version} • 
                    Editado por {professionalReport.professionalId?.name || "Profesional"}
                  </p>
                </div>
              </div>
              {professionalReport.signature && (
                <Badge variant="default" className="bg-green-600">
                  <FileSignature className="h-3 w-3 mr-1" />
                  Firmado Digitalmente
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Editor de reporte */}
      <ProfessionalReportEditor
        reportData={reportData}
        professionalReport={professionalReport}
        onSave={handleSave}
        onApprove={handleApprove}
        onSign={handleSign}
        isProfessional={isProfessional}
        childName={reportData.childContext?.name}
        childId={reportData.childContext?.childId}
      />
    </div>
  )
}