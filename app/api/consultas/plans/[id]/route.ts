// API endpoint para actualizar planes de niños
// Permite editar horarios, objetivos y recomendaciones

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { createLogger } from "@/lib/logger"

const logger = createLogger('api/consultas/plans/[id]')

// DELETE endpoint para eliminar un plan específico (solo admin)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const { id: planId } = params
    if (!planId || !ObjectId.isValid(planId)) {
      return NextResponse.json(
        { error: "ID de plan inválido" },
        { status: 400 }
      )
    }

    const { db } = await connectToDatabase()

    // Usar la colección principal de planes
    const collection = db.collection("child_plans")

    // Intentar borrar por ObjectId (forma estándar)
    let result = { deletedCount: 0 }
    if (ObjectId.isValid(planId)) {
      result = await collection.deleteOne({ _id: new ObjectId(planId) })
    }

    // Si no se encontró, intentar por _id como string (compatibilidad con datos antiguos)
    if (result.deletedCount === 0) {
      const altResult = await collection.deleteOne({ _id: planId as unknown as any })
      if (altResult.deletedCount === 0) {
        return NextResponse.json(
          { error: "Plan no encontrado" },
          { status: 404 }
        )
      }
      result = altResult
    }

    logger.info("Plan eliminado", { planId, adminId: session.user.id })

    return NextResponse.json({ success: true, message: "Plan eliminado correctamente" })
  } catch (error) {
    logger.error("Error eliminando plan:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
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

    const { id: planId } = params
    
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
    const plansCollection = db.collection("child_plans")

    // Verificar que el plan existe
    const existingPlan = await plansCollection.findOne({
      _id: new ObjectId(planId)
    })

    if (!existingPlan) {
      logger.info("Plan no encontrado, creando nuevo plan", { 
        planId,
        childId,
        collection: "child_plans"
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
  { params }: { params: { id: string } }
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

    const { id: planId } = params
    
    if (!planId || !ObjectId.isValid(planId)) {
      return NextResponse.json(
        { error: "ID de plan inválido" },
        { status: 400 }
      )
    }

    // Conectar a la base de datos
    const { db } = await connectToDatabase()
    const plansCollection = db.collection("child_plans")

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

// PATCH endpoint para aplicar un plan (borrador → activo)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar sesión de admin
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const { id: planId } = params

    if (!planId || !ObjectId.isValid(planId)) {
      return NextResponse.json(
        { error: "ID de plan inválido" },
        { status: 400 }
      )
    }

    const { db } = await connectToDatabase()
    const plansCollection = db.collection("child_plans")

    // Obtener el plan a aplicar
    const planToApply = await plansCollection.findOne({
      _id: new ObjectId(planId)
    })

    if (!planToApply) {
      return NextResponse.json(
        { error: "Plan no encontrado" },
        { status: 404 }
      )
    }

    // Verificar que el plan esté en estado borrador
    if (planToApply.status !== "borrador") {
      return NextResponse.json(
        { error: "Solo se pueden aplicar planes en estado borrador" },
        { status: 400 }
      )
    }

    logger.info("Aplicando plan", {
      planId,
      childId: planToApply.childId,
      userId: planToApply.userId,
      adminId: session.user.id
    })

    // 1. Cambiar todos los planes activos anteriores a "completado"
    await plansCollection.updateMany(
      {
        childId: planToApply.childId,
        userId: planToApply.userId,
        status: "activo",
        _id: { $ne: new ObjectId(planId) }
      },
      {
        $set: {
          status: "completado",
          updatedAt: new Date()
        }
      }
    )

    // 2. Cambiar el plan actual de "borrador" a "activo"
    const updateResult = await plansCollection.updateOne(
      { _id: new ObjectId(planId) },
      {
        $set: {
          status: "activo",
          updatedAt: new Date(),
          appliedBy: new ObjectId(session.user.id),
          appliedAt: new Date()
        }
      }
    )

    if (updateResult.modifiedCount === 0) {
      return NextResponse.json(
        { error: "No se pudo aplicar el plan" },
        { status: 500 }
      )
    }

    // Obtener el plan actualizado
    const updatedPlan = await plansCollection.findOne({
      _id: new ObjectId(planId)
    })

    logger.info("Plan aplicado exitosamente", {
      planId,
      childId: planToApply.childId,
      adminId: session.user.id
    })

    return NextResponse.json({
      success: true,
      plan: updatedPlan,
      message: "Plan aplicado correctamente. Los planes anteriores han sido marcados como completados."
    })

  } catch (error) {
    logger.error("Error aplicando plan:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
