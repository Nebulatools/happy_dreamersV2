// Script CORREGIDO para generar datos de prueba sin fechas inválidas
// Ejecutar: node generate-fixed-test-data.js

const { MongoClient, ObjectId } = require('mongodb')
const { addDays, format, addMinutes } = require('date-fns')

require('dotenv').config()
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/happy_dreamers'
const USER_ID = '688ce146d2d5ff9616549d86'

// Configuración de fechas - 4 meses de datos
const END_DATE = new Date('2025-08-20')  // Hoy
const START_DATE = new Date('2025-04-20') // 4 meses atrás

// Función CORREGIDA para sumar minutos a una fecha
function addMinutesToTime(dateStr, hour, min, minutesToAdd) {
  const startDate = new Date(`${dateStr}T${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00.000Z`)
  const endDate = addMinutes(startDate, minutesToAdd)
  return endDate.toISOString()
}

// Datos de niños simplificados (mismos perfiles)
const CHILDREN_DATA = [
  {
    firstName: "Sofía", lastName: "González", 
    birthDate: new Date('2023-03-15'), gender: "female",
    sleepGoal: 12, napGoal: 2, profile: "dormilona"
  },
  {
    firstName: "Diego", lastName: "Martínez",
    birthDate: new Date('2022-11-20'), gender: "male", 
    sleepGoal: 11, napGoal: 1.5, profile: "activo"
  },
  {
    firstName: "Isabella", lastName: "López",
    birthDate: new Date('2024-01-10'), gender: "female",
    sleepGoal: 13, napGoal: 2.5, profile: "sensible"
  },
  {
    firstName: "Mateo", lastName: "Rodríguez", 
    birthDate: new Date('2021-08-05'), gender: "male",
    sleepGoal: 10, napGoal: 0, profile: "maduro"
  },
  {
    firstName: "Emma", lastName: "Fernández",
    birthDate: new Date('2024-06-30'), gender: "female",
    sleepGoal: 14, napGoal: 3, profile: "bebe_modelo"
  }
]

