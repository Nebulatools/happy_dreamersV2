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
    
    // Log para depuración
    logger.info("Solicitud de actualización/creación de plan", { planId })
    
    if (!planId || !ObjectId.isValid(planId)) {
      logger.error("ID de plan inválido", { planId })
      return NextResponse.json(
        { error: "ID de plan inválido" },
        { status: 400 }
      )
    }

    // Obtener datos del body
    const body = await req.json()
    const { schedule, objectives, recommendations, childId, userId, planNumber, planVersion, planType } = body

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
      logger.info("Plan no encontrado, creando nuevo plan", { 
        planId,
        childId,
        collection: "childplans"
      })
      
      // Si el plan no existe y tenemos la información necesaria, lo creamos
      if (!childId || !userId) {
        return NextResponse.json(
          { error: "Para crear un nuevo plan se requiere childId y userId" },
          { status: 400 }
        )
      }

      // Crear el nuevo plan con el ID proporcionado
      const newPlan = {
        _id: new ObjectId(planId),
        childId: typeof childId === 'string' ? new ObjectId(childId) : childId,
        userId: typeof userId === 'string' ? new ObjectId(userId) : userId,
        planNumber: planNumber || 0,
        planVersion: planVersion || "1.0",
        planType: planType || "initial",
        schedule,
        objectives,
        recommendations,
        createdAt: new Date(),
        createdBy: new ObjectId(session.user.id),
        updatedAt: new Date(),
        updatedBy: new ObjectId(session.user.id)
      }

      const insertResult = await plansCollection.insertOne(newPlan)
      
      if (!insertResult.acknowledged) {
        logger.error("Error al crear el plan", { planId })
        return NextResponse.json(
          { error: "No se pudo crear el plan" },
          { status: 500 }
        )
      }

      logger.info("Plan creado exitosamente", {
        planId,
        childId,
        adminId: session.user.id
      })

      return NextResponse.json({
        success: true,
        plan: newPlan,
        message: "Plan creado correctamente",
        created: true
      })
    }

    logger.info("Plan encontrado, procediendo con actualización", {
      planId,
      childId: existingPlan.childId
    })

    // Actualizar el plan existente
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