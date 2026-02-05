// Endpoint de resumen AI del Pasante para el Panel de Diagnostico
// Solo para admins - genera resumen descriptivo + recomendaciones generales

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { OpenAI } from "openai"
import { authOptions } from "@/lib/auth"
import {
  getPasanteSystemPrompt,
  getPasanteUserPrompt,
  PASANTE_AI_CONFIG,
  type PasanteContext,
} from "@/lib/diagnostic/pasante-ai-prompt"
import type { DiagnosticResult } from "@/lib/diagnostic/types"
import { createLogger } from "@/lib/logger"

const logger = createLogger("API:admin:diagnostics:ai-summary")

// Interface del body esperado
interface AISummaryRequestBody {
  childId: string
  childName: string
  childAgeMonths: number
  planVersion: string
  planStatus: string
  diagnosticResult: DiagnosticResult
  recentEventsCount?: number
  surveyDataAvailable?: boolean
  additionalContext?: string
  // Sprint 4B: Texto libre para analisis extendido
  freeTextData?: {
    eventNotes: string[]     // Notas de eventos de los ultimos 14 dias
    chatMessages: string[]   // Mensajes de chat de los ultimos 14 dias
  }
}

/**
 * POST /api/admin/diagnostics/ai-summary
 *
 * Genera un resumen AI descriptivo del diagnostico de un nino
 * usando OpenAI GPT-4 con el prompt del Pasante AI.
 *
 * Body: AISummaryRequestBody
 * Response: { aiSummary: string }
 */
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticacion y permisos de admin
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      logger.warn("Intento de acceso no autorizado a ai-summary", {
        userId: session?.user?.id,
        role: session?.user?.role,
      })
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Parsear body
    const body: AISummaryRequestBody = await req.json()

    // Validar campos requeridos
    if (!body.childId || typeof body.childId !== "string") {
      return NextResponse.json(
        { error: "childId es requerido" },
        { status: 400 }
      )
    }

    if (!body.childName || typeof body.childName !== "string") {
      return NextResponse.json(
        { error: "childName es requerido" },
        { status: 400 }
      )
    }

    if (typeof body.childAgeMonths !== "number" || body.childAgeMonths < 0) {
      return NextResponse.json(
        { error: "childAgeMonths debe ser un numero positivo" },
        { status: 400 }
      )
    }

    if (!body.diagnosticResult) {
      return NextResponse.json(
        { error: "diagnosticResult es requerido" },
        { status: 400 }
      )
    }

    logger.info("Generando resumen AI", {
      adminId: session.user.id,
      childId: body.childId,
      childAgeMonths: body.childAgeMonths,
    })

    // Construir contexto para el Pasante AI
    const pasanteContext: PasanteContext = {
      childName: body.childName,
      childAgeMonths: body.childAgeMonths,
      planVersion: body.planVersion || "1",
      planStatus: body.planStatus || "active",
      diagnosticResult: body.diagnosticResult,
      recentEventsCount: body.recentEventsCount ?? 0,
      surveyDataAvailable: body.surveyDataAvailable ?? false,
      // Sprint 4B: Incluir texto libre si viene en el request
      freeTextData: body.freeTextData,
    }

    // Log de texto libre si hay
    if (body.freeTextData) {
      logger.info("Pasante AI con texto libre", {
        childId: body.childId,
        eventNotesCount: body.freeTextData.eventNotes?.length ?? 0,
        chatMessagesCount: body.freeTextData.chatMessages?.length ?? 0,
      })
    }

    // Generar prompts
    const systemPrompt = getPasanteSystemPrompt(pasanteContext)
    const userPrompt = getPasanteUserPrompt(body.additionalContext)

    // Validar API key antes de intentar la llamada
    if (!process.env.OPENAI_API_KEY) {
      logger.error("OPENAI_API_KEY no configurada")
      return NextResponse.json(
        { error: "Servicio AI no configurado" },
        { status: 503 }
      )
    }

    // Log de debug antes de la llamada
    logger.info("Pasante AI request", {
      childId: body.childId,
      systemPromptLength: systemPrompt.length,
      userPromptLength: userPrompt.length,
      model: PASANTE_AI_CONFIG.model,
    })

    // Inicializar OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    // Llamar a OpenAI con la configuracion del Pasante
    // Nota: GPT-5 usa max_completion_tokens y solo soporta temperature=1
    const completion = await openai.chat.completions.create({
      model: PASANTE_AI_CONFIG.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_completion_tokens: PASANTE_AI_CONFIG.maxTokens,
    })

    // Debug: Log completo de la respuesta para GPT-5
    logger.info("OpenAI response debug", {
      childId: body.childId,
      hasChoices: !!completion.choices,
      choicesLength: completion.choices?.length,
      firstChoice: completion.choices?.[0] ? {
        finishReason: completion.choices[0].finish_reason,
        hasMessage: !!completion.choices[0].message,
        messageRole: completion.choices[0].message?.role,
        contentLength: completion.choices[0].message?.content?.length,
        contentPreview: completion.choices[0].message?.content?.substring(0, 100),
      } : null,
    })

    const aiSummary = completion.choices[0]?.message?.content

    if (!aiSummary) {
      logger.error("OpenAI no retorno contenido", {
        childId: body.childId,
        fullResponse: JSON.stringify(completion, null, 2).substring(0, 500),
      })
      return NextResponse.json(
        { error: "No se pudo generar el resumen AI" },
        { status: 500 }
      )
    }

    logger.info("Resumen AI generado", {
      adminId: session.user.id,
      childId: body.childId,
      summaryLength: aiSummary.length,
    })

    return NextResponse.json({ aiSummary })
  } catch (error) {
    logger.error("Error en ai-summary:", {
      error: error instanceof Error ? error.message : "Unknown",
      stack: error instanceof Error ? error.stack : undefined,
      childId: "unknown",
    })

    // Errores especificos de OpenAI
    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        return NextResponse.json(
          { error: "Error de configuracion del servicio AI" },
          { status: 503 }
        )
      }
      if (error.message.includes("context length") || error.message.includes("maximum")) {
        return NextResponse.json(
          { error: "Diagnostico demasiado extenso para analizar" },
          { status: 400 }
        )
      }
      if (error.message.includes("model")) {
        return NextResponse.json(
          { error: "Modelo AI no disponible" },
          { status: 503 }
        )
      }
    }

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
