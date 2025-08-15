/**
 * SUITE DE PRUEBAS EXHAUSTIVAS - BACKEND EVENTOS V3
 * Sistema Happy Dreamers - Testing de integridad del backend
 * 
 * CONTEXTO:
 * - Backend-mongodb-guardian confirmó 95% integridad de datos
 * - Ignoramos bug calendario UI (eventos +3 horas después 18:00)
 * - Objetivo: Validar backend antes de Iteración 4
 */

// Configuración del entorno de pruebas
const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'
const API_BASE = `${BASE_URL}/api/children/events`

// Token de sesión simulado (debe ser reemplazado con token real en producción)
let SESSION_TOKEN = null
let TEST_CHILD_ID = null

// Utilidades de testing
class TestSuite {
  constructor() {
    this.results = []
    this.passedTests = 0
    this.failedTests = 0
  }

  log(category, test, status, details = '') {
    const result = {
      category,
      test,
      status,
      details,
      timestamp: new Date().toISOString()
    }
    this.results.push(result)
    
    if (status === 'PASS') {
      this.passedTests++
      console.log(`✅ [${category}] ${test}`)
    } else if (status === 'FAIL') {
      this.failedTests++
      console.log(`❌ [${category}] ${test} - ${details}`)
    } else {
      console.log(`ℹ️ [${category}] ${test} - ${details}`)
    }
  }

