"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DiagnosticResult } from "@/lib/diagnostic/types"

interface PasanteAISectionProps {
  childId: string
  childName: string
  childAgeMonths: number
  diagnosticResult: DiagnosticResult
  planVersion?: string
  planStatus?: string
  recentEventsCount?: number
  surveyDataAvailable?: boolean
  className?: string
  // Sprint 4B: Texto libre para analisis extendido
  freeTextData?: {
    eventNotes: string[]     // Notas de eventos de los ultimos 14 dias
    chatMessages: string[]   // Mensajes de chat de los ultimos 14 dias
  }
}

type RequestState = "idle" | "loading" | "success" | "error"

/**
 * PasanteAISection - Seccion de analisis del Pasante AI
 *
 * Muestra un boton para solicitar analisis AI del diagnostico.
 * El analisis es on-demand (click del usuario) para optimizar costos.
 *
 * Flujo:
 * 1. Usuario ve boton "Analizar"
 * 2. Click dispara POST a /api/admin/diagnostics/ai-summary
 * 3. Muestra loading state
 * 4. Muestra resultado o error
 *
 * @example
 * <PasanteAISection
 *   childId="abc123"
 *   childName="Sofia"
 *   childAgeMonths={18}
 *   diagnosticResult={diagnosticResult}
 * />
 */
export function PasanteAISection({
  childId,
  childName,
  childAgeMonths,
  diagnosticResult,
  planVersion = "1",
  planStatus = "active",
  recentEventsCount = 0,
  surveyDataAvailable = false,
  className,
  freeTextData,
}: PasanteAISectionProps) {
  const [requestState, setRequestState] = useState<RequestState>("idle")
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    setRequestState("loading")
    setError(null)

    try {
      const response = await fetch("/api/admin/diagnostics/ai-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          childId,
          childName,
          childAgeMonths,
          planVersion,
          planStatus,
          diagnosticResult,
          recentEventsCount,
          surveyDataAvailable,
          // Sprint 4B: Incluir texto libre si esta disponible
          freeTextData,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Error al generar analisis")
      }

      const data = await response.json()
      setAiSummary(data.aiSummary)
      setRequestState("success")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
      setRequestState("error")
    }
  }

  const handleRetry = () => {
    setAiSummary(null)
    setError(null)
    handleAnalyze()
  }

  return (
    <Card className={cn("bg-gradient-to-br from-purple-50 to-indigo-50", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Analisis del Pasante AI
          </CardTitle>
          <Badge variant="outline" className="bg-white/80 text-purple-700 border-purple-200">
            GPT-4
          </Badge>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Resumen descriptivo basado en el diagnostico actual
          {freeTextData && (freeTextData.eventNotes?.length > 0 || freeTextData.chatMessages?.length > 0) && (
            <span className="text-purple-600 ml-1">
              (incluye analisis de texto libre)
            </span>
          )}
        </p>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Estado: Idle - Mostrar boton de analizar */}
        {requestState === "idle" && !aiSummary && (
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-sm text-gray-600 text-center">
              Genera un resumen descriptivo del estado actual del diagnostico.
            </p>
            <Button
              onClick={handleAnalyze}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Analizar
            </Button>
          </div>
        )}

        {/* Estado: Loading */}
        {requestState === "loading" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
            <p className="text-sm text-gray-600">Analizando diagnostico...</p>
            <p className="text-xs text-gray-400">Esto puede tomar unos segundos</p>
          </div>
        )}

        {/* Estado: Error */}
        {requestState === "error" && (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm font-medium">Error al generar analisis</p>
            </div>
            <p className="text-xs text-gray-500 text-center">{error}</p>
            <Button
              onClick={handleRetry}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          </div>
        )}

        {/* Estado: Success - Mostrar resultado */}
        {(requestState === "success" || aiSummary) && aiSummary && (
          <div className="space-y-3">
            <div className="bg-white rounded-lg p-4 border border-purple-100 shadow-sm">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {aiSummary}
              </p>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleRetry}
                variant="ghost"
                size="sm"
                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Regenerar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default PasanteAISection
