// API endpoint para actualizar planes de niños
// Permite editar horarios, objetivos y recomendaciones

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { createLogger } from "@/lib/logger"

const logger = createLogger("api/consultas/plans/[id]")

// DELETE endpoint para eliminar un plan específico (solo admin)
// Si se elimina el plan activo, auto-activa el plan anterior (considerando refinamientos)
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
    const collection = db.collection("child_plans")

    // 1. Obtener el plan a eliminar ANTES de eliminarlo
    const planToDelete = await collection.findOne({ _id: new ObjectId(planId) })

    if (!planToDelete) {
      return NextResponse.json(
        { error: "Plan no encontrado" },
        { status: 404 }
      )
    }

    logger.info("Plan a eliminar", {
      planId,
      planVersion: planToDelete.planVersion,
      status: planToDelete.status,
      childId: planToDelete.childId,
      userId: planToDelete.userId,
    })

    // 2. Si el plan a eliminar es ACTIVO, buscar el plan anterior para reactivarlo
    let reactivatedPlan = null
    if (planToDelete.status === "active") {
      // Obtener todos los planes del mismo niño (ordenados por versión)
      const allPlans = await collection.find({
        childId: planToDelete.childId,
        userId: planToDelete.userId,
        _id: { $ne: new ObjectId(planId) }, // Excluir el plan a eliminar
      }).toArray()

      // Función para comparar versiones de planes (considera refinamientos como 1.1, 2.1, etc.)
      const compareVersions = (versionA: string, versionB: string): number => {
        const parseVersion = (v: string) => {
          const parts = v.split(".")
          const major = parseInt(parts[0]) || 0
          const minor = parseInt(parts[1]) || 0
          return { major, minor }
        }

        const a = parseVersion(versionA)
        const b = parseVersion(versionB)

        if (a.major !== b.major) {
          return b.major - a.major // Mayor número primero
        }
        return b.minor - a.minor // Mayor refinamiento primero
      }

      // Ordenar planes por versión (de mayor a menor)
      const sortedPlans = allPlans.sort((a, b) =>
        compareVersions(a.planVersion, b.planVersion)
      )

      logger.info("Planes disponibles para reactivación", {
        totalPlans: sortedPlans.length,
        versions: sortedPlans.map(p => ({
          version: p.planVersion,
          status: p.status,
        })),
      })

      // El primer plan en la lista ordenada es el más reciente (anterior al eliminado)
      const previousPlan = sortedPlans[0]

      if (previousPlan) {
        // Reactivar el plan anterior (cambiar de "superseded" a "active")
        await collection.updateOne(
          { _id: previousPlan._id },
          {
            $set: {
              status: "active",
              updatedAt: new Date(),
              reactivatedAt: new Date(),
              reactivatedBy: new ObjectId(session.user.id),
              reactivatedReason: `Plan ${planToDelete.planVersion} eliminado`,
            },
          }
        )

        reactivatedPlan = previousPlan

        logger.info("Plan anterior reactivado", {
          reactivatedPlanId: previousPlan._id,
          reactivatedVersion: previousPlan.planVersion,
          previousStatus: previousPlan.status,
          newStatus: "active",
        })
      } else {
        logger.warn("No hay plan anterior para reactivar", {
          childId: planToDelete.childId,
          deletedPlanVersion: planToDelete.planVersion,
        })
      }
    }

    // 3. Eliminar el plan original
    const result = await collection.deleteOne({ _id: new ObjectId(planId) })

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "No se pudo eliminar el plan" },
        { status: 500 }
      )
    }

    logger.info("Plan eliminado exitosamente", {
      planId,
      deletedVersion: planToDelete.planVersion,
      wasActive: planToDelete.status === "active",
      reactivatedPlan: reactivatedPlan ? {
        id: reactivatedPlan._id,
        version: reactivatedPlan.planVersion,
      } : null,
      adminId: session.user.id,
    })

    return NextResponse.json({
      success: true,
      message: "Plan eliminado correctamente",
      reactivated: reactivatedPlan ? {
        planId: reactivatedPlan._id,
        planVersion: reactivatedPlan.planVersion,
      } : null,
    })
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
    const { schedule, objectives, recommendations, sleepRoutine, childId, userId, planNumber, planVersion, planType } = body

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
      _id: new ObjectId(planId),
    })

    if (!existingPlan) {
      logger.info("Plan no encontrado, creando nuevo plan", { 
        planId,
        childId,
        collection: "child_plans",
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
        childId: typeof childId === "string" ? new ObjectId(childId) : childId,
        userId: typeof userId === "string" ? new ObjectId(userId) : userId,
        planNumber: planNumber || 0,
        planVersion: planVersion || "1.0",
        planType: planType || "initial",
        schedule,
        objectives,
        recommendations,
        sleepRoutine: sleepRoutine || null,
        createdAt: new Date(),
        createdBy: new ObjectId(session.user.id),
        updatedAt: new Date(),
        updatedBy: new ObjectId(session.user.id),
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
        adminId: session.user.id,
      })

      return NextResponse.json({
        success: true,
        plan: newPlan,
        message: "Plan creado correctamente",
        created: true,
      })
    }

    logger.info("Plan encontrado, procediendo con actualización", {
      planId,
      childId: existingPlan.childId,
    })

    // Actualizar el plan existente
    const updateResult = await plansCollection.updateOne(
      { _id: new ObjectId(planId) },
      {
        $set: {
          schedule,
          objectives,
          recommendations,
          sleepRoutine: sleepRoutine || null,
          updatedAt: new Date(),
          updatedBy: new ObjectId(session.user.id),
        },
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
      _id: new ObjectId(planId),
    })

    logger.info("Plan actualizado exitosamente", {
      planId,
      adminId: session.user.id,
      adminName: session.user.name,
    })

    return NextResponse.json({
      success: true,
      plan: updatedPlan,
      message: "Plan actualizado correctamente",
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
      _id: new ObjectId(planId),
    })

    if (!plan) {
      return NextResponse.json(
        { error: "Plan no encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      plan,
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
      _id: new ObjectId(planId),
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
      adminId: session.user.id,
    })

    // 1. Cambiar todos los planes activos anteriores a "superseded"
    await plansCollection.updateMany(
      {
        childId: planToApply.childId,
        userId: planToApply.userId,
        status: "active",
        _id: { $ne: new ObjectId(planId) },
      },
      {
        $set: {
          status: "superseded",
          updatedAt: new Date(),
        },
      }
    )

    // 2. Cambiar el plan actual de "borrador" a "active"
    const updateResult = await plansCollection.updateOne(
      { _id: new ObjectId(planId) },
      {
        $set: {
          status: "active",
          updatedAt: new Date(),
          appliedBy: new ObjectId(session.user.id),
          appliedAt: new Date(),
        },
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
      _id: new ObjectId(planId),
    })

    logger.info("Plan aplicado exitosamente", {
      planId,
      childId: planToApply.childId,
      adminId: session.user.id,
    })

    return NextResponse.json({
      success: true,
      plan: updatedPlan,
      message: "Plan aplicado correctamente. Los planes anteriores han sido marcados como supersedidos.",
    })

  } catch (error) {
    logger.error("Error aplicando plan:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