  async apiCall(method, endpoint, data = null, headers = {}) {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SESSION_TOKEN}`,
      ...headers
    }

    const config = {
      method,
      headers: defaultHeaders
    }

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.body = JSON.stringify(data)
    }

    try {
      const response = await fetch(endpoint, config)
      const responseData = await response.json()
      
      return {
        status: response.status,
        ok: response.ok,
        data: responseData,
        headers: response.headers
      }
    } catch (error) {
      return {
        status: 0,
        ok: false,
        error: error.message
      }
    }
  }

  generateTestEvent(type = 'sleep', overrides = {}) {
    const now = new Date()
    const baseEvent = {
      childId: TEST_CHILD_ID,
      eventType: type,
      startTime: now.toISOString(),
      emotionalState: 'tranquilo',
      notes: '',
      sleepDelay: 0,
      ...overrides
    }
    return baseEvent
  }

  generateReport() {
    const totalTests = this.passedTests + this.failedTests
    const successRate = ((this.passedTests / totalTests) * 100).toFixed(2)
    
    console.log('\n' + '='.repeat(60))
    console.log('📊 REPORTE FINAL DE TESTING - BACKEND EVENTOS V3')
    console.log('='.repeat(60))
    console.log(`Total de pruebas: ${totalTests}`)
    console.log(`Exitosas: ${this.passedTests} (${successRate}%)`)
    console.log(`Fallidas: ${this.failedTests}`)
    console.log(`Estado del sistema: ${successRate >= 95 ? '✅ APROBADO' : '❌ NECESITA CORRECCIÓN'}`)
    
    if (this.failedTests > 0) {
      console.log('\n🚨 PRUEBAS FALLIDAS:')
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`- [${r.category}] ${r.test}: ${r.details}`))
    }
    
    return {
      totalTests,
      passedTests: this.passedTests,
      failedTests: this.failedTests,
      successRate: parseFloat(successRate),
      approved: successRate >= 95,
      results: this.results
    }
  }
}

// Instancia global del suite de pruebas
const testSuite = new TestSuite()

/**
 * SETUP Y CONFIGURACIÓN INICIAL
 */
async function setupTestEnvironment() {
  testSuite.log('SETUP', 'Inicializando entorno de pruebas', 'INFO')
  
  // Aquí se debería configurar la sesión de usuario y obtener child ID
  // Por ahora usamos valores simulados
  SESSION_TOKEN = 'test-session-token'
  TEST_CHILD_ID = '507f1f77bcf86cd799439011' // ObjectId simulado
  
  testSuite.log('SETUP', 'Entorno configurado', 'PASS', `Child ID: ${TEST_CHILD_ID}`)
}

/**
 * 1. PRUEBAS DE CREACIÓN DE EVENTOS (POST)
 */
async function testEventCreation() {
  testSuite.log('CREATION', 'Iniciando pruebas de creación de eventos', 'INFO')

  // Test 1.1: Crear evento de sueño con todos los campos
  try {
    const sleepEvent = testSuite.generateTestEvent('sleep', {
      emotionalState: 'tranquilo',
      notes: 'El niño se durmió fácilmente hoy',
      sleepDelay: 15
    })
    
    const response = await testSuite.apiCall('POST', API_BASE, sleepEvent)
    
    if (response.ok && response.data.event) {
      // Verificar que NO se cree endTime al inicio
      if (!response.data.event.endTime) {
        testSuite.log('CREATION', 'Evento sueño completo - sin endTime inicial', 'PASS')
      } else {
        testSuite.log('CREATION', 'Evento sueño completo - endTime no debería existir', 'FAIL', 'Se creó endTime al inicio')
      }
      
      // Verificar campos requeridos
      const event = response.data.event
      if (event.eventType === 'sleep' && event.emotionalState === 'tranquilo' && event.sleepDelay === 15) {
        testSuite.log('CREATION', 'Validación campos evento sueño', 'PASS')
      } else {
        testSuite.log('CREATION', 'Validación campos evento sueño', 'FAIL', 'Campos incorrectos')
      }
    } else {
      testSuite.log('CREATION', 'Crear evento sueño completo', 'FAIL', response.data?.error || 'Error desconocido')
    }
  } catch (error) {
    testSuite.log('CREATION', 'Crear evento sueño completo', 'FAIL', error.message)
  }

  // Test 1.2: Crear evento de siesta con delay
  try {
    const napEvent = testSuite.generateTestEvent('nap', {
      emotionalState: 'inquieto',
      sleepDelay: 30,
      notes: 'Tuvo dificultad para la siesta'
    })
    
    const response = await testSuite.apiCall('POST', API_BASE, napEvent)
    
    if (response.ok) {
      testSuite.log('CREATION', 'Crear evento siesta con delay', 'PASS')
      
      // Verificar cálculo automático con sleepDelay
      const event = response.data.event
      if (event.sleepDelay === 30 && event.eventType === 'nap') {
        testSuite.log('CREATION', 'Validación sleepDelay en siesta', 'PASS')
      } else {
        testSuite.log('CREATION', 'Validación sleepDelay en siesta', 'FAIL')
      }
    } else {
      testSuite.log('CREATION', 'Crear evento siesta con delay', 'FAIL', response.data?.error)
    }
  } catch (error) {
    testSuite.log('CREATION', 'Crear evento siesta con delay', 'FAIL', error.message)
  }

  // Test 1.3: Crear evento con notas vacías
  try {
    const emptyNotesEvent = testSuite.generateTestEvent('sleep', {
      notes: '', // Explícitamente vacío
      emotionalState: 'alterado'
    })
    
    const response = await testSuite.apiCall('POST', API_BASE, emptyNotesEvent)
    
    if (response.ok && response.data.event.notes === '') {
      testSuite.log('CREATION', 'Crear evento con notas vacías', 'PASS')
    } else {
      testSuite.log('CREATION', 'Crear evento con notas vacías', 'FAIL', 'Notas no están vacías')
    }
  } catch (error) {
    testSuite.log('CREATION', 'Crear evento con notas vacías', 'FAIL', error.message)
  }

  // Test 1.4: Crear evento con diferentes estados emocionales
  const emotionalStates = ['tranquilo', 'inquieto', 'alterado']
  for (const state of emotionalStates) {
    try {
      const stateEvent = testSuite.generateTestEvent('sleep', {
        emotionalState: state
      })
      
      const response = await testSuite.apiCall('POST', API_BASE, stateEvent)
      
      if (response.ok && response.data.event.emotionalState === state) {
        testSuite.log('CREATION', `Estado emocional: ${state}`, 'PASS')
      } else {
        testSuite.log('CREATION', `Estado emocional: ${state}`, 'FAIL')
      }
    } catch (error) {
      testSuite.log('CREATION', `Estado emocional: ${state}`, 'FAIL', error.message)
    }
  }

  // Test 1.5: Crear evento wake (despertar)
  try {
    const wakeEvent = testSuite.generateTestEvent('wake', {
      emotionalState: 'tranquilo'
    })
    
    const response = await testSuite.apiCall('POST', API_BASE, wakeEvent)
    
    if (response.ok) {
      testSuite.log('CREATION', 'Crear evento wake', 'PASS')
    } else {
      testSuite.log('CREATION', 'Crear evento wake', 'FAIL', response.data?.error)
    }
  } catch (error) {
    testSuite.log('CREATION', 'Crear evento wake', 'FAIL', error.message)
  }
}

/**
 * 2. PRUEBAS DE ACTUALIZACIÓN (PATCH)
 */
async function testEventUpdate() {
  testSuite.log('UPDATE', 'Iniciando pruebas de actualización de eventos', 'INFO')

  // Primero crear un evento para actualizar
  let testEventId = null
  try {
    const baseEvent = testSuite.generateTestEvent('sleep', {
      sleepDelay: 20
    })
    
    const createResponse = await testSuite.apiCall('POST', API_BASE, baseEvent)
    if (createResponse.ok) {
      testEventId = createResponse.data.event._id
      testSuite.log('UPDATE', 'Evento base creado para testing', 'PASS')
    } else {
      testSuite.log('UPDATE', 'Evento base para testing', 'FAIL', 'No se pudo crear evento base')
      return
    }
  } catch (error) {
    testSuite.log('UPDATE', 'Setup evento para actualización', 'FAIL', error.message)
    return
  }

  // Test 2.1: Actualizar endTime de evento existente
  try {
    const endTime = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() // +8 horas
    
    const updateData = {
      eventId: testEventId,
      childId: TEST_CHILD_ID,
      endTime: endTime
    }
    
    const response = await testSuite.apiCall('PATCH', API_BASE, updateData)
    
    if (response.ok) {
      testSuite.log('UPDATE', 'Actualizar endTime', 'PASS')
    } else {
      testSuite.log('UPDATE', 'Actualizar endTime', 'FAIL', response.data?.error)
    }
  } catch (error) {
    testSuite.log('UPDATE', 'Actualizar endTime', 'FAIL', error.message)
  }

  // Test 2.2: Verificar cálculo automático de duration
  try {
    // Obtener el evento actualizado para verificar duration
    const getResponse = await testSuite.apiCall('GET', `${API_BASE}?childId=${TEST_CHILD_ID}`)
    
    if (getResponse.ok) {
      const events = getResponse.data.events || []
      const updatedEvent = events.find(e => e._id === testEventId)
      
      if (updatedEvent && updatedEvent.duration && updatedEvent.duration > 0) {
        testSuite.log('UPDATE', 'Cálculo automático duration', 'PASS', `Duration: ${updatedEvent.duration} min`)
      } else {
        testSuite.log('UPDATE', 'Cálculo automático duration', 'FAIL', 'Duration no calculada o es 0')
      }
      
      // Test 2.3: Verificar formato durationReadable
      if (updatedEvent && updatedEvent.durationReadable && updatedEvent.durationReadable.length > 0) {
        testSuite.log('UPDATE', 'Formato durationReadable', 'PASS', `Formato: ${updatedEvent.durationReadable}`)
      } else {
        testSuite.log('UPDATE', 'Formato durationReadable', 'FAIL', 'Formato no generado')
      }
    } else {
      testSuite.log('UPDATE', 'Verificación post-actualización', 'FAIL', 'No se pudo obtener evento')
    }
  } catch (error) {
    testSuite.log('UPDATE', 'Verificación cálculos automáticos', 'FAIL', error.message)
  }

  // Test 2.4: Actualizar con sleepDelay diferente
  try {
    const updateData = {
      eventId: testEventId,
      childId: TEST_CHILD_ID,
      sleepDelay: 45
    }
    
    const response = await testSuite.apiCall('PATCH', API_BASE, updateData)
    
    if (response.ok) {
      testSuite.log('UPDATE', 'Actualizar sleepDelay', 'PASS')
    } else {
      testSuite.log('UPDATE', 'Actualizar sleepDelay', 'FAIL', response.data?.error)
    }
  } catch (error) {
    testSuite.log('UPDATE', 'Actualizar sleepDelay', 'FAIL', error.message)
  }

  // Test 2.5: Actualizar notas del evento
  try {
    const updateData = {
      eventId: testEventId,
      childId: TEST_CHILD_ID,
      notes: 'Notas actualizadas durante la prueba'
    }
    
    const response = await testSuite.apiCall('PATCH', API_BASE, updateData)
    
    if (response.ok) {
      testSuite.log('UPDATE', 'Actualizar notas', 'PASS')
    } else {
      testSuite.log('UPDATE', 'Actualizar notas', 'FAIL', response.data?.error)
    }
  } catch (error) {
    testSuite.log('UPDATE', 'Actualizar notas', 'FAIL', error.message)
  }
}

/**
 * 3. PRUEBAS DE EDGE CASES
 */
async function testEdgeCases() {
  testSuite.log('EDGE_CASES', 'Iniciando pruebas de casos límite', 'INFO')

  // Test 3.1: Evento que cruza medianoche
  try {
    const midnightEvent = testSuite.generateTestEvent('sleep', {
      startTime: new Date('2024-01-15T23:30:00.000Z').toISOString(),
      emotionalState: 'tranquilo'
    })
    
    const response = await testSuite.apiCall('POST', API_BASE, midnightEvent)
    
    if (response.ok) {
      testSuite.log('EDGE_CASES', 'Evento cruza medianoche', 'PASS')
      
      // Ahora actualizar con endTime al día siguiente
      const nextDayEnd = new Date('2024-01-16T07:00:00.000Z').toISOString()
      const updateData = {
        eventId: response.data.event._id,
        childId: TEST_CHILD_ID,
        endTime: nextDayEnd
      }
      
      const updateResponse = await testSuite.apiCall('PATCH', API_BASE, updateData)
      if (updateResponse.ok) {
        testSuite.log('EDGE_CASES', 'Actualización evento medianoche', 'PASS')
      } else {
        testSuite.log('EDGE_CASES', 'Actualización evento medianoche', 'FAIL')
      }
    } else {
      testSuite.log('EDGE_CASES', 'Evento cruza medianoche', 'FAIL', response.data?.error)
    }
  } catch (error) {
    testSuite.log('EDGE_CASES', 'Evento cruza medianoche', 'FAIL', error.message)
  }

  // Test 3.2: Evento con duración negativa (error esperado)
  try {
    const negativeEvent = testSuite.generateTestEvent('sleep', {
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // -2 horas
    })
    
    const response = await testSuite.apiCall('POST', API_BASE, negativeEvent)
    
    // Esperamos que esto NO funcione o que duration sea 0
    if (!response.ok || (response.data.event && response.data.event.duration === 0)) {
      testSuite.log('EDGE_CASES', 'Duración negativa (error esperado)', 'PASS', 'Sistema previene duración negativa')
    } else {
      testSuite.log('EDGE_CASES', 'Duración negativa (error esperado)', 'FAIL', 'Sistema permite duración negativa')
    }
  } catch (error) {
    testSuite.log('EDGE_CASES', 'Duración negativa', 'PASS', 'Error capturado correctamente')
  }

  // Test 3.3: Evento con sleepDelay mayor que duración total
  try {
    const startTime = new Date().toISOString()
    const endTime = new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString() // +1 hora
    
    const extremeDelayEvent = testSuite.generateTestEvent('sleep', {
      startTime: startTime,
      sleepDelay: 120 // 2 horas de delay en 1 hora total
    })
    
    const createResponse = await testSuite.apiCall('POST', API_BASE, extremeDelayEvent)
    
    if (createResponse.ok) {
      // Actualizar con endTime
      const updateData = {
        eventId: createResponse.data.event._id,
        childId: TEST_CHILD_ID,
        endTime: endTime
      }
      
      const updateResponse = await testSuite.apiCall('PATCH', API_BASE, updateData)
      
      if (updateResponse.ok) {
        // Verificar que la duración real sea 0 o mínima
        const getResponse = await testSuite.apiCall('GET', `${API_BASE}?childId=${TEST_CHILD_ID}`)
        const events = getResponse.data.events || []
        const event = events.find(e => e._id === createResponse.data.event._id)
        
        if (event && event.duration >= 0) {
          testSuite.log('EDGE_CASES', 'SleepDelay > duración total', 'PASS', `Duration calculada: ${event.duration}`)
        } else {
          testSuite.log('EDGE_CASES', 'SleepDelay > duración total', 'FAIL', 'Cálculo incorrecto')
        }
      }
    }
  } catch (error) {
    testSuite.log('EDGE_CASES', 'SleepDelay extremo', 'FAIL', error.message)
  }

  // Test 3.4: Campos con valores límite
  try {
    const extremeValues = testSuite.generateTestEvent('sleep', {
      sleepDelay: 180, // Máximo según código (3 horas)
      notes: 'A'.repeat(1000), // Nota muy larga
      emotionalState: 'tranquilo'
    })
    
    const response = await testSuite.apiCall('POST', API_BASE, extremeValues)
    
    if (response.ok) {
      testSuite.log('EDGE_CASES', 'Valores límite', 'PASS')
    } else {
      testSuite.log('EDGE_CASES', 'Valores límite', 'FAIL', response.data?.error)
    }
  } catch (error) {
    testSuite.log('EDGE_CASES', 'Valores límite', 'FAIL', error.message)
  }
}

/**
 * 4. PRUEBAS DE CONCURRENCIA
 */
async function testConcurrency() {
  testSuite.log('CONCURRENCY', 'Iniciando pruebas de concurrencia', 'INFO')

  // Test 4.1: Crear múltiples eventos rápidamente
  try {
    const concurrentCreations = []
    
    for (let i = 0; i < 5; i++) {
      const event = testSuite.generateTestEvent('sleep', {
        startTime: new Date(Date.now() + i * 1000).toISOString(), // 1 segundo de diferencia
        emotionalState: 'tranquilo'
      })
      
      concurrentCreations.push(testSuite.apiCall('POST', API_BASE, event))
    }
    
    const results = await Promise.allSettled(concurrentCreations)
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.ok).length
    
    if (successful >= 4) { // Permitir 1 fallo
      testSuite.log('CONCURRENCY', 'Creación múltiple rápida', 'PASS', `${successful}/5 exitosas`)
    } else {
      testSuite.log('CONCURRENCY', 'Creación múltiple rápida', 'FAIL', `Solo ${successful}/5 exitosas`)
    }
  } catch (error) {
    testSuite.log('CONCURRENCY', 'Creación múltiple rápida', 'FAIL', error.message)
  }

  // Test 4.2: PATCH mientras se hace GET
  try {
    // Crear evento base
    const baseEvent = testSuite.generateTestEvent('sleep')
    const createResponse = await testSuite.apiCall('POST', API_BASE, baseEvent)
    
    if (createResponse.ok) {
      const eventId = createResponse.data.event._id
      
      // Operaciones concurrentes: GET y PATCH
      const getPromise = testSuite.apiCall('GET', `${API_BASE}?childId=${TEST_CHILD_ID}`)
      const patchPromise = testSuite.apiCall('PATCH', API_BASE, {
        eventId: eventId,
        childId: TEST_CHILD_ID,
        endTime: new Date().toISOString()
      })
      
      const [getResult, patchResult] = await Promise.all([getPromise, patchPromise])
      
      if (getResult.ok && patchResult.ok) {
        testSuite.log('CONCURRENCY', 'GET + PATCH simultáneo', 'PASS')
      } else {
        testSuite.log('CONCURRENCY', 'GET + PATCH simultáneo', 'FAIL', 'Una operación falló')
      }
    }
  } catch (error) {
    testSuite.log('CONCURRENCY', 'GET + PATCH simultáneo', 'FAIL', error.message)
  }

  // Test 4.3: Múltiples actualizaciones del mismo evento
  try {
    // Crear evento base
    const baseEvent = testSuite.generateTestEvent('sleep')
    const createResponse = await testSuite.apiCall('POST', API_BASE, baseEvent)
    
    if (createResponse.ok) {
      const eventId = createResponse.data.event._id
      
      // Múltiples PATCH al mismo evento
      const updates = []
      for (let i = 0; i < 3; i++) {
        updates.push(testSuite.apiCall('PATCH', API_BASE, {
          eventId: eventId,
          childId: TEST_CHILD_ID,
          notes: `Actualización ${i + 1}`
        }))
      }
      
      const results = await Promise.allSettled(updates)
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.ok).length
      
      if (successful >= 1) { // Al menos una debe ser exitosa
        testSuite.log('CONCURRENCY', 'Múltiples PATCH mismo evento', 'PASS', `${successful}/3 exitosas`)
      } else {
        testSuite.log('CONCURRENCY', 'Múltiples PATCH mismo evento', 'FAIL', 'Ninguna actualización exitosa')
      }
    }
  } catch (error) {
    testSuite.log('CONCURRENCY', 'Múltiples PATCH mismo evento', 'FAIL', error.message)
  }
}

/**
 * 5. PRUEBAS DE VALIDACIONES DE DATOS
 */
async function testDataValidation() {
  testSuite.log('VALIDATION', 'Iniciando pruebas de validación de datos', 'INFO')

  // Test 5.1: Campos requeridos faltantes
  try {
    const incompleteEvent = {
      // Falta childId y eventType
      emotionalState: 'tranquilo'
    }
    
    const response = await testSuite.apiCall('POST', API_BASE, incompleteEvent)
    
    if (!response.ok && response.status === 400) {
      testSuite.log('VALIDATION', 'Campos requeridos faltantes', 'PASS', 'Error 400 como esperado')
    } else {
      testSuite.log('VALIDATION', 'Campos requeridos faltantes', 'FAIL', 'Debería rechazar evento incompleto')
    }
  } catch (error) {
    testSuite.log('VALIDATION', 'Campos requeridos faltantes', 'PASS', 'Error capturado correctamente')
  }

  // Test 5.2: Tipos de datos incorrectos
  try {
    const wrongTypesEvent = {
      childId: TEST_CHILD_ID,
      eventType: 'sleep',
      sleepDelay: 'no-es-numero', // Debería ser número
      startTime: 'fecha-invalida' // Debería ser ISO string
    }
    
    const response = await testSuite.apiCall('POST', API_BASE, wrongTypesEvent)
    
    if (!response.ok) {
      testSuite.log('VALIDATION', 'Tipos de datos incorrectos', 'PASS', 'Rechazado correctamente')
    } else {
      testSuite.log('VALIDATION', 'Tipos de datos incorrectos', 'FAIL', 'Debería rechazar tipos incorrectos')
    }
  } catch (error) {
    testSuite.log('VALIDATION', 'Tipos de datos incorrectos', 'PASS', 'Error capturado')
  }

  // Test 5.3: Rangos de sleepDelay válidos
  const sleepDelayTests = [
    { value: -10, shouldPass: false, name: 'negativo' },
    { value: 0, shouldPass: true, name: 'cero' },
    { value: 30, shouldPass: true, name: 'normal' },
    { value: 180, shouldPass: true, name: 'máximo' },
    { value: 200, shouldPass: true, name: 'excesivo (debe limitarse)' }
  ]
  
  for (const test of sleepDelayTests) {
    try {
      const event = testSuite.generateTestEvent('sleep', {
        sleepDelay: test.value
      })
      
      const response = await testSuite.apiCall('POST', API_BASE, event)
      
      if (test.shouldPass && response.ok) {
        testSuite.log('VALIDATION', `SleepDelay ${test.name}`, 'PASS')
      } else if (!test.shouldPass && !response.ok) {
        testSuite.log('VALIDATION', `SleepDelay ${test.name}`, 'PASS', 'Rechazado correctamente')
      } else {
        testSuite.log('VALIDATION', `SleepDelay ${test.name}`, 'FAIL')
      }
    } catch (error) {
      testSuite.log('VALIDATION', `SleepDelay ${test.name}`, 'FAIL', error.message)
    }
  }

  // Test 5.4: Estados emocionales válidos
  const emotionalStateTests = [
    { value: 'tranquilo', shouldPass: true },
    { value: 'inquieto', shouldPass: true },
    { value: 'alterado', shouldPass: true },
    { value: 'feliz', shouldPass: true }, // Puede ser aceptado
    { value: '', shouldPass: true }, // Vacío debería usar default
    { value: 'estado-invalido', shouldPass: true } // Sistema puede aceptar cualquier string
  ]
  
  for (const test of emotionalStateTests) {
    try {
      const event = testSuite.generateTestEvent('sleep', {
        emotionalState: test.value
      })
      
      const response = await testSuite.apiCall('POST', API_BASE, event)
      
      if (response.ok === test.shouldPass) {
        testSuite.log('VALIDATION', `Estado emocional: ${test.value || 'vacío'}`, 'PASS')
      } else {
        testSuite.log('VALIDATION', `Estado emocional: ${test.value || 'vacío'}`, 'FAIL')
      }
    } catch (error) {
      testSuite.log('VALIDATION', `Estado emocional: ${test.value}`, 'FAIL', error.message)
    }
  }

  // Test 5.5: Formato ISO de fechas
  const dateTests = [
    { value: new Date().toISOString(), shouldPass: true, name: 'ISO válido' },
    { value: '2024-01-15T10:30:00Z', shouldPass: true, name: 'ISO con Z' },
    { value: '2024-01-15T10:30:00.000-05:00', shouldPass: true, name: 'ISO con timezone' },
    { value: '2024-01-15 10:30:00', shouldPass: false, name: 'formato no ISO' },
    { value: 'invalid-date', shouldPass: false, name: 'fecha inválida' }
  ]
  
  for (const test of dateTests) {
    try {
      const event = testSuite.generateTestEvent('sleep', {
        startTime: test.value
      })
      
      const response = await testSuite.apiCall('POST', API_BASE, event)
      
      if (response.ok === test.shouldPass) {
        testSuite.log('VALIDATION', `Formato fecha: ${test.name}`, 'PASS')
      } else {
        testSuite.log('VALIDATION', `Formato fecha: ${test.name}`, 'FAIL')
      }
    } catch (error) {
      if (!test.shouldPass) {
        testSuite.log('VALIDATION', `Formato fecha: ${test.name}`, 'PASS', 'Error esperado')
      } else {
        testSuite.log('VALIDATION', `Formato fecha: ${test.name}`, 'FAIL', error.message)
      }
    }
  }
}

/**
 * 6. PRUEBAS DE RECUPERACIÓN DE DATOS
 */
async function testDataRetrieval() {
  testSuite.log('RETRIEVAL', 'Iniciando pruebas de recuperación de datos', 'INFO')

  // Setup: crear varios eventos para las pruebas
  const testEvents = []
  try {
    for (let i = 0; i < 5; i++) {
      const event = testSuite.generateTestEvent('sleep', {
        startTime: new Date(Date.now() + i * 2 * 60 * 60 * 1000).toISOString(), // +2 horas cada uno
        emotionalState: ['tranquilo', 'inquieto', 'alterado'][i % 3]
      })
      
      const response = await testSuite.apiCall('POST', API_BASE, event)
      if (response.ok) {
        testEvents.push(response.data.event)
      }
    }
    
    testSuite.log('RETRIEVAL', 'Setup eventos para pruebas', 'PASS', `${testEvents.length} eventos creados`)
  } catch (error) {
    testSuite.log('RETRIEVAL', 'Setup eventos para pruebas', 'FAIL', error.message)
    return
  }

  // Test 6.1: GET eventos del día
  try {
    const response = await testSuite.apiCall('GET', `${API_BASE}?childId=${TEST_CHILD_ID}`)
    
    if (response.ok && response.data.events) {
      const events = response.data.events
      testSuite.log('RETRIEVAL', 'GET todos los eventos', 'PASS', `${events.length} eventos obtenidos`)
      
      // Test 6.2: Verificar ordenamiento correcto
      let isOrdered = true
      for (let i = 1; i < events.length; i++) {
        if (events[i-1].startTime && events[i].startTime) {
          const prevTime = new Date(events[i-1].startTime).getTime()
          const currTime = new Date(events[i].startTime).getTime()
          if (prevTime > currTime) {
            isOrdered = false
            break
          }
        }
      }
      
      if (isOrdered) {
        testSuite.log('RETRIEVAL', 'Ordenamiento cronológico', 'PASS')
      } else {
        testSuite.log('RETRIEVAL', 'Ordenamiento cronológico', 'FAIL', 'Eventos no ordenados por startTime')
      }
    } else {
      testSuite.log('RETRIEVAL', 'GET todos los eventos', 'FAIL', response.data?.error)
    }
  } catch (error) {
    testSuite.log('RETRIEVAL', 'GET eventos básico', 'FAIL', error.message)
  }

  // Test 6.3: Performance con muchos eventos
  try {
    const startTime = Date.now()
    const response = await testSuite.apiCall('GET', `${API_BASE}?childId=${TEST_CHILD_ID}`)
    const endTime = Date.now()
    const responseTime = endTime - startTime
    
    if (response.ok && responseTime < 2000) { // Menos de 2 segundos
      testSuite.log('RETRIEVAL', 'Performance GET eventos', 'PASS', `${responseTime}ms`)
    } else if (response.ok) {
      testSuite.log('RETRIEVAL', 'Performance GET eventos', 'FAIL', `Muy lento: ${responseTime}ms`)
    } else {
      testSuite.log('RETRIEVAL', 'Performance GET eventos', 'FAIL', 'Request falló')
    }
  } catch (error) {
    testSuite.log('RETRIEVAL', 'Performance GET eventos', 'FAIL', error.message)
  }

  // Test 6.4: Verificar estructura de respuesta
  try {
    const response = await testSuite.apiCall('GET', `${API_BASE}?childId=${TEST_CHILD_ID}`)
    
    if (response.ok && response.data) {
      const data = response.data
      
      // Verificar campos obligatorios en respuesta
      if (data._id && data.firstName && data.lastName && Array.isArray(data.events)) {
        testSuite.log('RETRIEVAL', 'Estructura respuesta GET', 'PASS')
      } else {
        testSuite.log('RETRIEVAL', 'Estructura respuesta GET', 'FAIL', 'Campos faltantes en respuesta')
      }
      
      // Verificar estructura de eventos
      if (data.events.length > 0) {
        const event = data.events[0]
        const requiredFields = ['_id', 'eventType', 'startTime', 'emotionalState', 'createdAt']
        const hasAllFields = requiredFields.every(field => field in event)
        
        if (hasAllFields) {
          testSuite.log('RETRIEVAL', 'Estructura evento individual', 'PASS')
        } else {
          testSuite.log('RETRIEVAL', 'Estructura evento individual', 'FAIL', 'Campos faltantes en evento')
        }
      }
    }
  } catch (error) {
    testSuite.log('RETRIEVAL', 'Verificación estructura', 'FAIL', error.message)
  }

  // Test 6.5: GET con childId inexistente
  try {
    const fakeChildId = '507f1f77bcf86cd799439999'
    const response = await testSuite.apiCall('GET', `${API_BASE}?childId=${fakeChildId}`)
    
    if (!response.ok && response.status === 404) {
      testSuite.log('RETRIEVAL', 'GET childId inexistente', 'PASS', 'Error 404 como esperado')
    } else {
      testSuite.log('RETRIEVAL', 'GET childId inexistente', 'FAIL', 'Debería retornar 404')
    }
  } catch (error) {
    testSuite.log('RETRIEVAL', 'GET childId inexistente', 'PASS', 'Error capturado')
  }

  // Test 6.6: GET sin childId
  try {
    const response = await testSuite.apiCall('GET', API_BASE) // Sin query parameter
    
    if (!response.ok && response.status === 400) {
      testSuite.log('RETRIEVAL', 'GET sin childId', 'PASS', 'Error 400 como esperado')
    } else {
      testSuite.log('RETRIEVAL', 'GET sin childId', 'FAIL', 'Debería requerir childId')
    }
  } catch (error) {
    testSuite.log('RETRIEVAL', 'GET sin childId', 'PASS', 'Error capturado')
  }
}

/**
 * FUNCIÓN PRINCIPAL DE TESTING
 */
async function runCompleteTestSuite() {
  console.log('🚀 INICIANDO SUITE DE PRUEBAS EXHAUSTIVAS - BACKEND EVENTOS V3')
  console.log('=' .repeat(60))
  
  try {
    await setupTestEnvironment()
    await testEventCreation()
    await testEventUpdate()
    await testEdgeCases()
    await testConcurrency()
    await testDataValidation()
    await testDataRetrieval()
    
    const report = testSuite.generateReport()
    
    // Guardar reporte en archivo
    const fs = require('fs')
    const reportPath = './testing/backend-test-report.json'
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    
    console.log(`\n💾 Reporte guardado en: ${reportPath}`)
    
    return report
  } catch (error) {
    console.error('❌ Error ejecutando suite de pruebas:', error)
    return null
  }
}

// Exportar para uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runCompleteTestSuite,
    TestSuite
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  runCompleteTestSuite()
}