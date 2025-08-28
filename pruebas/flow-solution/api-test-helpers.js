/**
 * 🔌 API TEST HELPERS - Happy Dreamers
 * 
 * Helpers para testing usando API calls en lugar de MongoDB directo
 * Prioridad: 70% - IMPORTANTE
 */

const fetch = require('node-fetch')

class ApiTestClient {
  constructor(baseUrl = 'http://localhost:3000', authToken = null) {
    this.baseUrl = baseUrl
    this.authToken = authToken
    this.cookies = ''
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalTime: 0
    }
  }

  /**
   * 🔐 Simula login y obtiene token/cookies
   */
  async login(email, password) {
    console.log(`🔐 Iniciando sesión como ${email}...`)
    
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      })
      
      // Capturar cookies de la respuesta
      const cookies = response.headers.get('set-cookie')
      if (cookies) {
        this.cookies = cookies
      }
      
      const data = await response.json()
      
      if (response.ok && data.token) {
        this.authToken = data.token
        console.log('✅ Login exitoso')
        return { success: true, token: data.token }
      }
      
      // Si no hay token pero hay cookies, también es válido (NextAuth)
      if (cookies) {
        console.log('✅ Login exitoso (sesión basada en cookies)')
        return { success: true, cookies }
      }
      
      console.log('❌ Login fallido:', data.error || 'Credenciales inválidas')
      return { success: false, error: data.error }
      
    } catch (error) {
      console.error('❌ Error en login:', error.message)
      return { success: false, error: error.message }
    }
  }

  /**
   * 🔨 Helper genérico para requests
   */
  async makeRequest(endpoint, options = {}) {
    const startTime = Date.now()
    this.stats.totalRequests++
    
    const url = `${this.baseUrl}${endpoint}`
    
    // Configurar headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    }
    
    // Agregar autenticación si existe
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`
    }
    
    if (this.cookies) {
      headers['Cookie'] = this.cookies
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
      })
      
      const responseTime = Date.now() - startTime
      this.stats.totalTime += responseTime
      
      let data
      const contentType = response.headers.get('content-type')
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json()
      } else {
        data = await response.text()
      }
      
      if (response.ok) {
        this.stats.successfulRequests++
        return {
          success: true,
          status: response.status,
          data,
          responseTime
        }
      } else {
        this.stats.failedRequests++
        return {
          success: false,
          status: response.status,
          error: data.error || data.message || 'Request failed',
          data,
          responseTime
        }
      }
      
    } catch (error) {
      this.stats.failedRequests++
      const responseTime = Date.now() - startTime
      
      return {
        success: false,
        error: error.message,
        responseTime
      }
    }
  }

  /**
   * 👶 Crear niño con survey
   */
  async createChild(childData) {
    console.log(`👶 Creando niño ${childData.firstName}...`)
    
    const result = await this.makeRequest('/api/children', {
      method: 'POST',
      body: childData
    })
    
    if (result.success) {
      console.log(`✅ Niño creado con ID: ${result.data.id}`)
    } else {
      console.log(`❌ Error creando niño: ${result.error}`)
    }
    
    return result
  }

  /**
   * 👶 Obtener niños
   */
  async getChildren() {
    console.log('📋 Obteniendo lista de niños...')
    
    const result = await this.makeRequest('/api/children', {
      method: 'GET'
    })
    
    if (result.success) {
      console.log(`✅ ${result.data.children?.length || 0} niños encontrados`)
    }
    
    return result
  }

  /**
   * 👶 Obtener un niño específico
   */
  async getChild(childId) {
    const result = await this.makeRequest(`/api/children?id=${childId}`, {
      method: 'GET'
    })
    
    return result
  }

  /**
   * 📅 Registrar evento
   */
  async createEvent(eventData) {
    const result = await this.makeRequest('/api/events', {
      method: 'POST',
      body: eventData
    })
    
    if (result.success) {
      console.log(`✅ Evento ${eventData.eventType} registrado`)
    } else {
      console.log(`❌ Error registrando evento: ${result.error}`)
    }
    
    return result
  }

  /**
   * 📅 Obtener eventos
   */
  async getEvents(childId, startDate, endDate) {
    let url = '/api/events'
    const params = []
    
    if (childId) params.push(`childId=${childId}`)
    if (startDate) params.push(`startDate=${startDate}`)
    if (endDate) params.push(`endDate=${endDate}`)
    
    if (params.length > 0) {
      url += '?' + params.join('&')
    }
    
    const result = await this.makeRequest(url, {
      method: 'GET'
    })
    
    return result
  }

  /**
   * 📋 Generar plan (requiere admin)
   */
  async generatePlan(userId, childId, planType, reportId = null) {
    console.log(`📋 Generando plan ${planType}...`)
    
    const body = { userId, childId, planType }
    if (reportId) body.reportId = reportId
    
    const result = await this.makeRequest('/api/consultas/plans', {
      method: 'POST',
      body
    })
    
    if (result.success) {
      console.log(`✅ Plan ${result.data.plan?.planVersion} generado`)
    } else {
      console.log(`❌ Error generando plan: ${result.error}`)
    }
    
    return result
  }

  /**
   * 📋 Obtener planes
   */
  async getPlans(childId, userId) {
    const result = await this.makeRequest(`/api/consultas/plans?childId=${childId}&userId=${userId}`, {
      method: 'GET'
    })
    
    if (result.success) {
      console.log(`✅ ${result.data.plans?.length || 0} planes encontrados`)
    }
    
    return result
  }

  /**
   * 📋 Validar si se puede generar plan
   */
  async validatePlanGeneration(userId, childId, planType) {
    const result = await this.makeRequest('/api/consultas/plans', {
      method: 'PUT',
      body: { userId, childId, planType }
    })
    
    return result
  }

  /**
   * 🩺 Analizar consulta
   */
  async analyzeConsultation(userId, childId, transcript) {
    console.log('🩺 Analizando transcript de consulta...')
    
    const result = await this.makeRequest('/api/consultas/analyze', {
      method: 'POST',
      body: { userId, childId, transcript }
    })
    
    if (result.success) {
      console.log(`✅ Análisis completado: ${result.data.reportId}`)
    } else {
      console.log(`❌ Error en análisis: ${result.error}`)
    }
    
    return result
  }

  /**
   * 🗑️ Eliminar niño
   */
  async deleteChild(childId) {
    console.log(`🗑️ Eliminando niño ${childId}...`)
    
    const result = await this.makeRequest(`/api/children?id=${childId}`, {
      method: 'DELETE'
    })
    
    if (result.success) {
      console.log('✅ Niño eliminado correctamente')
    } else {
      console.log(`❌ Error eliminando niño: ${result.error}`)
    }
    
    return result
  }

  /**
   * 📊 Obtener estadísticas de requests
   */
  getStats() {
    const avgResponseTime = this.stats.totalRequests > 0 
      ? (this.stats.totalTime / this.stats.totalRequests).toFixed(2)
      : 0
    
    return {
      ...this.stats,
      avgResponseTime,
      successRate: this.stats.totalRequests > 0 
        ? ((this.stats.successfulRequests / this.stats.totalRequests) * 100).toFixed(2) + '%'
        : '0%'
    }
  }

  /**
   * 📊 Imprimir estadísticas
   */
  printStats() {
    const stats = this.getStats()
    
    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 ESTADÍSTICAS DE API TESTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Requests: ${stats.totalRequests}
Exitosas: ${stats.successfulRequests}
Fallidas: ${stats.failedRequests}
Tasa de Éxito: ${stats.successRate}
Tiempo Promedio: ${stats.avgResponseTime}ms
Tiempo Total: ${stats.totalTime}ms
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `)
  }
}

