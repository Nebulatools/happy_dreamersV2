// Script para probar el registro de eventos de un día completo - 19 de agosto
// Incluye prueba de validación de traslape de horarios

const BASE_URL = 'http://localhost:3004'

// Eventos de ejemplo para un día completo (19 de agosto)
const testEvents = [
  {
    eventType: 'wake',
    startTime: '2025-08-19T07:00:00.000Z',
    emotionalState: 'happy',
    notes: 'Despertó de buen humor'
  },
  {
    eventType: 'feeding',
    startTime: '2025-08-19T07:30:00.000Z',
    endTime: '2025-08-19T07:45:00.000Z',
    emotionalState: 'calm',
    feedingType: 'bottle',
    feedingAmount: 150,
    feedingDuration: 15,
    babyState: 'awake',
    feedingNotes: 'Tomó todo el biberón'
  },
  {
    eventType: 'extra_activities',
    startTime: '2025-08-19T08:00:00.000Z',
    endTime: '2025-08-19T08:30:00.000Z',
    emotionalState: 'excited',
    activityDescription: 'Juego con bloques de colores',
    activityDuration: 30,
    activityImpact: 'positive',
    activityNotes: 'Muy interesado en apilar bloques'
  },
  {
    eventType: 'nap',
    startTime: '2025-08-19T10:00:00.000Z',
    endTime: '2025-08-19T11:30:00.000Z',
    emotionalState: 'tired',
    sleepDelay: 10,
    notes: 'Siesta matutina, durmió bien'
  },
  {
    eventType: 'feeding',
    startTime: '2025-08-19T12:00:00.000Z',
    endTime: '2025-08-19T12:20:00.000Z',
    emotionalState: 'calm',
    feedingType: 'solids',
    feedingAmount: 80,
    feedingDuration: 20,
    babyState: 'awake',
    feedingNotes: 'Almuerzo - puré de verduras'
  },
  {
    eventType: 'medication',
    startTime: '2025-08-19T13:00:00.000Z',
    emotionalState: 'calm',
    medicationName: 'Paracetamol',
    medicationDose: '5ml',
    medicationTime: '2025-08-19T13:00:00.000Z',
    medicationNotes: 'Para fiebre leve'
  },
  {
    eventType: 'nap',
    startTime: '2025-08-19T14:30:00.000Z',
    endTime: '2025-08-19T16:00:00.000Z',
    emotionalState: 'tired',
    sleepDelay: 15,
    notes: 'Siesta de la tarde'
  },
  {
    eventType: 'feeding',
    startTime: '2025-08-19T16:30:00.000Z',
    endTime: '2025-08-19T16:45:00.000Z',
    emotionalState: 'happy',
    feedingType: 'bottle',
    feedingAmount: 120,
    feedingDuration: 15,
    babyState: 'awake',
    feedingNotes: 'Merienda'
  },
  {
    eventType: 'extra_activities',
    startTime: '2025-08-19T17:00:00.000Z',
    endTime: '2025-08-19T17:30:00.000Z',
    emotionalState: 'excited',
    activityDescription: 'Tiempo de lectura con libros ilustrados',
    activityDuration: 30,
    activityImpact: 'positive',
    activityNotes: 'Le gustan mucho los dibujos'
  },
  {
    eventType: 'feeding',
    startTime: '2025-08-19T18:30:00.000Z',
    endTime: '2025-08-19T19:00:00.000Z',
    emotionalState: 'calm',
    feedingType: 'solids',
    feedingAmount: 100,
    feedingDuration: 30,
    babyState: 'awake',
    feedingNotes: 'Cena - puré de frutas'
  },
  {
    eventType: 'sleep',
    startTime: '2025-08-19T20:00:00.000Z',
    emotionalState: 'tired',
    sleepDelay: 5,
    notes: 'Hora de dormir nocturno'
  },
  {
    eventType: 'night_waking',
    startTime: '2025-08-19T23:30:00.000Z',
    endTime: '2025-08-19T23:45:00.000Z',
    emotionalState: 'irritable',
    awakeDelay: 15,
    notes: 'Despertar nocturno breve'
  }
]

// Evento que debería fallar por traslape (intenta registrar algo durante la siesta)
const overlappingEvent = {
  eventType: 'feeding',
  startTime: '2025-08-19T10:30:00.000Z', // Durante la siesta de 10:00-11:30
  endTime: '2025-08-19T10:45:00.000Z',
  emotionalState: 'calm',
  feedingType: 'bottle',
  feedingAmount: 100,
  feedingDuration: 15,
  babyState: 'awake',
  feedingNotes: 'Este evento NO debería ser registrado - traslape con siesta'
}

