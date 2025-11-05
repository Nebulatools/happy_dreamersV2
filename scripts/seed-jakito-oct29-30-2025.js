require('dotenv').config({ path: '.env' })
const { MongoClient, ObjectId } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI
const DB_NAME = process.env.MONGODB_DB_FINAL || process.env.MONGODB_DATABASE || process.env.MONGODB_DB
const TARGET_CHILD_ID = process.env.SEED_CHILD_ID || '68d1af5315d0e9b1cc189544'
const PARENT_EMAIL = process.env.SEED_PARENT_EMAIL || 'ventas@jacoagency.io'
const SHOULD_CLEAN = !process.argv.includes('--no-clean')

if (!MONGODB_URI || !DB_NAME) {
  console.error('❌ Faltan variables de entorno MONGODB_URI o base de datos (MONGODB_DB_FINAL/MONGODB_DATABASE/MONGODB_DB)')
  process.exit(1)
}

function dt(year, month, day, hour, minute) {
  return new Date(year, month - 1, day, hour, minute)
}

function minutesBetween(start, end) {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000))
}

function formatDuration(mins) {
  if (!mins || mins <= 0) return ''
  const hours = Math.floor(mins / 60)
  const minutes = mins % 60
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}min`
  if (hours > 0) return `${hours}h`
  return `${minutes}min`
}

function addMinutes(date, minutes) {
  const result = new Date(date)
  result.setMinutes(result.getMinutes() + minutes)
  return result
}

const rawEvents = [
  // --- Día 1: Miércoles 29 de octubre de 2025 ---
  {
    type: 'sleep',
    start: dt(2025, 10, 29, 0, 10),
    end: dt(2025, 10, 29, 6, 45),
    sleepDelay: 18,
    emotionalState: 'tranquilo',
    notes: 'Último tramo del sueño nocturno posterior al plan anterior. Se mantuvo relajado tras rutina calmada.'
  },
  {
    type: 'night_waking',
    start: dt(2025, 10, 29, 0, 50),
    end: dt(2025, 10, 29, 1, 5),
    awakeDelay: 15,
    emotionalState: 'inquieto',
    notes: 'Despertar breve por gases; se consoló con contacto y sonidos suaves.'
  },
  {
    type: 'feeding',
    start: dt(2025, 10, 29, 0, 55),
    end: dt(2025, 10, 29, 1, 5),
    feedingType: 'bottle',
    feedingAmount: 90,
    feedingDuration: 10,
    babyState: 'awake',
    notes: 'Biberón 90 ml; regresó a la cuna somnoliento y sin llanto.'
  },
  {
    type: 'night_waking',
    start: dt(2025, 10, 29, 3, 20),
    end: dt(2025, 10, 29, 3, 35),
    awakeDelay: 15,
    emotionalState: 'tranquilo',
    notes: 'Despertó suave para cambio de pañal y volvió a relajarse rápido.'
  },
  {
    type: 'feeding',
    start: dt(2025, 10, 29, 3, 25),
    end: dt(2025, 10, 29, 3, 37),
    feedingType: 'breast',
    feedingDuration: 12,
    babyState: 'sleepy',
    notes: 'Toma al pecho lado derecho; quedó dormido en brazos y se recostó despierto.'
  },
  {
    type: 'feeding',
    start: dt(2025, 10, 29, 7, 0),
    end: dt(2025, 10, 29, 7, 18),
    feedingType: 'breast',
    feedingDuration: 18,
    babyState: 'awake',
    notes: 'Toma completa al despertar; buen eructo.'
  },
  {
    type: 'nap',
    start: dt(2025, 10, 29, 8, 30),
    end: dt(2025, 10, 29, 9, 25),
    sleepDelay: 5,
    emotionalState: 'tranquilo',
    notes: 'Siesta 1 en brazos y traslado a cuna manteniendo white noise.'
  },
  {
    type: 'feeding',
    start: dt(2025, 10, 29, 9, 45),
    end: dt(2025, 10, 29, 9, 57),
    feedingType: 'bottle',
    feedingAmount: 80,
    feedingDuration: 12,
    babyState: 'awake',
    notes: 'Top-up ligero después de siesta; aceptó 80 ml.'
  },
  {
    type: 'extra_activities',
    start: dt(2025, 10, 29, 10, 10),
    end: dt(2025, 10, 29, 10, 30),
    activityDescription: 'tummy time sobre tapete',
    activityImpact: 'positive',
    activityDuration: 20,
    notes: 'Aceptó tummy time con buena tolerancia; sonrisas y vocalizaciones.'
  },
  {
    type: 'nap',
    start: dt(2025, 10, 29, 11, 5),
    end: dt(2025, 10, 29, 12, 10),
    sleepDelay: 8,
    emotionalState: 'inquieto',
    notes: 'Siesta 2; costó conciliar por ruido exterior, se usó shhh-pat.'
  },
  {
    type: 'feeding',
    start: dt(2025, 10, 29, 12, 20),
    end: dt(2025, 10, 29, 12, 36),
    feedingType: 'breast',
    feedingDuration: 16,
    babyState: 'awake',
    notes: 'Toma al pecho en posición de fútbol para mejorar agarre.'
  },
  {
    type: 'nap',
    start: dt(2025, 10, 29, 13, 30),
    end: dt(2025, 10, 29, 15, 0),
    sleepDelay: 10,
    emotionalState: 'tranquilo',
    notes: 'Siesta 3 con blackout parcial y ruido blanco continuo.'
  },
  {
    type: 'feeding',
    start: dt(2025, 10, 29, 15, 15),
    end: dt(2025, 10, 29, 15, 27),
    feedingType: 'bottle',
    feedingAmount: 100,
    feedingDuration: 12,
    babyState: 'awake',
    notes: 'Biberón 100 ml después de la siesta larga.'
  },
  {
    type: 'nap',
    start: dt(2025, 10, 29, 16, 5),
    end: dt(2025, 10, 29, 16, 45),
    sleepDelay: 6,
    emotionalState: 'tranquilo',
    notes: 'Catnap en portabebé caminando por la casa.'
  },
  {
    type: 'extra_activities',
    start: dt(2025, 10, 29, 17, 30),
    end: dt(2025, 10, 29, 18, 0),
    activityDescription: 'paseo vespertino en carriola',
    activityImpact: 'neutral',
    activityDuration: 30,
    notes: 'Paseo suave antes de la última toma; se mantuvo observando entorno.'
  },
  {
    type: 'feeding',
    start: dt(2025, 10, 29, 18, 45),
    end: dt(2025, 10, 29, 19, 5),
    feedingType: 'breast',
    feedingDuration: 20,
    babyState: 'awake',
    notes: 'Última toma grande del día; terminó relajado.'
  },
  {
    type: 'extra_activities',
    start: dt(2025, 10, 29, 19, 15),
    end: dt(2025, 10, 29, 19, 40),
    activityDescription: 'rutina nocturna (baño templado y masaje)',
    activityImpact: 'positive',
    activityDuration: 25,
    notes: 'Baño, masaje y cuento con luces tenues.'
  },
  {
    type: 'sleep',
    start: dt(2025, 10, 29, 20, 5),
    end: dt(2025, 10, 30, 6, 46),
    sleepDelay: 15,
    emotionalState: 'tranquilo',
    notes: 'Se acostó 20:00, tardó 15 min en dormirse con arrullo en cuna.'
  },
  {
    type: 'feeding',
    start: dt(2025, 10, 29, 22, 30),
    end: dt(2025, 10, 29, 22, 38),
    feedingType: 'bottle',
    feedingAmount: 70,
    feedingDuration: 8,
    babyState: 'asleep',
    notes: 'Dream feed planificado; tomó 70 ml sin despertarse por completo.'
  },
  {
    type: 'night_waking',
    start: dt(2025, 10, 30, 1, 42),
    end: dt(2025, 10, 30, 1, 55),
    awakeDelay: 13,
    emotionalState: 'neutral',
    notes: 'Despertar corto para cambio de posición.'
  },
  {
    type: 'feeding',
    start: dt(2025, 10, 30, 1, 45),
    end: dt(2025, 10, 30, 1, 55),
    feedingType: 'breast',
    feedingDuration: 10,
    babyState: 'sleepy',
    notes: 'Mini toma al pecho para confort; se volvió a dormir en cuna.'
  },
  {
    type: 'night_waking',
    start: dt(2025, 10, 30, 4, 18),
    end: dt(2025, 10, 30, 4, 32),
    awakeDelay: 14,
    emotionalState: 'tranquilo',
    notes: 'Despertó con pañal húmedo; se manejó en penumbra.'
  },
  {
    type: 'feeding',
    start: dt(2025, 10, 30, 4, 21),
    end: dt(2025, 10, 30, 4, 31),
    feedingType: 'bottle',
    feedingAmount: 60,
    feedingDuration: 10,
    babyState: 'awake',
    notes: 'Biberón breve para completar la noche.'
  },
  // --- Día 2: Jueves 30 de octubre de 2025 ---
  {
    type: 'feeding',
    start: dt(2025, 10, 30, 7, 5),
    end: dt(2025, 10, 30, 7, 22),
    feedingType: 'breast',
    feedingDuration: 17,
    babyState: 'awake',
    notes: 'Toma al despertar con buen agarre.'
  },
  {
    type: 'nap',
    start: dt(2025, 10, 30, 8, 32),
    end: dt(2025, 10, 30, 9, 25),
    sleepDelay: 4,
    emotionalState: 'tranquilo',
    notes: 'Siesta 1, se quedó dormido en 4 min con ayuda de white noise.'
  },
  {
    type: 'feeding',
    start: dt(2025, 10, 30, 9, 50),
    end: dt(2025, 10, 30, 10, 2),
    feedingType: 'bottle',
    feedingAmount: 85,
    feedingDuration: 12,
    babyState: 'awake',
    notes: 'Top-up matutino para mantener ventanas cortas.'
  },
  {
    type: 'extra_activities',
    start: dt(2025, 10, 30, 10, 20),
    end: dt(2025, 10, 30, 10, 45),
    activityDescription: 'sesión de estimulación musical',
    activityImpact: 'positive',
    activityDuration: 25,
    notes: 'Música suave y caricias; se mantuvo atento sin sobreestimularse.'
  },
  {
    type: 'nap',
    start: dt(2025, 10, 30, 11, 10),
    end: dt(2025, 10, 30, 12, 5),
    sleepDelay: 7,
    emotionalState: 'tranquilo',
    notes: 'Siesta 2 en habitación oscura, se quedó dormido con palmaditas.'
  },
  {
    type: 'feeding',
    start: dt(2025, 10, 30, 12, 25),
    end: dt(2025, 10, 30, 12, 40),
    feedingType: 'breast',
    feedingDuration: 15,
    babyState: 'awake',
    notes: 'Toma completa al pecho; terminó relajado.'
  },
  {
    type: 'nap',
    start: dt(2025, 10, 30, 13, 35),
    end: dt(2025, 10, 30, 14, 55),
    sleepDelay: 9,
    emotionalState: 'tranquilo',
    notes: 'Siesta 3 con blackout total, se despertó descansado.'
  },
  {
    type: 'feeding',
    start: dt(2025, 10, 30, 15, 20),
    end: dt(2025, 10, 30, 15, 33),
    feedingType: 'bottle',
    feedingAmount: 95,
    feedingDuration: 13,
    babyState: 'awake',
    notes: 'Biberón 95 ml, sostuvo buena digestión.'
  },
  {
    type: 'nap',
    start: dt(2025, 10, 30, 16, 15),
    end: dt(2025, 10, 30, 16, 50),
    sleepDelay: 5,
    emotionalState: 'tranquilo',
    notes: 'Catnap breve en porteo mientras se caminó en casa.'
  },
  {
    type: 'extra_activities',
    start: dt(2025, 10, 30, 17, 20),
    end: dt(2025, 10, 30, 17, 50),
    activityDescription: 'masaje relajante y estiramientos suaves',
    activityImpact: 'positive',
    activityDuration: 30,
    notes: 'Masaje con aceite tibio para preparar la rutina nocturna.'
  },
  {
    type: 'feeding',
    start: dt(2025, 10, 30, 18, 40),
    end: dt(2025, 10, 30, 19, 2),
    feedingType: 'breast',
    feedingDuration: 22,
    babyState: 'awake',
    notes: 'Última toma del día; se quedó tranquilo en brazos.'
  },
  {
    type: 'extra_activities',
    start: dt(2025, 10, 30, 19, 10),
    end: dt(2025, 10, 30, 19, 35),
    activityDescription: 'baño tibio y cuento',
    activityImpact: 'positive',
    activityDuration: 25,
    notes: 'Baño rápido, cambio de pañal y cuento con luz cálida.'
  },
  {
    type: 'sleep',
    start: dt(2025, 10, 30, 20, 0),
    end: dt(2025, 10, 31, 6, 40),
    sleepDelay: 14,
    emotionalState: 'tranquilo',
    notes: 'Se durmió 14 min después de colocarlo despierto en la cuna.'
  },
  {
    type: 'feeding',
    start: dt(2025, 10, 30, 22, 20),
    end: dt(2025, 10, 30, 22, 30),
    feedingType: 'bottle',
    feedingAmount: 60,
    feedingDuration: 10,
    babyState: 'asleep',
    notes: 'Dream feed corto para sostener el tramo largo de sueño.'
  },
  {
    type: 'night_waking',
    start: dt(2025, 10, 31, 2, 45),
    end: dt(2025, 10, 31, 3, 0),
    awakeDelay: 15,
    emotionalState: 'neutral',
    notes: 'Despertó a las 02:45, se calmó con arrullo leve.'
  },
  {
    type: 'feeding',
    start: dt(2025, 10, 31, 2, 48),
    end: dt(2025, 10, 31, 2, 58),
    feedingType: 'breast',
    feedingDuration: 10,
    babyState: 'sleepy',
    notes: 'Toma corta para reconectar; volvió a dormirse en la cuna.'
  }
]

async function main() {
  const client = new MongoClient(MONGODB_URI)
  console.log('🔌 Conectando a MongoDB...')
  await client.connect()
  console.log('✅ Conexión exitosa')

  const db = client.db(DB_NAME)
  const usersCol = db.collection('users')
  const childrenCol = db.collection('children')
  const eventsCol = db.collection('events')

  try {
    const child = await childrenCol.findOne({ _id: new ObjectId(TARGET_CHILD_ID) })
    if (!child) {
      throw new Error(`Niño con ID ${TARGET_CHILD_ID} no encontrado`)
    }

    let caregiverId = child.parentId
    if (!caregiverId) {
      const parent = await usersCol.findOne({ email: PARENT_EMAIL.toLowerCase() })
      if (!parent) {
        throw new Error(`No se encontró al usuario padre con email ${PARENT_EMAIL}`)
      }
      caregiverId = parent._id
    }

    const rangeStart = dt(2025, 10, 29, 0, 0)
    const rangeEnd = dt(2025, 10, 31, 12, 0)

    if (SHOULD_CLEAN) {
      const deletion = await eventsCol.deleteMany({
        childId: new ObjectId(TARGET_CHILD_ID),
        startTime: { $gte: rangeStart.toISOString(), $lt: rangeEnd.toISOString() }
      })
      console.log(`🧹 Eliminados ${deletion.deletedCount} eventos previos entre ${rangeStart.toISOString()} y ${rangeEnd.toISOString()}`)
    } else {
      console.log('⚠️ Limpieza deshabilitada (--no-clean). Los eventos nuevos podrían coexistir con registros previos en el rango.')
    }

    const now = new Date()

    const events = rawEvents
      .map((evt) => {
        const start = evt.start
        const end = evt.end || (evt.feedingDuration ? addMinutes(evt.start, evt.feedingDuration) : null)

        const baseDoc = {
          _id: new ObjectId(),
          childId: new ObjectId(TARGET_CHILD_ID),
          parentId: child.parentId || caregiverId,
          caregiverId: caregiverId ? new ObjectId(caregiverId) : undefined,
          eventType: evt.type,
          startTime: start.toISOString(),
          createdAt: now,
          updatedAt: now,
          notes: evt.notes || undefined,
          emotionalState: evt.emotionalState || undefined
        }

        if (end) {
          baseDoc.endTime = end.toISOString()
        }

        const totalMinutes = end ? minutesBetween(start, end) : null

        if (evt.type === 'sleep' || evt.type === 'nap') {
          const sleepDelay = evt.sleepDelay || 0
          baseDoc.sleepDelay = sleepDelay
          if (totalMinutes !== null) {
            const effective = Math.max(0, totalMinutes - sleepDelay)
            baseDoc.duration = effective
            baseDoc.durationReadable = formatDuration(effective)
          }
        } else if (evt.type === 'night_waking') {
          const awakeDelay = evt.awakeDelay != null ? evt.awakeDelay : totalMinutes
          baseDoc.awakeDelay = awakeDelay
          if (totalMinutes !== null) {
            baseDoc.duration = totalMinutes
            baseDoc.durationReadable = formatDuration(totalMinutes)
          }
        } else if (evt.type === 'feeding') {
          baseDoc.feedingType = evt.feedingType
          baseDoc.feedingAmount = evt.feedingAmount
          baseDoc.feedingDuration = evt.feedingDuration
          baseDoc.babyState = evt.babyState
          baseDoc.feedingNotes = evt.notes
          if (totalMinutes !== null && totalMinutes > 0) {
            baseDoc.duration = totalMinutes
            baseDoc.durationReadable = formatDuration(totalMinutes)
          }
        } else if (evt.type === 'extra_activities') {
          baseDoc.activityDescription = evt.activityDescription
          baseDoc.activityImpact = evt.activityImpact || 'neutral'
          baseDoc.activityDuration = evt.activityDuration || totalMinutes
          baseDoc.activityNotes = evt.notes
          if (totalMinutes !== null) {
            baseDoc.duration = totalMinutes
            baseDoc.durationReadable = formatDuration(totalMinutes)
          }
        }

        return baseDoc
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

    const insertResult = await eventsCol.insertMany(events)
    console.log(`✅ Insertados ${insertResult.insertedCount} eventos nuevos para Jakito`)

    const countsByType = events.reduce((acc, evt) => {
      acc[evt.eventType] = (acc[evt.eventType] || 0) + 1
      return acc
    }, {})

    console.log('📊 Desglose por tipo:', countsByType)
    console.log('📅 Rango cubierto:')
    console.log('   Desde:', events[0].startTime)
    console.log('   Hasta:', events[events.length - 1].endTime || events[events.length - 1].startTime)

  } catch (error) {
    console.error('❌ Error durante la inserción de eventos:', error)
  } finally {
    await client.close()
    console.log('🔌 Conexión cerrada')
  }
}

main().catch((err) => {
  console.error('❌ Error inesperado:', err)
  process.exit(1)
})
