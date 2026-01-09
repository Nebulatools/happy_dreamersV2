/**
 * Script de Migración: night_feeding → feeding con isNightFeeding flag
 *
 * Este script convierte eventos con eventType "night_feeding" al nuevo formato:
 * - eventType: "feeding"
 * - isNightFeeding: true
 * - feedingContext: "during_sleep"
 *
 * USO:
 * npx tsx scripts/migrate-night-feeding.ts
 *
 * NOTA: Requiere variables de entorno MONGODB_URI y MONGODB_DB configuradas
 */

import { MongoClient, ObjectId } from "mongodb"

// Cargar variables de entorno
import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

const MONGODB_URI = process.env.MONGODB_URI
const MONGODB_DB = process.env.MONGODB_DB

if (!MONGODB_URI || !MONGODB_DB) {
  console.error("❌ Error: MONGODB_URI y MONGODB_DB deben estar configurados en .env.local")
  process.exit(1)
}

interface MigrationStats {
  totalNightFeeding: number
  converted: number
  duplicatesRemoved: number
  errors: number
}

async function migrateNightFeeding() {
  const client = new MongoClient(MONGODB_URI!)
  const stats: MigrationStats = {
    totalNightFeeding: 0,
    converted: 0,
    duplicatesRemoved: 0,
    errors: 0
  }

  try {
    await client.connect()
    console.log("✅ Conectado a MongoDB")

    const db = client.db(MONGODB_DB)
    const eventsCol = db.collection("events")

    console.log("\n=== Migración de night_feeding ===\n")

    // Paso 1: Encontrar todos los eventos night_feeding
    const nightFeedingEvents = await eventsCol.find({ eventType: "night_feeding" }).toArray()
    stats.totalNightFeeding = nightFeedingEvents.length

    console.log(`📊 Encontrados ${nightFeedingEvents.length} eventos night_feeding`)

    if (nightFeedingEvents.length === 0) {
      console.log("✅ No hay eventos night_feeding para migrar")
      await client.close()
      return stats
    }

    // Paso 2: Procesar cada evento night_feeding
    for (const event of nightFeedingEvents) {
      try {
        // Buscar si existe un evento feeding duplicado con el mismo startTime y childId
        const duplicateFeeding = await eventsCol.findOne({
          eventType: "feeding",
          childId: event.childId,
          startTime: event.startTime,
          _id: { $ne: event._id }
        })

        if (duplicateFeeding) {
          // Existe un duplicado: actualizar el feeding original con el flag y eliminar el night_feeding
          await eventsCol.updateOne(
            { _id: duplicateFeeding._id },
            {
              $set: {
                isNightFeeding: true,
                feedingContext: "during_sleep",
                updatedAt: new Date().toISOString()
              }
            }
          )

          // Eliminar el evento night_feeding (duplicado)
          await eventsCol.deleteOne({ _id: event._id })
          stats.duplicatesRemoved++
          console.log(`🔄 Fusionado: ${event._id} → ${duplicateFeeding._id} (eliminado duplicado)`)
        } else {
          // No hay duplicado: convertir el night_feeding a feeding con flag
          await eventsCol.updateOne(
            { _id: event._id },
            {
              $set: {
                eventType: "feeding",
                isNightFeeding: true,
                feedingContext: "during_sleep",
                updatedAt: new Date().toISOString()
              }
            }
          )
          stats.converted++
          console.log(`✅ Convertido: ${event._id}`)
        }

      } catch (eventError) {
        console.error(`❌ Error procesando evento ${event._id}:`, eventError)
        stats.errors++
      }
    }

    console.log("\n=== Resumen de Migración ===")
    console.log(`📊 Total eventos night_feeding encontrados: ${stats.totalNightFeeding}`)
    console.log(`✅ Convertidos a feeding: ${stats.converted}`)
    console.log(`🔄 Duplicados fusionados/eliminados: ${stats.duplicatesRemoved}`)
    console.log(`❌ Errores: ${stats.errors}`)

    // Paso 3: Verificación final
    const remainingNightFeeding = await eventsCol.countDocuments({ eventType: "night_feeding" })
    console.log(`\n📋 Eventos night_feeding restantes: ${remainingNightFeeding}`)

    if (remainingNightFeeding === 0) {
      console.log("🎉 Migración completada exitosamente - No quedan eventos night_feeding")
    } else {
      console.log(`⚠️ Aún quedan ${remainingNightFeeding} eventos night_feeding (revisar manualmente)`)
    }

  } catch (error) {
    console.error("❌ Error general en migración:", error)
    throw error
  } finally {
    await client.close()
    console.log("\n✅ Conexión cerrada")
  }

  return stats
}

// Ejecutar solo si es el módulo principal
if (require.main === module) {
  migrateNightFeeding()
    .then((stats) => {
      console.log("\n=== Migración Finalizada ===")
      process.exit(stats.errors > 0 ? 1 : 0)
    })
    .catch((error) => {
      console.error("Error fatal:", error)
      process.exit(1)
    })
}

export { migrateNightFeeding }
