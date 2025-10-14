// Crea niño mock COMPLETO para investigación de Plan 0
// Incluye: User padre + Child con survey detallado + Eventos de junio 2025

require('dotenv').config()
const { MongoClient, ObjectId } = require('mongodb')
const bcrypt = require('bcryptjs')

const MONGODB_URI = process.env.MONGODB_URI
const DB_NAME = process.env.MONGODB_DB_FINAL || process.env.MONGODB_DATABASE || process.env.MONGODB_DB

if (!MONGODB_URI || !DB_NAME) {
  console.error('❌ Faltan variables de entorno')
  process.exit(1)
}

// Configuración del niño mock
const MOCK_CONFIG = {
  parent: {
    email: 'test-plan-investigation@mock.com',
    name: 'Test Parent Investigation',
    password: 'Test123!',
    role: 'parent'
  },
  child: {
    firstName: 'Sofia',
    lastName: 'Test',
    birthDate: new Date('2024-01-15'), // 18 meses en junio 2025 (ventana transición siestas)
    gender: 'female'
  }
}

// Survey completo y realista
const COMPLETE_SURVEY = {
  informacionFamiliar: {
    papa: {
      nombre: 'Carlos Test',
      ocupacion: 'Ingeniero',
      trabajaFueraCasa: true,
      tieneAlergias: false,
      edad: '35',
      telefono: '1234567890'
    },
    mama: {
      nombre: 'Ana Test',
      ocupacion: 'Doctora',
      trabajaFueraCasa: true,
      tieneAlergias: false,
      edad: '33',
      telefono: '0987654321'
    },
    tieneHermanos: false,
    numeroHermanos: 0
  },
  rutinaHabitos: {
    rutinaAntesAcostarse: 'Baño, cuento, canción de cuna',
    horaDormir: '20:30',
    haceSiestas: true,
    numeroSiestas: 2,
    duracionSiestasMinutos: 90,
    dondeDuermeNoche: 'Cuna en habitación propia',
    dondeDuermeSiestas: 'Cuna en habitación propia',
    usaChupete: false,
    necesitaAyudaDormir: true,
    tipoAyuda: 'Canción y palmaditas'
  },
  alimentacion: {
    tipoAlimentacion: 'mixta',
    comeSolo: false,
    usaCuchara: true,
    comidaFavorita: 'Puré de verduras',
    comidasDificiles: 'Carne',
    horarioComidas: 'Regular - 8:00, 12:00, 16:00, 19:00'
  },
  desarrollo: {
    camina: true,
    habla: true,
    palabrasQueConoce: '15-20 palabras',
    controlEsfinteres: false,
    juegoPreferido: 'Bloques de construcción',
    interactuaOtrosNinos: true
  },
  saludComportamiento: {
    problemasAlergiasActuales: 'Ninguno',
    medicamentosActuales: 'Ninguno',
    comportamientoDiurno: 'Activa y juguetona',
    miedosEspecificos: 'Oscuridad total',
    reaccionSeparacion: 'Llora un poco pero se calma rápido'
  },
  entornoFamiliar: {
    rutinaDiaria: 'Despierta 7:00, desayuno 8:00, juego, siesta 10:00, almuerzo 12:00, juego, siesta 15:00, cena 19:00, dormir 20:30',
    actividadesRegulares: 'Parque 3 veces/semana, clase música 1 vez/semana',
    tiempoPantalla: 'Máximo 30 minutos al día',
    relacionPadres: 'Excelente con ambos',
    apoyoFamiliar: 'Abuelos ayudan 2 veces/semana'
  },
  preocupacionesObjetivos: {
    principalPreocupacion: 'Transición de 2 siestas a 1',
    objetivoPrincipal: 'Lograr una siesta larga y consolidada',
    cambiosRecientes: 'Empezó a caminar hace 2 meses',
    expectativas: 'Establecer rutina de sueño consistente'
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

  console.log('🚀 CREACIÓN DE NIÑO MOCK COMPLETO\n')
  console.log('Conectando a MongoDB...')

  await client.connect()
  console.log('✅ Conectado\n')

  const db = client.db(DB_NAME)

  try {
    // 1. Crear/obtener usuario padre
    console.log('=' .repeat(60))
    console.log('👤 PASO 1: Usuario Padre')
    console.log('=' .repeat(60))

    let parent = await db.collection('users').findOne({
      email: MOCK_CONFIG.parent.email.toLowerCase()
    })

    if (parent) {
      console.log('✓ Usuario ya existe:', parent.email)
      console.log('  ID:', parent._id.toString())
    } else {
      const hashedPassword = await bcrypt.hash(MOCK_CONFIG.parent.password, 10)
      const newParent = {
        email: MOCK_CONFIG.parent.email.toLowerCase(),
        name: MOCK_CONFIG.parent.name,
        password: hashedPassword,
        role: MOCK_CONFIG.parent.role,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = await db.collection('users').insertOne(newParent)
      parent = { ...newParent, _id: result.insertedId }
      console.log('✓ Usuario creado:', parent.email)
      console.log('  ID:', parent._id.toString())
    }

    // 2. Crear niño con survey completo
    console.log('\n' + '=' .repeat(60))
    console.log('👶 PASO 2: Niño con Survey Completo')
    console.log('=' .repeat(60))

    const childData = {
      ...MOCK_CONFIG.child,
      parentId: parent._id,
      surveyData: COMPLETE_SURVEY,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const childResult = await db.collection('children').insertOne(childData)
    const childId = childResult.insertedId

    console.log('✓ Niño creado:', MOCK_CONFIG.child.firstName)
    console.log('  ID:', childId.toString())
    console.log('  Edad en junio 2025: 18 meses (ventana transición siestas)')
    console.log('  Survey: COMPLETO ✅')

    // 3. Generar eventos de junio 2025
    console.log('\n' + '=' .repeat(60))
    console.log('📊 PASO 3: Eventos de Junio 2025')
    console.log('=' .repeat(60))

    const events = []
    const from = dtLocal(2025, 6, 1, 0, 0)
    const to = dtLocal(2025, 7, 1, 0, 0)

    console.log('Generando 30 días de eventos...')

    for (let day = 1; day <= 30; day++) {
      // Sueño nocturno (20:15-21:30 → 06:15-07:30)
      const sleepStart = dtLocal(2025, 6, day, 20, 30)
      sleepStart.setMinutes(sleepStart.getMinutes() + randInt(-30, 60))
      const sleepEnd = dtLocal(2025, 6, day + 1, 7, 0)
      sleepEnd.setMinutes(sleepEnd.getMinutes() + randInt(-45, 30))
      const sleepDelay = randInt(5, 25)
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

      // Despertar nocturno ocasional (30%)
      if (randInt(1, 100) <= 30) {
        const nwStart = dtLocal(2025, 6, day + 1, choice([1, 2, 3]), randInt(0, 59))
        const nwEnd = new Date(nwStart)
        nwEnd.setMinutes(nwStart.getMinutes() + randInt(8, 25))
        const awakeDuration = minutesBetween(nwStart, nwEnd)

        events.push({
          _id: new ObjectId(),
          childId: childId.toString(),
          parentId: parent._id,
          eventType: 'night_waking',
          startTime: nwStart.toISOString(),
          endTime: nwEnd.toISOString(),
          awakeDelay: awakeDuration,
          duration: awakeDuration,
          durationReadable: humanDuration(awakeDuration),
          emotionalState: choice(['inquieto', 'neutral']),
          notes: 'Despertó y pidió agua',
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }

      // Toma nocturna ocasional (15% - en transición destete)
      if (randInt(1, 100) <= 15) {
        const nfStart = dtLocal(2025, 6, day + 1, choice([2, 3, 4]), randInt(0, 59))
        const nfEnd = new Date(nfStart)
        nfEnd.setMinutes(nfStart.getMinutes() + randInt(10, 25))

        events.push({
          _id: new ObjectId(),
          childId: childId.toString(),
          parentId: parent._id,
          eventType: 'night_feeding',
          startTime: nfStart.toISOString(),
          endTime: nfEnd.toISOString(),
          notes: 'Toma nocturna (en proceso de destete)',
          emotionalState: emo(),
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }

      // Siesta matutina (9:30-10:30, 60-90 min)
      const nap1Start = dtLocal(2025, 6, day, 9, 45)
      nap1Start.setMinutes(nap1Start.getMinutes() + randInt(-30, 30))
      const nap1End = new Date(nap1Start)
      nap1End.setMinutes(nap1Start.getMinutes() + randInt(60, 90))
      const nap1Duration = minutesBetween(nap1Start, nap1End)

      events.push({
        _id: new ObjectId(),
        childId: childId.toString(),
        parentId: parent._id,
        eventType: 'nap',
        startTime: nap1Start.toISOString(),
        endTime: nap1End.toISOString(),
        duration: nap1Duration,
        durationReadable: humanDuration(nap1Duration),
        emotionalState: emo(),
        notes: 'Siesta matutina',
        createdAt: new Date(),
        updatedAt: new Date()
      })

      // Siesta vespertina (14:00-15:00, 60-120 min)
      const nap2Start = dtLocal(2025, 6, day, 14, 15)
      nap2Start.setMinutes(nap2Start.getMinutes() + randInt(-30, 45))
      const nap2End = new Date(nap2Start)
      nap2End.setMinutes(nap2Start.getMinutes() + randInt(60, 120))
      const nap2Duration = minutesBetween(nap2Start, nap2End)

      events.push({
        _id: new ObjectId(),
        childId: childId.toString(),
        parentId: parent._id,
        eventType: 'nap',
        startTime: nap2Start.toISOString(),
        endTime: nap2End.toISOString(),
        duration: nap2Duration,
        durationReadable: humanDuration(nap2Duration),
        emotionalState: emo(),
        notes: 'Siesta vespertina',
        createdAt: new Date(),
        updatedAt: new Date()
      })

      // Comidas (desayuno, almuerzo, merienda, cena)
      const meals = [
        { h: 8, m: 0, notes: 'Desayuno' },
        { h: 12, m: 30, notes: 'Almuerzo' },
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
    console.log('  - Tipo y cantidad:')

    const eventCounts = {}
    events.forEach(e => {
      eventCounts[e.eventType] = (eventCounts[e.eventType] || 0) + 1
    })

    Object.entries(eventCounts).forEach(([type, count]) => {
      console.log(`    · ${type}: ${count}`)
    })

    // Insertar eventos
    await db.collection('events').insertMany(events, { ordered: false })
    console.log('✓ Eventos insertados en MongoDB')

    // 4. Resumen final
    console.log('\n' + '=' .repeat(60))
    console.log('✨ NIÑO MOCK COMPLETADO')
    console.log('=' .repeat(60))

    console.log('\n📋 Datos creados:')
    console.log(`  Usuario: ${parent.email}`)
    console.log(`  Password: ${MOCK_CONFIG.parent.password}`)
    console.log(`  Niño: ${MOCK_CONFIG.child.firstName} ${MOCK_CONFIG.child.lastName}`)
    console.log(`  Child ID: ${childId.toString()}`)
    console.log(`  Parent ID: ${parent._id.toString()}`)
    console.log(`  Eventos: ${events.length} (junio 2025)`)
    console.log(`  Survey: COMPLETO ✅`)

    console.log('\n🎯 Siguiente paso:')
    console.log('  Ejecutar generación de Plan 0 con:')
    console.log(`  node scripts/02_generate-plan0-july-1-2025.js ${childId.toString()} ${parent._id.toString()}`)

    console.log('\n💾 Guardar estos IDs para referencia:')
    console.log(`CHILD_ID=${childId.toString()}`)
    console.log(`PARENT_ID=${parent._id.toString()}`)

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
