"use client"

// Admin page: List Zoom transcripts and assign to a child

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Cloud, User, Calendar, Link2, RefreshCw, Eye } from "lucide-react"

type SessionItem = {
  _id?: string
  uuid?: string
  meetingId?: string | number
  topic?: string
  startTime?: string
  status: string
  createdAt?: string
  updatedAt?: string
  transcriptPreview?: string
}

type Child = { _id: string, firstName: string, lastName: string }

export default function TranscriptsPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [linkingId, setLinkingId] = useState<string | null>(null)
  const [children, setChildren] = useState<Child[]>([])
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [filter, setFilter] = useState("")
  const [selectedChildForReports, setSelectedChildForReports] = useState<string>("")
  const [assigned, setAssigned] = useState<any[]>([])
  const [loadingAssigned, setLoadingAssigned] = useState(false)

  const isAdmin = session?.user?.role === "admin"

  const filtered = useMemo(() => {
    const f = (filter || "").toLowerCase().trim()
    if (!f) return sessions
    return sessions.filter(s =>
      (s.topic || "").toLowerCase().includes(f) ||
      (s.transcriptPreview || "").toLowerCase().includes(f) ||
      String(s.meetingId || "").includes(f) ||
      String(s.uuid || "").includes(f)
    )
  }, [sessions, filter])

  const loadChildren = async () => {
    try {
      const res = await fetch("/api/children")
      const data = await res.json()
      const list = (data?.children || data?.data?.children || []) as any[]
      setChildren(list.map(c => ({ _id: c._id, firstName: c.firstName, lastName: c.lastName })))
    } catch (e) {
      toast({ title: "Error", description: "No se pudieron cargar los niños", variant: "destructive" })
    }
  }

  const loadUnlinked = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/integrations/zoom/sessions?status=transcript_unlinked&limit=100")
      if (!res.ok) throw new Error("No autorizado o error al cargar sesiones")
      const data = await res.json()
      setSessions(data.sessions || [])
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "No se pudieron cargar transcripts", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      loadChildren()
      // Auto-cargar lista global al entrar
      loadZoomItems()
      // Auto-refresh cada 60s
      const iv = setInterval(() => {
        loadZoomItems()
        if (selectedChildForReports) loadAssignedForChild(selectedChildForReports)
      }, 60000)
      return () => clearInterval(iv)
    }
  }, [isAdmin])

  const loadAssignedForChild = async (childId: string) => {
    if (!childId) { setAssigned([]); return }
    setLoadingAssigned(true)
    try {
      const res = await fetch(`/api/integrations/zoom/reports?childId=${childId}&limit=20`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) throw new Error(data?.error || 'No se pudieron cargar transcripts asignados')
      setAssigned(data.reports || [])
    } catch (e: any) {
      setAssigned([])
      toast({ title: 'Error', description: e?.message || 'No se pudieron cargar transcripts asignados', variant: 'destructive' })
    } finally {
      setLoadingAssigned(false)
    }
  }

  useEffect(() => {
    if (selectedChildForReports) loadAssignedForChild(selectedChildForReports)
  }, [selectedChildForReports])

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        loadZoomItems()
        if (selectedChildForReports) loadAssignedForChild(selectedChildForReports)
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [selectedChildForReports])

  const [assignMap, setAssignMap] = useState<Record<string, string>>({})

  const assign = async (item: SessionItem) => {
    const key = item.uuid || String(item.meetingId || "")
    const childId = assignMap[key]
    if (!childId) {
      toast({ title: "Selecciona un niño", description: "Debes seleccionar un niño para asignar el transcript", variant: "destructive" })
      return
    }
    setLinkingId(key)
    try {
      const res = await fetch("/api/integrations/zoom/sessions/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uuid: item.uuid, meetingId: item.meetingId, childId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) throw new Error(data?.error || "No se pudo asignar")
      toast({ title: "Asignado", description: "Transcript asignado correctamente" })
      // Remove from local list
      setSessions(prev => prev.filter(s => (s.uuid || s.meetingId) !== (item.uuid || item.meetingId)))
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "No se pudo asignar el transcript", variant: "destructive" })
    } finally {
      setLinkingId(null)
    }
  }

  // New: Zoom global transcripts (all, by date range)
  const [rangeDays, setRangeDays] = useState<string>("30")
  const [zoomItems, setZoomItems] = useState<any[]>([])
  const [loadingZoom, setLoadingZoom] = useState(false)
  const [previewing, setPreviewing] = useState<string | null>(null)
  const [previewText, setPreviewText] = useState<string>("")

  const loadZoomItems = async () => {
    setLoadingZoom(true)
    try {
      const to = new Date()
      const from = new Date(to.getTime() - (parseInt(rangeDays, 10) || 30) * 24 * 60 * 60 * 1000)
      const url = `/api/integrations/zoom/transcripts/list?from=${from.toISOString().slice(0,10)}&to=${to.toISOString().slice(0,10)}`
      const res = await fetch(url)
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) throw new Error(data?.error || 'No se pudieron cargar transcripts de Zoom')
      setZoomItems(data.items || [])
    } catch (e: any) {
      toast({ title: 'Zoom', description: e?.message || 'No se pudieron cargar transcripts de Zoom', variant: 'destructive' })
    } finally {
      setLoadingZoom(false)
    }
  }

  const showPreview = async (item: any) => {
    const key = item.uuid || String(item.meetingId || '')
    setPreviewing(key)
    setPreviewText('')
    try {
      const res = await fetch(`/api/integrations/zoom/transcripts/download?${item.uuid ? `uuid=${encodeURIComponent(item.uuid)}` : `meetingId=${encodeURIComponent(item.meetingId)}`}&fileId=${encodeURIComponent(item.file.id)}`)
      const text = await res.text()
      if (!res.ok) throw new Error(text || 'Error descargando transcript')
      setPreviewText(text)
    } catch (e: any) {
      setPreviewText(`Error: ${e?.message || 'No se pudo descargar el transcript'}`)
    }
  }

  if (!isAdmin) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="py-10 text-center">
            Solo administradores pueden acceder a esta página.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="mb-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Cloud className="h-8 w-8" /> Transcripts
        </h1>
        <p className="text-muted-foreground">Lista de transcripts de Zoom y asignación a niños</p>
      </div>

      {/* ALL ZOOM TRANSCRIPTS (by date range) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Transcripts en Zoom (todos)</CardTitle>
              <CardDescription>Trae los transcripts directamente de Zoom por rango de fechas</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={rangeDays} onValueChange={setRangeDays}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Rango" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 días</SelectItem>
                  <SelectItem value="30">Últimos 30 días</SelectItem>
                  <SelectItem value="90">Últimos 90 días</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={loadZoomItems} disabled={loadingZoom}>
                <RefreshCw className={`h-4 w-4 ${loadingZoom ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {zoomItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay transcripts en el rango seleccionado o aún no has cargado la lista.</p>
          ) : (
            <div className="space-y-4">
              {zoomItems.map((z, idx) => {
                const key = z.uuid || String(z.meetingId || '')
                return (
                  <div key={`${key}-${z.file.id}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <Badge variant="outline">Zoom</Badge>
                          {z.startTime && (<span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(z.startTime).toLocaleString('es-ES')}</span>)}
                          <span>File: {z.file.fileType}.{(z.file.fileExtension || '').toLowerCase()}</span>
                          {z.uuid && (<span>UUID: {String(z.uuid).slice(0,8)}…</span>)}
                          {z.meetingId && (<span>Meeting: {z.meetingId}</span>)}
                        </div>
                        <div className="font-medium mb-1 truncate">{z.topic || '(sin tema)'}</div>
                        {previewing === key && (
                          <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded border max-h-60 overflow-auto">{previewText || 'Cargando...'}</pre>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button variant="outline" size="sm" onClick={() => showPreview(z)}>
                          <Eye className="h-4 w-4 mr-1" /> Ver
                        </Button>
                        <Select value={assignMap[key] || ""} onValueChange={(val) => setAssignMap(prev => ({ ...prev, [key]: val }))}>
                          <SelectTrigger className="w-[220px]">
                            <SelectValue placeholder="Selecciona un niño" />
                          </SelectTrigger>
                          <SelectContent>
                            {children.map(c => (
                              <SelectItem key={c._id} value={c._id}>
                                <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> {c.firstName} {c.lastName}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button onClick={() => assign({ uuid: z.uuid, meetingId: z.meetingId })} disabled={!assignMap[key] || linkingId === key}>
                          <Link2 className="h-4 w-4 mr-1" /> {linkingId === key ? 'Asignando...' : 'Asignar'}
                        </Button>
                      </div>
                    </div>
                    {idx < zoomItems.length - 1 && <Separator className="mt-3" />}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Transcripts asignados</CardTitle>
              <CardDescription>Selecciona un niño para ver sus transcripts de Zoom ya vinculados</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedChildForReports} onValueChange={(v) => setSelectedChildForReports(v)}>
                <SelectTrigger className="w-[260px]">
                  <SelectValue placeholder="Selecciona un niño" />
                </SelectTrigger>
                <SelectContent>
                  {children.map(c => (
                    <SelectItem key={c._id} value={c._id}>
                      <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> {c.firstName} {c.lastName}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => loadAssignedForChild(selectedChildForReports)} disabled={!selectedChildForReports || loadingAssigned}>
                <RefreshCw className={`h-4 w-4 ${loadingAssigned ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedChildForReports ? (
            <p className="text-sm text-muted-foreground">Selecciona un niño para ver transcripts asignados.</p>
          ) : assigned.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay transcripts asignados para este niño.</p>
          ) : (
            <div className="space-y-4">
              {assigned.map((r, idx) => (
                <div key={r._id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Badge variant="outline">Zoom</Badge>
                        {r.createdAt && (<span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(r.createdAt).toLocaleString('es-ES')}</span>)}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-3">{r.transcript?.slice(0, 220) || '(vacío)'}</p>
                    </div>
                  </div>
                  {idx < assigned.length - 1 && <Separator className="mt-3" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>¿Dónde se ven los transcripts ya asignados?</CardTitle>
          <CardDescription>En la página de Consultas, sección “Transcripts de Zoom recientes” del niño seleccionado.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Asigna aquí los transcripts a su niño correspondiente. Luego, en <code>/dashboard/consultas</code>, el admin puede ver y usar esos transcripts vinculados
            al niño que esté seleccionado en el selector superior.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
