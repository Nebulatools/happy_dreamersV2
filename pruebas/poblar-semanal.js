// Script semanal para poblar eventos - CONFIGURACIÓN AL PRINCIPIO
// Solo cambiar estas fechas y ejecutar: node poblar-semanal.js

// ========================================
// 📅 CONFIGURACIÓN DE FECHAS - CAMBIAR AQUÍ
// ========================================
const FECHA_INICIO = '2025-06-01'  // Formato: YYYY-MM-DD - PRIMERA SEMANA JUNIO
const FECHA_FIN = '2025-06-07'     // Formato: YYYY-MM-DD - PRIMERA SEMANA JUNIO
const NIÑO_ESPECÍFICO = null       // null = ambos, 'Bernardo' o 'Esteban' para uno específico
const SOBRESCRIBIR = false         // true = eliminar eventos existentes, false = mantener

// ========================================
// SCRIPT - NO MODIFICAR DEBAJO DE ESTA LÍNEA
// ========================================

require('dotenv').config()
const { MongoClient, ObjectId } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI
const USER_ID = '688ce146d2d5ff9616549d86'

async function poblarSemanal() {
  try {
    console.log('📅 POBLAR EVENTOS SEMANAL')
    console.log('=========================')
    console.log(`📊 Configuración:`)
    console.log(`   Fecha inicio: ${FECHA_INICIO}`)
    console.log(`   Fecha fin: ${FECHA_FIN}`)
    console.log(`   Niño específico: ${NIÑO_ESPECÍFICO || 'Ambos'}`)
    console.log(`   Sobrescribir: ${SOBRESCRIBIR ? 'SÍ' : 'NO'}`)
    
    const client = new MongoClient(MONGODB_URI)
    await client.connect()
    console.log('✅ Conectado a MongoDB')
    
    const db = client.db()
    
    // Validar fechas
    const startDate = new Date(FECHA_INICIO + 'T00:00:00Z')
    const endDate = new Date(FECHA_FIN + 'T23:59:59Z')
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.error('❌ Fechas inválidas. Use formato YYYY-MM-DD')
      return
    }
    
    if (startDate >= endDate) {
      console.error('❌ Fecha inicio debe ser anterior a fecha fin')
      return
    }
    
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
    console.log(`⏰ Generando ${daysDiff} días de eventos`)
    
    // Buscar niños disponibles
    const availableChildren = await db.collection('children')
      .find({ parentId: USER_ID })
      .toArray()
    
    if (availableChildren.length === 0) {
      console.error('❌ No hay niños. Ejecuta primero: node crear-niños.js')
      return
    }
    
    console.log(`\n👶 Niños disponibles:`)
    availableChildren.forEach((child, i) => {
      const age = calculateAgeInMonths(child.birthDate)
      console.log(`   ${i + 1}. ${child.firstName} ${child.lastName} (${age} meses)`)
    })
    
    // Filtrar niños si se especifica uno
    let targetChildren = availableChildren
    if (NIÑO_ESPECÍFICO) {
      targetChildren = availableChildren.filter(child => 
        child.firstName.toLowerCase() === NIÑO_ESPECÍFICO.toLowerCase()
      )
      
      if (targetChildren.length === 0) {
        console.error(`❌ No se encontró niño: ${NIÑO_ESPECÍFICO}`)
        return
      }
    }
    
    console.log(`\n🎯 Procesando ${targetChildren.length} niño(s)...`)
    
    let totalEvents = 0
    const results = []
    
    // Procesar cada niño
    for (const child of targetChildren) {
      const childAge = calculateAgeInMonths(child.birthDate)
      console.log(`\n📝 ${child.firstName} ${child.lastName} (${childAge} meses)`)
      
      // Verificar eventos existentes
      const existingCount = await db.collection('events').countDocuments({
        childId: child._id,
        startTime: { $gte: startDate, $lte: endDate }
      })
      
      if (existingCount > 0) {
        console.log(`   ⚠️  ${existingCount} eventos existentes en el rango`)
        
        if (SOBRESCRIBIR) {
          console.log('   🔄 Eliminando eventos existentes...')
          await db.collection('events').deleteMany({
            childId: child._id,
            startTime: { $gte: startDate, $lte: endDate }
          })
        } else {
          console.log('   💡 Saltando (cambia SOBRESCRIBIR = true para eliminar)')
          continue
        }
      }
      
      // Generar eventos
      const childEvents = await generateEventsForChild(
        db, child._id, child.firstName, childAge, startDate, endDate
      )
      
      totalEvents += childEvents
      results.push({
        name: `${child.firstName} ${child.lastName}`,
        age: childAge,
        events: childEvents
      })
      
      console.log(`   ✅ ${childEvents} eventos generados`)
    }
    
    // Resumen final
    console.log('\n' + '='.repeat(40))
    console.log('🎉 EVENTOS GENERADOS')
    console.log('='.repeat(40))
    console.log(`📅 Período: ${FECHA_INICIO} → ${FECHA_FIN}`)
    console.log(`⏰ Días: ${daysDiff}`)
    console.log(`👶 Niños: ${results.length}`)
    console.log(`📊 Total eventos: ${totalEvents}`)
    
    results.forEach(result => {
      console.log(`   • ${result.name}: ${result.events} eventos`)
    })
    
    await client.close()
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

async function generateEventsForChild(db, childId, childName, ageInMonths, startDate, endDate) {
  const events = []
  const currentDate = new Date(startDate)
  
  // Patrones según edad
  const patterns = getAgeBasedPatterns(ageInMonths, childName)
  
  while (currentDate <= endDate) {
    const dayEvents = generateDayEvents(childId, childName, currentDate, patterns)
    events.push(...dayEvents)
    
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  // Insertar eventos
  if (events.length > 0) {
    await db.collection('events').insertMany(events)
  }
  
  return events.length
}

function getAgeBasedPatterns(ageInMonths, childName) {
  // Patrones específicos por niño basados en sus problemas reales
  if (childName === 'Bernardo') {
    // Bernardo: problemas severos de sueño, despertares cada 30 min
    return {
      sleepStart: { hour: 20, minute: 0, variance: 30 },
      wakeUp: { hour: 8, minute: 0, variance: 60 },
      napTimes: [
        { hour: 10, minute: 30, duration: 90, variance: 30 },
        { hour: 16, minute: 30, duration: 90, variance: 30 }
      ],
      feedingTimes: [
        { hour: 9, minute: 45, type: "breakfast" },
        { hour: 12, minute: 0, type: "lunch" },
        { hour: 19, minute: 15, type: "dinner" }
      ],
      nightWakings: 6, // Problema principal
      nightWakingPattern: [22, 23, 0, 1, 2, 3, 4, 5, 6],
      mood: ["cansado", "irritable", "tranquilo"],
      sleepQuality: [2, 3], // Mala calidad
      feedingType: "breast_milk", // Pecho y sólidos
      problems: ["despertares_frecuentes", "necesita_arrullo", "colecho"]
    }
  } else {
    // Esteban: problema de dependencia del chupón, mejor sueño general
    return {
      sleepStart: { hour: 20, minute: 0, variance: 45 },
      wakeUp: { hour: 7, minute: 0, variance: 60 },
      napTimes: [
        { hour: 13, minute: 45, duration: 105, variance: 15 }
      ],
      feedingTimes: [
        { hour: 7, minute: 45, type: "breakfast" },
        { hour: 13, minute: 0, type: "lunch" },
        { hour: 18, minute: 45, type: "dinner" }
      ],
      nightWakings: 2, // Menos despertares
      nightWakingPattern: [23, 2, 5],
      mood: ["feliz", "tranquilo", "irritable"],
      sleepQuality: [3, 4], // Mejor calidad
      feedingType: "solid_food", // Solo sólidos
      tantrums: 0.3, // 30% días con rabietas
      problems: ["dependencia_chupon", "rabietas_rutina", "hermana_recien_nacida"]
    }
  }
}

function generateDayEvents(childId, childName, date, patterns) {
  const events = []
  
  // Sleep start
  const sleepTime = new Date(date)
  const sleepVariance = (Math.random() - 0.5) * patterns.sleepStart.variance
  sleepTime.setHours(
    patterns.sleepStart.hour,
    patterns.sleepStart.minute + sleepVariance,
    0, 0
  )
  
  events.push({
    childId: new ObjectId(childId),
    parentId: new ObjectId(USER_ID),
    eventType: "sleep_start",
    startTime: sleepTime,
    mood: patterns.mood[Math.floor(Math.random() * patterns.mood.length)],
    notes: `${childName} se durmió después de rutina nocturna`,
    createdAt: sleepTime
  })
  
  // Night wakings (según patrón del niño)
  const shouldHaveWakings = Math.random() < (childName === 'Bernardo' ? 0.9 : 0.4)
  if (shouldHaveWakings) {
    const numWakings = Math.floor(Math.random() * patterns.nightWakings) + 1
    
    for (let i = 0; i < numWakings; i++) {
      const wakingHour = patterns.nightWakingPattern[
        Math.floor(Math.random() * patterns.nightWakingPattern.length)
      ]
      
      const waking = new Date(sleepTime)
      waking.setHours(wakingHour, Math.random() * 60, 0, 0)
      
      const problem = patterns.problems[Math.floor(Math.random() * patterns.problems.length)]
      let notes = `${childName} despertar nocturno`
      if (problem === 'despertares_frecuentes') notes += ' - cada 30 min'
      if (problem === 'dependencia_chupon') notes += ' - buscando chupón'
      if (problem === 'necesita_arrullo') notes += ' - necesita arrullo'
      
      events.push({
        childId: new ObjectId(childId),
        parentId: new ObjectId(USER_ID),
        eventType: "night_waking",
        startTime: waking,
        duration: 5 + Math.random() * (childName === 'Bernardo' ? 25 : 15),
        notes: notes,
        createdAt: waking
      })
    }
  }
  
  // Wake up
  const wakeTime = new Date(date)
  wakeTime.setDate(date.getDate() + 1)
  const wakeVariance = (Math.random() - 0.5) * patterns.wakeUp.variance
  wakeTime.setHours(
    patterns.wakeUp.hour + Math.floor(wakeVariance / 60),
    patterns.wakeUp.minute + (wakeVariance % 60),
    0, 0
  )
  
  events.push({
    childId: new ObjectId(childId),
    parentId: new ObjectId(USER_ID),
    eventType: "wake_up",
    startTime: wakeTime,
    mood: patterns.mood[Math.floor(Math.random() * patterns.mood.length)],
    quality: patterns.sleepQuality[Math.floor(Math.random() * patterns.sleepQuality.length)],
    notes: `${childName} despertó para comenzar el día`,
    createdAt: wakeTime
  })
  
  // Feeding events
  patterns.feedingTimes.forEach(meal => {
    const mealTime = new Date(date)
    mealTime.setHours(
      meal.hour + Math.floor((Math.random() - 0.5) * 1),
      meal.minute + Math.floor((Math.random() - 0.5) * 30),
      0, 0
    )
    
    events.push({
      childId: new ObjectId(childId),
      parentId: new ObjectId(USER_ID),
      eventType: "feeding",
      startTime: mealTime,
      feedingType: patterns.feedingType,
      duration: 15 + Math.random() * 25,
      notes: `${childName} - ${meal.type}`,
      createdAt: mealTime
    })
  })
  
  // Nap events
  patterns.napTimes.forEach(nap => {
    const napStart = new Date(date)
    napStart.setHours(
      nap.hour,
      nap.minute + Math.floor((Math.random() - 0.5) * nap.variance),
      0, 0
    )
    
    events.push({
      childId: new ObjectId(childId),
      parentId: new ObjectId(USER_ID),
      eventType: "nap_start",
      startTime: napStart,
      notes: `${childName} inicio siesta`,
      createdAt: napStart
    })
    
    const napEnd = new Date(napStart)
    napEnd.setMinutes(napEnd.getMinutes() + nap.duration + Math.floor((Math.random() - 0.5) * 30))
    
    events.push({
      childId: new ObjectId(childId),
      parentId: new ObjectId(USER_ID),
      eventType: "nap_end",
      startTime: napEnd,
      notes: `${childName} fin siesta`,
      createdAt: napEnd
    })
  })
  
  // Eventos especiales según niño
  if (patterns.tantrums && Math.random() < patterns.tantrums) {
    const tantrumTime = new Date(sleepTime)
    tantrumTime.setMinutes(tantrumTime.getMinutes() - 30)
    
    events.push({
      childId: new ObjectId(childId),
      parentId: new ObjectId(USER_ID),
      eventType: "other",
      startTime: tantrumTime,
      duration: 10 + Math.random() * 20,
      notes: `${childName} rabieta durante rutina - batalla pijama`,
      mood: "irritable",
      createdAt: tantrumTime
    })
  }
  
  return events
}

function calculateAgeInMonths(birthDateString) {
  const birthDate = new Date(birthDateString)
  const now = new Date()
  
  const years = now.getFullYear() - birthDate.getFullYear()
  const months = now.getMonth() - birthDate.getMonth()
  
  return years * 12 + months
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  poblarSemanal()
}

module.exports = { poblarSemanal }