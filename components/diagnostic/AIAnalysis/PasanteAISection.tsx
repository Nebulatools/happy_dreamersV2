"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles, Loader2, AlertCircle, RefreshCw, ChevronDown, Clock } from "lucide-react"
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

interface HistoryEntry {
  _id: string
  summary: string
  context: {
    childAgeMonths: number
    planVersion: string | null
    recentEventsCount: number
    overallStatus: string | null
    dataLevel: string | null
    alertCount: number
  }
  createdAt: string
}

type RequestState = "idle" | "loading" | "success" | "error"

// Formatear fecha relativa simple
function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMin < 2) return "Hace un momento"
  if (diffMin < 60) return `Hace ${diffMin} min`
  if (diffHours < 24) return `Hace ${diffHours}h`
  if (diffDays === 1) return "Ayer"
  if (diffDays < 7) return `Hace ${diffDays} dias`

  return date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  })
}

// Etiqueta corta del contexto del analisis
function contextLabel(ctx: HistoryEntry["context"]): string {
  const parts: string[] = []
  if (ctx.planVersion) parts.push(`Plan v${ctx.planVersion}`)
  if (ctx.recentEventsCount > 0) parts.push(`${ctx.recentEventsCount} eventos`)
  if (ctx.alertCount > 0) parts.push(`${ctx.alertCount} alertas`)
  if (parts.length === 0 && ctx.dataLevel) parts.push(ctx.dataLevel === "survey_only" ? "Solo survey" : "Survey + eventos")
  return parts.join(" · ") || "Sin contexto"
}

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

  // Historial
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)

  // Cargar historial al montar
  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/diagnostics/ai-summary?childId=${childId}`)
      if (res.ok) {
        const data = await res.json()
        setHistory(data.history || [])
      }
    } catch {
      // Silencioso - el historial es secundario
    }
  }, [childId])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

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

      // Refrescar historial despues de generar uno nuevo
      fetchHistory()
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

  // Historial sin incluir el analisis actual (si acaba de generarse)
  const pastHistory = aiSummary
    ? history.filter((_, i) => i > 0) // El [0] es el que acaba de guardarse
    : history

  return (
    <Card className={cn("bg-gradient-to-br from-purple-50 to-indigo-50", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          Analisis del Pasante AI
        </CardTitle>
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

        {/* Historial de analisis anteriores */}
        {pastHistory.length > 0 && (
          <div className="mt-4 border-t border-purple-100 pt-3">
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className="flex items-center gap-2 w-full text-left text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              <Clock className="h-4 w-4 text-purple-500" />
              <span className="font-medium">Analisis anteriores ({pastHistory.length})</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 ml-auto transition-transform",
                  historyOpen && "rotate-180"
                )}
              />
            </button>

            {historyOpen && (
              <div className="mt-3 space-y-2">
                {pastHistory.map((entry) => {
                  const isExpanded = expandedEntry === entry._id
                  return (
                    <div
                      key={entry._id}
                      className="bg-white rounded-lg border border-purple-100 overflow-hidden"
                    >
                      <button
                        onClick={() => setExpandedEntry(isExpanded ? null : entry._id)}
                        className="flex items-center justify-between w-full px-3 py-2 text-left hover:bg-purple-50/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-medium text-gray-700 shrink-0">
                            {formatRelativeDate(entry.createdAt)}
                          </span>
                          <span className="text-xs text-gray-400 truncate">
                            {contextLabel(entry.context)}
                          </span>
                        </div>
                        <ChevronDown
                          className={cn(
                            "h-3 w-3 text-gray-400 shrink-0 transition-transform",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </button>
                      {isExpanded && (
                        <div className="px-3 pb-3 border-t border-purple-50">
                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap pt-2">
                            {entry.summary}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default PasanteAISection
