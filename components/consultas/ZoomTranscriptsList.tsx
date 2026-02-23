"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { RefreshCw, Cloud, Calendar, Clipboard, PlugZap, Link2, ChevronDown, Loader2 } from "lucide-react"
import { useActiveChild } from "@/context/active-child-context"
import { useToast } from "@/hooks/use-toast"

type ZoomReport = {
  _id: string
  transcript: string
  createdAt: string
  provider?: string
  source?: any
}

type UnlinkedSession = {
  _id?: string
  uuid?: string
  meetingId?: string | number
  topic?: string
  startTime?: string
  status: string
  transcriptPreview?: string
}

interface ZoomTranscriptsListProps {
  onInsert?: (text: string) => void
  onInsertAndAnalyze?: (text: string) => void
  childId?: string
  childName?: string
  isAdmin?: boolean
}

export function ZoomTranscriptsList({ onInsert, onInsertAndAnalyze, childId, childName, isAdmin }: ZoomTranscriptsListProps) {
  const { activeChildId } = useActiveChild()
  const { toast } = useToast()

  // Usar childId del prop si se pasa, sino el del contexto
  const effectiveChildId = childId || activeChildId

  const [reports, setReports] = useState<ZoomReport[]>([])
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [status, setStatus] = useState<{ token?: boolean; api?: boolean } | null>(null)

  // Estado para sesiones no asignadas (admin only)
  const [unlinked, setUnlinked] = useState<UnlinkedSession[]>([])
  const [loadingUnlinked, setLoadingUnlinked] = useState(false)
  const [linkingId, setLinkingId] = useState<string | null>(null)
  const [unlinkedOpen, setUnlinkedOpen] = useState(false)

  const fetchReports = async () => {
    if (!effectiveChildId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/integrations/zoom/reports?childId=${effectiveChildId}&limit=5`)
      if (!res.ok) throw new Error("No autorizado o error cargando transcripts de Zoom")
      const data = await res.json()
      setReports(data.reports || [])
    } catch (e: any) {
      toast({ title: "Zoom", description: e?.message || "No se pudieron cargar los transcripts de Zoom", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  // Cargar sesiones no asignadas (admin only)
  const fetchUnlinked = async () => {
    if (!isAdmin) return
    setLoadingUnlinked(true)
    try {
      const res = await fetch("/api/integrations/zoom/sessions?status=transcript_unlinked&limit=20")
      if (!res.ok) throw new Error("Error al cargar sesiones no asignadas")
      const data = await res.json()
      setUnlinked(data.sessions || [])
    } catch (e: any) {
      toast({ title: "Zoom", description: e?.message || "No se pudieron cargar sesiones", variant: "destructive" })
    } finally {
      setLoadingUnlinked(false)
    }
  }

  // Asignar transcript al nino actual
  const assignToChild = async (item: UnlinkedSession) => {
    if (!effectiveChildId) return
    const key = item.uuid || String(item.meetingId || "")
    setLinkingId(key)
    try {
      const res = await fetch("/api/integrations/zoom/sessions/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uuid: item.uuid, meetingId: item.meetingId, childId: effectiveChildId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) throw new Error(data?.error || "No se pudo asignar")
      toast({ title: "Asignado", description: `Transcript asignado a ${childName || "este paciente"}` })
      // Quitar de la lista de no asignados y refrescar asignados
      setUnlinked(prev => prev.filter(s => (s.uuid || s.meetingId) !== (item.uuid || item.meetingId)))
      fetchReports()
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "No se pudo asignar el transcript", variant: "destructive" })
    } finally {
      setLinkingId(null)
    }
  }

  useEffect(() => {
    fetchReports()
    if (isAdmin) fetchUnlinked()
    // Auto-refresh every 30s and on tab focus
    const iv = setInterval(() => {
      fetchReports()
      if (isAdmin) fetchUnlinked()
    }, 30000)
    const onVis = () => {
      if (document.visibilityState === "visible") {
        fetchReports()
        if (isAdmin) fetchUnlinked()
      }
    }
    document.addEventListener("visibilitychange", onVis)
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", onVis) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveChildId, isAdmin])

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

  if (!effectiveChildId) return null

  return (
    <div className="space-y-4">
    {/* Seccion admin: transcripts no asignados */}
    {isAdmin && (
      <Card>
        <Collapsible open={unlinkedOpen} onOpenChange={setUnlinkedOpen}>
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full text-left">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Link2 className="h-5 w-5" />
                    Transcripts disponibles en Zoom
                    {unlinked.length > 0 && (
                      <Badge variant="secondary" className="ml-1">{unlinked.length}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Sesiones sin asignar — asigna directamente a {childName || "este paciente"}
                  </CardDescription>
                </div>
                <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${unlinkedOpen ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              {loadingUnlinked ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Cargando sesiones...
                </div>
              ) : unlinked.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay transcripts pendientes de asignar.</p>
              ) : (
                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-3">
                    {unlinked.map((s, idx) => {
                      const key = s.uuid || String(s.meetingId || "")
                      return (
                        <div key={key}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline">Zoom</Badge>
                                {s.startTime && (
                                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3" /> {formatDate(s.startTime)}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-medium truncate">{s.topic || "(sin tema)"}</p>
                              {s.transcriptPreview && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">{s.transcriptPreview.slice(0, 120)}</p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              onClick={() => assignToChild(s)}
                              disabled={linkingId === key}
                              className="shrink-0"
                            >
                              {linkingId === key ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <Link2 className="h-4 w-4 mr-1" />
                              )}
                              {linkingId === key ? "Asignando..." : `Asignar a ${childName || "paciente"}`}
                            </Button>
                          </div>
                          {idx < unlinked.length - 1 && <Separator className="mt-3" />}
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    )}

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
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${status.token && status.api ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                {status.token && status.api ? "Conectado" : "Revisar" }
              </span>
            )}
            <Button size="sm" variant="outline" onClick={testConnection} disabled={testing}>
              <PlugZap className={`h-4 w-4 ${testing ? "animate-pulse" : ""}`} />
            </Button>
            <Button size="sm" variant="outline" onClick={fetchReports} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
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
    </div>
  )
}
