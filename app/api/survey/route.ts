// API para gestionar encuestas
// Permite guardar y recuperar respuestas de encuestas

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

import { createLogger } from "@/lib/logger"

const logger = createLogger("API:survey:route")


// GET: Obtener respuestas de encuesta
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const childId = searchParams.get("childId")

    if (!childId) {
      return NextResponse.json({ message: "Falta el ID del niño" }, { status: 400 })
    }

    // Conectar a la base de datos
    const client = await clientPromise
    const db = client.db()

    // Verificar que el niño pertenece al usuario o es admin
    const child = await db.collection("children").findOne({ 
      _id: new ObjectId(childId),
      parentId: session.user.id,
    })

    if (!child) {
      return NextResponse.json({ message: "Niño no encontrado o no autorizado" }, { status: 404 })
    }

    // Verificamos si el niño tiene datos de encuesta
    if (!child.surveyData) {
      return NextResponse.json({ message: "Encuesta no encontrada" }, { status: 404 })
    }

    return NextResponse.json({
      childId: child._id.toString(),
      parentId: child.parentId,
      surveyData: child.surveyData,
      updatedAt: child.surveyUpdatedAt || child.updatedAt || child.createdAt,
    })
  } catch (error) {
    logger.error("Error al obtener encuesta:", error)
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 })
  }
}

// POST: Guardar respuestas de encuesta
export async function POST(req: Request) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 })
    }

    // Obtener datos de la solicitud
    const { childId, surveyData, isPartialSave = false, currentStep } = await req.json()

    if (!childId || !surveyData) {
      return NextResponse.json({ message: "Datos incompletos" }, { status: 400 })
    }

    // Conectar a la base de datos
    const client = await clientPromise
    const db = client.db()

    // Verificar que el niño pertenezca al usuario autenticado
    const child = await db.collection("children").findOne({
      _id: new ObjectId(childId),
      parentId: session.user.id,
    })

    if (!child) {
      return NextResponse.json({ message: "Niño no encontrado o no autorizado" }, { status: 404 })
    }

    // Preparar datos según el tipo de guardado
    let surveyDataToSave
    let updateFields
    
    if (isPartialSave) {
      // Para guardado parcial: no marcar como completado, incluir paso actual
      surveyDataToSave = {
        ...surveyData,
        isPartial: true,
        currentStep: currentStep,
        lastSavedAt: new Date()
      }
      updateFields = {
        surveyData: surveyDataToSave,
        surveyUpdatedAt: new Date(),
      }
      logger.info(`Guardado parcial para niño ${childId} en paso ${currentStep}`)
    } else {
      // Para guardado final: marcar como completado
      surveyDataToSave = {
        ...surveyData,
        isPartial: false,
        completedAt: surveyData.completedAt || new Date(),
        currentStep: undefined // Limpiar paso actual ya que está completo
      }
      updateFields = {
        surveyData: surveyDataToSave,
        surveyUpdatedAt: new Date(),
      }
      logger.info(`Guardado final para niño ${childId} - encuesta completada`)
    }
    
    const result = await db.collection("children").updateOne(
      { _id: new ObjectId(childId) },
      { $set: updateFields }
    )

    // Verificar si la actualización tuvo éxito
    if (result.matchedCount === 0) {
      return NextResponse.json({ 
        message: "No se encontró el niño para actualizar", 
        success: false, 
      }, { status: 404 })
    }

    const message = isPartialSave 
      ? `Progreso guardado correctamente en paso ${currentStep}`
      : "Encuesta completada y guardada correctamente en el perfil del niño"
    
    return NextResponse.json(
      {
        message,
        success: true,
        updated: result.modifiedCount > 0,
        isPartialSave,
        currentStep: isPartialSave ? currentStep : undefined,
      },
      { status: 200 },
    )
  } catch (error: any) {
    logger.error("Error al guardar encuesta:", error)
    return NextResponse.json({ 
      message: "Error interno del servidor", 
      error: error?.message || "Error desconocido", 
    }, { status: 500 })
  }
}
