// ENDPOINT TEMPORAL - ELIMINAR EVENTO ESPECÍFICO

import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function DELETE(req: NextRequest) {
  try {
    const { childId, eventId } = await req.json()
    
    console.log(`🗑️ ELIMINANDO EVENTO: ${eventId} del niño: ${childId}`)
    
    const { db } = await connectToDatabase()
    
    // Eliminar el evento específico
    const result = await db.collection("children").updateOne(
      { _id: new ObjectId(childId) },
      { $pull: { events: { _id: eventId } } }
    )
    
    console.log("Resultado:", result)
    
    if (result.modifiedCount > 0) {
      return NextResponse.json({
        success: true,
        message: `Evento ${eventId} eliminado exitosamente`,
      })
    } else {
      return NextResponse.json({
        success: false,
        message: "No se pudo eliminar el evento",
      }, { status: 404 })
    }
    
  } catch (error) {
    console.error("❌ ERROR:", error)
    return NextResponse.json(
      { error: "Error al eliminar evento", details: error.message },
      { status: 500 }
    )
  }
}