// Endpoint de clasificacion de alimentos con AI
// Solo para admins - clasifica texto libre en grupos nutricionales

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { classifyFood } from "@/lib/diagnostic/ai-food-classifier"
import { createLogger } from "@/lib/logger"

const logger = createLogger("API:admin:diagnostics:classify-food")

/**
 * POST /api/admin/diagnostics/classify-food
 *
 * Clasifica texto libre de notas de alimentacion en grupos nutricionales
 * usando OpenAI GPT-4. Solo accesible para admins.
 *
 * Body: { feedingNotes: string }
 * Response: { nutritionGroups: string[], aiClassified: boolean, confidence?: number }
 */
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticacion y permisos de admin
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      logger.warn("Intento de acceso no autorizado a classify-food", {
        userId: session?.user?.id,
        role: session?.user?.role,
      })
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Parsear body
    const body = await req.json()
    const { feedingNotes } = body

    // Validar input
    if (typeof feedingNotes !== "string") {
      return NextResponse.json(
        { error: "feedingNotes debe ser un string" },
        { status: 400 }
      )
    }

    // Si el texto esta vacio, retornar sin clasificar
    if (!feedingNotes.trim()) {
      return NextResponse.json({
        nutritionGroups: [],
        aiClassified: false,
        confidence: undefined,
      })
    }

    logger.info("Clasificando alimento", {
      adminId: session.user.id,
      textLength: feedingNotes.length,
    })

    // Llamar al clasificador AI
    const result = await classifyFood(feedingNotes)

    logger.info("Alimento clasificado", {
      adminId: session.user.id,
      aiClassified: result.aiClassified,
      groupsCount: result.nutritionGroups.length,
      confidence: result.confidence,
    })

    // Retornar resultado (sin rawText para la API publica)
    return NextResponse.json({
      nutritionGroups: result.nutritionGroups,
      aiClassified: result.aiClassified,
      confidence: result.confidence,
    })
  } catch (error) {
    logger.error("Error en classify-food:", error)

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
