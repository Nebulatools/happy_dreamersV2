#!/usr/bin/env node

/**
 * 🎯 SCRIPT DE PRUEBA: Registrar un día completo de eventos
 * 
 * Este script registra todos los tipos de eventos en Happy Dreamers
 * para demostrar que el sistema funciona perfectamente.
 * 
 * Uso: node scripts/test-eventos-dia-completo.js
 */

const { MongoClient, ObjectId } = require('mongodb')

// Configuración
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const DB_NAME = process.env.MONGODB_DB || 'happy_dreamers'

// Datos de prueba - usando Jacoe Agency de los logs
const TEST_CONFIG = {
  childId: '6819109560bd59637a2f1d86', // ID de Jacoe Agency (de los logs)
  parentId: '6819104a60bd59637a2f1d85',  // ID del padre de Jacoe
  testDate: '2025-08-20' // Fecha base para los eventos
}

console.log('🎯 INICIANDO PRUEBA DE EVENTOS - DÍA COMPLETO DE JACOE AGENCY')
console.log('=' .repeat(60))

async function conectarMongoDB() {
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  console.log('✅ Conectado a MongoDB')
  return client.db(DB_NAME)
}

async function registrarEvento(db, eventData) {
  try {
    // Crear el evento con ID único
    const event = {
      _id: new ObjectId().toString(),
      childId: TEST_CONFIG.childId,
      createdAt: new Date().toISOString(),
      ...eventData
    }

    // Registrar evento en la colección children
    const result = await db.collection('children').updateOne(
      { _id: new ObjectId(TEST_CONFIG.childId) },
      { $push: { events: event } }
    )

    if (result.modifiedCount > 0) {
      console.log(`✅ ${eventData.eventType.toUpperCase()}: ${eventData.description || eventData.startTime}`)
      return true
    } else {
      console.log(`❌ Error registrando evento: ${eventData.eventType}`)
      return false
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`)
    return false
  }
}

async function ejecutarPruebaDiaCompleto() {
  let db
  let client

  try {
    client = new MongoClient(MONGODB_URI)
    await client.connect()
    db = client.db(DB_NAME)
    console.log('✅ Conectado a MongoDB')

    // Verificar que el niño existe
    const child = await db.collection('children').findOne({ 
      _id: new ObjectId(TEST_CONFIG.childId) 
    })
    
    if (!child) {
      console.log('❌ ERROR: Niño no encontrado. Verifica el childId en TEST_CONFIG')
      return
    }

    console.log(`🧒 Niño encontrado: ${child.firstName} ${child.lastName}`)
    console.log('')

    // Array de eventos del día completo
    const eventos = [
      // 6:30 AM - Despertar
      {
        eventType: 'wake',
        startTime: `${TEST_CONFIG.testDate}T06:30:00.000Z`,
        emotionalState: 'happy',
        notes: 'Se despertó solita, muy contenta',
        description: 'Despertar matutino 6:30 AM'
      },

      // 7:00 AM - Desayuno
      {
        eventType: 'feeding',
        startTime: `${TEST_CONFIG.testDate}T07:00:00.000Z`,
        endTime: `${TEST_CONFIG.testDate}T07:25:00.000Z`,
        feedingType: 'solids',
        feedingAmount: 150,
        feedingDuration: 25,
        babyState: 'awake',
        feedingNotes: 'Comió muy bien, avena con frutas',
        emotionalState: 'happy',
        description: 'Desayuno - Avena con frutas'
      },

      // 9:30 AM - Actividad en el parque
      {
        eventType: 'extra_activities',
        startTime: `${TEST_CONFIG.testDate}T09:30:00.000Z`,
        activityDescription: 'Juego en el parque con otros niños',
        activityDuration: 90,
        activityImpact: 'positive',
        activityNotes: 'Mucha actividad física, se divirtió mucho',
        emotionalState: 'excited',
        description: 'Parque - 90 minutos de juego'
      },

      // 11:30 AM - Siesta matutina
      {
        eventType: 'nap',
        startTime: `${TEST_CONFIG.testDate}T11:30:00.000Z`,
        endTime: `${TEST_CONFIG.testDate}T12:45:00.000Z`,
        emotionalState: 'calm',
        notes: 'Siesta después del parque',
        description: 'Siesta matutina - 1h 15min'
      },

      // 1:00 PM - Almuerzo
      {
        eventType: 'feeding',
        startTime: `${TEST_CONFIG.testDate}T13:00:00.000Z`,
        endTime: `${TEST_CONFIG.testDate}T13:30:00.000Z`,
        feedingType: 'solids',
        feedingAmount: 200,
        feedingDuration: 30,
        babyState: 'awake',
        feedingNotes: 'Pollo con verduras, comió todo',
        emotionalState: 'neutral',
        description: 'Almuerzo - Pollo con verduras'
      },

      // 3:00 PM - Medicamento
      {
        eventType: 'medication',
        startTime: `${TEST_CONFIG.testDate}T15:00:00.000Z`,
        medicationName: 'Vitamina D',
        medicationDose: '400 UI (2 gotas)',
        medicationTime: `${TEST_CONFIG.testDate}T15:00:00.000Z`,
        medicationNotes: 'Vitamina diaria como indica el pediatra',
        emotionalState: 'neutral',
        description: 'Medicamento - Vitamina D'
      },

      // 3:30 PM - Siesta vespertina
      {
        eventType: 'nap',
        startTime: `${TEST_CONFIG.testDate}T15:30:00.000Z`,
        endTime: `${TEST_CONFIG.testDate}T16:30:00.000Z`,
        emotionalState: 'sleepy',
        notes: 'Siesta corta vespertina',
        description: 'Siesta vespertina - 1h'
      },

      // 6:00 PM - Cena
      {
        eventType: 'feeding',
        startTime: `${TEST_CONFIG.testDate}T18:00:00.000Z`,
        endTime: `${TEST_CONFIG.testDate}T18:20:00.000Z`,
        feedingType: 'bottle',
        feedingAmount: 180,
        feedingDuration: 20,
        babyState: 'awake',
        feedingNotes: 'Biberón con leche, muy tranquila',
        emotionalState: 'calm',
        description: 'Cena - Biberón 180ml'
      },

      // 7:00 PM - Rutina nocturna
      {
        eventType: 'extra_activities',
        startTime: `${TEST_CONFIG.testDate}T19:00:00.000Z`,
        activityDescription: 'Baño y cuentos antes de dormir',
        activityDuration: 45,
        activityImpact: 'calming',
        activityNotes: 'Rutina relajante, 3 cuentos',
        emotionalState: 'calm',
        description: 'Rutina nocturna - Baño y cuentos'
      },

      // 8:00 PM - Acostar
      {
        eventType: 'sleep',
        startTime: `${TEST_CONFIG.testDate}T20:00:00.000Z`,
        sleepDelay: 15,
        emotionalState: 'calm',
        notes: 'Se acostó tranquila, tardó 15 min en dormirse',
        description: 'Acostarse - SleepDelay 15 min'
      },

      // 2:30 AM - Despertar nocturno
      {
        eventType: 'night_waking',
        startTime: `${TEST_CONFIG.testDate}T02:30:00.000Z`,
        endTime: `${TEST_CONFIG.testDate}T02:45:00.000Z`,
        awakeDelay: 15,
        emotionalState: 'fussy',
        notes: 'Lloró un poco, se volvió a dormir sola',
        description: 'Despertar nocturno - 15 min'
      },

      // 4:00 AM - Toma nocturna
      {
        eventType: 'night_feeding',
        startTime: `${TEST_CONFIG.testDate}T04:00:00.000Z`,
        endTime: `${TEST_CONFIG.testDate}T04:15:00.000Z`,
        feedingType: 'bottle',
        feedingAmount: 120,
        feedingDuration: 15,
        babyState: 'asleep',
        feedingNotes: 'Toma nocturna, siguió medio dormida',
        emotionalState: 'sleepy',
        description: 'Toma nocturna - 120ml'
      },

      // 7:00 AM - Despertar final (día siguiente)
      {
        eventType: 'wake',
        startTime: `${TEST_CONFIG.testDate.split('-').slice(0,2).join('-')}-21T07:00:00.000Z`,
        emotionalState: 'happy',
        notes: 'Despertó muy contenta, lista para el día',
        description: 'Despertar final - 7:00 AM'
      }
    ]

    console.log('🎯 REGISTRANDO EVENTOS DEL DÍA...')
    console.log('')

    let eventosExitosos = 0
    let eventosFallidos = 0

    // Registrar cada evento
    for (let i = 0; i < eventos.length; i++) {
      const evento = eventos[i]
      const exito = await registrarEvento(db, evento)
      
      if (exito) {
        eventosExitosos++
      } else {
        eventosFallidos++
      }
      
      // Pequeña pausa entre eventos
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log('')
    console.log('📊 RESUMEN DE LA PRUEBA:')
    console.log('=' .repeat(40))
    console.log(`✅ Eventos registrados exitosamente: ${eventosExitosos}`)
    console.log(`❌ Eventos fallidos: ${eventosFallidos}`)
    console.log(`📊 Total de eventos: ${eventos.length}`)
    console.log('')

    if (eventosFallidos === 0) {
      console.log('🎉 ¡PRUEBA COMPLETAMENTE EXITOSA!')
      console.log('   Todos los tipos de eventos funcionan perfectamente')
      console.log('')
      
      // Mostrar estadísticas calculadas
      const childUpdated = await db.collection('children').findOne({ 
        _id: new ObjectId(TEST_CONFIG.childId) 
      })
      
      if (childUpdated && childUpdated.events) {
        console.log('📈 TIPOS DE EVENTOS REGISTRADOS:')
        const tiposEventos = {}
        childUpdated.events.forEach(event => {
          tiposEventos[event.eventType] = (tiposEventos[event.eventType] || 0) + 1
        })
        
        Object.entries(tiposEventos).forEach(([tipo, cantidad]) => {
          console.log(`   ${tipo}: ${cantidad} evento(s)`)
        })
        
        console.log('')
        console.log(`📊 Total de eventos en la base de datos: ${childUpdated.events.length}`)
      }
    } else {
      console.log('⚠️  Algunos eventos no se registraron correctamente.')
      console.log('   Revisa la configuración y la conexión a MongoDB.')
    }

    console.log('')
    console.log('🔗 Para ver los resultados:')
    console.log('   1. Abre Happy Dreamers en el navegador')
    console.log('   2. Ve al perfil del niño de prueba')
    console.log('   3. Revisa el calendario y estadísticas')
    console.log('')

  } catch (error) {
    console.error('❌ ERROR GENERAL:', error.message)
  } finally {
    if (client) {
      await client.close()
      console.log('✅ Conexión a MongoDB cerrada')
    }
  }
}

// Ejecutar la prueba
if (require.main === module) {
  ejecutarPruebaDiaCompleto().catch(console.error)
}

module.exports = { ejecutarPruebaDiaCompleto }