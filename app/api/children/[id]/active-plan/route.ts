// Endpoint simplificado para obtener el plan activo del niño
// Retorna horarios de sueño y actividades del plan actual

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { resolveChildAccess, ChildAccessError } from "@/lib/api/child-access"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { db } = await connectToDatabase()
    const childId = (await params).id

    try {
      await resolveChildAccess(db, session.user, childId, "canViewPlan")
    } catch (error) {
      if (error instanceof ChildAccessError) {
        return NextResponse.json({ error: error.message }, { status: error.status })
      }
      throw error
    }

    // Obtener plan activo
    const activePlan = await db.collection("child_plans").findOne(
      { 
        childId: new ObjectId(childId),
        status: "active"
      },
      { 
        projection: { 
          schedule: 1, 
          planNumber: 1, 
          title: 1 
        },
        sort: { planNumber: -1, createdAt: -1 }
      }
    )

    // Si no hay plan, retornar valores por defecto
    if (!activePlan) {
      return NextResponse.json({
        schedule: {
          bedtime: "20:00",
          wakeTime: "07:00",
          naps: []
        },
        isDefault: true
      })
    }

    return NextResponse.json({
      ...activePlan,
      isDefault: false
    })
    
  } catch (error) {
    console.error("Error obteniendo plan activo:", error)
    return NextResponse.json(
      { error: "Error al obtener el plan" },
      { status: 500 }
    )
  }
}
