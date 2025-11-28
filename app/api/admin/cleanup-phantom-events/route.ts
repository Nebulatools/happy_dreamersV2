import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function GET() {
  try {
    // Verificar que sea admin
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado - solo admin" }, { status: 401 })
    }

    const { db } = await connectToDatabase()

    const results: any = {
      eventsToDelete: PHANTOM_EVENT_IDS.length,
      deletedFromEvents: 0,
      modifiedChildren: 0,
      remainingInEvents: 0,
      remainingInChild: 0,
    }

    // 1. Eliminar de la colección events
    // Intentar con ObjectId primero
    const objectIdArray = PHANTOM_EVENT_IDS.map(id => new ObjectId(id))
    let deleteResult = await db.collection("events").deleteMany({
      _id: { $in: objectIdArray },
    })

    results.deletedFromEvents = deleteResult.deletedCount

    // Si no se eliminó nada, intentar con strings
    if (deleteResult.deletedCount === 0) {
      deleteResult = await db.collection("events").deleteMany({
        _id: { $in: PHANTOM_EVENT_IDS },
      })
      results.deletedFromEvents = deleteResult.deletedCount
    }

    // 2. Eliminar del array children.events
    // Intentar con strings primero (como están guardados)
    let updateResult = await db.collection("children").updateOne(
      { _id: new ObjectId(CHILD_ID) },
      {
        $pull: {
          events: {
            _id: { $in: PHANTOM_EVENT_IDS },
          },
        } as any,
      }
    )

    results.modifiedChildren = updateResult.modifiedCount

    // Si no se modificó, intentar con ObjectId
    if (updateResult.modifiedCount === 0) {
      updateResult = await db.collection("children").updateOne(
        { _id: new ObjectId(CHILD_ID) },
        {
          $pull: {
            events: {
              _id: { $in: objectIdArray },
            },
          } as any,
        }
      )
      results.modifiedChildren = updateResult.modifiedCount
    }

    // 3. Verificar que se eliminaron
    const remainingEvents = await db.collection("events").find({
      childId: CHILD_ID,
    }).toArray()

    results.remainingInEvents = remainingEvents.length
    results.remainingEventIds = remainingEvents.map((e: any) => ({
      _id: e._id?.toString(),
      eventType: e.eventType,
      startTime: e.startTime,
    }))

    const child = await db.collection("children").findOne({
      _id: new ObjectId(CHILD_ID),
    })

    results.remainingInChild = child?.events?.length || 0
    results.remainingChildEventIds = child?.events?.map((e: any) => ({
      _id: e._id,
      eventType: e.eventType,
      startTime: e.startTime,
    })) || []

    // 4. Eliminar TODOS los eventos restantes de este niño
    if (remainingEvents.length > 0) {
      const allEventIds = remainingEvents.map((e: any) => e._id)
      const finalDelete = await db.collection("events").deleteMany({
        _id: { $in: allEventIds },
      })
      results.finalDeletedFromEvents = finalDelete.deletedCount
    }

    // 5. Limpiar completamente el array de eventos del niño
    const finalUpdate = await db.collection("children").updateOne(
      { _id: new ObjectId(CHILD_ID) },
      { $set: { events: [] } }
    )
    results.clearedChildEvents = finalUpdate.modifiedCount > 0

    return NextResponse.json({
      success: true,
      message: "Limpieza completada",
      results,
    })

  } catch (error: any) {
    console.error("Error en limpieza:", error)
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 })
  }
}