async function testFullDayEvents() {
  console.log('🧪 INICIANDO PRUEBA COMPLETA DEL CALENDARIO - 19 DE AGOSTO')
  console.log('='*60)
  
  // Primero necesitamos obtener un niño para las pruebas
  try {
    console.log('\n1️⃣ Obteniendo lista de niños...')
    const childrenResponse = await fetch(`${BASE_URL}/api/children`, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (!childrenResponse.ok) {
      console.error('❌ No se pudo obtener la lista de niños')
      console.log('ℹ️  Asegúrate de estar autenticado en http://localhost:3004')
      return
    }
    
    const childrenData = await childrenResponse.json()
    console.log(`✅ Encontrados ${childrenData.children?.length || 0} niños`)
    
    if (!childrenData.children || childrenData.children.length === 0) {
      console.error('❌ No hay niños registrados. Crea un niño primero.')
      return
    }
    
    const testChildId = childrenData.children[0]._id
    const testChildName = childrenData.children[0].firstName
    console.log(`🧒 Usando niño: ${testChildName} (ID: ${testChildId})`)
    
    // 2. Registrar todos los eventos del día
    console.log(`\n2️⃣ Registrando ${testEvents.length} eventos para el 19 de agosto...`)
    let successCount = 0
    let failureCount = 0
    
    for (let i = 0; i < testEvents.length; i++) {
      const event = { ...testEvents[i], childId: testChildId }
      
      try {
        console.log(`\n   📝 [${i+1}/${testEvents.length}] Registrando ${event.eventType} a las ${new Date(event.startTime).toLocaleTimeString()}...`)
        
        const response = await fetch(`${BASE_URL}/api/children/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(event)
        })
        
        const result = await response.json()
        
        if (response.ok) {
          console.log(`   ✅ ${event.eventType} registrado exitosamente`)
          successCount++
        } else {
          console.log(`   ❌ Error: ${result.error}`)
          if (result.details) console.log(`      💡 ${result.details}`)
          failureCount++
        }
        
        // Pausa pequeña entre eventos
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        console.log(`   ❌ Error de red: ${error.message}`)
        failureCount++
      }
    }
    
    console.log(`\n✅ Eventos registrados exitosamente: ${successCount}`)
    console.log(`❌ Eventos fallidos: ${failureCount}`)
    
    // 3. Probar validación de traslape
    console.log('\n3️⃣ Probando validación de traslape de horarios...')
    const overlappingTestEvent = { ...overlappingEvent, childId: testChildId }
    
    try {
      const response = await fetch(`${BASE_URL}/api/children/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(overlappingTestEvent)
      })
      
      const result = await response.json()
      
      if (response.status === 409) { // Conflict
        console.log('✅ Validación de traslape funcionando correctamente!')
        console.log(`   🚫 Error esperado: ${result.error}`)
        console.log(`   📋 Detalles: ${result.details}`)
      } else if (response.ok) {
        console.log('❌ La validación de traslape NO está funcionando - evento se registró cuando no debería')
      } else {
        console.log(`❓ Error inesperado: ${result.error}`)
      }
    } catch (error) {
      console.log(`❌ Error de red probando traslape: ${error.message}`)
    }
    
    // 4. Verificar eventos registrados
    console.log('\n4️⃣ Verificando eventos registrados...')
    try {
      const eventsResponse = await fetch(`${BASE_URL}/api/children/events?childId=${testChildId}`)
      
      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json()
        const events = eventsData.events || []
        
        // Filtrar eventos del 19 de agosto
        const augustEvents = events.filter(event => 
          event.startTime && event.startTime.includes('2025-08-19')
        )
        
        console.log(`✅ Total de eventos del 19 de agosto: ${augustEvents.length}`)
        
        // Mostrar resumen por tipo
        const eventTypes = {}
        augustEvents.forEach(event => {
          eventTypes[event.eventType] = (eventTypes[event.eventType] || 0) + 1
        })
        
        console.log('\n📊 Resumen de eventos por tipo:')
        Object.entries(eventTypes).forEach(([type, count]) => {
          const typeName = {
            wake: 'Despertar',
            sleep: 'Dormir',
            nap: 'Siesta',
            feeding: 'Alimentación',
            medication: 'Medicamento',
            extra_activities: 'Actividad Extra',
            night_waking: 'Despertar nocturno'
          }[type] || type
          
          console.log(`   🔸 ${typeName}: ${count} evento${count > 1 ? 's' : ''}`)
        })
        
      } else {
        console.log('❌ No se pudieron obtener los eventos registrados')
      }
    } catch (error) {
      console.log(`❌ Error obteniendo eventos: ${error.message}`)
    }
    
    console.log('\n🎉 PRUEBA COMPLETADA!')
    console.log('='*60)
    console.log('💡 Ahora puedes revisar el calendario en: http://localhost:3004/dashboard/calendar')
    console.log('📅 Cambia a la vista diaria y navega al 19 de agosto para ver todos los eventos')
    
  } catch (error) {
    console.error('❌ Error general en la prueba:', error.message)
  }
}

// Ejecutar la prueba
testFullDayEvents()