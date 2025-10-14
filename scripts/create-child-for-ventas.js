// Crea niño completo para usuario ventas@jacoagency.io
// Con survey completo + eventos de junio 2025

require('dotenv').config()
const { MongoClient, ObjectId } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI
const DB_NAME = process.env.MONGODB_DB_FINAL || process.env.MONGODB_DATABASE || process.env.MONGODB_DB

if (!MONGODB_URI || !DB_NAME) {
  console.error('❌ Faltan variables de entorno')
  process.exit(1)
}

const TARGET_USER_EMAIL = 'ventas@jacoagency.io'

// Configuración del niño
const CHILD_CONFIG = {
  firstName: 'Luna',
  lastName: 'García',
  birthDate: new Date('2023-12-01'), // 18 meses en junio 2025
  gender: 'female'
}

// Survey completo
const COMPLETE_SURVEY = {
  informacionFamiliar: {
    papa: {
      nombre: 'Roberto García',
      ocupacion: 'Empresario',
      trabajaFueraCasa: true,
      tieneAlergias: false,
      edad: '38'
    },
    mama: {
      nombre: 'Laura Martínez',
      ocupacion: 'Diseñadora',
      trabajaFueraCasa: true,
      tieneAlergias: false,
      edad: '35'
    },
    tieneHermanos: false,
    numeroHermanos: 0
  },
  rutinaHabitos: {
    rutinaAntesAcostarse: 'Baño tibio, cuento, canción',
    horaDormir: '20:00',
    haceSiestas: true,
    numeroSiestas: 2,
    duracionSiestasMinutos: 90,
    dondeDuermeNoche: 'Cuna propia',
    dondeDuermeSiestas: 'Cuna propia',
    usaChupete: true,
    necesitaAyudaDormir: true,
    tipoAyuda: 'Palmaditas y música suave'
  },
  alimentacion: {
    tipoAlimentacion: 'mixta',
    comeSolo: false,
    usaCuchara: true,
    comidaFavorita: 'Frutas',
    comidasDificiles: 'Vegetales verdes',
    horarioComidas: '8:00, 12:00, 16:00, 19:00'
  },
  desarrollo: {
    camina: true,
    habla: true,
    palabrasQueConoce: '20 palabras',
    controlEsfinteres: false,
    juegoPreferido: 'Peluches',
    interactuaOtrosNinos: true
  },
  saludComportamiento: {
    problemasAlergiasActuales: 'Ninguno',
    medicamentosActuales: 'Ninguno',
    comportamientoDiurno: 'Alegre y curiosa',
    miedosEspecificos: 'Ruidos fuertes',
    reaccionSeparacion: 'Llora pero se adapta rápido'
  },
  entornoFamiliar: {
    rutinaDiaria: 'Despierta 7:00, desayuno 8:00, juego, siesta 10:00, almuerzo 12:00, siesta 14:30, merienda 16:00, cena 19:00, dormir 20:00',
    actividadesRegulares: 'Parque diario, natación 2x/semana',
    tiempoPantalla: '30 minutos máximo',
    relacionPadres: 'Muy apegada a ambos',
    apoyoFamiliar: 'Abuela materna ayuda'
  },
  preocupacionesObjetivos: {
    principalPreocupacion: 'Consolidar transición de 2 a 1 siesta',
    objetivoPrincipal: 'Siesta larga al mediodía',
    cambiosRecientes: 'Empezó guardería hace 1 mes',
    expectativas: 'Rutina consistente y predecible'
  }
}

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

  console.log('🚀 CREACIÓN DE NIÑO PARA ventas@jacoagency.io\n')
  console.log('Conectando a MongoDB...')

  await client.connect()
  console.log('✅ Conectado\n')

  const db = client.db(DB_NAME)

  try {
    // 1. Obtener usuario
    console.log('=' .repeat(60))
    console.log('👤 PASO 1: Verificar Usuario')
    console.log('=' .repeat(60))

    const parent = await db.collection('users').findOne({
      email: TARGET_USER_EMAIL.toLowerCase()
    })

    if (!parent) {
      console.error('❌ Usuario no encontrado:', TARGET_USER_EMAIL)
      process.exit(1)
    }

    console.log('✓ Usuario encontrado:', parent.email)
    console.log('  ID:', parent._id.toString())
    console.log('  Nombre:', parent.name)

    // 2. Crear niño con survey completo
    console.log('\n' + '=' .repeat(60))
    console.log('👶 PASO 2: Crear Niño con Survey')
    console.log('=' .repeat(60))

    const childData = {
      ...CHILD_CONFIG,
      parentId: parent._id,
      surveyData: COMPLETE_SURVEY,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const childResult = await db.collection('children').insertOne(childData)
    const childId = childResult.insertedId

    console.log('✓ Niño creado:', CHILD_CONFIG.firstName)
    console.log('  ID:', childId.toString())
    console.log('  Edad en junio 2025: 18 meses')
    console.log('  Survey: COMPLETO ✅')

    // 3. Generar eventos de junio 2025
    console.log('\n' + '=' .repeat(60))
    console.log('📊 PASO 3: Generar Eventos Junio 2025')
    console.log('=' .repeat(60))

    const events = []

    console.log('Generando 30 días de eventos...')

    for (let day = 1; day <= 30; day++) {
      // Sueño nocturno
      const sleepStart = dtLocal(2025, 6, day, 20, 15)
      sleepStart.setMinutes(sleepStart.getMinutes() + randInt(-30, 45))
      const sleepEnd = dtLocal(2025, 6, day + 1, 7, 0)
      sleepEnd.setMinutes(sleepEnd.getMinutes() + randInt(-30, 30))
      const sleepDelay = randInt(5, 20)
      const sleepDuration = Math.max(0, minutesBetween(sleepStart, sleepEnd) - sleepDelay)

      events.push({
        _id: new ObjectId(),
        childId: childId.toString(),
        parentId: parent._id,
        eventType: 'sleep',
        startTime: sleepStart.toISOString(),
        endTime: sleepEnd.toISOString(),
        sleepDelay,
        duration: sleepDuration,
        durationReadable: humanDuration(sleepDuration),
        emotionalState: emo(),
        createdAt: new Date(),
        updatedAt: new Date()
      })

      // Despertares nocturnos (30%)
      if (randInt(1, 100) <= 30) {
        const nwStart = dtLocal(2025, 6, day + 1, choice([1, 2, 3]), randInt(0, 59))
        const nwEnd = new Date(nwStart)
        nwEnd.setMinutes(nwStart.getMinutes() + randInt(10, 25))

        events.push({
          _id: new ObjectId(),
          childId: childId.toString(),
          parentId: parent._id,
          eventType: 'night_waking',
          startTime: nwStart.toISOString(),
          endTime: nwEnd.toISOString(),
          duration: minutesBetween(nwStart, nwEnd),
          emotionalState: choice(['inquieto', 'neutral']),
          notes: 'Despertó brevemente',
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }

      // Tomas nocturnas (20% - proceso destete)
      if (randInt(1, 100) <= 20) {
        const nfStart = dtLocal(2025, 6, day + 1, choice([2, 3, 4]), randInt(0, 59))
        const nfEnd = new Date(nfStart)
        nfEnd.setMinutes(nfStart.getMinutes() + randInt(10, 20))

        events.push({
          _id: new ObjectId(),
          childId: childId.toString(),
          parentId: parent._id,
          eventType: 'night_feeding',
          startTime: nfStart.toISOString(),
          endTime: nfEnd.toISOString(),
          notes: 'Toma nocturna',
          emotionalState: emo(),
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }

      // 2 siestas diarias (transición)
      // Siesta 1: ~10:00 (60-90 min)
      const nap1Start = dtLocal(2025, 6, day, 10, 0)
      nap1Start.setMinutes(nap1Start.getMinutes() + randInt(-30, 30))
      const nap1End = new Date(nap1Start)
      nap1End.setMinutes(nap1Start.getMinutes() + randInt(60, 90))

      events.push({
        _id: new ObjectId(),
        childId: childId.toString(),
        parentId: parent._id,
        eventType: 'nap',
        startTime: nap1Start.toISOString(),
        endTime: nap1End.toISOString(),
        duration: minutesBetween(nap1Start, nap1End),
        emotionalState: emo(),
        notes: 'Siesta matutina',
        createdAt: new Date(),
        updatedAt: new Date()
      })

      // Siesta 2: ~14:30 (60-120 min)
      const nap2Start = dtLocal(2025, 6, day, 14, 30)
      nap2Start.setMinutes(nap2Start.getMinutes() + randInt(-30, 30))
      const nap2End = new Date(nap2Start)
      nap2End.setMinutes(nap2Start.getMinutes() + randInt(60, 120))

      events.push({
        _id: new ObjectId(),
        childId: childId.toString(),
        parentId: parent._id,
        eventType: 'nap',
        startTime: nap2Start.toISOString(),
        endTime: nap2End.toISOString(),
        duration: minutesBetween(nap2Start, nap2End),
        emotionalState: emo(),
        notes: 'Siesta vespertina',
        createdAt: new Date(),
        updatedAt: new Date()
      })

      // Comidas (4 por día)
      const meals = [
        { h: 8, m: 0, notes: 'Desayuno' },
        { h: 12, m: 0, notes: 'Almuerzo' },
        { h: 16, m: 0, notes: 'Merienda' },
        { h: 19, m: 0, notes: 'Cena' }
      ]

      for (const meal of meals) {
        const t = dtLocal(2025, 6, day, meal.h, meal.m)
        t.setMinutes(t.getMinutes() + randInt(-15, 15))

        events.push({
          _id: new ObjectId(),
          childId: childId.toString(),
          parentId: parent._id,
          eventType: 'feeding',
          startTime: t.toISOString(),
          feedingType: 'solids',
          feedingAmount: randInt(150, 250),
          feedingDuration: randInt(15, 30),
          babyState: 'awake',
          feedingNotes: meal.notes,
          emotionalState: emo(),
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }
    }

    console.log(`✓ Eventos generados: ${events.length}`)

    const eventCounts = {}
    events.forEach(e => {
      eventCounts[e.eventType] = (eventCounts[e.eventType] || 0) + 1
    })

    console.log('  Distribución:')
    Object.entries(eventCounts).forEach(([type, count]) => {
      console.log(`    · ${type}: ${count}`)
    })

    await db.collection('events').insertMany(events, { ordered: false })
    console.log('✓ Eventos guardados en MongoDB')

    // 4. Resumen
    console.log('\n' + '=' .repeat(60))
    console.log('✨ NIÑO CREADO EXITOSAMENTE')
    console.log('=' .repeat(60))

    console.log(`\n📋 Usuario: ${parent.email}`)
    console.log(`👶 Niño: ${CHILD_CONFIG.firstName} ${CHILD_CONFIG.lastName}`)
    console.log(`🆔 Child ID: ${childId.toString()}`)
    console.log(`🆔 Parent ID: ${parent._id.toString()}`)
    console.log(`📊 Eventos: ${events.length}`)
    console.log(`✅ Survey: COMPLETO`)

    console.log('\n🎯 Siguiente paso - Generar Plan 0:')
    console.log(`node scripts/02_generate-plan0-july-1-2025.js ${childId.toString()} ${parent._id.toString()}`)

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
