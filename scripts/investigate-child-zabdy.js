// Script de investigación: Análisis completo del niño Zabdy
// Verifica survey, eventos, y planes existentes

require('dotenv').config()
const { MongoClient, ObjectId } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI
const DB_NAME = process.env.MONGODB_DB_FINAL || process.env.MONGODB_DATABASE || process.env.MONGODB_DB

// ID del niño a investigar
const CHILD_ID = '68d1af5315d0e9b1cc189544' // Zabdy

if (!MONGODB_URI || !DB_NAME) {
  console.error('❌ Faltan variables de entorno MONGODB_URI o DB_NAME')
  process.exit(1)
}

function formatDate(date) {
  if (!date) return 'N/A'
  return new Date(date).toLocaleString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function calculateAge(birthDate) {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  const now = new Date()
  const diffMs = now - birth
  const ageMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44))
  return ageMonths
}

async function main() {
  const client = new MongoClient(MONGODB_URI)

  console.log('🔍 INVESTIGACIÓN: Análisis del Niño Zabdy\n')
  console.log('Conectando a MongoDB...')

  await client.connect()
  console.log('✅ Conectado\n')

  const db = client.db(DB_NAME)

  try {
    // 1. Datos básicos del niño
    console.log('=' .repeat(70))
    console.log('👶 DATOS BÁSICOS DEL NIÑO')
    console.log('=' .repeat(70))

    const child = await db.collection('children').findOne({ _id: new ObjectId(CHILD_ID) })

    if (!child) {
      console.log('❌ Niño no encontrado con ID:', CHILD_ID)
      process.exit(1)
    }

    console.log(`Nombre: ${child.firstName} ${child.lastName || ''}`)
    console.log(`ID: ${CHILD_ID}`)
    console.log(`Parent ID: ${child.parentId}`)
    console.log(`Fecha nacimiento: ${child.birthDate ? formatDate(child.birthDate) : 'N/A'}`)

    const ageMonths = calculateAge(child.birthDate)
    if (ageMonths !== null) {
      const years = Math.floor(ageMonths / 12)
      const months = ageMonths % 12
      console.log(`Edad actual: ${years} años, ${months} meses (${ageMonths} meses total)`)
    }

    // 2. Survey Data
    console.log('\n' + '=' .repeat(70))
    console.log('📋 SURVEY DATA (Cuestionario Inicial)')
    console.log('=' .repeat(70))

    if (child.surveyData && Object.keys(child.surveyData).length > 0) {
      console.log('✅ Survey completado\n')

      // Mostrar datos del survey de forma estructurada
      if (child.surveyData.rutinaHabitos) {
        console.log('Rutina y Hábitos:')
        const rh = child.surveyData.rutinaHabitos
        console.log(`  - Rutina antes de acostarse: ${rh.rutinaAntesAcostarse || 'N/A'}`)
        console.log(`  - Hora de dormir: ${rh.horaDormir || 'N/A'}`)
        console.log(`  - Hace siestas: ${rh.haceSiestas ? 'Sí' : 'No'}`)
        console.log(`  - Dónde duerme (noche): ${rh.dondeDuermeNoche || 'N/A'}`)
        console.log(`  - Dónde duerme (siestas): ${rh.dondeDuermeSiestas || 'N/A'}`)
      }

      if (child.surveyData.alimentacion) {
        console.log('\nAlimentación:')
        const alim = child.surveyData.alimentacion
        console.log(`  - Tipo: ${alim.tipoAlimentacion || 'N/A'}`)
        console.log(`  - Come solo: ${alim.comeSolo ? 'Sí' : 'No'}`)
      }

      if (child.surveyData.desarrollo) {
        console.log('\nDesarrollo:')
        const des = child.surveyData.desarrollo
        console.log(`  - Camina: ${des.camina ? 'Sí' : 'No'}`)
        console.log(`  - Habla: ${des.habla ? 'Sí' : 'No'}`)
      }

      // Mostrar JSON completo resumido
      console.log('\n📄 Survey completo (JSON):')
      console.log(JSON.stringify(child.surveyData, null, 2).substring(0, 500) + '...')
    } else {
      console.log('❌ NO tiene survey completado')
      console.log('⚠️  Esto es crítico para generación de Plan 0')
    }

    // 3. Eventos históricos
    console.log('\n' + '=' .repeat(70))
    console.log('📊 EVENTOS HISTÓRICOS')
    console.log('=' .repeat(70))

    const totalEvents = await db.collection('events').countDocuments({
      childId: CHILD_ID
    })

    console.log(`Total de eventos: ${totalEvents}`)

    if (totalEvents > 0) {
      // Contar por tipo
      const eventsByType = await db.collection('events').aggregate([
        { $match: { childId: CHILD_ID } },
        { $group: { _id: '$eventType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]).toArray()

      console.log('\nEventos por tipo:')
      eventsByType.forEach(item => {
        console.log(`  - ${item._id}: ${item.count}`)
      })

      // Rango de fechas
      const oldest = await db.collection('events')
        .find({ childId: CHILD_ID })
        .sort({ startTime: 1 })
        .limit(1)
        .toArray()

      const newest = await db.collection('events')
        .find({ childId: CHILD_ID })
        .sort({ startTime: -1 })
        .limit(1)
        .toArray()

      if (oldest.length > 0 && newest.length > 0) {
        console.log('\nRango temporal:')
        console.log(`  - Primer evento: ${formatDate(oldest[0].startTime)}`)
        console.log(`  - Último evento: ${formatDate(newest[0].startTime)}`)
      }

      // Últimos 5 eventos
      const recentEvents = await db.collection('events')
        .find({ childId: CHILD_ID })
        .sort({ startTime: -1 })
        .limit(5)
        .toArray()

      console.log('\nÚltimos 5 eventos:')
      recentEvents.forEach((evt, idx) => {
        console.log(`  ${idx + 1}. ${evt.eventType} - ${formatDate(evt.startTime)}`)
      })
    } else {
      console.log('❌ NO tiene eventos registrados')
      console.log('⚠️  Sin eventos no se pueden calcular estadísticas para Plan 0')
    }

    // 4. Planes existentes
    console.log('\n' + '=' .repeat(70))
    console.log('📝 PLANES GENERADOS')
    console.log('=' .repeat(70))

    const plans = await db.collection('child_plans')
      .find({
        childId: new ObjectId(CHILD_ID)
      })
      .sort({ planNumber: 1 })
      .toArray()

    console.log(`Total de planes: ${plans.length}`)

    if (plans.length > 0) {
      console.log('\nDetalles de planes:')
      plans.forEach(plan => {
        console.log(`\n  Plan ${plan.planVersion || plan.planNumber}:`)
        console.log(`    - Tipo: ${plan.planType}`)
        console.log(`    - Status: ${plan.status}`)
        console.log(`    - Creado: ${formatDate(plan.createdAt)}`)
        console.log(`    - Título: ${plan.title}`)
        if (plan.schedule) {
          console.log(`    - Bedtime: ${plan.schedule.bedtime || 'N/A'}`)
          console.log(`    - WakeTime: ${plan.schedule.wakeTime || 'N/A'}`)
          console.log(`    - Siestas: ${plan.schedule.naps?.length || 0}`)
          console.log(`    - Comidas: ${plan.schedule.meals?.length || 0}`)
        }
        if (plan.sourceData) {
          console.log(`    - Basado en:`)
          console.log(`      · Survey: ${plan.sourceData.surveyDataUsed ? 'Sí' : 'No'}`)
          console.log(`      · Stats: ${plan.sourceData.childStatsUsed ? 'Sí' : 'No'}`)
          console.log(`      · RAG sources: ${plan.sourceData.ragSources?.length || 0}`)
          console.log(`      · Eventos: ${plan.sourceData.totalEvents || 'N/A'}`)
        }
      })
    } else {
      console.log('ℹ️  NO tiene planes generados todavía')
      console.log('✨ Perfecto para generar Plan 0 desde cero')
    }

    // 5. Resumen y recomendación
    console.log('\n' + '=' .repeat(70))
    console.log('💡 RESUMEN Y RECOMENDACIÓN')
    console.log('=' .repeat(70))

    const hasSurvey = child.surveyData && Object.keys(child.surveyData).length > 0
    const hasEvents = totalEvents > 0
    const hasPlans = plans.length > 0

    console.log('\n✅ Checklist para generación Plan 0:')
    console.log(`  [${hasSurvey ? '✓' : '✗'}] Survey completado`)
    console.log(`  [${hasEvents ? '✓' : '✗'}] Eventos históricos disponibles (${totalEvents})`)
    console.log(`  [${!hasPlans ? '✓' : '✗'}] Sin planes previos (ideal para Plan 0)`)

    console.log('\n📊 RECOMENDACIÓN:')
    if (hasSurvey && hasEvents && !hasPlans) {
      console.log('  ✅ PERFECTO para generar Plan 0')
      console.log('  → Tiene todos los datos necesarios')
      console.log('  → No tiene planes anteriores')
      console.log('  → Edad apropiada para análisis completo')
      console.log('\n  🚀 SIGUIENTE PASO: Ejecutar generación con logging detallado')
    } else if (hasSurvey && hasEvents && hasPlans) {
      console.log('  ⚠️  Ya tiene planes generados')
      console.log('  → Opción 1: Regenerar Plan 0 (actualizará el existente)')
      console.log('  → Opción 2: Usar otro niño o crear mock')
    } else {
      console.log('  ❌ FALTAN DATOS críticos')
      if (!hasSurvey) console.log('  → Necesita completar survey')
      if (!hasEvents) console.log('  → Necesita eventos históricos (usar scripts de seed)')
      console.log('\n  🔧 SIGUIENTE PASO: Crear niño mock con datos completos')
    }

  } catch (error) {
    console.error('\n❌ Error durante investigación:', error)
  } finally {
    await client.close()
    console.log('\n🔌 Conexión cerrada')
  }
}

main().catch((e) => {
  console.error('Error fatal:', e)
  process.exit(1)
})