// Función simplificada pero CORREGIDA para generar eventos
function generateFixedEvents(child, date) {
  const events = []
  const age = (Date.now() - child.birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  const profile = child.profile || 'normal'
  
  const dateStr = format(date, 'yyyy-MM-dd')
  
  // 1. DESPERTAR MATUTINO
  const wakeTime = profile === 'activo' ? 6 + Math.random() : 7 + Math.random() * 0.5
  const wakeHour = Math.floor(wakeTime)
  const wakeMin = Math.floor((wakeTime - wakeHour) * 60)
  
  events.push({
    _id: new ObjectId().toString(),
    childId: child._id.toString(),
    eventType: 'wake',
    startTime: `${dateStr}T${wakeHour.toString().padStart(2, '0')}:${wakeMin.toString().padStart(2, '0')}:00.000Z`,
    emotionalState: ['happy', 'calm', 'tired'][Math.floor(Math.random() * 3)],
    notes: `Despertó ${profile === 'activo' ? 'con energía' : 'tranquilo'}`,
    createdAt: new Date().toISOString()
  })

  // 2. ALIMENTACIONES CON FECHAS CORREGIDAS
  const feedingTimes = age < 2 ? [8, 12, 16, 18.5] : [8.5, 12.5, 18]
  
  feedingTimes.forEach(feedTime => {
    const feedHour = Math.floor(feedTime)
    const feedMin = Math.floor((feedTime - feedHour) * 60)
    const duration = Math.floor(15 + Math.random() * 20) // 15-35 minutos
    
    // CORRECCIÓN: Usar addMinutesToTime en lugar de suma directa
    const endTime = addMinutesToTime(dateStr, feedHour, feedMin, duration)
    
    events.push({
      _id: new ObjectId().toString(),
      childId: child._id.toString(),
      eventType: 'feeding',
      startTime: `${dateStr}T${feedHour.toString().padStart(2, '0')}:${feedMin.toString().padStart(2, '0')}:00.000Z`,
      endTime: endTime, // ✅ FECHA CORREGIDA
      emotionalState: ['calm', 'happy'][Math.floor(Math.random() * 2)],
      feedingType: age < 1.5 ? 'bottle' : 'solids',
      feedingAmount: Math.floor(80 + Math.random() * 80),
      feedingDuration: duration,
      babyState: 'awake',
      feedingNotes: `Comió durante ${duration} minutos`,
      createdAt: new Date().toISOString()
    })
  })

  // 3. SIESTAS CON FECHAS CORREGIDAS
  const napTimes = age < 1 ? [10, 14, 16] : 
                   age < 2 ? [10, 14.5] :
                   age < 3 ? [13.5] : []
  
  if (profile === 'maduro') napTimes.length = 0 // Sin siestas
  
  napTimes.forEach(napTime => {
    const napHour = Math.floor(napTime)
    const napMin = Math.floor((napTime - napHour) * 60)
    const napDuration = Math.floor(60 + Math.random() * 60) // 60-120 minutos
    const sleepDelay = Math.floor(5 + Math.random() * 15)
    
    // CORRECCIÓN: Usar addMinutesToTime
    const endTime = addMinutesToTime(dateStr, napHour, napMin, napDuration)
    
    events.push({
      _id: new ObjectId().toString(),
      childId: child._id.toString(), 
      eventType: 'nap',
      startTime: `${dateStr}T${napHour.toString().padStart(2, '0')}:${napMin.toString().padStart(2, '0')}:00.000Z`,
      endTime: endTime, // ✅ FECHA CORREGIDA
      emotionalState: ['tired', 'calm'][Math.floor(Math.random() * 2)],
      sleepDelay: sleepDelay,
      duration: napDuration - sleepDelay,
      durationReadable: `${Math.floor((napDuration - sleepDelay) / 60)}h ${Math.floor((napDuration - sleepDelay) % 60)}min`,
      notes: `Siesta de ${Math.floor((napDuration - sleepDelay) / 60)}h ${Math.floor((napDuration - sleepDelay) % 60)}min`,
      createdAt: new Date().toISOString()
    })
  })

  // 4. SUEÑO NOCTURNO
  const bedTime = age < 2 ? 19.5 + Math.random() * 0.5 : 20 + Math.random() * 0.5
  const bedHour = Math.floor(bedTime)
  const bedMin = Math.floor((bedTime - bedHour) * 60)
  const sleepDelay = profile === 'activo' ? Math.floor(20 + Math.random() * 20) : Math.floor(5 + Math.random() * 15)

  events.push({
    _id: new ObjectId().toString(),
    childId: child._id.toString(),
    eventType: 'sleep',
    startTime: `${dateStr}T${bedHour.toString().padStart(2, '0')}:${bedMin.toString().padStart(2, '0')}:00.000Z`,
    emotionalState: ['tired', 'calm'][Math.floor(Math.random() * 2)],
    sleepDelay: sleepDelay,
    notes: profile === 'activo' ? `Tardó ${sleepDelay} min en dormirse` : 'Se durmió tranquilo',
    createdAt: new Date().toISOString()
  })

  // 5. DESPERTARES NOCTURNOS (con fechas corregidas)
  const nightWakingProb = profile === 'sensible' ? 0.6 : 
                          profile === 'bebe_modelo' ? 0.1 : 0.3
  
  if (Math.random() < nightWakingProb) {
    const nightTime = 22 + Math.random() * 6  // Entre 22:00 y 04:00
    const nightHour = Math.floor(nightTime) % 24
    const nightMin = Math.floor((nightTime - Math.floor(nightTime)) * 60)
    const awakeDuration = Math.floor(15 + Math.random() * 25) // 15-40 minutos

    // CORRECCIÓN: Usar addMinutesToTime
    const endTime = addMinutesToTime(dateStr, nightHour, nightMin, awakeDuration)

    events.push({
      _id: new ObjectId().toString(),
      childId: child._id.toString(),
      eventType: 'night_waking',
      startTime: `${dateStr}T${nightHour.toString().padStart(2, '0')}:${nightMin.toString().padStart(2, '0')}:00.000Z`,
      endTime: endTime, // ✅ FECHA CORREGIDA
      emotionalState: ['irritable', 'cranky', 'calm'][Math.floor(Math.random() * 3)],
      awakeDelay: awakeDuration,
      duration: awakeDuration,
      durationReadable: `${awakeDuration}min`,
      notes: profile === 'sensible' ? 'Necesitó consuelo' : 'Volvió a dormir',
      createdAt: new Date().toISOString()
    })
  }

  // 6. MEDICAMENTOS (10% probabilidad)
  if (Math.random() < 0.1) {
    const medTime = 9 + Math.random() * 8
    const medHour = Math.floor(medTime)
    const medMin = Math.floor((medTime - medHour) * 60)
    
    const medications = [
      { name: 'Paracetamol infantil', dose: '5ml' },
      { name: 'Vitamina D', dose: '400 UI' },
      { name: 'Probióticos', dose: '1 sobre' }
    ]
    
    const med = medications[Math.floor(Math.random() * medications.length)]

    events.push({
      _id: new ObjectId().toString(),
      childId: child._id.toString(),
      eventType: 'medication',
      startTime: `${dateStr}T${medHour.toString().padStart(2, '0')}:${medMin.toString().padStart(2, '0')}:00.000Z`,
      emotionalState: 'calm',
      medicationName: med.name,
      medicationDose: med.dose,
      medicationTime: `${dateStr}T${medHour.toString().padStart(2, '0')}:${medMin.toString().padStart(2, '0')}:00.000Z`,
      medicationNotes: `${med.name} ${med.dose} administrado`,
      notes: `${med.name} ${med.dose}`,
      createdAt: new Date().toISOString()
    })
  }

  // 7. ACTIVIDADES EXTRA (30% probabilidad)
  if (Math.random() < 0.3) {
    const actTime = 10 + Math.random() * 6
    const actHour = Math.floor(actTime)
    const actMin = Math.floor((actTime - actHour) * 60)
    const duration = Math.floor(20 + Math.random() * 40) // 20-60 minutos

    const activities = profile === 'activo' ? 
      ['Juego en el parque', 'Corrió mucho', 'Juegos físicos'] :
      ['Tiempo de juego tranquilo', 'Lectura de cuentos', 'Música suave']
    
    const activity = activities[Math.floor(Math.random() * activities.length)]

    // CORRECCIÓN: Usar addMinutesToTime
    const endTime = addMinutesToTime(dateStr, actHour, actMin, duration)

    events.push({
      _id: new ObjectId().toString(),
      childId: child._id.toString(),
      eventType: 'extra_activities',
      startTime: `${dateStr}T${actHour.toString().padStart(2, '0')}:${actMin.toString().padStart(2, '0')}:00.000Z`,
      endTime: endTime, // ✅ FECHA CORREGIDA
      emotionalState: profile === 'activo' ? 'excited' : 'happy',
      activityDescription: activity,
      activityDuration: duration,
      activityImpact: 'positive',
      activityNotes: `${activity} durante ${duration} minutos`,
      notes: activity,
      createdAt: new Date().toISOString()
    })
  }

  // 8. TOMAS NOCTURNAS para bebés <18 meses (con fechas corregidas)
  if (age < 1.5 && Math.random() < 0.3) {
    const nightFeedTime = 2 + Math.random() * 3 // Entre 2am y 5am
    const nfHour = Math.floor(nightFeedTime)
    const nfMin = Math.floor((nightFeedTime - nfHour) * 60)
    const duration = Math.floor(15 + Math.random() * 15) // 15-30 minutos

    // CORRECCIÓN: Usar addMinutesToTime
    const endTime = addMinutesToTime(dateStr, nfHour, nfMin, duration)

    events.push({
      _id: new ObjectId().toString(),
      childId: child._id.toString(),
      eventType: 'night_feeding',
      startTime: `${dateStr}T${nfHour.toString().padStart(2, '0')}:${nfMin.toString().padStart(2, '0')}:00.000Z`,
      endTime: endTime, // ✅ FECHA CORREGIDA
      emotionalState: 'sleepy',
      feedingType: 'bottle',
      feedingAmount: Math.floor(60 + Math.random() * 40),
      feedingDuration: duration,
      babyState: 'asleep',
      feedingNotes: `Toma nocturna ${duration}min`,
      notes: 'Toma nocturna tranquila',
      createdAt: new Date().toISOString()
    })
  }

  return events
}

async function generateFixedTestData() {
  console.log('🚀 GENERANDO DATOS CORREGIDOS (SIN FECHAS INVÁLIDAS)')
  console.log('=' * 65)
  console.log(`📅 Período: ${format(START_DATE, 'dd/MM/yyyy')} - ${format(END_DATE, 'dd/MM/yyyy')}`)
  console.log(`👶 Niños: ${CHILDREN_DATA.length} (versión simplificada)`)
  
  try {
    const client = new MongoClient(MONGODB_URI)
    await client.connect()
    console.log('✅ Conectado a MongoDB')
    
    const db = client.db()
    
    // 1. LIMPIAR DATOS ANTERIORES
    console.log('\n🧹 Limpiando datos anteriores...')
    const deleteChildren = await db.collection('children').deleteMany({ parentId: USER_ID })
    const deletePlans = await db.collection('sleep_plans').deleteMany({ parentId: new ObjectId(USER_ID) })
    console.log(`   🗑️  ${deleteChildren.deletedCount} niños eliminados`)
    console.log(`   🗑️  ${deletePlans.deletedCount} planes eliminados`)
    
    // 2. GENERAR NIÑOS
    console.log('\n👶 Generando niños...')
    const children = CHILDREN_DATA.map((childData, index) => {
      const child = {
        _id: new ObjectId(),
        ...childData,
        parentId: USER_ID,
        events: [],
        currentHabits: ["chupete", "manta_especial"],
        temperament: childData.profile === 'activo' ? 'activo' : 
                    childData.profile === 'sensible' ? 'sensible' : 'tranquilo',
        healthNotes: `Niño con perfil ${childData.profile}`,
        createdAt: new Date('2025-04-20'),
        updatedAt: new Date()
      }
      console.log(`   ${index + 1}. ${child.firstName} - ${child.profile}`)
      return child
    })
    
    // 3. GENERAR EVENTOS CON FECHAS CORREGIDAS
    console.log('\n📊 Generando eventos con fechas válidas...')
    let totalEvents = 0
    
    for (const child of children) {
      console.log(`   📝 ${child.firstName}...`)
      
      const currentDate = new Date(START_DATE)
      let childEvents = 0
      
      while (currentDate <= END_DATE && currentDate <= new Date()) {
        const dayEvents = generateFixedEvents(child, currentDate)
        child.events.push(...dayEvents)
        totalEvents += dayEvents.length
        childEvents += dayEvents.length
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      console.log(`      ✅ ${childEvents} eventos generados`)
    }
    
    // 4. GENERAR PLANES BÁSICOS
    console.log('\n📋 Generando planes básicos...')
    const allPlans = []
    
    for (const child of children) {
      const plan = {
        _id: new ObjectId(),
        title: `Plan de sueño - ${child.firstName}`,
        description: `Plan personalizado para ${child.firstName}`,
        childId: child._id,
        parentId: new ObjectId(USER_ID),
        createdAt: new Date(),
        status: 'active',
        schedule: {
          bedtime: "19:30",
          wakeTime: "07:00",
          napTimes: child.napGoal > 0 ? ["13:30"] : [],
          totalSleepGoal: child.sleepGoal,
          napGoal: child.napGoal
        },
        techniques: ['Rutina consistente', 'Ambiente tranquilo'],
        goals: [`${child.sleepGoal}h de sueño nocturno`],
        notes: `Plan para perfil ${child.profile}`,
        expectedDuration: '2-4 semanas',
        followUpSchedule: 'Revisión semanal'
      }
      
      allPlans.push(plan)
      console.log(`   ${child.firstName}: 1 plan activo`)
    }
    
    // 5. GUARDAR TODO
    console.log('\n💾 Guardando en base de datos...')
    
    await db.collection('children').insertMany(children)
    console.log(`   ✅ ${children.length} niños insertados`)
    
    if (allPlans.length > 0) {
      await db.collection('sleep_plans').insertMany(allPlans)
      console.log(`   ✅ ${allPlans.length} planes insertados`)
    }
    
    await client.close()
    console.log('   ✅ Conexión cerrada')
    
    // 6. RESUMEN
    console.log('\n🎉 ¡DATOS CORREGIDOS GENERADOS EXITOSAMENTE!')
    console.log('=' * 60)
    console.log(`👶 Niños: ${children.length}`)
    console.log(`📊 Total eventos: ${totalEvents} (promedio: ${Math.floor(totalEvents/children.length)})`)
    console.log(`📋 Planes: ${allPlans.length}`)
    
    console.log('\n✅ CORRECCIONES APLICADAS:')
    console.log('• Fechas endTime calculadas correctamente con addMinutes()')
    console.log('• Sin minutos >59 o horas inválidas')
    console.log('• Todas las fechas son válidas para Date() de JavaScript')
    console.log('• El calendario debería funcionar sin errores ahora')
    
    console.log('\n📋 RESUMEN POR NIÑO:')
    children.forEach((child, i) => {
      console.log(`   ${i+1}. ${child.firstName} - ${child.profile} (${child.events.length} eventos)`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Ejecutar
generateFixedTestData()