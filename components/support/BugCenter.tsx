"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import * as Sentry from "@sentry/nextjs"
import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { AlertCircle, Bug, Camera, ClipboardCopy, RefreshCw, Send } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  extractTraceId,
  getClientErrorBuffer,
  recordClientError,
  subscribeClientErrorBuffer,
  type ClientObservedError,
} from "@/lib/observability/client-error-buffer"

type ServerTraceLog = {
  _id: string
  createdAt: string
  source: string
  level: string
  message: string
  traceId: string
  endpoint?: string
  action?: string
  statusCode?: number
}

type BugContextResponse = {
  success?: boolean
  traceId?: string
  logs?: unknown
  error?: string
}

const MAX_CLIENT_ERRORS = 25
const MAX_SERVER_LOGS = 25

function isRoleAllowed(role?: string) {
  return role === "admin" || role === "professional"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined
}

function normalizeServerLogs(raw: unknown): ServerTraceLog[] {
  if (!Array.isArray(raw)) return []

  const output: ServerTraceLog[] = []
  for (const row of raw) {
    const item = isRecord(row) ? row : null
    if (!item) continue

    const id = asString(item._id, item._id ? String(item._id) : "")
    const traceId = asString(item.traceId)
    const message = asString(item.message)

    if (!id || !traceId || !message) continue

    output.push({
      _id: id,
      createdAt: asString(item.createdAt),
      source: asString(item.source, "unknown"),
      level: asString(item.level, "error"),
      message,
      traceId,
      endpoint: asOptionalString(item.endpoint),
      action: asOptionalString(item.action),
      statusCode: typeof item.statusCode === "number" ? item.statusCode : undefined,
    })
  }

  return output
}

function getFetchUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input
  if (input instanceof URL) return input.toString()
  if (typeof Request !== "undefined" && input instanceof Request) return input.url
  return ""
}

