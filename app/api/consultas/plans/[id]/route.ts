// API endpoint para actualizar planes de niños
// Permite editar horarios, objetivos y recomendaciones

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { createLogger } from "@/lib/logger"

const logger = createLogger('api/consultas/plans/[id]')

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar sesión
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const { id: planId } = await params
    
    if (!planId || !ObjectId.isValid(planId)) {
      return NextResponse.json(
        { error: "ID de plan inválido" },
        { status: 400 }
      )
    }

    // Obtener datos del body
    const body = await req.json()
    const { schedule, objectives, recommendations } = body

    // Validación básica
    if (!schedule || !objectives || !recommendations) {
      return NextResponse.json(
        { error: "Datos incompletos para actualizar el plan" },
        { status: 400 }
      )
    }

    // Conectar a la base de datos
    const { db } = await connectToDatabase()
    const plansCollection = db.collection("childplans")

    // Verificar que el plan existe
    const existingPlan = await plansCollection.findOne({
      _id: new ObjectId(planId)
    })

    if (!existingPlan) {
      return NextResponse.json(
        { error: "Plan no encontrado" },
        { status: 404 }
      )
    }

    // Actualizar el plan
    const updateResult = await plansCollection.updateOne(
      { _id: new ObjectId(planId) },
      {
        $set: {
          schedule,
          objectives,
          recommendations,
          updatedAt: new Date(),
          updatedBy: new ObjectId(session.user.id)
        }
      }
    )

    if (updateResult.modifiedCount === 0) {
      logger.warn("Plan no modificado", { planId })
      return NextResponse.json(
        { error: "No se pudo actualizar el plan" },
        { status: 500 }
      )
    }

    // Obtener el plan actualizado
    const updatedPlan = await plansCollection.findOne({
      _id: new ObjectId(planId)
    })

    logger.info("Plan actualizado exitosamente", {
      planId,
      adminId: session.user.id,
      adminName: session.user.name
    })

    return NextResponse.json({
      success: true,
      plan: updatedPlan,
      message: "Plan actualizado correctamente"
    })

  } catch (error) {
    logger.error("Error actualizando plan:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// GET endpoint para obtener un plan específico
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar sesión
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const { id: planId } = await params
    
    if (!planId || !ObjectId.isValid(planId)) {
      return NextResponse.json(
        { error: "ID de plan inválido" },
        { status: 400 }
      )
    }

    // Conectar a la base de datos
    const { db } = await connectToDatabase()
    const plansCollection = db.collection("childplans")

    // Obtener el plan
    const plan = await plansCollection.findOne({
      _id: new ObjectId(planId)
    })

    if (!plan) {
      return NextResponse.json(
        { error: "Plan no encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      plan
    })

  } catch (error) {
    logger.error("Error obteniendo plan:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}