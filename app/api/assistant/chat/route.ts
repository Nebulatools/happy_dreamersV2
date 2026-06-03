// Endpoint del asistente flotante de Happy Dreamers.
// Tool-calling (ai SDK v4) con la sesión del usuario: registra/consulta eventos por
// lenguaje natural llamando directo a los servicios internos (sin API key de HD).

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import * as Sentry from "@sentry/nextjs"
import { createLogger } from "@/lib/logger"
import { DEFAULT_TIMEZONE } from "@/lib/datetime"
import { createAssistantTools, AssistantSideEffects } from "@/lib/assistant/tools"
import { nowContext } from "@/lib/assistant/format"

const logger = createLogger("API:assistant:chat")

const MARIANA_TONE =
  "Eres la asistente de Happy Dreamers, cálida, cercana y experta en sueño infantil (estilo 'Dra. Mariana'). " +
  "Hablas español de México, claro y breve."

function buildSystem(params: { childName: string | null; tz: string }): string {
  const now = nowContext(params.tz)
  return [
    MARIANA_TONE,
    "",
    "Puedes EJECUTAR acciones con tus herramientas (tools): registrar eventos de sueño/siesta/despertar/alimentación/medicamento/actividad, " +
      "editar o borrar el último evento, listar eventos, dar estadísticas, ver el estado actual, cambiar de niño y manejar notificaciones. " +
      "También respondes dudas y consejos de sueño infantil (usa search_knowledge si hace falta).",
    "",
    "REGLAS:",
    `- Niño activo: ${params.childName || "ninguno seleccionado"}. Si una acción necesita un niño y no hay, pide elegir uno (o usa set_active_child si te dan el nombre).`,
    `- Fecha y hora actual del usuario: ${now.pretty}. Resuelve "anoche/hoy/ayer/esta semana" a fechas concretas (YYYY-MM-DD) con base en esto.`,
    "- Para registrar/editar, pasa dateStr (YYYY-MM-DD) y timeStr (HH:mm). NUNCA inventes el timestamp final; la herramienta lo arma.",
    "- Si faltan datos clave (hora, tipo), pregunta con UNA pregunta corta antes de registrar.",
    "- Para BORRAR: primero llama delete_last_event con confirmed=false, muestra qué se borraría y pide confirmación; solo borra cuando el usuario confirme.",
    "- En estadísticas/estado/listas NO inventes números: usa siempre los datos que devuelven las tools.",
    "- Respuestas cortas, amables y con confirmación clara de lo que hiciste.",
  ].join("\n")
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const message: string = (body?.message || "").toString().trim()
    const childId: string | null = body?.childId || null
    const childName: string | null = body?.childName || null
    const history: Array<{ role: string; content: string }> = Array.isArray(body?.history) ? body.history : []

    if (!message) {
      return NextResponse.json({ error: "Falta el mensaje" }, { status: 400 })
    }

    const tz = (session.user as any).timezone || DEFAULT_TIMEZONE
    const { db } = await connectToDatabase()

    const sideEffects: AssistantSideEffects = {}
    const ctx = {
      db,
      actor: { id: session.user.id, role: (session.user as any).role },
      childId,
      childName,
      timezone: tz,
      sideEffects,
    }
    const tools = createAssistantTools(ctx)

    const messages = [
      ...history
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
        .slice(-8)
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: message },
    ]

    const result = await generateText({
      model: openai("gpt-4o-mini"),
      system: buildSystem({ childName: ctx.childName, tz }),
      messages,
      tools,
      maxSteps: 6,
      temperature: 0.4,
    })

    return NextResponse.json({
      response: result.text || "Listo.",
      sideEffects,
    })
  } catch (error: any) {
    logger.error("Error en asistente:", error?.message || error)
    Sentry.captureException(error)
    return NextResponse.json(
      { error: "Hubo un problema con el asistente. Intenta de nuevo." },
      { status: 500 }
    )
  }
}
