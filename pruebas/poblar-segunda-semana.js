// Script para poblar segunda semana de junio - 8-14 junio 2025
// Agregar eventos ADICIONALES para generar Plan 1

require('dotenv').config()
const { MongoClient, ObjectId } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI
const USER_ID = '688ce146d2d5ff9616549d86'
const ESTEBAN_ID = '68ad0476b98bdbe0f7ff5942'

async function poblarSegundaSemana() {
  try {
    console.log('🌟 POBLAR SEGUNDA SEMANA JUNIO - 8-14 JUNIO 2025')
    console.log('================================================')
    console.log('📌 Agregando eventos ADICIONALES para Plan 1')
    
    const client = new MongoClient(MONGODB_URI)
    await client.connect()
    console.log('✅ Conectado a MongoDB')
    
    const db = client.db()
    
    // Obtener datos actuales de Esteban
    const child = await db.collection('children').findOne({
      _id: new ObjectId(ESTEBAN_ID)
    })
    
    if (!child) {
      console.error('❌ No se encontró a Esteban')
      return
    }
    
    console.log(`\n👶 Niño: ${child.firstName} ${child.lastName}`)
    console.log(`📊 Eventos actuales: ${child.events?.length || 0}`)
    
    // Generar eventos para segunda semana (8-14 junio)
    const eventosSegundaSemana = generarEventosSegundaSemana()
    
    // Combinar eventos existentes con nuevos eventos
    const eventosExistentes = child.events || []
    const todoEventos = [...eventosExistentes, ...eventosSegundaSemana]
    
    // Actualizar en base de datos
    await db.collection('children').updateOne(
      { _id: child._id },
      { 
        $set: { 
          events: todoEventos,
          updatedAt: new Date()
        }
      }
    )
    
    console.log(`\n✅ SEGUNDA SEMANA AGREGADA`)
    console.log('==========================')
    console.log(`📊 Eventos existentes: ${eventosExistentes.length}`)
    console.log(`📊 Eventos nuevos: ${eventosSegundaSemana.length}`)
    console.log(`📊 Total eventos: ${todoEventos.length}`)
    console.log(`📅 Período nuevo: 8-14 junio 2025`)
    console.log(`🎯 Listo para generar Plan 1`)
    
    await client.close()
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

function generarEventosSegundaSemana() {
  const eventos = []
  
  // Generar eventos para 8-14 junio (7 días)
  for (let dia = 8; dia <= 14; dia++) {
    const fecha = `2025-06-${dia.toString().padStart(2, '0')}`
    
    // Eventos por día (similar patrón a primera semana pero con variaciones)
    
    // 1. Wake up (despertar)
    eventos.push({
      _id: new ObjectId(),
      eventType: 'wake_up',
      startTime: new Date(`${fecha}T07:${15 + Math.floor(Math.random() * 30)}:00.000Z`),
      endTime: new Date(`${fecha}T07:${15 + Math.floor(Math.random() * 30)}:00.000Z`),
      duration: 0,
      quality: 4 + Math.floor(Math.random() * 2), // 4 o 5
      mood: ['feliz', 'tranquilo'][Math.floor(Math.random() * 2)],
      notes: `Despertar natural día ${dia} de junio`,
      userId: USER_ID,
      childId: ESTEBAN_ID,
      createdAt: new Date(`${fecha}T07:${15 + Math.floor(Math.random() * 30)}:00.000Z`),
      updatedAt: new Date(`${fecha}T07:${15 + Math.floor(Math.random() * 30)}:00.000Z`)
    })
    
    // 2. Breakfast
    eventos.push({
      _id: new ObjectId(),
      eventType: 'meal',
      startTime: new Date(`${fecha}T08:00:00.000Z`),
      endTime: new Date(`${fecha}T08:30:00.000Z`),
      duration: 30,
      quality: 4 + Math.floor(Math.random() * 2),
      mood: 'tranquilo',
      notes: `Desayuno - día ${dia}`,
      userId: USER_ID,
      childId: ESTEBAN_ID,
      createdAt: new Date(`${fecha}T08:00:00.000Z`),
      updatedAt: new Date(`${fecha}T08:00:00.000Z`)
    })
    
    // 3. Almuerzo
    eventos.push({
      _id: new ObjectId(),
      eventType: 'meal',
      startTime: new Date(`${fecha}T12:30:00.000Z`),
      endTime: new Date(`${fecha}T13:15:00.000Z`),
      duration: 45,
      quality: 4 + Math.floor(Math.random() * 2),
      mood: 'feliz',
      notes: `Almuerzo - día ${dia}`,
      userId: USER_ID,
      childId: ESTEBAN_ID,
      createdAt: new Date(`${fecha}T12:30:00.000Z`),
      updatedAt: new Date(`${fecha}T12:30:00.000Z`)
    })
    
    // 4. Siesta (solo algunos días)
    if (Math.random() > 0.3) { // 70% probabilidad
      const inicioSiesta = 14 + Math.floor(Math.random() * 2) // 14:00-15:00
      const duracionSiesta = 60 + Math.floor(Math.random() * 60) // 60-120 min
      
      eventos.push({
        _id: new ObjectId(),
        eventType: 'nap_start',
        startTime: new Date(`${fecha}T${inicioSiesta}:00:00.000Z`),
        endTime: new Date(`${fecha}T${inicioSiesta}:00:00.000Z`),
        duration: 0,
        quality: 3 + Math.floor(Math.random() * 2),
        mood: 'tranquilo',
        notes: `Inicio siesta día ${dia}`,
        userId: USER_ID,
        childId: ESTEBAN_ID,
        createdAt: new Date(`${fecha}T${inicioSiesta}:00:00.000Z`),
        updatedAt: new Date(`${fecha}T${inicioSiesta}:00:00.000Z`)
      })
      
      const finSiesta = new Date(`${fecha}T${inicioSiesta}:00:00.000Z`)
      finSiesta.setMinutes(finSiesta.getMinutes() + duracionSiesta)
      
      eventos.push({
        _id: new ObjectId(),
        eventType: 'nap_end',
        startTime: finSiesta,
        endTime: finSiesta,
        duration: duracionSiesta,
        quality: 3 + Math.floor(Math.random() * 2),
        mood: ['tranquilo', 'irritable'][Math.floor(Math.random() * 2)],
        notes: `Fin siesta ${duracionSiesta} min - día ${dia}`,
        userId: USER_ID,
        childId: ESTEBAN_ID,
        createdAt: finSiesta,
        updatedAt: finSiesta
      })
    }
    
    // 5. Cena
    eventos.push({
      _id: new ObjectId(),
      eventType: 'meal',
      startTime: new Date(`${fecha}T19:00:00.000Z`),
      endTime: new Date(`${fecha}T19:45:00.000Z`),
      duration: 45,
      quality: 4 + Math.floor(Math.random() * 2),
      mood: 'tranquilo',
      notes: `Cena - día ${dia}`,
      userId: USER_ID,
      childId: ESTEBAN_ID,
      createdAt: new Date(`${fecha}T19:00:00.000Z`),
      updatedAt: new Date(`${fecha}T19:00:00.000Z`)
    })
    
    // 6. Bedtime (acostarse)
    const horaAcostar = 20 + Math.floor(Math.random() * 2) // 20:00-21:00
    const minutoAcostar = Math.floor(Math.random() * 60)
    
    eventos.push({
      _id: new ObjectId(),
      eventType: 'bedtime',
      startTime: new Date(`${fecha}T${horaAcostar}:${minutoAcostar.toString().padStart(2, '0')}:00.000Z`),
      endTime: new Date(`${fecha}T${horaAcostar}:${minutoAcostar.toString().padStart(2, '0')}:00.000Z`),
      duration: 0,
      quality: 3 + Math.floor(Math.random() * 3), // 3, 4 o 5
      mood: ['tranquilo', 'irritable', 'cansado'][Math.floor(Math.random() * 3)],
      notes: `Hora de dormir - día ${dia}`,
      userId: USER_ID,
      childId: ESTEBAN_ID,
      createdAt: new Date(`${fecha}T${horaAcostar}:${minutoAcostar.toString().padStart(2, '0')}:00.000Z`),
      updatedAt: new Date(`${fecha}T${horaAcostar}:${minutoAcostar.toString().padStart(2, '0')}:00.000Z`)
    })
  }
  
  console.log(`📊 Eventos generados segunda semana: ${eventos.length}`)
  
  return eventos
}

// Ejecutar script
poblarSegundaSemana()