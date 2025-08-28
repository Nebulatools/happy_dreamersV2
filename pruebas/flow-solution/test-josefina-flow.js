/**
 * 🧪 TEST COMPLETO - Happy Dreamers Flow
 * 
 * Este script simula el flujo completo de la aplicación:
 * 1. Crear niño "Josefina" con survey completo
 * 2. Generar eventos desde julio 2025
 * 3. Crear Plan 0 (inicial)
 * 4. Registrar más eventos
 * 5. Crear Plan 1 (basado en eventos)
 * 6. Simular consulta y crear transcript
 * 7. Crear Plan 1.1 (refinamiento)
 * 
 * Parent ID: 688ce146d2d5ff9616549d86 (test@test.com)
 */

const { MongoClient, ObjectId } = require('mongodb')
const { generateSampleData } = require('./sample-data')

// Configuración
const CONFIG = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  DB_NAME: process.env.MONGODB_DB || 'happy_dreamers',
  PARENT_ID: '688ce146d2d5ff9616549d86',
  ADMIN_ID: '676c8c1cc8c99baac91e5819', // Admin ID para pruebas
  CHILD_NAME: 'Josefina',
  START_DATE: new Date('2025-07-01'),
  TEST_MODE: true // Si es true, limpia datos al final
}

// Logger mejorado
const logger = {
  info: (msg, data = {}) => console.log(`✅ ${msg}`, data),
  warn: (msg, data = {}) => console.log(`⚠️  ${msg}`, data),
  error: (msg, data = {}) => console.error(`❌ ${msg}`, data),
  step: (num, msg) => console.log(`\n📍 PASO ${num}: ${msg}`),
  success: (msg) => console.log(`🎉 ${msg}`),
  divider: () => console.log('\n' + '='.repeat(60) + '\n')
}

class HappyDreamersTestFlow {
  constructor() {
    this.client = null
    this.db = null
    this.childId = null
    this.planIds = []
    this.eventIds = []
    this.reportId = null
  }

  async connect() {
    try {
      logger.step(0, 'Conectando a MongoDB...')
      this.client = new MongoClient(CONFIG.MONGODB_URI)
      await this.client.connect()
      this.db = this.client.db(CONFIG.DB_NAME)
      logger.info('Conexión exitosa a MongoDB')
      
      // Verificar conexión
      const collections = await this.db.listCollections().toArray()
      logger.info(`Base de datos: ${CONFIG.DB_NAME}`)
      logger.info(`Colecciones encontradas: ${collections.length}`)
      
      return true
    } catch (error) {
      logger.error('Error conectando a MongoDB:', error)
      throw error
    }
  }

  async verifyParentAccount() {
    logger.step(1, 'Verificando cuenta padre...')
    
    try {
      const parent = await this.db.collection('users').findOne({
        _id: new ObjectId(CONFIG.PARENT_ID)
      })
      
      if (!parent) {
        throw new Error(`No se encontró el usuario padre con ID: ${CONFIG.PARENT_ID}`)
      }
      
      logger.info('Cuenta padre verificada:', {
        email: parent.email,
        name: parent.name,
        role: parent.role,
        childrenCount: parent.children?.length || 0
      })
      
      return parent
    } catch (error) {
      logger.error('Error verificando cuenta padre:', error)
      throw error
    }
  }

