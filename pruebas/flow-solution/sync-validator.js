/**
 * 🔄 SYNC VALIDATOR - Happy Dreamers
 * 
 * Valida y corrige sincronización entre sistema dual
 * Prioridad: 90% - CRÍTICO
 */

const { MongoClient, ObjectId } = require('mongodb')

class SyncValidator {
  constructor(mongoUri, dbName) {
    this.mongoUri = mongoUri
    this.dbName = dbName
    this.client = null
    this.db = null
    this.report = {
      totalChildren: 0,
      syncedChildren: 0,
      unsyncedChildren: 0,
      totalDiscrepancies: 0,
      fixedDiscrepancies: 0,
      details: []
    }
  }

  async connect() {
    if (!this.client) {
      this.client = new MongoClient(this.mongoUri)
      await this.client.connect()
      this.db = this.client.db(this.dbName)
    }
    return this.db
  }

  async disconnect() {
    if (this.client) {
      await this.client.close()
      this.client = null
      this.db = null
    }
  }

  /**
   * 🔍 Analiza sincronización de un niño específico
   */
  async analyzeChildSync(childId) {
    const db = await this.connect()
    const childObjectId = typeof childId === 'string' ? new ObjectId(childId) : childId
    
    // Obtener niño con eventos embebidos
    const child = await db.collection('children').findOne({ _id: childObjectId })
    
    if (!child) {
      return {
        exists: false,
        error: 'Child not found'
      }
    }
    
    const embeddedEvents = child.events || []
    
    // Obtener eventos de analytics
    const analyticsEvents = await db.collection('events')
      .find({ childId: childObjectId })
      .toArray()
    
    // Análisis detallado
    const analysis = {
      childId: childObjectId.toString(),
      childName: `${child.firstName} ${child.lastName}`,
      embedded: {
        count: embeddedEvents.length,
        eventTypes: this.countEventTypes(embeddedEvents),
        dateRange: this.getDateRange(embeddedEvents)
      },
      analytics: {
        count: analyticsEvents.length,
        eventTypes: this.countEventTypes(analyticsEvents),
        dateRange: this.getDateRange(analyticsEvents)
      },
      synced: embeddedEvents.length === analyticsEvents.length,
      discrepancy: Math.abs(embeddedEvents.length - analyticsEvents.length),
      syncPercentage: this.calculateSyncPercentage(embeddedEvents.length, analyticsEvents.length)
    }
    
    // Detectar eventos faltantes
    if (!analysis.synced) {
      analysis.issues = this.detectSyncIssues(embeddedEvents, analyticsEvents)
    }
    
    return analysis
  }

  /**
   * 🔍 Detecta problemas específicos de sincronización
   */
  detectSyncIssues(embeddedEvents, analyticsEvents) {
    const issues = {
      missingInAnalytics: [],
      missingInEmbedded: [],
      duplicates: []
    }
    
    // Crear mapas de eventos por tiempo y tipo
    const embeddedMap = new Map()
    const analyticsMap = new Map()
    
    embeddedEvents.forEach(event => {
      const key = `${event.eventType}_${new Date(event.startTime).toISOString()}`
      embeddedMap.set(key, event)
    })
    
    analyticsEvents.forEach(event => {
      const key = `${event.eventType}_${new Date(event.startTime).toISOString()}`
      if (analyticsMap.has(key)) {
        issues.duplicates.push(event)
      }
      analyticsMap.set(key, event)
    })
    
    // Buscar faltantes en analytics
    embeddedMap.forEach((event, key) => {
      if (!analyticsMap.has(key)) {
        issues.missingInAnalytics.push(event)
      }
    })
    
    // Buscar faltantes en embedded (no debería pasar)
    analyticsMap.forEach((event, key) => {
      if (!embeddedMap.has(key)) {
        issues.missingInEmbedded.push(event)
      }
    })
    
    return issues
  }

