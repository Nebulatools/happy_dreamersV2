// Componente para mostrar análisis y recomendaciones de consultas
// Visualiza resultados de forma clara y profesional

"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  FileText,
  Copy,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Baby,
  Calendar,
  ArrowRight,
} from "lucide-react"
import { PDFExportButton } from "@/components/reports/PDFExportButton"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"

interface AnalysisResult {
  analysis: string
  recommendations: string
  childContext?: {
    name: string
    ageInMonths: number
    totalEvents: number
  }
  metadata?: {
    reportId: string
    createdAt: string
    adminName: string
    processingTime?: string | number
    sourcesUsed?: number
    dataQuality?: {
      allSourcesUsed: boolean
      statsFromDate?: string
      statsMethod?: string
    }
  }
}

interface AnalysisReportProps {
  result: AnalysisResult | null
  isLoading?: boolean
  userName?: string
  childName?: string
  onGoToPlan?: () => void
}

export function AnalysisReport({
  result,
  isLoading = false,
  userName,
  childName,
  onGoToPlan,
}: AnalysisReportProps) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  // Copiar análisis al portapapeles
  const copyToClipboard = async () => {
    if (!result) return

    const fullReport = `
ANÁLISIS PEDIÁTRICO - ${new Date().toLocaleDateString("es-ES")}
${userName ? `Usuario: ${userName}` : ""}
${childName ? `Niño: ${childName}` : ""}

ANÁLISIS:
${result.analysis}

RECOMENDACIONES:
${result.recommendations}

---
Generado por Happy Dreamers AI Assistant
    `.trim()

    try {
      await navigator.clipboard.writeText(fullReport)
      setCopied(true)
      toast({
        title: "Copiado",
        description: "El análisis se ha copiado al portapapeles.",
      })

      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo copiar al portapapeles.",
        variant: "destructive",
      })
    }
  }


  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generando Análisis...
          </CardTitle>
          <CardDescription>
            Procesando transcript con IA especializada
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded animate-pulse"></div>
            <div className="h-4 bg-muted rounded animate-pulse w-3/4"></div>
            <div className="h-4 bg-muted rounded animate-pulse w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!result) {
    return (
      <Card>
        <CardContent className="py-16">
          <div className="text-center">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-gray-700">Sin Análisis Disponible</h3>
            <p className="text-gray-500">
              Completa el transcript y genera el análisis para ver los resultados aquí.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header del reporte */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Análisis Completado
              </CardTitle>
              <CardDescription>
                Generado el {new Date().toLocaleDateString("es-ES")}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                disabled={copied}
              >
                {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              {result.metadata?.reportId && (
                <PDFExportButton
                  reportId={result.metadata.reportId}
                  reportType="consultation"
                  size="sm"
                  variant="outline"
                />
              )}
            </div>
          </div>
        </CardHeader>

        {/* Información del contexto */}
        {(childName || result.childContext) && (
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              {childName && (
                <div className="flex items-center gap-1">
                  <Baby className="h-4 w-4 text-gray-500" />
                  {childName}
                </div>
              )}
              {result.childContext && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  {result.childContext.ageInMonths} meses, {result.childContext.totalEvents} eventos
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Análisis principal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            Análisis de la Consulta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[400px]">
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {result.analysis}
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Recomendaciones */}
      <Card className="border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-green-600" />
            Plan de Mejoramiento
          </CardTitle>
          <CardDescription>
            Recomendaciones específicas y accionables para el niño
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[400px]">
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {result.recommendations}
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* CTA: Siguiente paso → Generar Plan */}
      {onGoToPlan && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base">Siguiente paso</h3>
                <p className="text-sm text-muted-foreground">
                  Revisa o genera un nuevo plan basado en este análisis
                </p>
              </div>
              <Button onClick={onGoToPlan} className="gap-2">
                Ir al Plan
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
