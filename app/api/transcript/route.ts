// API para transcript de audio usando Google Gemini
// Convierte archivos de audio a texto para usar en consultas

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

import { createLogger } from "@/lib/logger"

const logger = createLogger("API:transcript:route")


export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación y permisos de admin
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const formData = await req.formData()
    const audioFile = formData.get("audio") as File

    if (!audioFile) {
      return NextResponse.json({ 
        error: "No se proporcionó archivo de audio", 
      }, { status: 400 })
    }

    // Verificar tipo de archivo (ampliado para navegadores modernos)
    const allowedTypes = [
      "audio/wav", 
      "audio/mp3", 
      "audio/mpeg", 
      "audio/webm", 
      "audio/webm;codecs=opus",
      "audio/ogg", 
      "audio/mp4",
      "audio/x-wav",
      "audio/wave",
    ]
    
    logger.info("Tipo de archivo recibido:", audioFile.type)
    
    if (!allowedTypes.includes(audioFile.type)) {
      return NextResponse.json({ 
        error: `Tipo de archivo no soportado: ${audioFile.type}. Use WAV, MP3, WebM u OGG.`, 
      }, { status: 400 })
    }

    // Verificar tamaño del archivo (máximo 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (audioFile.size > maxSize) {
      return NextResponse.json({ 
        error: "El archivo es demasiado grande. Máximo 10MB.", 
      }, { status: 400 })
    }

    // Convertir archivo a base64 para enviar a Gemini
    const audioBuffer = await audioFile.arrayBuffer()
    const audioBase64 = Buffer.from(audioBuffer).toString("base64")

    // Llamar a la API de Google Gemini para transcript
    const transcriptResult = await transcribeWithGemini(audioBase64, audioFile.type)

    return NextResponse.json({
      success: true,
      transcript: transcriptResult.transcript,
      confidence: transcriptResult.confidence,
      duration: transcriptResult.duration,
      metadata: {
        filename: audioFile.name,
        filesize: audioFile.size,
        filetype: audioFile.type,
        processedAt: new Date().toISOString(),
      },
    })

  } catch (error) {
    logger.error("Error en transcript:", error)
    return NextResponse.json({ 
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : "Error desconocido",
    }, { status: 500 })
  }
}

// Función para transcribir audio usando Google Gemini
async function transcribeWithGemini(audioBase64: string, mimeType: string) {
  try {
    // Configurar la API key de Google
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) {
      throw new Error("API key de Google Gemini no configurada")
    }

    // Preparar el payload para Gemini
    const payload = {
      contents: [
        {
          parts: [
            {
              text: "Transcribe exactamente todo lo que se dice en este archivo de audio. Devuelve SOLO el texto hablado, sin comentarios adicionales.",
            },
            {
              inline_data: {
                mime_type: mimeType,
                data: audioBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        topK: 32,
        topP: 1,
        maxOutputTokens: 2048,
      },
    }

    // Hacer la petición a Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    )

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Error de Gemini API: ${response.status} - ${errorData}`)
    }

    const result = await response.json()
    
    // Extraer el transcript del resultado
    const transcript = result.candidates?.[0]?.content?.parts?.[0]?.text || ""
    
    if (!transcript) {
      throw new Error("No se pudo obtener transcript del audio")
    }

    // Calcular métricas básicas
    const wordCount = transcript.split(" ").length
    const confidence = calculateConfidenceScore(transcript)
    const estimatedDuration = wordCount * 0.4 // Aproximación: 150 palabras por minuto

    return {
      transcript: transcript.trim(),
      confidence,
      duration: Math.round(estimatedDuration),
      wordCount,
    }

  } catch (error) {
    logger.error("Error en transcripción con Gemini:", error)
    throw new Error(`Error al transcribir audio: ${error instanceof Error ? error.message : "Error desconocido"}`)
  }
}

// Función para calcular un score de confianza básico
function calculateConfidenceScore(transcript: string): number {
  // Métricas básicas para estimar la calidad del transcript
  const wordCount = transcript.split(" ").length
  const hasmedicalTerms = /\b(sueño|siesta|despertar|alimentación|llanto|fiebre|desarrollo|crecimiento|pediatría)\b/i.test(transcript)
  const hasProperStructure = transcript.includes(".") || transcript.includes(",")
  const hasReasonableLength = wordCount > 10 && wordCount < 2000

  let score = 0.5 // Base score
  
  if (hasmedicalTerms) score += 0.2
  if (hasProperStructure) score += 0.2
  if (hasReasonableLength) score += 0.1
  
  // Penalizar transcripts muy cortos o que parecen errores
  if (wordCount < 5) score *= 0.3
  if (transcript.includes("[inaudible]") || transcript.includes("[unclear]")) score *= 0.8
  
  return Math.min(Math.max(score, 0), 1) // Mantener entre 0 y 1
}

// Endpoint GET para verificar estado del servicio
export async function GET() {
  return NextResponse.json({
    service: "transcript-api",
    status: "active",
    supportedFormats: ["audio/wav", "audio/mp3", "audio/mpeg", "audio/webm", "audio/ogg"],
    maxFileSize: "10MB",
    provider: "Google Gemini",
  })
}