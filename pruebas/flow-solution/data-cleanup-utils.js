/**
 * 🧹 DATA CLEANUP UTILITIES - Happy Dreamers
 * 
 * Previene y limpia la contaminación de datos (90.9% legacy data issue)
 * Prioridad: 95% - CRÍTICO
 */

const { MongoClient, ObjectId } = require('mongodb')

class DataCleanupManager {
  constructor(mongoUri, dbName) {
    this.mongoUri = mongoUri
    this.dbName = dbName
    this.client = null
    this.db = null
    this.stats = {
      orphanedEvents: 0,
      validEvents: 0,
      syncDiscrepancies: 0,
      cleanedEvents: 0
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
   * 🔍 Detecta eventos huérfanos en la colección analytics
   */
  async detectOrphanedEvents() {
    console.log('🔍 Detectando eventos huérfanos...')
    
    const db = await this.connect()
    
    // Obtener todos los IDs de niños válidos
    const validChildren = await db.collection('children').find({}).toArray()
    const validChildIds = validChildren.map(c => c._id.toString())
    
    console.log(`✅ Niños válidos encontrados: ${validChildIds.length}`)
    
    // Buscar eventos en analytics
    const analyticsEvents = await db.collection('events').find({}).toArray()
    
    const orphanedEvents = []
    const validEvents = []
    
    for (const event of analyticsEvents) {
      const childIdStr = event.childId?.toString()
      
      if (!childIdStr || !validChildIds.includes(childIdStr)) {
        orphanedEvents.push(event)
      } else {
        validEvents.push(event)
      }
    }
    
    this.stats.orphanedEvents = orphanedEvents.length
    this.stats.validEvents = validEvents.length
    
    const contaminationRate = (orphanedEvents.length / analyticsEvents.length * 100).toFixed(1)
    
    console.log(`
📊 ANÁLISIS DE CONTAMINACIÓN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total eventos en analytics: ${analyticsEvents.length}
Eventos válidos: ${validEvents.length} (${(100 - parseFloat(contaminationRate)).toFixed(1)}%)
Eventos huérfanos: ${orphanedEvents.length} (${contaminationRate}%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━
${contaminationRate > 50 ? '🚨 CONTAMINACIÓN CRÍTICA DETECTADA' : '✅ Contaminación bajo control'}
    `)
    
    return {
      orphanedEvents,
      validEvents,
      contaminationRate: parseFloat(contaminationRate),
      validChildIds
    }
  }

  /**
   * 🧹 Limpia eventos huérfanos de la colección analytics
   */
  async cleanOrphanedEvents(dryRun = true) {
    console.log(`\n🧹 ${dryRun ? 'SIMULANDO' : 'EJECUTANDO'} limpieza de eventos huérfanos...`)
    
    const { orphanedEvents, contaminationRate } = await this.detectOrphanedEvents()
    
    if (orphanedEvents.length === 0) {
      console.log('✅ No hay eventos huérfanos para limpiar')
      return { cleaned: 0 }
    }
    
    if (dryRun) {
      console.log(`
⚠️  MODO SIMULACIÓN - No se eliminará nada
Se eliminarían ${orphanedEvents.length} eventos huérfanos
Liberaría ${contaminationRate}% de contaminación
      `)
      return { cleaned: 0, wouldClean: orphanedEvents.length }
    }
    
    // Ejecutar limpieza real
    const db = await this.connect()
    const orphanedIds = orphanedEvents.map(e => e._id)
    
    const deleteResult = await db.collection('events').deleteMany({
      _id: { $in: orphanedIds }
    })
    
    this.stats.cleanedEvents = deleteResult.deletedCount
    
    console.log(`
✅ LIMPIEZA COMPLETADA:
━━━━━━━━━━━━━━━━━━━━━━━
Eventos eliminados: ${deleteResult.deletedCount}
Contaminación reducida: ${contaminationRate}% → 0%
━━━━━━━━━━━━━━━━━━━━━━━
    `)
    
    return { cleaned: deleteResult.deletedCount }
  }

  /**
   * 🔄 Verifica sincronización entre sistemas dual
   */
  async verifySyncConsistency(childId) {
    console.log(`\n🔄 Verificando sincronización para niño ${childId}...`)
    
    const db = await this.connect()
    
    // Obtener eventos del array embebido
    const child = await db.collection('children').findOne({
      _id: typeof childId === 'string' ? new ObjectId(childId) : childId
    })
    
    if (!child) {
      console.log('❌ Niño no encontrado')
      return { synced: false, error: 'Child not found' }
    }
    
    const embeddedEvents = child.events || []
    
    // Obtener eventos de analytics
    const analyticsEvents = await db.collection('events').find({
      childId: child._id
    }).toArray()
    
    // Comparar conteos
    const syncStatus = {
      embeddedCount: embeddedEvents.length,
      analyticsCount: analyticsEvents.length,
      synced: embeddedEvents.length === analyticsEvents.length,
      discrepancy: Math.abs(embeddedEvents.length - analyticsEvents.length)
    }
    
    if (!syncStatus.synced) {
      this.stats.syncDiscrepancies++
    }
    
    console.log(`
📊 ESTADO DE SINCRONIZACIÓN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sistema Operativo: ${syncStatus.embeddedCount} eventos
Sistema Analytics: ${syncStatus.analyticsCount} eventos
Estado: ${syncStatus.synced ? '✅ SINCRONIZADO' : `❌ DESINCRONIZADO (${syncStatus.discrepancy} eventos de diferencia)`}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `)
    
    return syncStatus
  }

  /**
   * 🔧 Resincroniza eventos entre sistemas
   */
  async resyncChildEvents(childId) {
    console.log(`\n🔧 Resincronizando eventos para niño ${childId}...`)
    
    const db = await this.connect()
    
    // Obtener el niño
    const child = await db.collection('children').findOne({
      _id: typeof childId === 'string' ? new ObjectId(childId) : childId
    })
    
    if (!child) {
      throw new Error('Niño no encontrado')
    }
    
    const embeddedEvents = child.events || []
    
    // Limpiar eventos existentes en analytics para este niño
    await db.collection('events').deleteMany({ childId: child._id })
    
    // Reinsertar desde embedded
    if (embeddedEvents.length > 0) {
      const analyticsEvents = embeddedEvents.map(event => ({
        ...event,
        childId: child._id,
        parentId: child.parentId,
        _id: new ObjectId()
      }))
      
      await db.collection('events').insertMany(analyticsEvents)
    }
    
    console.log(`✅ Resincronización completada: ${embeddedEvents.length} eventos`)
    
    return {
      synced: embeddedEvents.length,
      source: 'embedded',
      target: 'analytics'
    }
  }

  /**
   * 🗑️ Implementa cascade delete para niños
   */
  async cascadeDeleteChild(childId) {
    console.log(`\n🗑️ Eliminando niño y todos sus datos relacionados...`)
    
    const db = await this.connect()
    const childObjectId = typeof childId === 'string' ? new ObjectId(childId) : childId
    
    // Verificar que el niño existe
    const child = await db.collection('children').findOne({ _id: childObjectId })
    
    if (!child) {
      console.log('❌ Niño no encontrado')
      return { deleted: false, error: 'Child not found' }
    }
    
    const deletions = {
      events: 0,
      plans: 0,
      consultations: 0,
      child: 0
    }
    
    // 1. Eliminar eventos de analytics
    const eventsResult = await db.collection('events').deleteMany({
      childId: childObjectId
    })
    deletions.events = eventsResult.deletedCount
    
    // 2. Eliminar planes
    const plansResult = await db.collection('child_plans').deleteMany({
      childId: childObjectId
    })
    deletions.plans = plansResult.deletedCount
    
    // 3. Eliminar reportes de consulta
    const consultResult = await db.collection('consultation_reports').deleteMany({
      childId: childObjectId
    })
    deletions.consultations = consultResult.deletedCount
    
    // 4. Eliminar el niño
    const childResult = await db.collection('children').deleteOne({
      _id: childObjectId
    })
    deletions.child = childResult.deletedCount
    
    // 5. Actualizar referencia en padre
    if (child.parentId) {
      await db.collection('users').updateOne(
        { _id: new ObjectId(child.parentId) },
        { $pull: { children: childObjectId } }
      )
    }
    
    console.log(`
✅ CASCADE DELETE COMPLETADO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Niño eliminado: ${deletions.child}
Eventos eliminados: ${deletions.events}
Planes eliminados: ${deletions.plans}
Consultas eliminadas: ${deletions.consultations}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `)
    
    return { deleted: true, deletions }
  }

  /**
   * 🏥 Health check del sistema
   */
  async performHealthCheck() {
    console.log('\n🏥 EJECUTANDO HEALTH CHECK DEL SISTEMA...\n')
    
    const db = await this.connect()
    
    const health = {
      database: false,
      collections: {},
      dataQuality: {},
      recommendations: []
    }
    
    try {
      // Check database connection
      await db.admin().ping()
      health.database = true
      console.log('✅ Conexión a base de datos: OK')
      
      // Check collections
      const collections = ['users', 'children', 'events', 'child_plans', 'consultation_reports']
      for (const coll of collections) {
        const count = await db.collection(coll).countDocuments()
        health.collections[coll] = count
        console.log(`📊 Colección ${coll}: ${count} documentos`)
      }
      
      // Check data quality
      const { contaminationRate, orphanedEvents, validEvents } = await this.detectOrphanedEvents()
      
      health.dataQuality = {
        contaminationRate,
        orphanedEvents: orphanedEvents.length,
        validEvents: validEvents.length,
        syncIssues: this.stats.syncDiscrepancies
      }
      
      // Generate recommendations
      if (contaminationRate > 10) {
        health.recommendations.push(`🚨 CRÍTICO: Contaminación de datos al ${contaminationRate}% - Ejecutar limpieza inmediata`)
      }
      
      if (contaminationRate > 5 && contaminationRate <= 10) {
        health.recommendations.push(`⚠️  ADVERTENCIA: Contaminación de datos al ${contaminationRate}% - Programar limpieza`)
      }
      
      if (this.stats.syncDiscrepancies > 0) {
        health.recommendations.push(`⚠️  ADVERTENCIA: ${this.stats.syncDiscrepancies} problemas de sincronización detectados`)
      }
      
      if (health.recommendations.length === 0) {
        health.recommendations.push('✅ Sistema saludable - No se requieren acciones')
      }
      
    } catch (error) {
      console.error('❌ Error en health check:', error)
      health.error = error.message
    }
    
    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏥 RESUMEN DE SALUD DEL SISTEMA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Estado BD: ${health.database ? '✅' : '❌'}
Calidad de Datos: ${health.dataQuality.contaminationRate < 5 ? '✅' : health.dataQuality.contaminationRate < 10 ? '⚠️' : '❌'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 RECOMENDACIONES:
${health.recommendations.map(r => `  • ${r}`).join('\n')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `)
    
    return health
  }

  /**
   * 📊 Obtener estadísticas de limpieza
   */
  getStats() {
    return this.stats
  }
}

/**
 * 🚀 Función helper para limpieza rápida
 */
async function quickCleanup(mongoUri, dbName, options = {}) {
  const cleaner = new DataCleanupManager(mongoUri, dbName)
  
  try {
    // 1. Health check
    await cleaner.performHealthCheck()
    
    // 2. Clean orphaned events if needed
    if (options.cleanOrphans !== false) {
      await cleaner.cleanOrphanedEvents(options.dryRun || false)
    }
    
    // 3. Return stats
    return cleaner.getStats()
    
  } finally {
    await cleaner.disconnect()
  }
}

// Export para uso
module.exports = {
  DataCleanupManager,
  quickCleanup
}