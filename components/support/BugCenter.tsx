"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import * as Sentry from "@sentry/nextjs"
import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { Bug, Send } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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

      <DialogContent className="max-w-2xl w-[95vw] max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Bug className="h-5 w-5" /> Bug Center
          </DialogTitle>
          <DialogDescription className="text-xs">
            Describe el problema. El contexto tecnico se adjunta automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <div className="space-y-1.5">
            <Label htmlFor="bug-title" className="text-sm">Que paso</Label>
            <Input
              id="bug-title"
              placeholder="Ej. No aparecen transcripciones de Zoom"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bug-description" className="text-sm">Detalles</Label>
            <Textarea
              id="bug-description"
              placeholder="Que esperabas que ocurriera y que paso realmente?"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-20 max-h-28 resize-none"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Se adjuntara informacion tecnica automaticamente para ayudar a resolver el problema.
          </p>
        </div>

        <DialogFooter className="shrink-0 pt-3 border-t">
          <Button className="w-full" onClick={() => void submitReport()} disabled={submitting}>
            <Send className="h-4 w-4 mr-1.5" /> {submitting ? "Enviando..." : "Enviar reporte"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