  /**
   * 🔧 Corrige sincronización de un niño
   */
  async fixChildSync(childId, strategy = 'embedded-to-analytics') {
    console.log(`\n🔧 Corrigiendo sincronización para niño ${childId}...`)
    console.log(`Estrategia: ${strategy}`)
    
    const db = await this.connect()
    const childObjectId = typeof childId === 'string' ? new ObjectId(childId) : childId
    
    const analysis = await this.analyzeChildSync(childObjectId)
    
    if (!analysis.synced) {
      console.log(`❌ Desincronización detectada: ${analysis.discrepancy} eventos de diferencia`)
      
      if (strategy === 'embedded-to-analytics') {
        // Limpiar analytics y resincronizar desde embedded
        await db.collection('events').deleteMany({ childId: childObjectId })
        
        const child = await db.collection('children').findOne({ _id: childObjectId })
        const embeddedEvents = child.events || []
        
        if (embeddedEvents.length > 0) {
          const analyticsEvents = embeddedEvents.map(event => ({
            ...event,
            childId: childObjectId,
            parentId: child.parentId,
            _id: new ObjectId(),
            createdAt: event.createdAt || new Date(),
            updatedAt: new Date()
          }))
          
          await db.collection('events').insertMany(analyticsEvents)
          console.log(`✅ Sincronizados ${analyticsEvents.length} eventos desde embedded a analytics`)
        }
        
      } else if (strategy === 'analytics-to-embedded') {
        // Actualizar embedded desde analytics
        const analyticsEvents = await db.collection('events')
          .find({ childId: childObjectId })
          .toArray()
        
        const embeddedFormat = analyticsEvents.map(event => {
          const { _id, childId, parentId, createdAt, updatedAt, ...eventData } = event
          return {
            ...eventData,
            _id: new ObjectId()
          }
        })
        
        await db.collection('children').updateOne(
          { _id: childObjectId },
          { $set: { events: embeddedFormat } }
        )
        
        console.log(`✅ Sincronizados ${embeddedFormat.length} eventos desde analytics a embedded`)
        
      } else if (strategy === 'merge') {
        // Merge ambos sistemas (más complejo)
        const child = await db.collection('children').findOne({ _id: childObjectId })
        const embeddedEvents = child.events || []
        const analyticsEvents = await db.collection('events')
          .find({ childId: childObjectId })
          .toArray()
        
        // Crear conjunto único de eventos
        const allEvents = new Map()
        
        // Agregar embedded
        embeddedEvents.forEach(event => {
          const key = `${event.eventType}_${new Date(event.startTime).toISOString()}`
          allEvents.set(key, event)
        })
        
        // Agregar analytics (sin duplicar)
        analyticsEvents.forEach(event => {
          const key = `${event.eventType}_${new Date(event.startTime).toISOString()}`
          if (!allEvents.has(key)) {
            allEvents.set(key, event)
          }
        })
        
        const mergedEvents = Array.from(allEvents.values())
        
        // Actualizar ambos sistemas
        await db.collection('children').updateOne(
          { _id: childObjectId },
          { $set: { events: mergedEvents } }
        )
        
        await db.collection('events').deleteMany({ childId: childObjectId })
        
        if (mergedEvents.length > 0) {
          const analyticsFormat = mergedEvents.map(event => ({
            ...event,
            childId: childObjectId,
            parentId: child.parentId,
            _id: new ObjectId()
          }))
          
          await db.collection('events').insertMany(analyticsFormat)
        }
        
        console.log(`✅ Merge completado: ${mergedEvents.length} eventos totales`)
      }
      
      // Verificar corrección
      const postAnalysis = await this.analyzeChildSync(childObjectId)
      
      if (postAnalysis.synced) {
        console.log('✅ Sincronización corregida exitosamente')
        this.report.fixedDiscrepancies++
        return { success: true, postAnalysis }
      } else {
        console.log('⚠️  Sincronización parcialmente corregida')
        return { success: false, postAnalysis }
      }
      
    } else {
      console.log('✅ El niño ya está sincronizado')
      return { success: true, analysis }
    }
  }

  /**
   * 🔍 Análisis completo del sistema
   */
  async analyzeSystemSync() {
    console.log('\n🔍 ANALIZANDO SINCRONIZACIÓN DEL SISTEMA COMPLETO...\n')
    
    const db = await this.connect()
    
    // Obtener todos los niños
    const children = await db.collection('children').find({}).toArray()
    this.report.totalChildren = children.length
    
    console.log(`📊 Analizando ${children.length} niños...\n`)
    
    for (const child of children) {
      const analysis = await this.analyzeChildSync(child._id)
      
      if (analysis.synced) {
        this.report.syncedChildren++
        console.log(`✅ ${analysis.childName}: SINCRONIZADO (${analysis.embedded.count} eventos)`)
      } else {
        this.report.unsyncedChildren++
        this.report.totalDiscrepancies += analysis.discrepancy
        console.log(`❌ ${analysis.childName}: DESINCRONIZADO (${analysis.embedded.count} vs ${analysis.analytics.count})`)
        
        this.report.details.push({
          childName: analysis.childName,
          embedded: analysis.embedded.count,
          analytics: analysis.analytics.count,
          discrepancy: analysis.discrepancy,
          syncPercentage: analysis.syncPercentage
        })
      }
    }
    
    this.printSystemReport()
    
    return this.report
  }

