// Script para poblar primera semana de junio - LÓGICA CORRECTA
// Los sleep events aparecen en el día donde TERMINAN (despiertan)
// Es más lógico para los padres ver la rutina completa del día

require('dotenv').config()
const { MongoClient, ObjectId } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI
const USER_ID = '688ce146d2d5ff9616549d86'

async function poblarSemanaLogica() {
  try {
    console.log('🌟 POBLAR PRIMERA SEMANA JUNIO - LÓGICA CORRECTA')
    console.log('================================================')
    console.log('📌 Sleep events aparecen en el día donde DESPIERTAN')
    
    const client = new MongoClient(MONGODB_URI)
    await client.connect()
    console.log('✅ Conectado a MongoDB')
    
    const db = client.db()
    
    // Obtener niños
    const children = await db.collection('children')
      .find({ parentId: USER_ID })
      .toArray()
      
    if (children.length === 0) {
      console.error('❌ No hay niños')
      return
    }
    
    console.log(`\n📝 Generando eventos para todos los niños...`)
    
    // Generar eventos para cada niño
    for (const child of children) {
      console.log(`   🔄 Procesando ${child.firstName}...`)
      
      const eventos = generarEventosLogicos()
      
      // Guardar eventos para este niño
      await db.collection('children').updateOne(
        { _id: child._id },
        { 
          $set: { 
            events: eventos,
            updatedAt: new Date()
          }
        }
      )
      
      console.log(`   ✅ ${child.firstName}: ${eventos.length} eventos generados`)
    }
    
    console.log(`\n🎉 COMPLETADO CON LÓGICA CORRECTA`)
    console.log('==================================')
    console.log(`👶 ${children.length} niños procesados`)
    console.log(`📅 Período: 1-7 junio 2025`)
    console.log(`✅ Sleep events en días correctos`)
    
    await client.close()
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

function generarEventosLogicos() {
  const eventos = []
  
  // ========================================
  // DÍA 1: DOMINGO 1 JUNIO 2025
  // ========================================
  
  // Despertar domingo (viene de dormir la noche anterior)
  eventos.push({
    _id: new ObjectId().toString(),
    eventType: "wake",
    startTime: "2025-06-01T08:00:00-06:00",
    emotionalState: "feliz",
    notes: "Bernardo despertó domingo",
    createdAt: new Date().toISOString()
  })

  // Sleep que TERMINÓ en domingo (empezó sábado noche)
  eventos.push({
    _id: new ObjectId().toString(),
    eventType: "sleep",
    startTime: "2025-05-31T20:30:00-06:00", // 8:30 PM sábado
    endTime: "2025-06-01T08:00:00-06:00",   // 8:00 AM domingo
    duration: 690, // 11h 30min
    durationReadable: "11h 30min",
    emotionalState: "tranquilo",
    notes: "Bernardo durmió desde la noche anterior",
    sleepDelay: 15,
    createdAt: new Date().toISOString()
  })
  
  // Desayuno domingo
  eventos.push({
    _id: new ObjectId().toString(),
    eventType: "feeding",
    startTime: "2025-06-01T08:30:00-06:00",
    feedingType: "breast",
    feedingAmount: 150,
    feedingDuration: 20,
    babyState: "awake",
    feedingNotes: "Desayuno domingo",
    emotionalState: "feliz",
    notes: "",
    createdAt: new Date().toISOString()
  })
  
  // Siesta matutina domingo
  eventos.push({
    _id: new ObjectId().toString(),
    eventType: "nap",
    startTime: "2025-06-01T10:30:00-06:00",
    endTime: "2025-06-01T11:30:00-06:00",
    duration: 60,
    durationReadable: "1h",
    emotionalState: "tranquilo",
    notes: "Bernardo siesta matutina domingo",
    createdAt: new Date().toISOString()
  })
  
  // Almuerzo domingo
  eventos.push({
    _id: new ObjectId().toString(),
    eventType: "feeding",
    startTime: "2025-06-01T12:30:00-06:00",
    feedingType: "breast",
    feedingAmount: 180,
    feedingDuration: 25,
    babyState: "awake",
    feedingNotes: "Almuerzo domingo",
    emotionalState: "feliz",
    notes: "",
    createdAt: new Date().toISOString()
  })
  
  // Siesta vespertina domingo
  eventos.push({
    _id: new ObjectId().toString(),
    eventType: "nap",
    startTime: "2025-06-01T15:00:00-06:00",
    endTime: "2025-06-01T16:30:00-06:00",
    duration: 90,
    durationReadable: "1h 30min",
    emotionalState: "tranquilo",
    notes: "Bernardo siesta vespertina domingo",
    createdAt: new Date().toISOString()
  })
  
  // Cena domingo
  eventos.push({
    _id: new ObjectId().toString(),
    eventType: "feeding",
    startTime: "2025-06-01T18:30:00-06:00",
    feedingType: "breast",
    feedingAmount: 120,
    feedingDuration: 20,
    babyState: "awake",
    feedingNotes: "Cena ligera domingo",
    emotionalState: "tranquilo",
    notes: "",
    createdAt: new Date().toISOString()
  })
  
  // ========================================
  // DÍA 2: LUNES 2 JUNIO 2025
  // ========================================
  
  // Despertar lunes
  eventos.push({
    _id: new ObjectId().toString(),
    eventType: "wake",
    startTime: "2025-06-02T08:00:00-06:00",
    emotionalState: "tranquilo",
    notes: "Bernardo despertó lunes",
    createdAt: new Date().toISOString()
  })

  // Sleep que TERMINÓ en lunes (empezó domingo noche)
  eventos.push({
    _id: new ObjectId().toString(),
    eventType: "sleep",
    startTime: "2025-06-01T20:30:00-06:00", // 8:30 PM domingo
    endTime: "2025-06-02T08:00:00-06:00",   // 8:00 AM lunes
    duration: 690, // 11h 30min
    durationReadable: "11h 30min",
    emotionalState: "tranquilo",
    notes: "Bernardo durmió bien el domingo",
    sleepDelay: 10,
    createdAt: new Date().toISOString()
  })
  
  // Despertar nocturno domingo noche
  eventos.push({
    _id: new ObjectId().toString(),
    eventType: "night_waking",
    startTime: "2025-06-02T02:30:00-06:00",
    endTime: "2025-06-02T02:45:00-06:00",
    duration: 15,
    durationReadable: "15min",
    emotionalState: "irritable",
    notes: "Despertar nocturno - se calmó rápido",
    awakeDelay: 15,
    createdAt: new Date().toISOString()
  })
  
  // Medicamento lunes
  eventos.push({
    _id: new ObjectId().toString(),
    eventType: "medication",
    startTime: "2025-06-02T08:15:00-06:00",
    medicationName: "Ibuprofeno",
    medicationDose: "2.5ml",
    medicationTime: "2025-06-02T08:15:00-06:00",
    medicationNotes: "Para la fiebre",
    emotionalState: "tranquilo",
    notes: "",
    createdAt: new Date().toISOString()
  })
  
  // Desayuno lunes
  eventos.push({
    _id: new ObjectId().toString(),
    eventType: "feeding",
    startTime: "2025-06-02T08:30:00-06:00",
    feedingType: "breast",
    feedingAmount: 150,
    feedingDuration: 20,
    babyState: "awake",
    feedingNotes: "Desayuno lunes",
    emotionalState: "feliz",
    notes: "",
    createdAt: new Date().toISOString()
  })
  
  // Actividad extra lunes
  eventos.push({
    _id: new ObjectId().toString(),
    eventType: "extra_activities",
    startTime: "2025-06-02T10:00:00-06:00",
    activityDescription: "Juego con bloques de construcción",
    activityDuration: 30,
    activityImpact: "neutral",
    activityNotes: "Jugó concentrado por media hora",
    emotionalState: "feliz",
    notes: "",
    createdAt: new Date().toISOString()
  })
  
  // ========================================
  // DÍA 3: MARTES 3 JUNIO 2025
  // ========================================
  
  // Despertar martes
  eventos.push({
    _id: new ObjectId().toString(),
    eventType: "wake",
    startTime: "2025-06-03T07:30:00-06:00",
    emotionalState: "feliz",
    notes: "Bernardo despertó temprano el martes",
    createdAt: new Date().toISOString()
  })

  // Sleep que TERMINÓ en martes (empezó lunes noche)
  eventos.push({
    _id: new ObjectId().toString(),
    eventType: "sleep",
    startTime: "2025-06-02T20:00:00-06:00", // 8:00 PM lunes
    endTime: "2025-06-03T07:30:00-06:00",   // 7:30 AM martes
    duration: 690, // 11h 30min
    durationReadable: "11h 30min",
    emotionalState: "tranquilo",
    notes: "Bernardo se durmió temprano el lunes",
    sleepDelay: 5,
    createdAt: new Date().toISOString()
  })
  
  // Desayuno martes
  eventos.push({
    _id: new ObjectId().toString(),
    eventType: "feeding",
    startTime: "2025-06-03T08:00:00-06:00",
    feedingType: "breast",
    feedingAmount: 160,
    feedingDuration: 22,
    babyState: "awake",
    feedingNotes: "Desayuno martes",
    emotionalState: "feliz",
    notes: "",
    createdAt: new Date().toISOString()
  })
  
  // Siesta matutina martes
  eventos.push({
    _id: new ObjectId().toString(),
    eventType: "nap",
    startTime: "2025-06-03T10:00:00-06:00",
    endTime: "2025-06-03T11:15:00-06:00",
    duration: 75,
    durationReadable: "1h 15min",
    emotionalState: "tranquilo",
    notes: "Bernardo siesta matutina martes",
    createdAt: new Date().toISOString()
  })
  
  // Almuerzo martes
  eventos.push({
    _id: new ObjectId().toString(),
    eventType: "feeding",
    startTime: "2025-06-03T12:00:00-06:00",
    feedingType: "breast",
    feedingAmount: 170,
    feedingDuration: 24,
    babyState: "awake",
    feedingNotes: "Almuerzo martes",
    emotionalState: "feliz",
    notes: "",
    createdAt: new Date().toISOString()
  })
  
  // ========================================
  // DÍA 4: MIÉRCOLES 4 JUNIO 2025
  // ========================================
  
  // Despertar miércoles
  eventos.push({
    _id: new ObjectId().toString(),
    eventType: "wake",
    startTime: "2025-06-04T08:15:00-06:00",
    emotionalState: "tranquilo",
    notes: "Bernardo despertó miércoles",
    createdAt: new Date().toISOString()
  })

  // Sleep que TERMINÓ en miércoles (empezó martes noche)
  eventos.push({
    _id: new ObjectId().toString(),
    eventType: "sleep",
    startTime: "2025-06-03T21:00:00-06:00", // 9:00 PM martes
    endTime: "2025-06-04T08:15:00-06:00",   // 8:15 AM miércoles
    duration: 675, // 11h 15min
    durationReadable: "11h 15min",
    emotionalState: "tranquilo",
    notes: "Bernardo durmió más tarde el martes",
    sleepDelay: 20,
    createdAt: new Date().toISOString()
  })
  
  // Desayuno miércoles
  eventos.push({
    _id: new ObjectId().toString(),
    eventType: "feeding",
    startTime: "2025-06-04T08:45:00-06:00",
    feedingType: "breast",
    feedingAmount: 155,
    feedingDuration: 21,
    babyState: "awake",
    feedingNotes: "Desayuno miércoles",
    emotionalState: "feliz",
    notes: "",
    createdAt: new Date().toISOString()
  })
  
  // Siesta vespertina miércoles
  eventos.push({
    _id: new ObjectId().toString(),
    eventType: "nap",
    startTime: "2025-06-04T14:30:00-06:00",
    endTime: "2025-06-04T16:00:00-06:00",
    duration: 90,
    durationReadable: "1h 30min",
    emotionalState: "tranquilo",
    notes: "Bernardo siesta vespertina miércoles",
    createdAt: new Date().toISOString()
  })
  
  // ========================================
  // DÍA 5: JUEVES 5 JUNIO 2025
  // ========================================
  
  // Despertar jueves
  eventos.push({
    _id: new ObjectId().toString(),
    eventType: "wake",
    startTime: "2025-06-05T07:45:00-06:00",
    emotionalState: "feliz",
    notes: "Bernardo despertó jueves temprano",
    createdAt: new Date().toISOString()
  })

  // Sleep que TERMINÓ en jueves (empezó miércoles noche)
  eventos.push({
    _id: new ObjectId().toString(),
    eventType: "sleep",
    startTime: "2025-06-04T20:45:00-06:00", // 8:45 PM miércoles
    endTime: "2025-06-05T07:45:00-06:00",   // 7:45 AM jueves
    duration: 660, // 11h
    durationReadable: "11h",
    emotionalState: "tranquilo",
    notes: "Bernardo durmió bien el miércoles",
    sleepDelay: 12,
    createdAt: new Date().toISOString()
  })
  
  // Despertar nocturno miércoles noche
  eventos.push({
    _id: new ObjectId().toString(),
    eventType: "night_waking",
    startTime: "2025-06-05T01:15:00-06:00",
    endTime: "2025-06-05T01:30:00-06:00",
    duration: 15,
    durationReadable: "15min",
    emotionalState: "irritable",
    notes: "Despertar nocturno - se calmó rápido",
    awakeDelay: 15,
    createdAt: new Date().toISOString()
  })
  
  // Desayuno jueves
  eventos.push({
    _id: new ObjectId().toString(),
    eventType: "feeding",
    startTime: "2025-06-05T08:15:00-06:00",
    feedingType: "breast",
    feedingAmount: 165,
    feedingDuration: 23,
    babyState: "awake",
    feedingNotes: "Desayuno jueves",
    emotionalState: "feliz",
    notes: "",
    createdAt: new Date().toISOString()
  })
  
  // Actividad extra jueves
  eventos.push({
    _id: new ObjectId().toString(),
    eventType: "extra_activities",
    startTime: "2025-06-05T11:00:00-06:00",
    activityDescription: "Tiempo boca abajo (tummy time)",
    activityDuration: 20,
    activityImpact: "positive",
    activityNotes: "Fortaleció músculos del cuello",
    emotionalState: "feliz",
    notes: "",
    createdAt: new Date().toISOString()
  })
  
  // ========================================
  // DÍA 6: VIERNES 6 JUNIO 2025
  // ========================================
  
  // Despertar viernes
  eventos.push({
    _id: new ObjectId().toString(),
    eventType: "wake",
    startTime: "2025-06-06T08:00:00-06:00",
    emotionalState: "feliz",
    notes: "Bernardo despertó viernes con energía",
    createdAt: new Date().toISOString()
  })

  // Sleep que TERMINÓ en viernes (empezó jueves noche)
  eventos.push({
    _id: new ObjectId().toString(),
    eventType: "sleep",
    startTime: "2025-06-05T20:30:00-06:00", // 8:30 PM jueves
    endTime: "2025-06-06T08:00:00-06:00",   // 8:00 AM viernes
    duration: 690, // 11h 30min
    durationReadable: "11h 30min",
    emotionalState: "tranquilo",
    notes: "Bernardo durmió perfecto el jueves",
    sleepDelay: 8,
    createdAt: new Date().toISOString()
  })
  
  // Desayuno viernes
  eventos.push({
    _id: new ObjectId().toString(),
    eventType: "feeding",
    startTime: "2025-06-06T08:30:00-06:00",
    feedingType: "breast",
    feedingAmount: 175,
    feedingDuration: 25,
    babyState: "awake",
    feedingNotes: "Desayuno viernes abundante",
    emotionalState: "feliz",
    notes: "",
    createdAt: new Date().toISOString()
  })
  
  // Siesta matutina viernes
  eventos.push({
    _id: new ObjectId().toString(),
    eventType: "nap",
    startTime: "2025-06-06T10:45:00-06:00",
    endTime: "2025-06-06T12:00:00-06:00",
    duration: 75,
    durationReadable: "1h 15min",
    emotionalState: "tranquilo",
    notes: "Bernardo siesta matutina viernes",
    createdAt: new Date().toISOString()
  })
  
  // Almuerzo viernes
  eventos.push({
    _id: new ObjectId().toString(),
    eventType: "feeding",
    startTime: "2025-06-06T13:00:00-06:00",
    feedingType: "breast",
    feedingAmount: 160,
    feedingDuration: 22,
    babyState: "awake",
    feedingNotes: "Almuerzo viernes",
    emotionalState: "feliz",
    notes: "",
    createdAt: new Date().toISOString()
  })
  
  // ========================================
  // DÍA 7: SÁBADO 7 JUNIO 2025
  // ========================================
  
  // Despertar sábado
  eventos.push({
    _id: new ObjectId().toString(),
    eventType: "wake",
    startTime: "2025-06-07T08:30:00-06:00",
    emotionalState: "feliz",
    notes: "Bernardo despertó sábado para fin de semana",
    createdAt: new Date().toISOString()
  })

  // Sleep que TERMINÓ en sábado (empezó viernes noche)
  eventos.push({
    _id: new ObjectId().toString(),
    eventType: "sleep",
    startTime: "2025-06-06T21:15:00-06:00", // 9:15 PM viernes
    endTime: "2025-06-07T08:30:00-06:00",   // 8:30 AM sábado
    duration: 675, // 11h 15min
    durationReadable: "11h 15min",
    emotionalState: "tranquilo",
    notes: "Bernardo se durmió tarde el viernes",
    sleepDelay: 25,
    createdAt: new Date().toISOString()
  })
  
  // Desayuno sábado
  eventos.push({
    _id: new ObjectId().toString(),
    eventType: "feeding",
    startTime: "2025-06-07T09:00:00-06:00",
    feedingType: "breast",
    feedingAmount: 170,
    feedingDuration: 24,
    babyState: "awake",
    feedingNotes: "Desayuno sábado relajado",
    emotionalState: "feliz",
    notes: "",
    createdAt: new Date().toISOString()
  })
  
  // Medicamento sábado
  eventos.push({
    _id: new ObjectId().toString(),
    eventType: "medication",
    startTime: "2025-06-07T10:30:00-06:00",
    medicationName: "Vitamina D",
    medicationDose: "1 gota",
    medicationTime: "2025-06-07T10:30:00-06:00",
    medicationNotes: "Suplemento diario",
    emotionalState: "tranquilo",
    notes: "",
    createdAt: new Date().toISOString()
  })
  
  // Siesta vespertina sábado
  eventos.push({
    _id: new ObjectId().toString(),
    eventType: "nap",
    startTime: "2025-06-07T15:30:00-06:00",
    endTime: "2025-06-07T17:00:00-06:00",
    duration: 90,
    durationReadable: "1h 30min",
    emotionalState: "tranquilo",
    notes: "Bernardo siesta vespertina sábado",
    createdAt: new Date().toISOString()
  })
  
  // Actividad extra sábado
  eventos.push({
    _id: new ObjectId().toString(),
    eventType: "extra_activities",
    startTime: "2025-06-07T17:30:00-06:00",
    activityDescription: "Paseo en carriola por el parque",
    activityDuration: 45,
    activityImpact: "positive",
    activityNotes: "Bernardo disfrutó el aire fresco",
    emotionalState: "feliz",
    notes: "",
    createdAt: new Date().toISOString()
  })
  
  // Cena sábado
  eventos.push({
    _id: new ObjectId().toString(),
    eventType: "feeding",
    startTime: "2025-06-07T19:00:00-06:00",
    feedingType: "breast",
    feedingAmount: 140,
    feedingDuration: 20,
    babyState: "awake",
    feedingNotes: "Cena sábado después del paseo",
    emotionalState: "tranquilo",
    notes: "",
    createdAt: new Date().toISOString()
  })
  
  console.log(`✅ Generados ${eventos.length} eventos con lógica correcta`)
  
  return eventos
}

// Ejecutar
if (require.main === module) {
  poblarSemanaLogica()
}

module.exports = { poblarSemanaLogica }