export function BugCenter() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const { toast } = useToast()

  const [open, setOpen] = useState(false)
  const [loadingContext, setLoadingContext] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [serverLogs, setServerLogs] = useState<ServerTraceLog[]>([])
  const [clientLogs, setClientLogs] = useState<ClientObservedError[]>([])

  const fetchPatchedRef = useRef(false)
  const originalFetchRef = useRef<typeof window.fetch | null>(null)
  const isEnabled = process.env.NEXT_PUBLIC_BUG_CENTER_ENABLED === "true"
  const role = session?.user?.role
  const canUse = isEnabled && isRoleAllowed(role)

  const refreshClientLogs = useCallback(() => {
    const latest = getClientErrorBuffer().slice(0, MAX_CLIENT_ERRORS)
    setClientLogs(latest)
  }, [])

  const loadServerContext = useCallback(async () => {
    setLoadingContext(true)
    try {
      const res = await fetch(`/api/support/bug-context?limit=${MAX_SERVER_LOGS}`)
      const payload = (await res.json().catch(() => ({}))) as BugContextResponse
      if (!res.ok || payload.success !== true) {
        throw new Error(payload.error || "No se pudo cargar contexto técnico")
      }

      setServerLogs(normalizeServerLogs(payload.logs))
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo cargar contexto técnico"
      toast({ title: "Bug Center", description: message, variant: "destructive" })
    } finally {
      setLoadingContext(false)
    }
  }, [toast])

  useEffect(() => {
    refreshClientLogs()
    const unsubscribe = subscribeClientErrorBuffer(refreshClientLogs)
    return unsubscribe
  }, [refreshClientLogs])

  useEffect(() => {
    if (!canUse) return
    if (fetchPatchedRef.current) return

    const onError = (event: ErrorEvent) => {
      const message = event.message || "Error de runtime"
      recordClientError({
        type: "runtime",
        message,
        traceId: extractTraceId(message),
        route: pathname || undefined,
        details: asOptionalString(event.error?.stack),
      })
    }

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const rawReason = event.reason
      const reasonMessage = rawReason instanceof Error
        ? rawReason.message
        : typeof rawReason === "string"
          ? rawReason
          : "Unhandled promise rejection"

      recordClientError({
        type: "unhandledrejection",
        message: reasonMessage,
        traceId: extractTraceId(reasonMessage),
        route: pathname || undefined,
        details: rawReason instanceof Error ? rawReason.stack : undefined,
      })
    }

    originalFetchRef.current = window.fetch.bind(window)
    window.fetch = async (...args: Parameters<typeof window.fetch>) => {
      const start = Date.now()
      const endpoint = getFetchUrl(args[0])
      try {
        const response = await (originalFetchRef.current as typeof window.fetch)(...args)
        if (!response.ok) {
          const traceId = response.headers.get("x-trace-id") || undefined
          recordClientError({
            type: "fetch",
            message: `HTTP ${response.status} en ${endpoint || "request"}`,
            route: pathname || undefined,
            endpoint: endpoint || undefined,
            statusCode: response.status,
            traceId: traceId || undefined,
            details: `${response.statusText} (${Date.now() - start}ms)`,
          })
        }
        return response
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error de red"
        recordClientError({
          type: "fetch",
          message,
          route: pathname || undefined,
          endpoint: endpoint || undefined,
          traceId: extractTraceId(message),
          details: error instanceof Error ? error.stack : undefined,
        })
        throw error
      }
    }

    window.addEventListener("error", onError)
    window.addEventListener("unhandledrejection", onUnhandledRejection)
    fetchPatchedRef.current = true

    return () => {
      if (originalFetchRef.current) {
        window.fetch = originalFetchRef.current
        originalFetchRef.current = null
      }
      window.removeEventListener("error", onError)
      window.removeEventListener("unhandledrejection", onUnhandledRejection)
      fetchPatchedRef.current = false
    }
  }, [canUse, pathname])

  useEffect(() => {
    if (!open || !canUse) return
    void loadServerContext()
  }, [open, canUse, loadServerContext])

  const allTraceIds = useMemo(() => {
    const set = new Set<string>()
    for (const log of serverLogs) {
      if (log.traceId) set.add(log.traceId)
    }
    for (const log of clientLogs) {
      if (log.traceId) set.add(log.traceId)
    }
    return Array.from(set)
  }, [serverLogs, clientLogs])

  const buildDiagnosticText = useCallback(() => {
    const now = new Date().toISOString()
    const lines: string[] = []

    lines.push("=== BUG CENTER DIAGNOSTIC ===")
    lines.push(`Timestamp: ${now}`)
    lines.push(`Route: ${pathname || "unknown"}`)
    lines.push(`Role: ${role || "unknown"}`)
    lines.push(`UserId: ${session?.user?.id || "unknown"}`)
    lines.push(`Viewport: ${typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "n/a"}`)
    lines.push(`TraceIds: ${allTraceIds.join(", ") || "none"}`)
    lines.push("")
    lines.push("--- User Report ---")
    lines.push(`Title: ${title || "(sin título)"}`)
    lines.push(`Description: ${description || "(sin descripción)"}`)
    lines.push("")
    lines.push("--- Server Logs ---")

    if (serverLogs.length === 0) {
      lines.push("No server logs.")
    } else {
      for (const log of serverLogs.slice(0, MAX_SERVER_LOGS)) {
        lines.push(
          `[${log.createdAt}] ${log.level.toUpperCase()} ${log.source} traceId=${log.traceId} msg="${log.message}" endpoint=${log.endpoint || "-"} status=${log.statusCode || "-"}`
        )
      }
    }

    lines.push("")
    lines.push("--- Client Logs ---")
    if (clientLogs.length === 0) {
      lines.push("No client logs.")
    } else {
      for (const log of clientLogs.slice(0, MAX_CLIENT_ERRORS)) {
        lines.push(
          `[${log.timestamp}] ${log.type.toUpperCase()} traceId=${log.traceId || "-"} msg="${log.message}" endpoint=${log.endpoint || "-"} status=${log.statusCode || "-"}`
        )
      }
    }

    return lines.join("\n")
  }, [allTraceIds, clientLogs, description, pathname, role, serverLogs, session?.user?.id, title])

  const copyDiagnostic = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(buildDiagnosticText())
      toast({ title: "Copiado", description: "Diagnóstico copiado al portapapeles." })
    } catch {
      toast({ title: "Error", description: "No se pudo copiar el diagnóstico.", variant: "destructive" })
    }
  }, [buildDiagnosticText, toast])

  const submitReport = useCallback(async () => {
    setSubmitting(true)
    try {
      const response = await fetch("/api/support/bug-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || `Bug en ${pathname || "dashboard"}`,
          description: description.trim(),
          route: pathname || "",
          traceIds: allTraceIds,
          clientErrors: clientLogs.slice(0, MAX_CLIENT_ERRORS),
          context: {
            userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
            language: typeof navigator !== "undefined" ? navigator.language : undefined,
            viewport: typeof window !== "undefined" ? { width: window.innerWidth, height: window.innerHeight } : undefined,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            source: "bug-center",
            feature: "bug-center",
          },
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>
      if (!response.ok || payload.success !== true) {
        throw new Error(asString(payload.error, "No se pudo enviar el reporte"))
      }

      const reportId = asString(payload.reportId)
      const traceId = asString(payload.traceId)

      Sentry.withScope((scope) => {
        scope.setTag("feature", "bug-center")
        scope.setTag("route", pathname || "unknown")
        scope.setTag("role", role || "unknown")
        if (traceId) scope.setTag("traceId", traceId)
        if (session?.user?.id) scope.setUser({ id: session.user.id })
        scope.setContext("bugCenter", {
          reportId,
          traceIds: allTraceIds,
        })
        Sentry.captureMessage("Bug report sent from Bug Center", "info")
      })

      toast({
        title: "Reporte enviado",
        description: reportId ? `Reporte ${reportId} guardado correctamente.` : "Reporte guardado correctamente.",
      })

      setOpen(false)
      setTitle("")
      setDescription("")
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo enviar el reporte"
      toast({ title: "Error", description: message, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }, [allTraceIds, clientLogs, description, pathname, role, session?.user?.id, title, toast])

  if (!canUse) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="relative p-2 min-h-[44px] min-w-[44px] h-auto w-auto rounded-full bg-white/70 backdrop-blur hover:bg-white"
          aria-label="Abrir centro de bugs"
        >
          <Bug className="h-4 w-4 text-[#2553A1]" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" /> Bug Center
          </DialogTitle>
          <DialogDescription>
            Describe el problema y comparte este diagnóstico. No necesitas abrir consola.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bug-title">Qué pasó</Label>
            <Input
              id="bug-title"
              placeholder="Ej. No aparecen transcripciones de Zoom"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bug-description">Detalles</Label>
            <Textarea
              id="bug-description"
              placeholder="¿Qué esperabas que ocurriera y qué pasó realmente?"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-24"
            />
          </div>

          <div className="rounded-md border p-3 text-sm">
            <p className="font-medium">Contexto automático</p>
            <p className="text-muted-foreground mt-1">Ruta: {pathname || "unknown"}</p>
            <p className="text-muted-foreground">Rol: {role || "unknown"}</p>
            <p className="text-muted-foreground">Usuario: {session?.user?.id || "unknown"}</p>
            <p className="text-muted-foreground">TraceIds detectados: {allTraceIds.length || 0}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Diagnóstico técnico</Label>
              <Button variant="outline" size="sm" onClick={() => void loadServerContext()} disabled={loadingContext}>
                <RefreshCw className={`h-4 w-4 mr-1 ${loadingContext ? "animate-spin" : ""}`} />
                Refrescar
              </Button>
            </div>

            <ScrollArea className="h-64 rounded-md border p-2">
              <div className="space-y-2">
                {serverLogs.slice(0, MAX_SERVER_LOGS).map((log) => (
                  <div key={log._id} className="rounded border p-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{log.source}</Badge>
                      <Badge variant={log.level === "error" ? "destructive" : "secondary"}>{log.level}</Badge>
                      <span className="text-muted-foreground">{new Date(log.createdAt).toLocaleString("es-ES")}</span>
                    </div>
                    <p className="mt-1 font-medium">{log.message}</p>
                    <p className="text-muted-foreground">traceId: {log.traceId}</p>
                    {(log.endpoint || log.statusCode) && (
                      <p className="text-muted-foreground">
                        {log.endpoint || "(sin endpoint)"} {log.statusCode ? `· ${log.statusCode}` : ""}
                      </p>
                    )}
                  </div>
                ))}

                {clientLogs.slice(0, MAX_CLIENT_ERRORS).map((log) => (
                  <div key={log.id} className="rounded border border-amber-300 p-2 text-xs bg-amber-50/40">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">client</Badge>
                      <Badge variant="secondary">{log.type}</Badge>
                      <span className="text-muted-foreground">{new Date(log.timestamp).toLocaleString("es-ES")}</span>
                    </div>
                    <p className="mt-1 font-medium">{log.message}</p>
                    {log.traceId && <p className="text-muted-foreground">traceId: {log.traceId}</p>}
                    {(log.endpoint || log.statusCode) && (
                      <p className="text-muted-foreground">
                        {log.endpoint || "(sin endpoint)"} {log.statusCode ? `· ${log.statusCode}` : ""}
                      </p>
                    )}
                  </div>
                ))}

                {serverLogs.length === 0 && clientLogs.length === 0 && (
                  <p className="text-sm text-muted-foreground p-2">No hay errores recientes en el buffer.</p>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 flex gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              Recomendación: toma screenshot de este modal y envía también el texto copiado con el botón{" "}
              <strong>Copiar diagnóstico</strong>.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={copyDiagnostic}>
            <ClipboardCopy className="h-4 w-4 mr-2" /> Copiar diagnóstico
          </Button>
          <Button
            variant="outline"
            onClick={() => toast({ title: "Captura", description: "Toma screenshot de este modal y compártelo en soporte." })}
          >
            <Camera className="h-4 w-4 mr-2" /> Capturar pantalla
          </Button>
          <Button onClick={() => void submitReport()} disabled={submitting}>
            <Send className="h-4 w-4 mr-2" /> {submitting ? "Enviando..." : "Enviar reporte"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
