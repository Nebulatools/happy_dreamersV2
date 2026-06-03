// Widget de chat flotante de Happy Dreamers.
// Burbuja arrastrable (default abajo-derecha) + panel responsive (hoja en móvil).
// Habla con /api/assistant/chat (acciones por lenguaje natural). Gateado por flag.

"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Moon, X, Send, Loader2 } from "lucide-react"
import { useActiveChild } from "@/context/active-child-context"
import { useUser } from "@/context/UserContext"
import { useEventsInvalidation } from "@/hooks/use-events-cache"

interface Msg {
  role: "user" | "assistant"
  content: string
}

const WIDGET_ENABLED = process.env.NEXT_PUBLIC_ASSISTANT_WIDGET_ENABLED !== "false"
const GRAD = "linear-gradient(135deg,#628BE6,#67C5FF)"

export function AssistantWidget() {
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hola 🌙 Soy tu asistente. Dime, por ejemplo: \"registra que durmió de 8:30pm a 7am\" o \"¿cómo durmió esta semana?\"." },
  ])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)

  // posición de la burbuja (desktop, arrastrable)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number; moved: boolean } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const { activeChildId, setActiveChildId } = useActiveChild()
  const { userData } = useUser()
  const invalidateEvents = useEventsInvalidation()
  const [childName, setChildName] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener("resize", check)
    // posición guardada
    try {
      const saved = localStorage.getItem("hd_assistant_pos")
      if (saved) setPos(JSON.parse(saved))
    } catch {}
    return () => window.removeEventListener("resize", check)
  }, [])

  // nombre del niño activo (para contexto)
  useEffect(() => {
    if (!activeChildId) { setChildName(null); return }
    let cancel = false
    fetch("/api/children")
      .then((r) => r.json())
      .then((j) => {
        const list = j?.data?.children || j?.children || []
        const c = list.find((x: any) => (x._id?.toString?.() || x._id) === activeChildId)
        if (!cancel) setChildName(c ? `${c.firstName} ${c.lastName}`.trim() : null)
      })
      .catch(() => {})
    return () => { cancel = true }
  }, [activeChildId])

  useEffect(() => {
    if (open && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, open, sending])

  // ---------- drag de la burbuja (solo desktop) ----------
  const onPointerDown = (e: React.PointerEvent) => {
    if (isMobile) return
    const base = pos || defaultPos()
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: base.x, oy: base.y, moved: false }
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) d.moved = true
    const nx = Math.min(Math.max(d.ox + dx, 8), window.innerWidth - 72)
    const ny = Math.min(Math.max(d.oy + dy, 8), window.innerHeight - 72)
    setPos({ x: nx, y: ny })
  }
  const onPointerUp = () => {
    const d = dragRef.current
    dragRef.current = null
    if (!d) return
    if (!d.moved) {
      setOpen((o) => !o)
    } else if (pos) {
      try { localStorage.setItem("hd_assistant_pos", JSON.stringify(pos)) } catch {}
    }
  }

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput("")
    const next = [...messages, { role: "user" as const, content: text }]
    setMessages(next)
    setSending(true)
    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          childId: activeChildId,
          childName,
          history: next.slice(-9, -1),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Error")
      setMessages((m) => [...m, { role: "assistant", content: json.response }])
      // efectos secundarios
      const se = json.sideEffects || {}
      if (se.setActiveChild?.id) setActiveChildId(se.setActiveChild.id)
      if (se.eventsChanged) { try { invalidateEvents() } catch {} }
    } catch (e: any) {
      setMessages((m) => [...m, { role: "assistant", content: "Ups, hubo un problema. ¿Lo intentamos de nuevo?" }])
    } finally {
      setSending(false)
    }
  }, [input, sending, messages, activeChildId, childName, setActiveChildId, invalidateEvents])

  if (!mounted || !WIDGET_ENABLED) return null

  const bubble = pos || defaultPos()
  const bubbleStyle: React.CSSProperties = isMobile
    ? { right: 16, bottom: 84 } // arriba del bottom-nav móvil
    : { left: bubble.x, top: bubble.y }

  return (
    <>
      {/* BURBUJA */}
      {!open || isMobile ? (
        <button
          aria-label="Asistente"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onClick={() => isMobile && setOpen((o) => !o)}
          className="fixed z-[60] flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl transition-transform active:scale-95"
          style={{ ...bubbleStyle, background: GRAD, boxShadow: "0 12px 30px -8px rgba(37,83,161,.6)", touchAction: "none" }}
        >
          {open && isMobile ? <X className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
        </button>
      ) : null}

      {/* PANEL */}
      {open && (
        <div
          className="fixed z-[60] flex flex-col overflow-hidden bg-white shadow-2xl"
          style={
            isMobile
              ? { inset: 0, borderRadius: 0 }
              : {
                  left: Math.min(bubble.x, window.innerWidth - 392),
                  top: Math.max(bubble.y - 580, 12),
                  width: 376,
                  height: 560,
                  borderRadius: 20,
                  border: "1px solid #e6ecf8",
                }
          }
        >
          {/* header */}
          <div className="flex items-center justify-between px-4 py-3 text-white" style={{ background: GRAD }}>
            <div className="flex items-center gap-2">
              <Moon className="h-5 w-5" />
              <div className="leading-tight">
                <div className="text-sm font-bold">Asistente</div>
                <div className="text-[11px] opacity-90">{childName ? `Niño: ${childName}` : "Elige un niño"}</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Cerrar" className="rounded-full p-1.5 hover:bg-white/20">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* mensajes */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-[#f5f8ff] px-3 py-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-[14px] leading-snug ${
                    m.role === "user" ? "rounded-br-sm text-white" : "rounded-bl-sm border border-[#e6ecf8] bg-white text-[#10183a]"
                  }`}
                  style={m.role === "user" ? { background: GRAD } : undefined}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-[#e6ecf8] bg-white px-3.5 py-2 text-[13px] text-[#64709a]">
                  <Loader2 className="h-4 w-4 animate-spin" /> escribiendo…
                </div>
              </div>
            )}
          </div>

          {/* input */}
          <div className="flex items-end gap-2 border-t border-[#e6ecf8] bg-white p-2.5">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() }
              }}
              rows={1}
              placeholder="Escribe o pídeme registrar algo…"
              className="max-h-28 flex-1 resize-none rounded-xl border border-[#e6ecf8] bg-[#f5f8ff] px-3 py-2 text-[14px] outline-none focus:border-[#67C5FF]"
            />
            <button
              onClick={send}
              disabled={sending || !input.trim()}
              aria-label="Enviar"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white disabled:opacity-50"
              style={{ background: GRAD }}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function defaultPos() {
  if (typeof window === "undefined") return { x: 1200, y: 700 }
  return { x: window.innerWidth - 78, y: window.innerHeight - 88 }
}
