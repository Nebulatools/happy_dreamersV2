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
import { Cloud, User, Calendar, Link2, RefreshCw } from "lucide-react"

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
      loadUnlinked()
    }
  }, [isAdmin])

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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Transcripts pendientes por asignar</CardTitle>
              <CardDescription>Transcripts detectados sin niño asignado</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input placeholder="Buscar por tema, texto o ID" value={filter} onChange={e => setFilter(e.target.value)} className="w-[260px]" />
              <Button variant="outline" onClick={loadUnlinked} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay transcripts pendientes.</p>
          ) : (
            <div className="space-y-4">
              {filtered.map((item, idx) => {
                const key = item.uuid || String(item.meetingId || "")
                return (
                  <div key={key}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <Badge variant="outline">Zoom</Badge>
                          {item.startTime && (
                            <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(item.startTime).toLocaleString("es-ES")}</span>
                          )}
                          {item.uuid && (<span>UUID: {String(item.uuid).slice(0,8)}…</span>)}
                          {item.meetingId && (<span>Meeting: {item.meetingId}</span>)}
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">{item.status}</span>
                        </div>
                        <div className="font-medium mb-1 truncate">{item.topic || "(sin tema)"}</div>
                        <p className="text-sm text-muted-foreground line-clamp-3">{item.transcriptPreview || "(sin contenido)"}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
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
                        <Button onClick={() => assign(item)} disabled={!assignMap[key] || linkingId === key}>
                          <Link2 className="h-4 w-4 mr-1" /> {linkingId === key ? "Asignando..." : "Asignar"}
                        </Button>
                      </div>
                    </div>
                    {idx < filtered.length - 1 && <Separator className="mt-3" />}
                  </div>
                )
              })}
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

