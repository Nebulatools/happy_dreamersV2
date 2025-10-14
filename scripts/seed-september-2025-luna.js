// Genera eventos de SEPTIEMBRE 2025 para Luna García
// Muestra implementación del Plan 0 generado el 1 de septiembre

require('dotenv').config()
const { MongoClient, ObjectId } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI
const DB_NAME = process.env.MONGODB_DB_FINAL || process.env.MONGODB_DATABASE || process.env.MONGODB_DB

const LUNA_CHILD_ID = '68ed606b296f42530dd36c6f'
const PARENT_ID = '68d1a9b07e63c75df18e1c1c'

// Utilidades
function dtLocal(y, m, d, hh, mm) {
  return new Date(y, m - 1, d, hh, mm)
}

function minutesBetween(a, b) {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000))
}

function humanDuration(mins) {
  if (!mins || mins <= 0) return ''
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const choice = (arr) => arr[randInt(0, arr.length - 1)]
const emo = () => choice(['tranquilo', 'neutral', 'inquieto'])

async function main() {
  const client = new MongoClient(MONGODB_URI)

  console.log('🌟 GENERACIÓN DE EVENTOS - SEPTIEMBRE 2025 (Luna García)\n')
  console.log('📅 Implementando Plan 0 (generado 1 de septiembre):')
  console.log('   ✓ Consolidación de 2→1 siesta')
  console.log('   ✓ Horarios más consistentes')
  console.log('   ✓ Menos despertares nocturnos')
  console.log('   ✓ Sin tomas nocturnas\n')

  console.log('Conectando a MongoDB...')
  await client.connect()
  console.log('✅ Conectado\n')

  const db = client.db(DB_NAME)

  try {
    const events = []

    console.log('=' .repeat(60))
    console.log('📊 GENERANDO EVENTOS DE SEPTIEMBRE 2025 (30 DÍAS)')
    console.log('=' .repeat(60))

    // Septiembre muestra progresión: primeras 2 semanas con 2 siestas, luego 1 siesta
    for (let day = 1; day <= 30; day++) {
      const isTransitioning = day <= 14  // Primeras 2 semanas aún en transición

      // SUEÑO NOCTURNO - Más consistente en septiembre
      // Plan 0 sugiere: bedtime 20:00, wake 6:57
      const sleepStart = dtLocal(2025, 9, day, 20, 0)
      sleepStart.setMinutes(sleepStart.getMinutes() + randInt(-15, 20))  // Menos variación

      const sleepEnd = dtLocal(2025, 9, day + 1, 6, 57)
      sleepEnd.setMinutes(sleepEnd.getMinutes() + randInt(-20, 20))  // Más consistente

      const sleepDelay = randInt(3, 15)  // Menos delay que en junio
      const sleepDuration = Math.max(0, minutesBetween(sleepStart, sleepEnd) - sleepDelay)

      events.push({
        _id: new ObjectId(),
        childId: new ObjectId(LUNA_CHILD_ID),
        parentId: new ObjectId(PARENT_ID),
        eventType: 'sleep',
        startTime: sleepStart.toISOString(),
        endTime: sleepEnd.toISOString(),
        sleepDelay,
        duration: sleepDuration,
        durationReadable: humanDuration(sleepDuration),
        emotionalState: choice(['tranquilo', 'neutral']),  // Mejora emocional
        createdAt: new Date(),
        updatedAt: new Date()
      })

      // DESPERTARES NOCTURNOS - Reducidos (solo 15% vs 30% en junio)
      if (randInt(1, 100) <= 15) {
        const nwStart = dtLocal(2025, 9, day + 1, choice([2, 3]), randInt(0, 59))
        const nwEnd = new Date(nwStart)
        nwEnd.setMinutes(nwStart.getMinutes() + randInt(5, 15))  // Más cortos

        events.push({
          _id: new ObjectId(),
          childId: new ObjectId(LUNA_CHILD_ID),
          parentId: new ObjectId(PARENT_ID),
          eventType: 'night_waking',
          startTime: nwStart.toISOString(),
          endTime: nwEnd.toISOString(),
          duration: minutesBetween(nwStart, nwEnd),
          emotionalState: 'neutral',
          notes: 'Despertó brevemente',
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }

      // NO MÁS TOMAS NOCTURNAS (eliminadas en septiembre)

      // SIESTAS - Transición progresiva
      if (isTransitioning) {
        // Primeras 2 semanas: Todavía 2 siestas pero más cortas
        // Siesta matutina (acortándose)
        const nap1Start = dtLocal(2025, 9, day, 9, 45)
        nap1Start.setMinutes(nap1Start.getMinutes() + randInt(-20, 20))
        const nap1End = new Date(nap1Start)
        nap1End.setMinutes(nap1Start.getMinutes() + randInt(40, 60))  // Más corta

        events.push({
          _id: new ObjectId(),
          childId: new ObjectId(LUNA_CHILD_ID),
          parentId: new ObjectId(PARENT_ID),
          eventType: 'nap',
          startTime: nap1Start.toISOString(),
          endTime: nap1End.toISOString(),
          duration: minutesBetween(nap1Start, nap1End),
          emotionalState: emo(),
          notes: 'Siesta matutina (en reducción)',
          createdAt: new Date(),
          updatedAt: new Date()
        })

        // Siesta vespertina (extendiéndose)
        const nap2Start = dtLocal(2025, 9, day, 14, 0)
        nap2Start.setMinutes(nap2Start.getMinutes() + randInt(-15, 15))
        const nap2End = new Date(nap2Start)
        nap2End.setMinutes(nap2Start.getMinutes() + randInt(90, 120))  // Más larga

        events.push({
          _id: new ObjectId(),
          childId: new ObjectId(LUNA_CHILD_ID),
          parentId: new ObjectId(PARENT_ID),
          eventType: 'nap',
          startTime: nap2Start.toISOString(),
          endTime: nap2End.toISOString(),
          duration: minutesBetween(nap2Start, nap2End),
          emotionalState: emo(),
          notes: 'Siesta vespertina (consolidándose)',
          createdAt: new Date(),
          updatedAt: new Date()
        })

      } else {
        // Últimas 2 semanas: Solo 1 siesta consolidada al mediodía
        const napStart = dtLocal(2025, 9, day, 12, 15)  // Según Plan 0
        napStart.setMinutes(napStart.getMinutes() + randInt(-10, 10))
        const napEnd = new Date(napStart)
        napEnd.setMinutes(napStart.getMinutes() + randInt(100, 130))  // Siesta larga

        events.push({
          _id: new ObjectId(),
          childId: new ObjectId(LUNA_CHILD_ID),
          parentId: new ObjectId(PARENT_ID),
          eventType: 'nap',
          startTime: napStart.toISOString(),
          endTime: napEnd.toISOString(),
          duration: minutesBetween(napStart, napEnd),
          emotionalState: choice(['tranquilo', 'neutral']),
          notes: 'Siesta única consolidada',
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }

      // COMIDAS - Más consistentes con Plan 0
      const meals = [
        { h: 7, m: 58, notes: 'Desayuno' },      // Según Plan 0
        { h: 12, m: 1, notes: 'Almuerzo' },      // Según Plan 0
        { h: 16, m: 2, notes: 'Merienda' },      // Según Plan 0
        { h: 19, m: 0, notes: 'Cena' }           // Según Plan 0
      ]

      for (const meal of meals) {
        const t = dtLocal(2025, 9, day, meal.h, meal.m)
        t.setMinutes(t.getMinutes() + randInt(-10, 10))  // Menos variación

        events.push({
          _id: new ObjectId(),
          childId: new ObjectId(LUNA_CHILD_ID),
          parentId: new ObjectId(PARENT_ID),
          eventType: 'feeding',
          startTime: t.toISOString(),
          feedingType: 'solids',
          feedingAmount: randInt(180, 270),  // Cantidades mayores
          feedingDuration: randInt(15, 25),
          babyState: 'awake',
          feedingNotes: meal.notes,
          emotionalState: choice(['tranquilo', 'neutral']),
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }
    }

    console.log(`✓ Total eventos generados: ${events.length}`)

    // Distribución por tipo
    const eventCounts = {}
    events.forEach(e => {
      eventCounts[e.eventType] = (eventCounts[e.eventType] || 0) + 1
    })

    console.log('\n📊 Distribución de eventos:')
    Object.entries(eventCounts).forEach(([type, count]) => {
      console.log(`   · ${type}: ${count}`)
    })

    // Insertar en MongoDB
    console.log('\n💾 Guardando eventos en MongoDB...')
    await db.collection('events').insertMany(events, { ordered: false })
    console.log('✅ Eventos guardados correctamente')

    // CALCULAR ESTADÍSTICAS DE SEPTIEMBRE
    console.log('\n' + '=' .repeat(60))
    console.log('📈 ESTADÍSTICAS DE SEPTIEMBRE 2025')
    console.log('=' .repeat(60))

    // Sueño nocturno
    const sleeps = events.filter(e => e.eventType === 'sleep')
    const sleepDurations = sleeps.map(e => e.duration)
    const avgSleepSept = Math.round(sleepDurations.reduce((a, b) => a + b, 0) / sleepDurations.length)

    const wakeTimes = sleeps.map(e => new Date(e.endTime))
    const wakeMinutes = wakeTimes.map(d => d.getHours() * 60 + d.getMinutes())
    const avgWakeSept = Math.round(wakeMinutes.reduce((a, b) => a + b, 0) / wakeMinutes.length)

    const bedtimes = sleeps.map(e => new Date(e.startTime))
    const bedtimeMinutes = bedtimes.map(d => {
      let m = d.getHours() * 60 + d.getMinutes()
      if (d.getHours() <= 6) m += 24 * 60
      return m
    })
    const avgBedtimeSept = Math.round(bedtimeMinutes.reduce((a, b) => a + b, 0) / bedtimeMinutes.length) % (24 * 60)

    // Siestas
    const naps = events.filter(e => e.eventType === 'nap')
    const napDurations = naps.map(e => e.duration)
    const avgNapDuration = Math.round(napDurations.reduce((a, b) => a + b, 0) / napDurations.length)

    const napStarts = naps.map(e => new Date(e.startTime))
    const napStartMinutes = napStarts.map(d => d.getHours() * 60 + d.getMinutes())
    const avgNapTime = Math.round(napStartMinutes.reduce((a, b) => a + b, 0) / napStartMinutes.length)

    // Comidas
    const feedings = events.filter(e => e.eventType === 'feeding')

    function formatTime(mins) {
      const h = Math.floor(mins / 60) % 24
      const m = mins % 60
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }

    console.log('\n🌙 SUEÑO NOCTURNO:')
    console.log(`   Duración promedio: ${avgSleepSept} min (${humanDuration(avgSleepSept)})`)
    console.log(`   Hora despertar: ${formatTime(avgWakeSept)}`)
    console.log(`   Hora acostar: ${formatTime(avgBedtimeSept)}`)

    console.log('\n💤 SIESTAS:')
    console.log(`   Total siestas: ${naps.length}`)
    console.log(`   Promedio por día: ${(naps.length / 30).toFixed(1)}`)
    console.log(`   Duración promedio: ${avgNapDuration} min (${humanDuration(avgNapDuration)})`)
    console.log(`   Hora típica: ${formatTime(avgNapTime)}`)

    console.log('\n🍽️ COMIDAS:')
    console.log(`   Total comidas: ${feedings.length}`)
    console.log(`   Promedio por día: ${(feedings.length / 30).toFixed(1)}`)

    console.log('\n😴 DESPERTARES NOCTURNOS:')
    const nightWakings = events.filter(e => e.eventType === 'night_waking')
    console.log(`   Total: ${nightWakings.length}`)
    console.log(`   Promedio por noche: ${(nightWakings.length / 30).toFixed(1)}`)

    console.log('\n🍼 TOMAS NOCTURNAS:')
    const nightFeedings = events.filter(e => e.eventType === 'night_feeding')
    console.log(`   Total: ${nightFeedings.length}`)

    // COMPARACIÓN CON JUNIO
    console.log('\n' + '=' .repeat(60))
    console.log('📊 COMPARACIÓN JUNIO vs SEPTIEMBRE 2025')
    console.log('=' .repeat(60))

    // Estadísticas de junio (conocidas)
    const juneStats = {
      avgSleep: 616,
      avgWake: 417,
      avgBedtime: 1229,
      totalNaps: 60,
      avgNapDuration: 86,
      avgNapTime: 735,
      nightWakings: 8,
      nightFeedings: 9
    }

    console.log('\n🌙 SUEÑO NOCTURNO:')
    console.log(`   Duración:    Junio ${juneStats.avgSleep} min → Sept ${avgSleepSept} min (${avgSleepSept > juneStats.avgSleep ? '+' : ''}${avgSleepSept - juneStats.avgSleep} min)`)
    console.log(`   Despertar:   Junio ${formatTime(juneStats.avgWake)} → Sept ${formatTime(avgWakeSept)}`)
    console.log(`   Acostar:     Junio ${formatTime(juneStats.avgBedtime)} → Sept ${formatTime(avgBedtimeSept)}`)

    console.log('\n💤 SIESTAS:')
    console.log(`   Cantidad:    Junio ${juneStats.totalNaps} → Sept ${naps.length} (${naps.length < juneStats.totalNaps ? '⬇️' : '⬆️'} ${Math.abs(naps.length - juneStats.totalNaps)})`)
    console.log(`   Por día:     Junio 2.0 → Sept ${(naps.length / 30).toFixed(1)} (⬇️ Consolidación exitosa)`)
    console.log(`   Duración:    Junio ${juneStats.avgNapDuration} min → Sept ${avgNapDuration} min (+${avgNapDuration - juneStats.avgNapDuration} min)`)

    console.log('\n😴 DESPERTARES:')
    console.log(`   Nocturnos:   Junio ${juneStats.nightWakings} → Sept ${nightWakings.length} (${nightWakings.length < juneStats.nightWakings ? '⬇️ Mejora' : '⬆️'} ${Math.abs(nightWakings.length - juneStats.nightWakings)})`)

    console.log('\n🍼 TOMAS NOCTURNAS:')
    console.log(`   Total:       Junio ${juneStats.nightFeedings} → Sept ${nightFeedings.length} (${nightFeedings.length === 0 ? '✅ ELIMINADAS' : nightFeedings.length})`)

    // Mejoras identificadas
    console.log('\n' + '=' .repeat(60))
    console.log('✨ MEJORAS IDENTIFICADAS (Plan 0 → Septiembre)')
    console.log('=' .repeat(60))

    const improvements = []

    if (avgSleepSept > juneStats.avgSleep) {
      improvements.push(`✅ Sueño nocturno +${avgSleepSept - juneStats.avgSleep} min más largo`)
    }

    if (naps.length < juneStats.totalNaps) {
      improvements.push(`✅ Consolidación de siestas: ${juneStats.totalNaps}→${naps.length} (${(naps.length / 30).toFixed(1)} por día)`)
    }

    if (avgNapDuration > juneStats.avgNapDuration) {
      improvements.push(`✅ Siestas más largas: +${avgNapDuration - juneStats.avgNapDuration} min promedio`)
    }

    if (nightWakings.length < juneStats.nightWakings) {
      improvements.push(`✅ Menos despertares: ${juneStats.nightWakings}→${nightWakings.length} (-${juneStats.nightWakings - nightWakings.length})`)
    }

    if (nightFeedings.length === 0 && juneStats.nightFeedings > 0) {
      improvements.push(`✅ Tomas nocturnas eliminadas (0 en sept vs ${juneStats.nightFeedings} en junio)`)
    }

    improvements.forEach(improvement => console.log(`   ${improvement}`))

    console.log('\n' + '=' .repeat(60))
    console.log('✅ GENERACIÓN COMPLETADA')
    console.log('=' .repeat(60))
    console.log(`\n📅 Eventos de septiembre 2025: ${events.length} eventos creados`)
    console.log(`👶 Child ID: ${LUNA_CHILD_ID}`)
    console.log('\n🎯 Plan 0 fue generado el 1 de septiembre')
    console.log('   Los eventos de septiembre muestran la implementación del plan')

  } catch (error) {
    console.error('\n❌ Error:', error)
    throw error
  } finally {
    await client.close()
    console.log('\n🔌 Conexión cerrada')
  }
}

main().catch((e) => {
  console.error('Error fatal:', e)
  process.exit(1)
})
