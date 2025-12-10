// API para editar secciones de la encuesta de un nino
// Solo admins pueden editar encuestas

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { createLogger } from "@/lib/logger"

const logger = createLogger("API:children:[id]:survey:route")

// Secciones validas de la encuesta
const VALID_SECTIONS = [
  "informacionFamiliar",
  "dinamicaFamiliar",
  "historial",
  "desarrolloSalud",
  "actividadFisica",
  "rutinaHabitos",
]

// PATCH /api/children/[id]/survey - actualizar una seccion de la encuesta
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Solo admins pueden editar encuestas
    if (session.user.role !== "admin") {
      logger.warn(`Usuario ${session.user.id} intento editar encuesta sin permisos de admin`)
      return NextResponse.json(
        { error: "Solo administradores pueden editar encuestas" },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { section, data } = body

    // Validar que se proporciono una seccion
    if (!section) {
      return NextResponse.json(
        { error: "Se requiere especificar una seccion" },
        { status: 400 }
      )
    }

    // Validar que la seccion es valida
    if (!VALID_SECTIONS.includes(section)) {
      return NextResponse.json(
        { error: `Seccion invalida. Secciones validas: ${VALID_SECTIONS.join(", ")}` },
        { status: 400 }
      )
    }

    // Validar que se proporcionaron datos
    if (!data || typeof data !== "object") {
      return NextResponse.json(
        { error: "Se requieren datos para actualizar la seccion" },
        { status: 400 }
      )
    }

    logger.info(`Admin ${session.user.id} editando seccion ${section} del nino ${id}`)

    const { db } = await connectToDatabase()

    // Verificar que el nino existe
    const child = await db.collection("children").findOne({
      _id: new ObjectId(id),
    })

    if (!child) {
      logger.error(`Nino con ID ${id} no encontrado`)
      return NextResponse.json({ error: "Nino no encontrado" }, { status: 404 })
    }

    // Actualizar solo la seccion especificada
    const updateResult = await db.collection("children").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          [`surveyData.${section}`]: data,
          "surveyData.lastUpdated": new Date(),
          updatedAt: new Date(),
        },
      }
    )

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { error: "No se pudo actualizar la encuesta" },
        { status: 500 }
      )
    }

    logger.info(`Seccion ${section} actualizada exitosamente para nino ${id}`)

    return NextResponse.json({
      success: true,
      message: `Seccion "${section}" actualizada correctamente`,
      modifiedCount: updateResult.modifiedCount,
    })
  } catch (error) {
    logger.error("Error al actualizar seccion de encuesta:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// GET /api/children/[id]/survey - obtener solo los datos de encuesta
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Solo admins pueden ver encuestas directamente por esta ruta
    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Solo administradores pueden acceder a esta ruta" },
        { status: 403 }
      )
    }

    const { id } = await params
    const { db } = await connectToDatabase()

    const child = await db.collection("children").findOne(
      { _id: new ObjectId(id) },
      { projection: { surveyData: 1, firstName: 1, lastName: 1 } }
    )

    if (!child) {
      return NextResponse.json({ error: "Nino no encontrado" }, { status: 404 })
    }

    // Enriquecer surveyData con flags estandar
    const surveyData = child.surveyData
      ? {
          ...child.surveyData,
          completed:
            child.surveyData.completed ??
            (!!child.surveyData.completedAt && child.surveyData.isPartial !== true),
          lastUpdated: child.surveyData.lastUpdated ?? child.updatedAt,
        }
      : null

    return NextResponse.json({
      childId: id,
      childName: `${child.firstName} ${child.lastName}`,
      surveyData,
    })
  } catch (error) {
    logger.error("Error al obtener encuesta:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
