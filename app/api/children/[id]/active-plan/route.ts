// Endpoint simplificado para obtener el plan activo del niño
// Retorna horarios de sueño y actividades del plan actual

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDb } from "@/lib/mongoose"
import { ObjectId } from "mongodb"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const db = await getDb()
    
    // Verificar permisos
    const childId = (await params).id
    const child = await db.collection("children").findOne({
      _id: new ObjectId(childId),
      $or: [
        { parentId: session.user.id },
        { parentId: new ObjectId(session.user.id) }
      ]
    })

    if (!child && session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
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
        } 
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