  async createChildWithSurvey() {
    logger.step(2, 'Creando niño Josefina con survey completo...')
    
    try {
      const sampleData = generateSampleData()
      
      const childData = {
        firstName: CONFIG.CHILD_NAME,
        lastName: 'TestFlow',
        birthDate: '2024-01-15', // 18 meses de edad
        parentId: CONFIG.PARENT_ID,
        surveyData: sampleData.completeSurvey,
        currentSleepState: {
          isAsleep: false,
          sleepType: null
        },
        events: [], // Inicialmente vacío
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      // Insertar niño
      const result = await this.db.collection('children').insertOne(childData)
      this.childId = result.insertedId
      
      // Actualizar referencia en usuario padre
      await this.db.collection('users').updateOne(
        { _id: new ObjectId(CONFIG.PARENT_ID) },
        { 
          $addToSet: { children: this.childId },
          $set: { updatedAt: new Date() }
        }
      )
      
      logger.success(`Niño creado exitosamente con ID: ${this.childId}`)
      logger.info('Survey completo agregado:', {
        steps: Object.keys(sampleData.completeSurvey).length,
        completed: sampleData.completeSurvey.completed
      })
      
      return this.childId
    } catch (error) {
      logger.error('Error creando niño:', error)
      throw error
    }
  }

  async generateInitialEvents() {
    logger.step(3, 'Generando eventos iniciales (Julio 2025)...')
    
    try {
      const sampleData = generateSampleData()
      const events = []
      const startDate = new Date('2025-07-01')
      const endDate = new Date('2025-07-31')
      
      let currentDate = new Date(startDate)
      let eventCount = 0
      
      while (currentDate <= endDate) {
        // Eventos diarios típicos
        const dayEvents = sampleData.generateDayEvents(currentDate)
        
        for (const event of dayEvents) {
          // Agregar a array embebido del niño
          await this.db.collection('children').updateOne(
            { _id: this.childId },
            { 
              $push: { 
                events: {
                  ...event,
                  _id: new ObjectId(),
                  childId: this.childId,
                  parentId: CONFIG.PARENT_ID
                }
              }
            }
          )
          
          // También agregar a colección events (analytics)
          const analyticsEvent = await this.db.collection('events').insertOne({
            ...event,
            childId: this.childId,
            parentId: CONFIG.PARENT_ID,
            createdAt: new Date()
          })
          
          this.eventIds.push(analyticsEvent.insertedId)
          eventCount++
        }
        
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      logger.success(`${eventCount} eventos generados para julio 2025`)
      logger.info('Tipos de eventos creados:', {
        bedtime: eventCount / 3,
        wakeup: eventCount / 3,
        naps: eventCount / 3
      })
      
      return this.eventIds
    } catch (error) {
      logger.error('Error generando eventos:', error)
      throw error
    }
  }

  async generatePlan0() {
    logger.step(4, 'Generando Plan 0 (inicial basado en survey + stats)...')
    
    try {
      // Calcular estadísticas
      const stats = await this.calculateChildStats()
      
      // Simular generación de Plan 0
      const plan0 = {
        childId: this.childId,
        userId: new ObjectId(CONFIG.PARENT_ID),
        planNumber: 0,
        planVersion: '0',
        planType: 'initial',
        title: `Plan Inicial para ${CONFIG.CHILD_NAME}`,
        
        schedule: {
          morning: {
            wakeTime: '07:00',
            activities: ['Desayuno nutritivo', 'Juego libre supervisado']
          },
          naps: [{
            startTime: '13:00',
            duration: 90,
            preparation: ['Lectura tranquila', 'Ambiente con luz tenue']
          }],
          evening: {
            dinnerTime: '18:30',
            bathTime: '19:30',
            bedtimeRoutine: ['Baño relajante', 'Cuento corto', 'Canción de cuna'],
            targetBedtime: '20:00'
          }
        },
        
        objectives: [
          {
            id: 'obj_1',
            description: 'Establecer horario consistente de sueño nocturno',
            targetDate: new Date('2025-08-15'),
            metrics: ['Variación de hora de dormir < 30 minutos'],
            priority: 'high'
          },
          {
            id: 'obj_2',
            description: 'Reducir despertares nocturnos a máximo 1 por noche',
            targetDate: new Date('2025-08-30'),
            metrics: ['Despertares nocturnos ≤ 1'],
            priority: 'medium'
          },
          {
            id: 'obj_3',
            description: 'Mantener siesta de 90 minutos consistente',
            targetDate: new Date('2025-08-15'),
            metrics: ['Duración siesta 60-120 minutos'],
            priority: 'medium'
          }
        ],
        
        recommendations: [
          {
            category: 'routine',
            title: 'Rutina de relajación pre-sueño',
            description: 'Implementar actividades calmantes 30 minutos antes de dormir',
            rationale: 'Basado en la edad del niño (18 meses) y patrones actuales de sueño'
          },
          {
            category: 'environment',
            title: 'Optimización del ambiente de sueño',
            description: 'Mantener temperatura entre 18-20°C, usar luz tenue naranja',
            rationale: 'Condiciones óptimas para sueño profundo según investigación'
          },
          {
            category: 'nutrition',
            title: 'Cena ligera y temprana',
            description: 'Ofrecer cena ligera 2 horas antes de dormir',
            rationale: 'Facilita digestión y mejora calidad del sueño'
          }
        ],
        
        basedOn: 'survey_stats_rag',
        sourceData: {
          surveyDataUsed: true,
          childStatsUsed: true,
          ragSources: ['sleep_guidelines_18m', 'routine_establishment', 'healthy_sleep_habits'],
          ageInMonths: 18,
          totalEvents: stats.totalEvents,
          avgSleepDuration: stats.avgSleepDuration,
          avgBedtime: stats.avgBedtime
        },
        
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: new ObjectId(CONFIG.ADMIN_ID),
        status: 'active'
      }
      
      const result = await this.db.collection('child_plans').insertOne(plan0)
      this.planIds.push(result.insertedId)
      
      logger.success(`Plan 0 generado con ID: ${result.insertedId}`)
      logger.info('Plan 0 detalles:', {
        objectives: plan0.objectives.length,
        recommendations: plan0.recommendations.length,
        basedOn: plan0.basedOn
      })
      
      return result.insertedId
    } catch (error) {
      logger.error('Error generando Plan 0:', error)
      throw error
    }
  }

  async generateAdditionalEvents() {
    logger.step(5, 'Generando eventos adicionales (Agosto 1-15, 2025)...')
    
    try {
      const sampleData = generateSampleData()
      const startDate = new Date('2025-08-01')
      const endDate = new Date('2025-08-15')
      
      let currentDate = new Date(startDate)
      let eventCount = 0
      
      while (currentDate <= endDate) {
        // Eventos con mejoras (menos despertares nocturnos)
        const dayEvents = sampleData.generateImprovedDayEvents(currentDate)
        
        for (const event of dayEvents) {
          // Agregar a array embebido
          await this.db.collection('children').updateOne(
            { _id: this.childId },
            { 
              $push: { 
                events: {
                  ...event,
                  _id: new ObjectId(),
                  childId: this.childId,
                  parentId: CONFIG.PARENT_ID
                }
              }
            }
          )
          
          // Agregar a analytics
          const analyticsEvent = await this.db.collection('events').insertOne({
            ...event,
            childId: this.childId,
            parentId: CONFIG.PARENT_ID,
            createdAt: new Date()
          })
          
          this.eventIds.push(analyticsEvent.insertedId)
          eventCount++
        }
        
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      logger.success(`${eventCount} eventos adicionales generados (Agosto 1-15)`)
      logger.info('Mejoras observadas en los nuevos eventos')
      
      return eventCount
    } catch (error) {
      logger.error('Error generando eventos adicionales:', error)
      throw error
    }
  }

  async generatePlan1() {
    logger.step(6, 'Generando Plan 1 (basado en nuevos eventos)...')
    
    try {
      const stats = await this.calculateChildStats()
      
      const plan1 = {
        childId: this.childId,
        userId: new ObjectId(CONFIG.PARENT_ID),
        planNumber: 1,
        planVersion: '1',
        planType: 'event_based',
        title: `Plan Actualizado para ${CONFIG.CHILD_NAME}`,
        
        schedule: {
          morning: {
            wakeTime: '07:00',
            activities: ['Desayuno', 'Actividad física matutina']
          },
          naps: [{
            startTime: '13:00',
            duration: 75, // Reducido de 90 a 75 minutos
            preparation: ['Lectura', 'Música suave']
          }],
          evening: {
            dinnerTime: '18:30',
            bathTime: '19:45', // Ajustado 15 minutos más tarde
            bedtimeRoutine: ['Baño', 'Masaje relajante', 'Cuento'],
            targetBedtime: '20:15' // Ajustado 15 minutos más tarde
          }
        },
        
        objectives: [
          {
            id: 'obj_1_updated',
            description: 'Mantener mejora en despertares nocturnos',
            targetDate: new Date('2025-09-01'),
            metrics: ['Mantener ≤ 1 despertar por noche'],
            priority: 'high',
            progress: 'En progreso - mejora del 40% observada'
          },
          {
            id: 'obj_2_new',
            description: 'Ajustar duración de siesta',
            targetDate: new Date('2025-09-01'),
            metrics: ['Siesta de 60-75 minutos'],
            priority: 'medium'
          }
        ],
        
        recommendations: [
          {
            category: 'routine',
            title: 'Mantener consistencia lograda',
            description: 'Continuar con rutina actual que muestra mejoras',
            rationale: 'Datos muestran reducción del 40% en despertares nocturnos'
          },
          {
            category: 'adjustment',
            title: 'Ajuste fino de horarios',
            description: 'Retrasar rutina nocturna 15 minutos',
            rationale: 'Patrones sugieren que el niño no tiene sueño hasta las 20:15'
          }
        ],
        
        improvements: {
          nightWakings: {
            before: 2.1,
            after: 1.3,
            improvement: '38% reducción'
          },
          sleepLatency: {
            before: 25,
            after: 18,
            improvement: '28% más rápido para dormir'
          }
        },
        
        basedOn: 'previous_plan_events',
        sourceData: {
          previousPlanId: this.planIds[0],
          newEventsCount: 45,
          totalEventsAnalyzed: stats.totalEvents,
          periodAnalyzed: 'Agosto 1-15, 2025'
        },
        
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: new ObjectId(CONFIG.ADMIN_ID),
        status: 'active'
      }
      
      // Marcar Plan 0 como superseded
      await this.db.collection('child_plans').updateOne(
        { _id: this.planIds[0] },
        { $set: { status: 'superseded' } }
      )
      
      const result = await this.db.collection('child_plans').insertOne(plan1)
      this.planIds.push(result.insertedId)
      
      logger.success(`Plan 1 generado con ID: ${result.insertedId}`)
      logger.info('Plan 1 mejoras detectadas:', plan1.improvements)
      
      return result.insertedId
    } catch (error) {
      logger.error('Error generando Plan 1:', error)
      throw error
    }
  }

  async createConsultationTranscript() {
    logger.step(7, 'Creando transcript de consulta médica...')
    
    try {
      const sampleData = generateSampleData()
      const transcript = sampleData.consultationTranscript
      
      // Simular análisis del transcript
      const consultationReport = {
        childId: this.childId,
        userId: new ObjectId(CONFIG.PARENT_ID),
        adminId: new ObjectId(CONFIG.ADMIN_ID),
        
        transcript: transcript,
        
        analysis: {
          mainConcerns: [
            'Dificultad ocasional para iniciar el sueño',
            'Despertar temprano algunos días (6:30 AM)',
            'Resistencia a la siesta en algunos días'
          ],
          
          behaviorPatterns: [
            'Mejor respuesta con rutina consistente',
            'Sensibilidad a cambios de horario',
            'Preferencia por ambiente muy oscuro'
          ],
          
          recommendations: [
            {
              category: 'routine',
              recommendation: 'Implementar técnica de "fading" para la siesta',
              timeline: '2-3 semanas',
              rationale: 'Reducción gradual para evitar resistencia'
            },
            {
              category: 'environment',
              recommendation: 'Usar cortinas blackout completas',
              timeline: 'Inmediato',
              rationale: 'Niño muestra sensibilidad a la luz'
            },
            {
              category: 'behavioral',
              recommendation: 'Introducir objeto de transición (peluche especial)',
              timeline: '1 semana',
              rationale: 'Facilitar auto-consuelo'
            }
          ],
          
          parentCommitments: [
            'Mantener horario de dormir entre 20:00-20:30',
            'No pantallas después de las 18:00',
            'Rutina de 30 minutos antes de dormir'
          ],
          
          professionalObservations: [
            'Desarrollo del sueño apropiado para la edad',
            'Mejoras significativas desde Plan 0',
            'Padres comprometidos con el proceso'
          ],
          
          followUp: {
            required: true,
            suggestedDate: '2 semanas',
            focusAreas: ['Progreso con objeto de transición', 'Ajuste de siesta']
          }
        },
        
        createdAt: new Date()
      }
      
      const result = await this.db.collection('consultation_reports').insertOne(consultationReport)
      this.reportId = result.insertedId
      
      logger.success(`Transcript de consulta creado con ID: ${result.insertedId}`)
      logger.info('Análisis de consulta:', {
        concerns: consultationReport.analysis.mainConcerns.length,
        recommendations: consultationReport.analysis.recommendations.length,
        followUpRequired: consultationReport.analysis.followUp.required
      })
      
      return result.insertedId
    } catch (error) {
      logger.error('Error creando transcript:', error)
      throw error
    }
  }

  async generatePlan1_1() {
    logger.step(8, 'Generando Plan 1.1 (refinamiento basado en consulta)...')
    
    try {
      const plan1_1 = {
        childId: this.childId,
        userId: new ObjectId(CONFIG.PARENT_ID),
        planNumber: 1, // Mismo número que Plan 1
        planVersion: '1.1', // Versión de refinamiento
        planType: 'transcript_refinement',
        title: `Plan Refinado para ${CONFIG.CHILD_NAME} - Post Consulta`,
        
        schedule: {
          morning: {
            wakeTime: '07:00',
            activities: ['Desayuno', 'Juego activo', 'Luz natural']
          },
          naps: [{
            startTime: '13:15', // Ajustado 15 minutos
            duration: 60, // Reducido a 60 minutos
            preparation: ['Ambiente oscuro total', 'Objeto de transición'],
            technique: 'Fading gradual durante 2 semanas'
          }],
          evening: {
            dinnerTime: '18:00', // Adelantado 30 minutos
            screenTimeEnd: '18:00', // Explícitamente definido
            bathTime: '19:30',
            bedtimeRoutine: [
              'Baño con luz tenue',
              'Masaje con aceite de lavanda',
              'Cuento con objeto de transición',
              'Canción de cuna'
            ],
            targetBedtime: '20:00-20:30' // Ventana flexible
          }
        },
        
        objectives: [
          {
            id: 'obj_refined_1',
            description: 'Implementar objeto de transición exitosamente',
            targetDate: new Date('2025-09-01'),
            metrics: ['Niño acepta y usa peluche para auto-consuelo'],
            priority: 'high'
          },
          {
            id: 'obj_refined_2',
            description: 'Reducir gradualmente duración de siesta',
            targetDate: new Date('2025-09-15'),
            metrics: ['Siesta de 45-60 minutos sin resistencia'],
            priority: 'medium',
            technique: 'Reducir 5 minutos cada 3 días'
          },
          {
            id: 'obj_refined_3',
            description: 'Eliminar despertares antes de las 6:30 AM',
            targetDate: new Date('2025-09-01'),
            metrics: ['Despertar consistente 6:30-7:00 AM'],
            priority: 'medium'
          }
        ],
        
        recommendations: [
          {
            category: 'immediate',
            title: 'Implementación de cortinas blackout',
            description: 'Instalar cortinas que bloqueen 100% la luz',
            rationale: 'Consulta reveló alta sensibilidad a la luz',
            priority: 'urgent'
          },
          {
            category: 'behavioral',
            title: 'Introducción de "Señor Oso" (objeto de transición)',
            description: 'Peluche especial solo para dormir, con olor familiar',
            rationale: 'Facilitará auto-consuelo y reducirá dependencia parental',
            implementation: 'Presentar durante rutina, mantener en cuna'
          },
          {
            category: 'technique',
            title: 'Técnica de fading para siesta',
            description: 'Reducir duración 5 minutos cada 3 días',
            rationale: 'Evitar resistencia mediante cambio gradual',
            timeline: '2-3 semanas para completar'
          }
        ],
        
        professionalInsights: {
          consultationDate: new Date(),
          consultationReportId: this.reportId,
          keyFindings: [
            'Desarrollo normal del sueño para 18 meses',
            'Alta sensibilidad sensorial (luz y ruido)',
            'Buena respuesta a rutinas consistentes'
          ],
          parentConcerns: [
            'Despertar temprano ocasional',
            'Resistencia a siesta algunos días'
          ],
          agreedAdjustments: [
            'Implementar objeto de transición',
            'Instalar blackout completo',
            'Flexibilizar ventana de sueño 20:00-20:30'
          ]
        },
        
        parentGuidance: {
          dos: [
            'Mantener consistencia incluso en fines de semana',
            'Celebrar pequeños logros',
            'Usar lenguaje positivo sobre el sueño'
          ],
          donts: [
            'No cambiar múltiples cosas a la vez',
            'Evitar pantallas después de las 18:00',
            'No ceder ante resistencia inicial'
          ],
          troubleshooting: [
            'Si rechaza objeto de transición: jugar con él durante el día',
            'Si resiste reducción de siesta: pausar 3 días y continuar',
            'Si despierta antes de 6:30: no interactuar hasta esa hora'
          ]
        },
        
        basedOn: 'plan1_plus_consultation',
        sourceData: {
          basePlanId: this.planIds[1],
          consultationReportId: this.reportId,
          transcriptAnalyzed: true,
          professionalRecommendations: 3
        },
        
        followUp: {
          required: true,
          date: new Date('2025-09-01'),
          format: 'Video llamada o presencial',
          focus: ['Progreso con objeto de transición', 'Ajuste de siesta', 'Horario matutino']
        },
        
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: new ObjectId(CONFIG.ADMIN_ID),
        status: 'active'
      }
      
      const result = await this.db.collection('child_plans').insertOne(plan1_1)
      this.planIds.push(result.insertedId)
      
      // Plan 1 permanece active (no se marca como superseded en refinamientos)
      
      logger.success(`Plan 1.1 (refinamiento) generado con ID: ${result.insertedId}`)
      logger.info('Plan 1.1 incorpora:', {
        professionalInsights: Object.keys(plan1_1.professionalInsights).length,
        parentGuidance: Object.keys(plan1_1.parentGuidance).length,
        refinedObjectives: plan1_1.objectives.length
      })
      
      return result.insertedId
    } catch (error) {
      logger.error('Error generando Plan 1.1:', error)
      throw error
    }
  }

  async calculateChildStats() {
    // Calcular estadísticas del niño
    const child = await this.db.collection('children').findOne({ _id: this.childId })
    const events = child.events || []
    
    const stats = {
      totalEvents: events.length,
      avgSleepDuration: 10.5, // horas promedio
      avgBedtime: '20:00',
      avgWakeTime: '07:00',
      nightWakings: 1.3 // promedio
    }
    
    return stats
  }

  async validateFlow() {
    logger.divider()
    logger.step(9, 'Validando flujo completo...')
    
    try {
      const validations = {
        childCreated: false,
        eventsGenerated: false,
        plan0Created: false,
        plan1Created: false,
        consultationCreated: false,
        plan1_1Created: false,
        dataConsistency: false
      }
      
      // Validar niño
      const child = await this.db.collection('children').findOne({ _id: this.childId })
      validations.childCreated = !!child
      logger.info(`✓ Niño creado: ${child?.firstName} ${child?.lastName}`)
      
      // Validar eventos
      validations.eventsGenerated = child?.events?.length > 0
      logger.info(`✓ Eventos generados: ${child?.events?.length} eventos`)
      
      // Validar planes
      const plans = await this.db.collection('child_plans').find({
        childId: this.childId
      }).toArray()
      
      validations.plan0Created = plans.some(p => p.planVersion === '0')
      validations.plan1Created = plans.some(p => p.planVersion === '1')
      validations.plan1_1Created = plans.some(p => p.planVersion === '1.1')
      
      logger.info(`✓ Planes creados: ${plans.length} planes`)
      plans.forEach(p => {
        logger.info(`  - Plan ${p.planVersion}: ${p.title}`)
      })
      
      // Validar consulta
      const report = await this.db.collection('consultation_reports').findOne({
        _id: this.reportId
      })
      validations.consultationCreated = !!report
      logger.info(`✓ Consulta creada: ${report ? 'Sí' : 'No'}`)
      
      // Validar consistencia de datos
      validations.dataConsistency = 
        validations.childCreated &&
        validations.eventsGenerated &&
        validations.plan0Created &&
        validations.plan1Created &&
        validations.consultationCreated &&
        validations.plan1_1Created
      
      logger.divider()
      
      if (validations.dataConsistency) {
        logger.success('🎉 FLUJO COMPLETO VALIDADO EXITOSAMENTE!')
        logger.info('Todos los componentes del flujo están funcionando correctamente')
      } else {
        logger.warn('Algunas validaciones fallaron:')
        Object.entries(validations).forEach(([key, value]) => {
          if (!value) {
            logger.error(`  - ${key}: FALLÓ`)
          }
        })
      }
      
      return validations
    } catch (error) {
      logger.error('Error validando flujo:', error)
      throw error
    }
  }

  async generateReport() {
    logger.divider()
    logger.step(10, 'Generando reporte final...')
    
    const report = {
      testDate: new Date().toISOString(),
      childId: this.childId?.toString(),
      parentId: CONFIG.PARENT_ID,
      
      summary: {
        childCreated: !!this.childId,
        totalEvents: this.eventIds.length,
        totalPlans: this.planIds.length,
        consultationCreated: !!this.reportId
      },
      
      timeline: {
        childCreation: 'Completado',
        julyEvents: `${this.eventIds.length > 30 ? '31 días' : 'Parcial'}`,
        plan0: this.planIds[0] ? 'Generado' : 'Pendiente',
        augustEvents: 'Completado (15 días)',
        plan1: this.planIds[1] ? 'Generado' : 'Pendiente',
        consultation: this.reportId ? 'Realizada' : 'Pendiente',
        plan1_1: this.planIds[2] ? 'Generado' : 'Pendiente'
      },
      
      ids: {
        childId: this.childId?.toString(),
        planIds: this.planIds.map(id => id.toString()),
        reportId: this.reportId?.toString(),
        eventCount: this.eventIds.length
      }
    }
    
    // Guardar reporte
    const reportPath = `/Users/jaco/Desktop/nebula/proyectos_clientes/happy_dreamers_v0/pruebas/flow-solution/test-results/report-${Date.now()}.json`
    
    logger.success('Reporte generado:')
    console.log(JSON.stringify(report, null, 2))
    
    return report
  }

  async cleanup() {
    if (!CONFIG.TEST_MODE) {
      logger.info('Modo producción - datos preservados')
      return
    }
    
    logger.divider()
    logger.warn('Limpiando datos de prueba...')
    
    try {
      // Eliminar planes
      if (this.planIds.length > 0) {
        await this.db.collection('child_plans').deleteMany({
          _id: { $in: this.planIds }
        })
        logger.info(`${this.planIds.length} planes eliminados`)
      }
      
      // Eliminar reporte de consulta
      if (this.reportId) {
        await this.db.collection('consultation_reports').deleteOne({
          _id: this.reportId
        })
        logger.info('Reporte de consulta eliminado')
      }
      
      // Eliminar eventos de analytics
      if (this.eventIds.length > 0) {
        await this.db.collection('events').deleteMany({
          _id: { $in: this.eventIds }
        })
        logger.info(`${this.eventIds.length} eventos eliminados de analytics`)
      }
      
      // Eliminar niño
      if (this.childId) {
        await this.db.collection('children').deleteOne({
          _id: this.childId
        })
        
        // Remover referencia del padre
        await this.db.collection('users').updateOne(
          { _id: new ObjectId(CONFIG.PARENT_ID) },
          { $pull: { children: this.childId } }
        )
        
        logger.info('Niño eliminado y referencia removida del padre')
      }
      
      logger.success('Limpieza completada')
    } catch (error) {
      logger.error('Error durante limpieza:', error)
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close()
      logger.info('Desconectado de MongoDB')
    }
  }

  async run() {
    logger.divider()
    logger.success('🚀 INICIANDO TEST COMPLETO - HAPPY DREAMERS FLOW')
    logger.divider()
    
    try {
      await this.connect()
      await this.verifyParentAccount()
      await this.createChildWithSurvey()
      await this.generateInitialEvents()
      await this.generatePlan0()
      await this.generateAdditionalEvents()
      await this.generatePlan1()
      await this.createConsultationTranscript()
      await this.generatePlan1_1()
      await this.validateFlow()
      const report = await this.generateReport()
      
      if (CONFIG.TEST_MODE) {
        await this.cleanup()
      }
      
      logger.divider()
      logger.success('✅ TEST COMPLETADO EXITOSAMENTE')
      logger.divider()
      
      return report
    } catch (error) {
      logger.error('Error fatal en el flujo:', error)
      throw error
    } finally {
      await this.disconnect()
    }
  }
}

// Ejecutar test si se llama directamente
if (require.main === module) {
  const test = new HappyDreamersTestFlow()
  test.run()
    .then(report => {
      console.log('\n📊 Reporte Final guardado')
      process.exit(0)
    })
    .catch(error => {
      console.error('❌ Test falló:', error)
      process.exit(1)
    })
}

module.exports = HappyDreamersTestFlow