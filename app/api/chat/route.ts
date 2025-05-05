// API para el chatbot
// Permite interactuar con el asistente IA

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 })
    }

    const { message, childId } = await req.json()

    if (!message) {
      return NextResponse.json({ message: "Falta el mensaje" }, { status: 400 })
    }

    // Conectar a la base de datos
    const { db } = await connectToDatabase()

    // Si se proporciona un ID de niño, obtener información relevante
    let childInfo = ""
    if (childId) {
      const child = await db.collection("children").findOne({ _id: childId })
      if (child) {
        childInfo = `Información del niño:
          - Nombre: ${child.firstName} ${child.lastName}
          - Edad: ${calculateAge(child.birthDate)} años
          - Fecha de nacimiento: ${new Date(child.birthDate).toLocaleDateString()}
        `

        // Obtener las respuestas de la encuesta
        const surveyAnswers = await db.collection("survey_answers").find({ childId }).toArray()
        if (surveyAnswers.length > 0) {
          childInfo += "\nRespuestas de la encuesta:\n"
          surveyAnswers.forEach((survey) => {
            childInfo += `- Encuesta ${survey.surveyId}:\n`
            Object.entries(survey.answers).forEach(([key, value]) => {
              childInfo += `  - ${key}: ${value}\n`
            })
          })
        }

        // Obtener los últimos eventos
        const recentEvents = await db.collection("events").find({ childId }).sort({ startTime: -1 }).limit(5).toArray()
        if (recentEvents.length > 0) {
          childInfo += "\nEventos recientes:\n"
          recentEvents.forEach((event) => {
            childInfo += `- ${event.eventType} (${new Date(event.startTime).toLocaleString()}): ${
              event.notes || "Sin notas"
            }\n`
          })
        }
      }
    }

    // Generar respuesta con OpenAI
    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: `Eres un asistente especializado en sueño infantil para la aplicación Happy Dreamers. 
              Responde de manera amable y profesional a la siguiente consulta sobre sueño infantil.
              Proporciona consejos prácticos y basados en evidencia científica.
              
              ${childInfo ? `Contexto sobre el niño:\n${childInfo}\n` : ""}
              
              Consulta del usuario: ${message}`,
    })

    // Guardar la conversación
    await db.collection("chat_messages").insertOne({
      userId: session.user.id,
      childId: childId || null,
      message,
      response: text,
      timestamp: new Date(),
    })

    return NextResponse.json({ response: text })
  } catch (error) {
    console.error("Error en el chatbot:", error)
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 })
  }
}

// Función para calcular la edad en años
function calculateAge(birthDate: string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }

  return age
}