/**
 * 🔄 Helper para simular flujo completo con APIs
 */
class ApiFlowSimulator {
  constructor(baseUrl) {
    this.parentClient = new ApiTestClient(baseUrl)
    this.adminClient = new ApiTestClient(baseUrl)
    this.childId = null
    this.planIds = []
    this.reportId = null
  }

  async setupAuth(parentEmail, parentPassword, adminEmail, adminPassword) {
    console.log('\n🔐 Configurando autenticación...')
    
    // Login como padre
    const parentLogin = await this.parentClient.login(parentEmail, parentPassword)
    if (!parentLogin.success) {
      throw new Error('Failed to login as parent')
    }
    
    // Login como admin
    const adminLogin = await this.adminClient.login(adminEmail, adminPassword)
    if (!adminLogin.success) {
      // Si no hay cuenta admin real, usar el mismo token para simular
      console.warn('⚠️  No se pudo autenticar como admin, usando modo simulación')
      this.adminClient.authToken = this.parentClient.authToken
    }
    
    console.log('✅ Autenticación configurada\n')
    
    return true
  }

  async createChildWithSurvey(childData) {
    const result = await this.parentClient.createChild(childData)
    
    if (result.success) {
      this.childId = result.data.id
      return this.childId
    }
    
    throw new Error(`Failed to create child: ${result.error}`)
  }

  async registerEvents(events) {
    const results = []
    
    for (const event of events) {
      const result = await this.parentClient.createEvent({
        ...event,
        childId: this.childId
      })
      results.push(result)
      
      // Pequeña pausa para no sobrecargar
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    const successful = results.filter(r => r.success).length
    console.log(`📅 ${successful}/${events.length} eventos registrados exitosamente`)
    
    return results
  }

  async generatePlan(planType, reportId = null) {
    // Obtener parent ID del niño
    const childResult = await this.parentClient.getChild(this.childId)
    if (!childResult.success) {
      throw new Error('Cannot get child data')
    }
    
    const parentId = childResult.data.parentId
    
    // Generar plan como admin
    const result = await this.adminClient.generatePlan(
      parentId,
      this.childId,
      planType,
      reportId
    )
    
    if (result.success) {
      this.planIds.push(result.data.planId)
      return result.data
    }
    
    throw new Error(`Failed to generate plan: ${result.error}`)
  }

  async analyzeConsultation(transcript) {
    const childResult = await this.parentClient.getChild(this.childId)
    if (!childResult.success) {
      throw new Error('Cannot get child data')
    }
    
    const parentId = childResult.data.parentId
    
    const result = await this.adminClient.analyzeConsultation(
      parentId,
      this.childId,
      transcript
    )
    
    if (result.success) {
      this.reportId = result.data.reportId
      return result.data
    }
    
    throw new Error(`Failed to analyze consultation: ${result.error}`)
  }

  async cleanup() {
    if (this.childId) {
      await this.parentClient.deleteChild(this.childId)
    }
  }

  printStats() {
    console.log('\n📊 ESTADÍSTICAS CONSOLIDADAS:')
    console.log('\nCliente Padre:')
    this.parentClient.printStats()
    console.log('\nCliente Admin:')
    this.adminClient.printStats()
  }
}

// Exportar
module.exports = {
  ApiTestClient,
  ApiFlowSimulator
}