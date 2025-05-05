// API para gestionar encuestas
// Permite guardar y recuperar respuestas de encuestas

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"

// GET: Obtener respuestas de encuesta
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const childId = searchParams.get("childId")
    const surveyId = searchParams.get("surveyId")

    if (!childId) {
      return NextResponse.json({ message: "Falta el ID del niño" }, { status: 400 })
    }

    // Conectar a la base de datos
    const { db } = await connectToDatabase()

    // Construir la consulta
    const query: any = { childId }

    // Si se especifica un ID de encuesta
    if (surveyId) {
      query.surveyId = surveyId
    }

    // Verificar que el niño pertenece al usuario o es admin
    const child = await db.collection("children").findOne({ _id: childId })

    if (!child) {
      return NextResponse.json({ message: "Niño no encontrado" }, { status: 404 })
    }

    if (child.parentId !== session.user.id && session.user.role !== "admin") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 })
    }

    // Obtener las respuestas
    const answers = await db.collection("survey_answers").find(query).toArray()

    return NextResponse.json(answers)
  } catch (error) {
    console.error("Error al obtener respuestas de encuesta:", error)
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 })
  }
}

// POST: Guardar respuestas de encuesta
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 })
    }

    const data = await req.json()

    // Validar los datos
    if (!data.childId || !data.surveyId || !data.answers) {
      return NextResponse.json({ message: "Faltan datos requeridos" }, { status: 400 })
    }

    // Conectar a la base de datos
    const { db } = await connectToDatabase()

    // Verificar que el niño pertenece al usuario o es admin
    const child = await db.collection("children").findOne({ _id: data.childId })

    if (!child) {
      return NextResponse.json({ message: "Niño no encontrado" }, { status: 404 })
    }

    if (child.parentId !== session.user.id && session.user.role !== "admin") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 })
    }

    // Eliminar respuestas anteriores para esta encuesta y niño
    await db.collection("survey_answers").deleteMany({
      childId: data.childId,
      surveyId: data.surveyId,
    })

    // Guardar las nuevas respuestas
    const result = await db.collection("survey_answers").insertOne({
      childId: data.childId,
      surveyId: data.surveyId,
      answers: data.answers,
      createdBy: session.user.id,
      createdAt: new Date(),
    })

    return NextResponse.json(
      {
        message: "Respuestas guardadas correctamente",
        answerId: result.insertedId,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error al guardar respuestas de encuesta:", error)
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 })
  }
}
