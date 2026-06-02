// Pagina self-serve para gestionar API Keys (integraciones como Yose).
// Crear (secreto visible una sola vez), listar y revocar keys.

"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { usePageHeaderConfig } from "@/context/page-header-context"
import { useToast } from "@/hooks/use-toast"
import { Key, Copy, Trash2, ShieldCheck, AlertTriangle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const AVAILABLE_SCOPES: { value: string; label: string; desc: string }[] = [
  { value: "children:read", label: "Leer niños", desc: "Ver la lista y datos básicos de los niños" },
  { value: "events:read", label: "Leer eventos", desc: "Consultar eventos de sueño/alimentación" },
  { value: "events:write", label: "Escribir eventos", desc: "Registrar, editar y eliminar eventos" },
  { value: "stats:read", label: "Leer estadísticas", desc: "Acceder a métricas de sueño" },
  { value: "notifications:read", label: "Leer notificaciones", desc: "Ver el historial de notificaciones" },
  { value: "notifications:write", label: "Crear notificaciones", desc: "Enviar/programar notificaciones" },
]

interface ApiKeyRow {
  id: string
  name: string
  keyPrefix: string
  scopes: string[]
  childIds: string[]
  status: "active" | "revoked"
  lastUsedAt: string | null
  createdAt: string
}

interface ChildOption {
  id: string
  name: string
}

export default function ApiKeysPage() {
  const { toast } = useToast()
  const [keys, setKeys] = useState<ApiKeyRow[]>([])
  const [children, setChildren] = useState<ChildOption[]>([])
  const [loading, setLoading] = useState(true)

  // Form de creacion
  const [name, setName] = useState("")
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["events:read", "events:write"])
  const [selectedChildren, setSelectedChildren] = useState<string[]>([])
  const [creating, setCreating] = useState(false)

  // Secreto recien creado (se muestra una vez)
  const [newSecret, setNewSecret] = useState<string | null>(null)

  usePageHeaderConfig({ title: "API / Desarrolladores", showChildSelector: false })

  const loadKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/api-keys")
      const json = await res.json()
      setKeys(json?.data || [])
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar las API keys", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const loadChildren = useCallback(async () => {
    try {
      const res = await fetch("/api/children")
      const json = await res.json()
      const list = json?.data?.children || json?.children || []
      setChildren(
        list.map((c: any) => ({ id: c._id?.toString?.() || c._id, name: `${c.firstName} ${c.lastName}`.trim() }))
      )
    } catch {
      // no critico
    }
  }, [])

  useEffect(() => {
    loadKeys()
    loadChildren()
  }, [loadKeys, loadChildren])

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]))
  }
  const toggleChild = (id: string) => {
    setSelectedChildren((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ title: "Falta el nombre", description: "Ponle un nombre a la API key", variant: "destructive" })
      return
    }
    if (selectedScopes.length === 0) {
      toast({ title: "Faltan scopes", description: "Selecciona al menos un permiso", variant: "destructive" })
      return
    }
    setCreating(true)
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          scopes: selectedScopes,
          childIds: selectedChildren.length > 0 ? selectedChildren : undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.message || "Error al crear la API key")
      setNewSecret(json.data.secret)
      setName("")
      setSelectedChildren([])
      await loadKeys()
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (id: string) => {
    if (!confirm("¿Revocar esta API key? Dejará de funcionar de inmediato.")) return
    try {
      const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("No se pudo revocar")
      toast({ title: "API key revocada" })
      await loadKeys()
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    }
  }

  const copySecret = () => {
    if (newSecret) {
      navigator.clipboard.writeText(newSecret)
      toast({ title: "Copiado", description: "El secreto se copió al portapapeles" })
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      {/* Crear nueva key */}
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Key className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-semibold">Crear nueva API key</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Usa una API key para conectar servicios externos (por ejemplo, Yose) con Happy Dreamers.
          El secreto se muestra una sola vez al crearla.
        </p>

        <div className="space-y-4">
          <div>
            <Label htmlFor="key-name">Nombre</Label>
            <Input
              id="key-name"
              placeholder="Ej: Yose"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
            />
          </div>

          <div>
            <Label className="mb-2 block">Permisos (scopes)</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {AVAILABLE_SCOPES.map((s) => (
                <label
                  key={s.value}
                  className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 hover:bg-accent"
                >
                  <Checkbox
                    checked={selectedScopes.includes(s.value)}
                    onCheckedChange={() => toggleScope(s.value)}
                  />
                  <span>
                    <span className="block text-sm font-medium">{s.label}</span>
                    <span className="block text-xs text-muted-foreground">{s.desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {children.length > 0 && (
            <div>
              <Label className="mb-2 block">
                Limitar a ciertos niños (opcional)
              </Label>
              <p className="mb-2 text-xs text-muted-foreground">
                Si no seleccionas ninguno, la key podrá acceder a todos tus niños.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {children.map((c) => (
                  <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-lg border p-2 hover:bg-accent">
                    <Checkbox checked={selectedChildren.includes(c.id)} onCheckedChange={() => toggleChild(c.id)} />
                    <span className="text-sm">{c.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <Button onClick={handleCreate} disabled={creating}>
            {creating ? "Creando..." : "Crear API key"}
          </Button>
        </div>
      </Card>

      {/* Lista de keys */}
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-500" />
          <h2 className="text-lg font-semibold">Tus API keys</h2>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : keys.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no has creado ninguna API key.</p>
        ) : (
          <div className="space-y-3">
            {keys.map((k) => (
              <div key={k.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{k.name}</span>
                    {k.status === "revoked" ? (
                      <Badge variant="destructive">Revocada</Badge>
                    ) : (
                      <Badge>Activa</Badge>
                    )}
                  </div>
                  <code className="mt-1 block text-xs text-muted-foreground">{k.keyPrefix}…</code>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {k.scopes.map((s) => (
                      <Badge key={s} variant="secondary" className="text-[10px]">
                        {s}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {k.childIds.length > 0 ? `${k.childIds.length} niño(s) permitidos` : "Todos los niños"}
                    {" · "}
                    {k.lastUsedAt ? `Último uso: ${new Date(k.lastUsedAt).toLocaleString()}` : "Sin uso"}
                  </p>
                </div>
                {k.status === "active" && (
                  <Button variant="ghost" size="icon" onClick={() => handleRevoke(k.id)} aria-label="Revocar">
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal: secreto recien creado */}
      <Dialog open={!!newSecret} onOpenChange={(open) => !open && setNewSecret(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tu nueva API key</DialogTitle>
            <DialogDescription className="flex items-start gap-2 pt-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <span>Copia este secreto ahora. Por seguridad, no se volverá a mostrar.</span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-lg border bg-muted p-3">
            <code className="flex-1 break-all text-sm">{newSecret}</code>
            <Button variant="outline" size="icon" onClick={copySecret} aria-label="Copiar">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewSecret(null)}>Ya lo copié</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
