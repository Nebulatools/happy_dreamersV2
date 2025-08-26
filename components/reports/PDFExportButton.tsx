"use client"

// Componente para exportar reportes a PDF

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { 
  Download, 
  FileText, 
  Calendar, 
  ChartBar,
  Loader2,
  Check
} from "lucide-react"

interface PDFExportButtonProps {
  reportId?: string
  childId?: string
  reportType?: "professional_report" | "sleep_report" | "consultation" | "monthly_summary"
  dateRange?: { from: Date; to: Date } | { year: number; month: number }
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg"
  className?: string
  onExportComplete?: () => void
  disabled?: boolean
}

export function PDFExportButton({
  reportId,
  childId,
  reportType = "professional_report",
  dateRange,
  variant = "outline",
  size = "default",
  className,
  onExportComplete,
  disabled = false
}: PDFExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)

  const handleExport = async (type?: string) => {
    const exportType = type || reportType
    
    if (!reportId && !childId) {
      toast.error("Faltan datos para exportar el reporte")
      return
    }

    setIsExporting(true)
    setExportSuccess(false)

    try {
      const requestBody: any = {
        reportType: exportType
      }

      // Configurar parámetros según el tipo
      if (exportType === "professional_report" || exportType === "consultation") {
        requestBody.reportId = reportId
      } else if (exportType === "sleep_report" || exportType === "monthly_summary") {
        requestBody.childId = childId
        requestBody.dateRange = dateRange || {
          from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
          to: new Date()
        }
      }

      const response = await fetch("/api/reports/export/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al exportar el reporte")
      }

      // Obtener el blob del PDF
      const blob = await response.blob()
      
      // Crear URL y descargar
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      
      // Generar nombre del archivo
      const date = new Date().toISOString().split("T")[0]
      const filename = `reporte_${exportType}_${date}.pdf`
      link.download = filename
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setExportSuccess(true)
      toast.success("Reporte exportado exitosamente", {
        description: `Descargado como ${filename}`
      })

      // Callback opcional
      if (onExportComplete) {
        onExportComplete()
      }

      // Reset estado después de 3 segundos
      setTimeout(() => {
        setExportSuccess(false)
      }, 3000)

    } catch (error: any) {
      console.error("Error exportando PDF:", error)
      toast.error(error.message || "Error al exportar el reporte")
    } finally {
      setIsExporting(false)
    }
  }

  // Si hay múltiples tipos de reporte disponibles, mostrar menú
  if (childId && !reportType) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant={variant} 
            size={size} 
            className={className}
            disabled={disabled || isExporting}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : exportSuccess ? (
              <Check className="h-4 w-4 mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Exportar PDF
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Seleccionar tipo de reporte</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => handleExport("sleep_report")}>
            <FileText className="h-4 w-4 mr-2" />
            Reporte de Sueño
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => handleExport("monthly_summary")}>
            <Calendar className="h-4 w-4 mr-2" />
            Resumen Mensual
          </DropdownMenuItem>
          
          {reportId && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport("professional_report")}>
                <ChartBar className="h-4 w-4 mr-2" />
                Reporte Profesional
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Botón simple para un solo tipo de reporte
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={() => handleExport()}
      disabled={disabled || isExporting}
    >
      {isExporting ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Exportando...
        </>
      ) : exportSuccess ? (
        <>
          <Check className="h-4 w-4 mr-2" />
          Descargado
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          Descargar PDF
        </>
      )}
    </Button>
  )
}