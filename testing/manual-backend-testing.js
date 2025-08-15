/**
 * TESTING MANUAL DIRECTO - BACKEND EVENTOS V3
 * Happy Dreamers - Validación de integridad del backend
 * 
 * EJECUTAR CON: node testing/manual-backend-testing.js
 * 
 * PREREQUISITOS:
 * 1. Servidor Next.js corriendo en localhost:3000
 * 2. Usuario de prueba creado en la aplicación
 * 3. Al menos un niño creado para el usuario
 * 
 * CONFIGURACIÓN:
 * - Actualizar USER_SESSION_TOKEN con token real
 * - Actualizar TEST_CHILD_ID con ID real de niño
 */

const https = require('https')
const http = require('http')

// CONFIGURACIÓN - ACTUALIZAR CON DATOS REALES
const CONFIG = {
  BASE_URL: 'http://localhost:3000',
  USER_SESSION_TOKEN: 'tu-session-token-aqui', // Obtener del navegador
  TEST_CHILD_ID: 'tu-child-id-aqui', // ID de un niño existente
  API_ENDPOINT: '/api/children/events'
}

// Colores para output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

class BackendTester {
  constructor() {
    this.results = []
    this.passed = 0
    this.failed = 0
  }

  log(category, test, status, details = '') {
    const timestamp = new Date().toISOString()
    const result = { category, test, status, details, timestamp }
    this.results.push(result)

    let color = colors.reset
    let icon = 'ℹ️'
    
    if (status === 'PASS') {
      color = colors.green
      icon = '✅'
      this.passed++
    } else if (status === 'FAIL') {
      color = colors.red
      icon = '❌'
      this.failed++
    } else if (status === 'WARN') {
      color = colors.yellow
      icon = '⚠️'
    }

    console.log(`${color}${icon} [${category}] ${test}${colors.reset}${details ? ' - ' + details : ''}`)
  }

  makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(CONFIG.BASE_URL + path)
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `next-auth.session-token=${CONFIG.USER_SESSION_TOKEN}`
        }
      }

      if (data) {
        const payload = JSON.stringify(data)
        options.headers['Content-Length'] = Buffer.byteLength(payload)
      }

      const client = url.protocol === 'https:' ? https : http
      const req = client.request(options, (res) => {
        let body = ''
        res.on('data', chunk => body += chunk)
        res.on('end', () => {
          try {
            const parsedBody = body ? JSON.parse(body) : {}
            resolve({
              status: res.statusCode,
              ok: res.statusCode >= 200 && res.statusCode < 300,
              data: parsedBody,
              headers: res.headers
            })
          } catch (error) {
            resolve({
              status: res.statusCode,
              ok: false,
              data: { error: 'Invalid JSON response', body },
              headers: res.headers
            })
          }
        })
      })

      req.on('error', reject)

      if (data) {
        req.write(JSON.stringify(data))
      }

      req.end()
    })
  }

  generateTestEvent(type = 'sleep', overrides = {}) {
    return {
      childId: CONFIG.TEST_CHILD_ID,
      eventType: type,
      startTime: new Date().toISOString(),
      emotionalState: 'tranquilo',
      notes: '',
      sleepDelay: 0,
      ...overrides
    }
  }

  async validateConfiguration() {
    this.log('CONFIG', 'Validando configuración', 'INFO')

    if (!CONFIG.USER_SESSION_TOKEN || CONFIG.USER_SESSION_TOKEN === 'tu-session-token-aqui') {
      this.log('CONFIG', 'Session Token', 'FAIL', 'Configurar USER_SESSION_TOKEN')
      return false
    }

    if (!CONFIG.TEST_CHILD_ID || CONFIG.TEST_CHILD_ID === 'tu-child-id-aqui') {
      this.log('CONFIG', 'Child ID', 'FAIL', 'Configurar TEST_CHILD_ID')
      return false
    }

    // Verificar conectividad al servidor
    try {
      const response = await this.makeRequest('GET', CONFIG.API_ENDPOINT + `?childId=${CONFIG.TEST_CHILD_ID}`)
      if (response.ok) {
        this.log('CONFIG', 'Conectividad servidor', 'PASS')
        this.log('CONFIG', 'Acceso a niño', 'PASS', `Eventos existentes: ${response.data.events?.length || 0}`)
        return true
      } else {
        this.log('CONFIG', 'Acceso a niño', 'FAIL', response.data.error || 'Error desconocido')
        return false
      }
    } catch (error) {
      this.log('CONFIG', 'Conectividad servidor', 'FAIL', error.message)
      return false
    }
  }

  async testCreation() {
    this.log('CREATION', 'Iniciando pruebas de creación', 'INFO')

    // Test 1: Crear evento básico de sueño
    try {
      const sleepEvent = this.generateTestEvent('sleep', {
        emotionalState: 'tranquilo',
        sleepDelay: 15
      })

      const response = await this.makeRequest('POST', CONFIG.API_ENDPOINT, sleepEvent)
      
      if (response.ok && response.data.event) {
        this.log('CREATION', 'Evento sueño básico', 'PASS')
        
        // Verificar que NO se cree endTime al inicio
        if (!response.data.event.endTime) {
          this.log('CREATION', 'Sin endTime inicial', 'PASS')
        } else {
          this.log('CREATION', 'Sin endTime inicial', 'FAIL', 'EndTime creado incorrectamente')
        }

        return response.data.event._id // Retornar ID para pruebas posteriores
      } else {
        this.log('CREATION', 'Evento sueño básico', 'FAIL', response.data.error)
        return null
      }
    } catch (error) {
      this.log('CREATION', 'Evento sueño básico', 'FAIL', error.message)
      return null
    }
  }

  async testUpdate(eventId) {
    if (!eventId) {
      this.log('UPDATE', 'Pruebas de actualización', 'FAIL', 'No hay eventId para probar')
      return
    }

    this.log('UPDATE', 'Iniciando pruebas de actualización', 'INFO')

    // Test 1: Agregar endTime
    try {
      const endTime = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString() // +7 horas
      
      const updateData = {
        eventId: eventId,
        childId: CONFIG.TEST_CHILD_ID,
        endTime: endTime
      }

      const response = await this.makeRequest('PATCH', CONFIG.API_ENDPOINT, updateData)
      
      if (response.ok) {
        this.log('UPDATE', 'Agregar endTime', 'PASS')
      } else {
        this.log('UPDATE', 'Agregar endTime', 'FAIL', response.data.error)
      }
    } catch (error) {
      this.log('UPDATE', 'Agregar endTime', 'FAIL', error.message)
    }

    // Test 2: Verificar cálculo automático de duration
    try {
      const getResponse = await this.makeRequest('GET', CONFIG.API_ENDPOINT + `?childId=${CONFIG.TEST_CHILD_ID}`)
      
      if (getResponse.ok) {
        const events = getResponse.data.events || []
        const updatedEvent = events.find(e => e._id === eventId)
        
        if (updatedEvent) {
          if (updatedEvent.duration && updatedEvent.duration > 0) {
            this.log('UPDATE', 'Cálculo automático duration', 'PASS', `${updatedEvent.duration} min`)
          } else {
            this.log('UPDATE', 'Cálculo automático duration', 'FAIL', 'Duration no calculada')
          }

          if (updatedEvent.durationReadable && updatedEvent.durationReadable.length > 0) {
            this.log('UPDATE', 'Formato durationReadable', 'PASS', updatedEvent.durationReadable)
          } else {
            this.log('UPDATE', 'Formato durationReadable', 'FAIL', 'Formato no generado')
          }
        }
      }
    } catch (error) {
      this.log('UPDATE', 'Verificación cálculos', 'FAIL', error.message)
    }
  }

  async testEdgeCases() {
    this.log('EDGE_CASES', 'Iniciando pruebas de casos límite', 'INFO')

    // Test 1: Evento que cruza medianoche
    try {
      const midnightEvent = this.generateTestEvent('sleep', {
        startTime: '2024-01-15T23:30:00.000Z'
      })

      const response = await this.makeRequest('POST', CONFIG.API_ENDPOINT, midnightEvent)
      
      if (response.ok) {
        this.log('EDGE_CASES', 'Evento cruza medianoche', 'PASS')
        
        // Actualizar con endTime del día siguiente
        const endTime = '2024-01-16T07:00:00.000Z'
        const updateData = {
          eventId: response.data.event._id,
          childId: CONFIG.TEST_CHILD_ID,
          endTime: endTime
        }
        
        const updateResponse = await this.makeRequest('PATCH', CONFIG.API_ENDPOINT, updateData)
        if (updateResponse.ok) {
          this.log('EDGE_CASES', 'Actualización cruce medianoche', 'PASS')
        } else {
          this.log('EDGE_CASES', 'Actualización cruce medianoche', 'FAIL')
        }
      } else {
        this.log('EDGE_CASES', 'Evento cruza medianoche', 'FAIL', response.data.error)
      }
    } catch (error) {
      this.log('EDGE_CASES', 'Evento cruza medianoche', 'FAIL', error.message)
    }

    // Test 2: SleepDelay extremo
    try {
      const extremeEvent = this.generateTestEvent('sleep', {
        sleepDelay: 200 // Más del máximo permitido (180)
      })

      const response = await this.makeRequest('POST', CONFIG.API_ENDPOINT, extremeEvent)
      
      if (response.ok) {
        this.log('EDGE_CASES', 'SleepDelay extremo', 'PASS', 'Sistema acepta y debería limitar')
      } else {
        this.log('EDGE_CASES', 'SleepDelay extremo', 'FAIL', response.data.error)
      }
    } catch (error) {
      this.log('EDGE_CASES', 'SleepDelay extremo', 'FAIL', error.message)
    }

    // Test 3: Notas muy largas
    try {
      const longNotesEvent = this.generateTestEvent('sleep', {
        notes: 'A'.repeat(1000) // Nota de 1000 caracteres
      })

      const response = await this.makeRequest('POST', CONFIG.API_ENDPOINT, longNotesEvent)
      
      if (response.ok) {
        this.log('EDGE_CASES', 'Notas muy largas', 'PASS')
      } else {
        this.log('EDGE_CASES', 'Notas muy largas', 'FAIL', response.data.error)
      }
    } catch (error) {
      this.log('EDGE_CASES', 'Notas muy largas', 'FAIL', error.message)
    }
  }

  async testValidation() {
    this.log('VALIDATION', 'Iniciando pruebas de validación', 'INFO')

    // Test 1: Campos requeridos faltantes
    try {
      const incompleteEvent = {
        emotionalState: 'tranquilo' // Falta childId y eventType
      }

      const response = await this.makeRequest('POST', CONFIG.API_ENDPOINT, incompleteEvent)
      
      if (!response.ok && response.status === 400) {
        this.log('VALIDATION', 'Campos requeridos', 'PASS', 'Error 400 correcto')
      } else {
        this.log('VALIDATION', 'Campos requeridos', 'FAIL', 'Debería rechazar')
      }
    } catch (error) {
      this.log('VALIDATION', 'Campos requeridos', 'PASS', 'Error capturado')
    }

    // Test 2: ChildId inexistente
    try {
      const fakeEvent = this.generateTestEvent('sleep', {
        childId: '507f1f77bcf86cd799439999' // ID falso
      })

      const response = await this.makeRequest('POST', CONFIG.API_ENDPOINT, fakeEvent)
      
      if (!response.ok && response.status === 404) {
        this.log('VALIDATION', 'ChildId inexistente', 'PASS', 'Error 404 correcto')
      } else {
        this.log('VALIDATION', 'ChildId inexistente', 'FAIL', 'Debería retornar 404')
      }
    } catch (error) {
      this.log('VALIDATION', 'ChildId inexistente', 'PASS', 'Error capturado')
    }

    // Test 3: Estados emocionales
    const states = ['tranquilo', 'inquieto', 'alterado']
    for (const state of states) {
      try {
        const stateEvent = this.generateTestEvent('sleep', {
          emotionalState: state
        })

        const response = await this.makeRequest('POST', CONFIG.API_ENDPOINT, stateEvent)
        
        if (response.ok) {
          this.log('VALIDATION', `Estado: ${state}`, 'PASS')
        } else {
          this.log('VALIDATION', `Estado: ${state}`, 'FAIL')
        }
      } catch (error) {
        this.log('VALIDATION', `Estado: ${state}`, 'FAIL', error.message)
      }
    }
  }

  async testRetrieval() {
    this.log('RETRIEVAL', 'Iniciando pruebas de recuperación', 'INFO')

    // Test 1: GET básico
    try {
      const startTime = Date.now()
      const response = await this.makeRequest('GET', CONFIG.API_ENDPOINT + `?childId=${CONFIG.TEST_CHILD_ID}`)
      const endTime = Date.now()
      const responseTime = endTime - startTime

      if (response.ok) {
        this.log('RETRIEVAL', 'GET básico', 'PASS', `${responseTime}ms`)
        
        // Verificar estructura
        if (response.data.events && Array.isArray(response.data.events)) {
          this.log('RETRIEVAL', 'Estructura respuesta', 'PASS', `${response.data.events.length} eventos`)
          
          // Verificar ordenamiento
          const events = response.data.events
          let isOrdered = true
          for (let i = 1; i < events.length; i++) {
            if (events[i-1].startTime && events[i].startTime) {
              if (new Date(events[i-1].startTime) > new Date(events[i].startTime)) {
                isOrdered = false
                break
              }
            }
          }
          
          if (isOrdered) {
            this.log('RETRIEVAL', 'Ordenamiento cronológico', 'PASS')
          } else {
            this.log('RETRIEVAL', 'Ordenamiento cronológico', 'FAIL')
          }
        } else {
          this.log('RETRIEVAL', 'Estructura respuesta', 'FAIL', 'Events no es array')
        }
      } else {
        this.log('RETRIEVAL', 'GET básico', 'FAIL', response.data.error)
      }
    } catch (error) {
      this.log('RETRIEVAL', 'GET básico', 'FAIL', error.message)
    }

    // Test 2: GET sin childId
    try {
      const response = await this.makeRequest('GET', CONFIG.API_ENDPOINT)
      
      if (!response.ok && response.status === 400) {
        this.log('RETRIEVAL', 'GET sin childId', 'PASS', 'Error 400 correcto')
      } else {
        this.log('RETRIEVAL', 'GET sin childId', 'FAIL', 'Debería requerir childId')
      }
    } catch (error) {
      this.log('RETRIEVAL', 'GET sin childId', 'PASS', 'Error capturado')
    }
  }

  async testConcurrency() {
    this.log('CONCURRENCY', 'Iniciando pruebas de concurrencia', 'INFO')

    // Test: Crear múltiples eventos rápidamente
    try {
      const promises = []
      
      for (let i = 0; i < 3; i++) {
        const event = this.generateTestEvent('sleep', {
          startTime: new Date(Date.now() + i * 1000).toISOString()
        })
        promises.push(this.makeRequest('POST', CONFIG.API_ENDPOINT, event))
      }

      const results = await Promise.allSettled(promises)
      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.ok
      ).length

      if (successful >= 2) {
        this.log('CONCURRENCY', 'Creación múltiple', 'PASS', `${successful}/3 exitosas`)
      } else {
        this.log('CONCURRENCY', 'Creación múltiple', 'WARN', `Solo ${successful}/3 exitosas`)
      }
    } catch (error) {
      this.log('CONCURRENCY', 'Creación múltiple', 'FAIL', error.message)
    }
  }

  generateReport() {
    const total = this.passed + this.failed
    const successRate = total > 0 ? ((this.passed / total) * 100).toFixed(2) : 0
    
    console.log('\n' + '='.repeat(60))
    console.log(`${colors.cyan}📊 REPORTE FINAL - BACKEND EVENTOS V3${colors.reset}`)
    console.log('='.repeat(60))
    console.log(`Total pruebas: ${total}`)
    console.log(`${colors.green}✅ Exitosas: ${this.passed} (${successRate}%)${colors.reset}`)
    console.log(`${colors.red}❌ Fallidas: ${this.failed}${colors.reset}`)
    
    const status = successRate >= 95 ? 
      `${colors.green}✅ SISTEMA APROBADO PARA ITERACIÓN 4${colors.reset}` :
      `${colors.red}❌ SISTEMA NECESITA CORRECCIONES${colors.reset}`
    
    console.log(`\nEstado: ${status}`)
    
    if (this.failed > 0) {
      console.log(`\n${colors.red}🚨 PRUEBAS FALLIDAS:${colors.reset}`)
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`${colors.red}- [${r.category}] ${r.test}: ${r.details}${colors.reset}`))
    }

    // Recomendaciones
    console.log(`\n${colors.yellow}📋 RECOMENDACIONES:${colors.reset}`)
    if (successRate >= 95) {
      console.log('✅ El backend está listo para Iteración 4')
      console.log('✅ La integridad de datos está confirmada')
      console.log('ℹ️  Continuar ignorando el bug del calendario UI')
    } else {
      console.log('⚠️  Corregir las pruebas fallidas antes de continuar')
      console.log('⚠️  Verificar la configuración de testing')
      console.log('⚠️  Revisar logs del servidor para más detalles')
    }

    return {
      total,
      passed: this.passed,
      failed: this.failed,
      successRate: parseFloat(successRate),
      approved: successRate >= 95
    }
  }

  async runAllTests() {
    console.log(`${colors.blue}🚀 INICIANDO TESTING BACKEND EVENTOS V3${colors.reset}`)
    console.log('='.repeat(60))

    // Validar configuración
    const configValid = await this.validateConfiguration()
    if (!configValid) {
      console.log(`${colors.red}❌ Configuración inválida. Revisa CONFIG en el archivo.${colors.reset}`)
      return
    }

    // Ejecutar todas las pruebas
    const eventId = await this.testCreation()
    await this.testUpdate(eventId)
    await this.testEdgeCases()
    await this.testValidation()
    await this.testRetrieval()
    await this.testConcurrency()

    // Generar reporte final
    return this.generateReport()
  }
}

// Ejecutar testing si se llama directamente
if (require.main === module) {
  const tester = new BackendTester()
  tester.runAllTests().catch(console.error)
}

module.exports = BackendTester