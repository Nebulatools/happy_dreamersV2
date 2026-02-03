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
    }

    // Generar prompts
    const systemPrompt = getPasanteSystemPrompt(pasanteContext)
    const userPrompt = getPasanteUserPrompt(body.additionalContext)

    // Inicializar OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    // Llamar a OpenAI con la configuracion del Pasante
    const completion = await openai.chat.completions.create({
      model: PASANTE_AI_CONFIG.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: PASANTE_AI_CONFIG.maxTokens,
      temperature: PASANTE_AI_CONFIG.temperature,
      presence_penalty: PASANTE_AI_CONFIG.presencePenalty,
      frequency_penalty: PASANTE_AI_CONFIG.frequencyPenalty,
    })

    const aiSummary = completion.choices[0]?.message?.content

    if (!aiSummary) {
      logger.error("OpenAI no retorno contenido", {
        childId: body.childId,
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
    logger.error("Error en ai-summary:", error)

    // Manejar error de API key
    if (error instanceof Error && error.message.includes("API key")) {
      return NextResponse.json(
        { error: "Error de configuracion del servicio AI" },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