  /**
   * 🔧 Corregir todo el sistema
   */
  async fixSystemSync(strategy = 'embedded-to-analytics') {
    console.log('\n🔧 INICIANDO CORRECCIÓN MASIVA DE SINCRONIZACIÓN...\n')
    console.log(`Estrategia: ${strategy}\n`)
    
    const db = await this.connect()
    const children = await db.collection('children').find({}).toArray()
    
    let fixed = 0
    let failed = 0
    
    for (const child of children) {
      const result = await this.fixChildSync(child._id, strategy)
      
      if (result.success) {
        fixed++
      } else {
        failed++
      }
      
      // Pequeña pausa para no sobrecargar
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 CORRECCIÓN MASIVA COMPLETADA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Niños corregidos: ${fixed}
Niños con errores: ${failed}
Total procesados: ${children.length}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `)
    
    // Análisis post-corrección
    await this.analyzeSystemSync()
    
    return {
      fixed,
      failed,
      total: children.length
    }
  }

  /**
   * 📊 Funciones auxiliares
   */
  countEventTypes(events) {
    const types = {}
    events.forEach(event => {
      const type = event.eventType || event.type || 'unknown'
      types[type] = (types[type] || 0) + 1
    })
    return types
  }

  getDateRange(events) {
    if (events.length === 0) return { start: null, end: null }
    
    const dates = events.map(e => new Date(e.startTime || e.date || e.createdAt))
    const sorted = dates.sort((a, b) => a - b)
    
    return {
      start: sorted[0]?.toISOString().split('T')[0],
      end: sorted[sorted.length - 1]?.toISOString().split('T')[0]
    }
  }

  calculateSyncPercentage(embedded, analytics) {
    if (embedded === 0 && analytics === 0) return 100
    if (embedded === 0 || analytics === 0) return 0
    
    const min = Math.min(embedded, analytics)
    const max = Math.max(embedded, analytics)
    
    return ((min / max) * 100).toFixed(1)
  }

  /**
   * 📊 Imprimir reporte del sistema
   */
  printSystemReport() {
    const syncRate = this.report.totalChildren > 0
      ? ((this.report.syncedChildren / this.report.totalChildren) * 100).toFixed(1)
      : 0
    
    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 REPORTE DE SINCRONIZACIÓN DEL SISTEMA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Niños: ${this.report.totalChildren}
Sincronizados: ${this.report.syncedChildren} (${syncRate}%)
Desincronizados: ${this.report.unsyncedChildren}
Total Discrepancias: ${this.report.totalDiscrepancies} eventos
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${this.report.unsyncedChildren > 0 ? '⚠️  PROBLEMAS DETECTADOS:' : '✅ SISTEMA COMPLETAMENTE SINCRONIZADO'}
`)
    
    if (this.report.details.length > 0) {
      console.log('Detalles de desincronización:')
      this.report.details.forEach(detail => {
        console.log(`  • ${detail.childName}: ${detail.embedded} vs ${detail.analytics} (${detail.syncPercentage}% sync)`)
      })
      console.log('')
    }
    
    if (this.report.unsyncedChildren > 0) {
      console.log('📋 RECOMENDACIONES:')
      console.log('  1. Ejecutar fixSystemSync() para corregir automáticamente')
      console.log('  2. Revisar logs de sincronización para errores')
      console.log('  3. Implementar validación en cada evento nuevo')
      console.log('')
    }
  }

  /**
   * 🔄 Monitor en tiempo real
   */
  async monitorRealTimeSync(intervalSeconds = 5, maxIterations = 10) {
    console.log(`\n🔄 INICIANDO MONITOR DE SINCRONIZACIÓN EN TIEMPO REAL`)
    console.log(`Intervalo: ${intervalSeconds} segundos\n`)
    
    let iteration = 0
    
    const monitor = setInterval(async () => {
      iteration++
      console.log(`\n--- Iteración ${iteration}/${maxIterations} ---`)
      
      const report = await this.analyzeSystemSync()
      
      if (report.unsyncedChildren === 0) {
        console.log('✅ Sistema completamente sincronizado!')
        clearInterval(monitor)
        return
      }
      
      if (iteration >= maxIterations) {
        console.log('⏱️ Monitor finalizado por límite de iteraciones')
        clearInterval(monitor)
      }
      
    }, intervalSeconds * 1000)
    
    return monitor
  }
}

/**
 * 🚀 Función helper para validación rápida
 */
async function quickSyncCheck(mongoUri, dbName, childId = null) {
  const validator = new SyncValidator(mongoUri, dbName)
  
  try {
    if (childId) {
      // Verificar un niño específico
      const analysis = await validator.analyzeChildSync(childId)
      console.log('\n📊 Análisis de sincronización:')
      console.log(JSON.stringify(analysis, null, 2))
      return analysis
    } else {
      // Verificar todo el sistema
      const report = await validator.analyzeSystemSync()
      return report
    }
  } finally {
    await validator.disconnect()
  }
}

// Exportar
module.exports = {
  SyncValidator,
  quickSyncCheck
}