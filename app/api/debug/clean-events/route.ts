// ENDPOINT TEMPORAL - SOLO PARA DEBUGGING
// Limpia eventos duplicados y problemáticos

import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function POST(req: NextRequest) {
  try {
    console.log("🧹 INICIANDO LIMPIEZA DE EVENTOS...")
    
    const { db } = await connectToDatabase()
    
    // Obtener todos los niños con eventos
    const children = await db.collection("children").find({}).toArray()
    
    let totalFixed = 0
    const report = []
    
    for (const child of children) {
      const childReport = {
        name: `${child.firstName} ${child.lastName}`,
        id: child._id.toString(),
        originalEvents: child.events?.length || 0,
        duplicatesRemoved: 0,
        eventsKept: 0,
      }
      
      if (!child.events || child.events.length === 0) {
        childReport.action = "Sin eventos"
        report.push(childReport)
        continue
      }
      
      // Buscar duplicados por tipo y hora
      const uniqueEvents = []
      const seen = new Set()
      
      for (const event of child.events) {
        if (!event.startTime || !event.eventType) {
          // Mantener eventos sin startTime o eventType
          uniqueEvents.push(event)
          continue
        }
        
        const key = `${event.eventType}-${event.startTime}`
        
        if (seen.has(key)) {
          // Es un duplicado - lo eliminamos
          childReport.duplicatesRemoved++
          console.log(`  ❌ Eliminando duplicado: ${event.eventType} a las ${new Date(event.startTime).toLocaleString("es-ES")}`)
        } else {
          // Es único - lo mantenemos
          seen.add(key)
          uniqueEvents.push(event)
          childReport.eventsKept++
        }
      }
      
      // Actualizar solo si hay cambios
      if (childReport.duplicatesRemoved > 0) {
        await db.collection("children").updateOne(
          { _id: child._id },
          { $set: { events: uniqueEvents } }
        )
        
        totalFixed++
        childReport.action = `${childReport.duplicatesRemoved} duplicados eliminados`
      } else {
        childReport.action = "Sin duplicados"
      }
      
      report.push(childReport)
    }
    
    console.log("✅ LIMPIEZA COMPLETADA")
    
    return NextResponse.json({
      success: true,
      message: `Limpieza completada. ${totalFixed} niños actualizados.`,
      report,
    })
    
  } catch (error) {
    console.error("❌ ERROR en limpieza:", error)
    return NextResponse.json(
      { error: "Error en la limpieza", details: error.message },
      { status: 500 }
    )
  }
}