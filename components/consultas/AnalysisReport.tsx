// Componente para mostrar análisis y recomendaciones de consultas
// Visualiza resultados de forma clara y profesional

"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  FileText, 
  Download, 
  Share, 
  Copy, 
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Clock,
  User,
  Baby,
  Calendar,
  TrendingUp
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"
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
    processingTime?: string
  }
}

interface AnalysisReportProps {
  result: AnalysisResult | null
  isLoading?: boolean
  userName?: string
  childName?: string
}

export function AnalysisReport({ 
  result, 
  isLoading = false, 
  userName, 
  childName 
}: AnalysisReportProps) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  // Copiar análisis al portapapeles
  const copyToClipboard = async () => {
    if (!result) return

    const fullReport = `
ANÁLISIS PEDIÁTRICO - ${new Date().toLocaleDateString('es-ES')}
${userName ? `Usuario: ${userName}` : ''}
${childName ? `Niño: ${childName}` : ''}

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

  // Descargar como archivo de texto
  const downloadReport = () => {
    if (!result) return

    const fullReport = `
ANÁLISIS PEDIÁTRICO
Fecha: ${new Date().toLocaleDateString('es-ES')}
${userName ? `Usuario: ${userName}` : ''}
${childName ? `Niño: ${childName}` : ''}

ANÁLISIS:
${result.analysis}

RECOMENDACIONES:
${result.recommendations}

${result.childContext ? `
CONTEXTO DEL NIÑO:
- Edad: ${result.childContext.ageInMonths} meses
- Total de eventos: ${result.childContext.totalEvents}
` : ''}

---
Generado por Happy Dreamers AI Assistant
Reporte ID: ${result.metadata?.reportId || 'N/A'}
    `.trim()

    const blob = new Blob([fullReport], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analisis-${childName || 'consulta'}-${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Descarga iniciada",
      description: "El análisis se está descargando como archivo de texto.",
    })
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
          <Separator />
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded animate-pulse"></div>
            <div className="h-4 bg-muted rounded animate-pulse w-2/3"></div>
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
                Análisis generado el {new Date().toLocaleDateString('es-ES')} 
                {result.metadata?.processingTime && ` en ${result.metadata.processingTime}`}
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
              <Button
                variant="outline"
                size="sm"
                onClick={downloadReport}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {/* Información del contexto */}
        {(userName || childName || result.childContext) && (
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              {userName && (
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4 text-gray-500" />
                  Usuario: {userName}
                </div>
              )}
              {childName && (
                <div className="flex items-center gap-1">
                  <Baby className="h-4 w-4 text-gray-500" />
                  Niño: {childName}
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
            Análisis Clínico
          </CardTitle>
          <CardDescription>
            Evaluación basada en transcript + datos del niño + knowledge base
          </CardDescription>
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

      {/* Metadatos del reporte */}
      {result.metadata && (
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              Información del Reporte
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
              <div>
                <strong>ID del Reporte:</strong><br />
                {result.metadata.reportId}
              </div>
              <div>
                <strong>Generado:</strong><br />
                {new Date(result.metadata.createdAt).toLocaleString('es-ES')}
              </div>
              {result.metadata.adminName && (
                <div>
                  <strong>Administrador:</strong><br />
                  {result.metadata.adminName}
                </div>
              )}
              {result.metadata.processingTime && (
                <div>
                  <strong>Tiempo de procesamiento:</strong><br />
                  {result.metadata.processingTime}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Acciones adicionales */}
      <div className="flex justify-center">
        <div className="flex gap-2">
          <Badge variant="secondary" className="text-xs">
            <TrendingUp className="h-3 w-3 mr-1" />
            Análisis Completado
          </Badge>
          <Badge variant="outline" className="text-xs">
            Powered by AI
          </Badge>
        </div>
      </div>
    </div>
  )
}