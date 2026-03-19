// Analisis de transcripciones de consultas pediatricas de sueno con LLM.
// Usa OpenAI GPT-4 como motor principal, con fallback a heuristicas regex.

import { OpenAI } from "openai"
import { createLogger } from "@/lib/logger"

const logger = createLogger("TranscriptAnalysis")

interface TranscriptAnalysis {
  summary: string
  recommendations: string[]
  sleepIssues: string[]
  routineChanges: string[]
}

const ANALYSIS_PROMPT = `Eres un asistente de analisis de consultas pediatricas de sueno.
Analiza la siguiente transcripcion de una consulta y extrae:
1. Resumen de la consulta (2-3 oraciones)
2. Problemas de sueno identificados
3. Recomendaciones principales
4. Cambios de rutina discutidos

Responde EXCLUSIVAMENTE en formato JSON con esta estructura:
{
  "summary": "string",
  "recommendations": ["string"],
  "sleepIssues": ["string"],
  "routineChanges": ["string"]
}

Si algun campo no tiene informacion relevante, devuelve un array vacio o un string indicandolo.
No incluyas nada fuera del JSON.`

/**
 * Analiza una transcripcion de consulta usando LLM (GPT-4).
 * Si la llamada a la API falla, se utiliza un fallback basado en regex.
 */
export async function analyzeTranscriptLLM(
  transcript: string,
  model: "gemini" | "openai" = "openai"
): Promise<TranscriptAnalysis> {
  logger.info("Analyzing transcript", { model, length: transcript?.length || 0 })

  if (!transcript || transcript.trim().length === 0) {
    logger.warn("Empty transcript provided, returning empty analysis")
    return {
      summary: "Transcripcion vacia, no se pudo analizar.",
      recommendations: [],
      sleepIssues: [],
      routineChanges: [],
    }
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured")
    }

    const openai = new OpenAI({ apiKey })

    // Truncar transcripciones muy largas para respetar limites de tokens
    const maxChars = 12000
    const truncatedTranscript =
      transcript.length > maxChars
        ? transcript.slice(0, maxChars) + "\n\n[...transcripcion truncada por longitud]"
        : transcript

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: ANALYSIS_PROMPT },
        { role: "user", content: truncatedTranscript },
      ],
      temperature: 0.3,
      max_tokens: 800,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error("Empty response from OpenAI")
    }

    // Extraer JSON de la respuesta (tolerar markdown code fences)
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("No JSON found in LLM response")
    }

    const parsed = JSON.parse(jsonMatch[0]) as Partial<TranscriptAnalysis>

    const result: TranscriptAnalysis = {
      summary: typeof parsed.summary === "string" ? parsed.summary : "No se pudo generar resumen.",
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      sleepIssues: Array.isArray(parsed.sleepIssues) ? parsed.sleepIssues : [],
      routineChanges: Array.isArray(parsed.routineChanges) ? parsed.routineChanges : [],
    }

    logger.info("Transcript analysis completed via LLM", {
      summaryLength: result.summary.length,
      recommendationsCount: result.recommendations.length,
      sleepIssuesCount: result.sleepIssues.length,
      routineChangesCount: result.routineChanges.length,
    })

    return result
  } catch (error) {
    logger.error("LLM analysis failed, falling back to regex heuristics", {
      error: error instanceof Error ? error.message : String(error),
    })

    return fallbackRegexAnalysis(transcript)
  }
}

/**
 * Fallback basado en regex cuando la API de LLM no esta disponible.
 * Conserva la logica original del stub.
 */
function fallbackRegexAnalysis(transcript: string): TranscriptAnalysis {
  const hasSymptoms = /tos|fiebre|moco|alerg/i.test(transcript)
  const hasSleepComplaints = /despert|insom|siest|dorm/i.test(transcript)
  const hasRoutineDiscussion = /rutina|horario|hora de acost|ventana/i.test(transcript)

  const recommendations: string[] = []
  const sleepIssues: string[] = []
  const routineChanges: string[] = []

  if (hasSleepComplaints) {
    recommendations.push("Revisar consistencia de hora de acostarse y ventanas 2-4h.")
    sleepIssues.push("Se mencionan problemas relacionados con el sueno.")
  }
  if (hasSymptoms) {
    recommendations.push("Consultar sintomatologia con pediatra si persiste mas de 48h.")
    sleepIssues.push("Sintomas fisicos que pueden afectar el sueno.")
  }
  if (hasRoutineDiscussion) {
    routineChanges.push("Se discutieron ajustes de rutina durante la consulta.")
  }

  return {
    summary: `Resumen automatico (heuristico): ${hasSymptoms ? "Se mencionan sintomas." : "Sin sintomas claros."} ${hasSleepComplaints ? "Hay que ajustar rutina de sueno." : "Rutina sin problemas evidentes."}`,
    recommendations,
    sleepIssues,
    routineChanges,
  }
}
