// Transcript analysis (sketch). Replace with Gemini/OpenAI integration.

import { createLogger } from "@/lib/logger"

const logger = createLogger("transcripts:analyze")

export async function analyzeTranscriptLLM(transcript: string, model: "gemini" | "openai" = "openai") {
  // NOTE: Keep it simple: return a stub structure for now.
  // Integrate @google/generative-ai or OpenAI client when ready.
  logger.info("Analyzing transcript (sketch)", { model, length: transcript?.length || 0 })

  // Very basic heuristics to create a sketch response
  const hasSymptoms = /tos|fiebre|moco|alerg/i.test(transcript || "")
  const hasSleepComplaints = /despert|insom|siest|dorm/i.test(transcript || "")

  const recommendations: string[] = []
  if (hasSleepComplaints) recommendations.push("Revisar consistencia de hora de acostarse y ventanas 2–4h.")
  if (hasSymptoms) recommendations.push("Consultar síntomatología con pediatra si persiste más de 48h.")

  return {
    summary: `Resumen automático (borrador): ${hasSymptoms ? "Se mencionan síntomas." : "Sin síntomas claros."} ${hasSleepComplaints ? "Hay que ajustar rutina de sueño." : "Rutina sin problemas evidentes."}`,
    recommendations,
  }
}

