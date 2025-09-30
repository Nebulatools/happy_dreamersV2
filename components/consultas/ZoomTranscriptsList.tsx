"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Cloud, Calendar, Clipboard, PlugZap } from "lucide-react"
import { useActiveChild } from "@/context/active-child-context"
import { useToast } from "@/hooks/use-toast"

type ZoomReport = {
  _id: string
  transcript: string
  createdAt: string
  provider?: string
  source?: any
}

export function ZoomTranscriptsList({ onInsert, onInsertAndAnalyze }: { onInsert?: (text: string) => void, onInsertAndAnalyze?: (text: string) => void }) {
  const { activeChildId } = useActiveChild()
  const { toast } = useToast()

  const [reports, setReports] = useState<ZoomReport[]>([])
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [status, setStatus] = useState<{ token?: boolean; api?: boolean } | null>(null)

  const fetchReports = async () => {
    if (!activeChildId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/integrations/zoom/reports?childId=${activeChildId}&limit=5`)
      if (!res.ok) throw new Error("No autorizado o error cargando transcripts de Zoom")
      const data = await res.json()
      setReports(data.reports || [])
    } catch (e: any) {
      toast({ title: "Zoom", description: e?.message || "No se pudieron cargar los transcripts de Zoom", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
    // Auto-refresh every 30s and on tab focus
    const iv = setInterval(fetchReports, 30000)
    const onVis = () => { if (document.visibilityState === 'visible') fetchReports() }
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', onVis) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChildId])

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleString("es-ES") } catch { return iso }
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({ title: "Copiado", description: "Transcript copiado al portapapeles" })
    } catch {
      toast({ title: "Error", description: "No se pudo copiar", variant: "destructive" })
    }
  }

  const testConnection = async () => {
    setTesting(true)
    try {
      const res = await fetch("/api/integrations/zoom/debug")
      const data = await res.json().catch(() => ({} as any))
      if (!res.ok) {
        throw new Error(data?.error || "Error verificando Zoom")
      }
      const tokenOk = !!data?.diagnostics?.token_ok
      const apiOk = !!data?.diagnostics?.api_ok
      setStatus({ token: tokenOk, api: apiOk })
      toast({
        title: "Zoom",
        description: tokenOk && apiOk
          ? "Conexión correcta. Token y permisos OK."
          : tokenOk
            ? "Token OK. Revisa permisos/scopes para recordings."
            : "No se pudo obtener token. Revisa .env y credenciales.",
        variant: tokenOk && apiOk ? "default" : "destructive",
      })
    } catch (e: any) {
      setStatus({ token: false, api: false })
      toast({ title: "Zoom", description: e?.message || "Error verificando Zoom", variant: "destructive" })
    } finally {
      setTesting(false)
    }
  }

  if (!activeChildId) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              Transcripts de Zoom recientes
            </CardTitle>
            <CardDescription>
              Últimos transcripts vinculados a este niño
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {status && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${status.token && status.api ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {status.token && status.api ? 'Conectado' : 'Revisar' }
              </span>
            )}
            <Button size="sm" variant="outline" onClick={testConnection} disabled={testing}>
              <PlugZap className={`h-4 w-4 ${testing ? 'animate-pulse' : ''}`} />
            </Button>
            <Button size="sm" variant="outline" onClick={fetchReports} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay transcripts de Zoom aún.</p>
        ) : (
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-4">
              {reports.map((r, idx) => (
                <div key={r._id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">Zoom</Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" /> {formatDate(r.createdAt)}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {r.transcript?.slice(0, 160) || "(vacío)"}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => copy(r.transcript)} title="Copiar">
                        <Clipboard className="h-4 w-4" />
                      </Button>
                      {onInsert && (
                        <Button size="sm" onClick={() => onInsert(r.transcript)} title="Insertar en el editor">
                          Insertar
                        </Button>
                      )}
                      {onInsertAndAnalyze && (
                        <Button size="sm" onClick={() => onInsertAndAnalyze(r.transcript)} title="Insertar y analizar">
                          Usar para análisis
                        </Button>
                      )}
                    </div>
                  </div>
                  {idx < reports.length - 1 && <Separator className="mt-3" />}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
