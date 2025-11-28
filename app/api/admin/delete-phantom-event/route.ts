// API de admin para eliminar evento fantasma específico
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { createLogger } from "@/lib/logger"

const logger = createLogger("API:admin:delete-phantom-event")

// DELETE: Eliminar evento fantasma por ID
export async function DELETE(req: Request) {
  try {
    // Verificar que sea admin
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const eventId = searchParams.get("eventId")
    const childId = searchParams.get("childId")

    if (!eventId || !childId) {
      return NextResponse.json(
        { error: "Se requieren eventId y childId" },
        { status: 400 }
      )
    }

    logger.info("Eliminando evento fantasma", { eventId, childId })

    const { db } = await connectToDatabase()

    const results = {
      eventId,
      childId,
      deletedFromEvents: 0,
      deletedFromChildrenArray: 0,
      success: false,
    }

    // PASO 1: Eliminar de colección 'events' (intentar ambas formas)
    try {
      // Intentar con ObjectId
      let deleteResult = await db.collection("events").deleteOne({
        _id: new ObjectId(eventId),
      })
      results.deletedFromEvents = deleteResult.deletedCount || 0
      logger.info(`Eliminado de events (ObjectId): ${results.deletedFromEvents}`)

      // Si no se eliminó, intentar con string
      if (results.deletedFromEvents === 0) {
        deleteResult = await db.collection("events").deleteOne({
          _id: eventId,
        })
        results.deletedFromEvents = deleteResult.deletedCount || 0
        logger.info(`Eliminado de events (string): ${results.deletedFromEvents}`)
      }
    } catch (e) {
      logger.warn("Error eliminando de events:", e)
    }

    // PASO 2: Eliminar del array children.events
    try {
      const updateResult = await db.collection("children").updateOne(
        { _id: new ObjectId(childId) },
        { $pull: { events: { _id: eventId } } }
      )
      results.deletedFromChildrenArray = updateResult.modifiedCount || 0
      logger.info(`Eliminado de children.events: ${results.deletedFromChildrenArray}`)
    } catch (e) {
      logger.warn("Error eliminando de children.events:", e)
    }

    // PASO 3: Verificar que se eliminó
    const stillInEvents = await db.collection("events").findOne({ _id: eventId })
    const stillInEventsObjectId = await db.collection("events").findOne({ _id: new ObjectId(eventId) })

    const childDoc = await db.collection("children").findOne(
      { _id: new ObjectId(childId) },
      { projection: { events: 1 } }
    )
    const stillInArray = childDoc?.events?.find((e: any) => e._id === eventId)

    results.success = !stillInEvents && !stillInEventsObjectId && !stillInArray

    logger.info("Resultado de eliminación:", results)

    if (results.success) {
      return NextResponse.json({
        success: true,
        message: "Evento fantasma eliminado correctamente",
        details: results,
      })
    } else {
      return NextResponse.json({
        success: false,
        message: "El evento aún existe en algún lugar",
        details: results,
        stillExists: {
          inEvents: !!stillInEvents || !!stillInEventsObjectId,
          inChildrenArray: !!stillInArray,
        },
      }, { status: 500 })
    }

  } catch (error: any) {
    logger.error("Error eliminando evento fantasma:", error)
    return NextResponse.json(
      { error: "Error interno del servidor", details: error.message },
      { status: 500 }
    )
  }
}
