// ENDPOINT TEMPORAL - REVISAR EVENTOS DE UN NIÑO ESPECÍFICO

import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const childId = searchParams.get("childId") || "68ad0476b98bdbe0f7ff5941" // Bernardo por defecto
    
    console.log(`🔍 REVISANDO EVENTOS DEL NIÑO: ${childId}`)
    
    const { db } = await connectToDatabase()
    
    const child = await db.collection("children").findOne({ _id: new ObjectId(childId) })
    
    if (!child) {
      return NextResponse.json({ error: "Niño no encontrado" }, { status: 404 })
    }
    
    const events = child.events || []
    
    console.log(`👶 NIÑO: ${child.firstName} ${child.lastName}`)
    console.log(`📅 EVENTOS: ${events.length}`)
    
    // Analizar eventos en detalle
    const analysis = {
      child: {
        name: `${child.firstName} ${child.lastName}`,
        id: child._id.toString()
      },
      totalEvents: events.length,
      eventsByType: {},
      eventsWithEndTime: 0,
      eventsWithoutEndTime: 0,
      duplicateTimes: [],
      detailedEvents: []
    }
    
    const timeMap = new Map()
    
    events.forEach((event, index) => {
      // Agrupar por tipo
      const type = event.eventType || 'unknown'
      if (!analysis.eventsByType[type]) {
        analysis.eventsByType[type] = 0
      }
      analysis.eventsByType[type]++
      
      // Contar con/sin endTime
      if (event.endTime) {
        analysis.eventsWithEndTime++
      } else {
        analysis.eventsWithoutEndTime++
      }
      
      // Detectar duplicados de tiempo
      if (event.startTime) {
        const timeKey = event.startTime
        if (!timeMap.has(timeKey)) {
          timeMap.set(timeKey, [])
        }
        timeMap.get(timeKey).push(event)
      }
      
      // Detalles del evento
      analysis.detailedEvents.push({
        index,
        id: event._id,
        type: event.eventType,
        startTime: event.startTime ? new Date(event.startTime).toLocaleString('es-ES') : null,
        endTime: event.endTime ? new Date(event.endTime).toLocaleString('es-ES') : null,
        hasEndTime: !!event.endTime,
        emotionalState: event.emotionalState,
        notes: event.notes
      })
    })
    
    // Encontrar duplicados
    timeMap.forEach((eventsAtTime, time) => {
      if (eventsAtTime.length > 1) {
        analysis.duplicateTimes.push({
          time: new Date(time).toLocaleString('es-ES'),
          count: eventsAtTime.length,
          events: eventsAtTime.map(e => ({
            id: e._id,
            type: e.eventType,
            hasEndTime: !!e.endTime
          }))
        })
      }
    })
    
    return NextResponse.json(analysis)
    
  } catch (error) {
    console.error('❌ ERROR:', error)
    return NextResponse.json(
      { error: "Error al revisar eventos", details: error.message },
      { status: 500 }
    )
  }
}