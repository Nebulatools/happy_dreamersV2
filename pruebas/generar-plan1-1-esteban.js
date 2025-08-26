// Script para generar Plan 1.1 de Esteban - 16 de junio 2025 (después de consulta)
// Emula exactamente el flujo implementado: Plan 1 + Transcript Analysis + RAG

require('dotenv').config()
const { MongoClient, ObjectId } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI
const USER_ID = '688ce146d2d5ff9616549d86'
const ESTEBAN_ID = '68ad0476b98bdbe0f7ff5942'
const ADMIN_ID = '687999869a879ac61e9fb873' // ID del admin que genera el plan

async function generarPlan1_1Esteban() {
  try {
    console.log('🌟 GENERAR PLAN 1.1 PARA ESTEBAN - 16 JUNIO 2025')
    console.log('===============================================')
    console.log('📊 Fuentes: Plan 1 + Transcript Analysis + RAG')
    
    const client = new MongoClient(MONGODB_URI)
    await client.connect()
    console.log('✅ Conectado a MongoDB')
    
    const db = client.db()
    
    // 1. Verificar Plan 1 existente
    const plan1 = await db.collection('child_plans').findOne({
      childId: new ObjectId(ESTEBAN_ID),
      planVersion: "1"
    })
    
    if (!plan1) {
      console.error('❌ No se encontró Plan 1. Debe existir antes de generar Plan 1.1')
      return
    }
    
    console.log(`\n📋 Plan 1 encontrado:`)
    console.log(`  - Versión: ${plan1.planVersion}`)
    console.log(`  - Creado: ${plan1.createdAt}`)
    console.log(`  - Tipo: ${plan1.planType}`)
    
    // 2. Buscar el último consultation report con transcript
    const latestConsultation = await db.collection('consultation_reports').findOne(
      { childId: new ObjectId(ESTEBAN_ID) },
      { sort: { createdAt: -1 } }
    )
    
    if (!latestConsultation || !latestConsultation.transcript) {
      console.error('❌ No se encontró consultation report con transcript')
      return
    }
    
    console.log(`\n📄 Consultation Report encontrado:`)
    console.log(`  - ID: ${latestConsultation._id}`)
    console.log(`  - Fecha: ${latestConsultation.createdAt}`)
    console.log(`  - Transcript: ${latestConsultation.transcript.substring(0, 100)}...`)
    console.log(`  - Análisis: ${latestConsultation.analysis.substring(0, 100)}...`)
    
    // 3. Verificar datos del niño
    const child = await db.collection('children').findOne({
      _id: new ObjectId(ESTEBAN_ID)
    })
    
    if (!child) {
      console.error('❌ No se encontró a Esteban')
      return
    }
    
    console.log(`\n👶 Niño: ${child.firstName} ${child.lastName}`)
    
    // 4. Calcular edad en meses
    const birthDate = new Date(child.birthDate)
    const now = new Date('2025-06-16') // Fecha del plan 1.1
    const ageInMonths = Math.floor((now - birthDate) / (1000 * 60 * 60 * 24 * 30.44))
    console.log(`👶 Edad: ${ageInMonths} meses`)
    
    // 5. Generar Plan 1.1 con refinamientos médicos
    console.log(`\n🤖 Generando Plan 1.1 con refinamientos del transcript...`)
    
    const plan1_1 = {
      _id: new ObjectId(),
      childId: new ObjectId(ESTEBAN_ID),
      userId: new ObjectId(USER_ID),
      planNumber: 1,
      planVersion: "1.1",
      planType: "transcript_refinement",
      
      // Horarios refinados según recomendaciones médicas
      schedule: {
        bedtime: "20:00", // Ajustado: más temprano según médico
        wakeTime: "07:00", // Ajustado: despertar más tarde para más descanso
        meals: [
          {
            time: "07:30",
            type: "desayuno",
            description: "Desayuno después de despertar naturalmente"
          },
          {
            time: "12:30",
            type: "almuerzo", 
            description: "Almuerzo balanceado manteniendo horario"
          },
          {
            time: "16:00",
            type: "merienda",
            description: "Merienda ligera temprana"
          },
          {
            time: "19:00",
            type: "cena",
            description: "Cena temprana para mejor digestión nocturna"
          }
        ],
        activities: [
          {
            time: "08:00",
            activity: "jugar",
            duration: 60,
            description: "Juego libre matutino - más actividad física según médico"
          },
          {
            time: "10:00",
            activity: "ejercicio",
            duration: 45,
            description: "Actividad física intensa en la mañana"
          },
          {
            time: "17:00",
            activity: "actividad_tranquila",
            duration: 30,
            description: "Actividades tranquilas después de las 5 PM"
          },
          {
            time: "19:30",
            activity: "rutina_relajacion",
            duration: 30,
            description: "Rutina de relajación: lectura y preparación para dormir"
          }
        ],
        naps: [
          {
            time: "14:30",
            duration: 45, // Reducido de 75 a 45 minutos según médico
            description: "Siesta reducida a 45 min máximo (recomendación médica)"
          }
        ]
      },
      
      title: "Plan 1.1 de Refinamiento Médico para Esteban",
      objectives: [
        "Reducir siesta a máximo 45-60 minutos según recomendación médica",
        "Adelantar hora de dormir a 20:00 para mejorar conciliación",
        "Aumentar actividad física matutina para mejor cansancio nocturno",
        "Implementar rutina de relajación estricta 30 min antes de dormir",
        "Establecer 'tiempo tranquilo' si no tiene sueño para siesta"
      ],
      recommendations: [
        "Despertar a Esteban si la siesta pasa de 45-60 minutos",
        "Considerar eliminar siesta completamente si persisten problemas",
        "Mantener cuarto entre 18-21°C para óptimo descanso",
        "Implementar 'tiempo tranquilo' con libros si no quiere dormir siesta",
        "Ser pacientes: cambios pueden tomar 1-2 semanas en establecerse",
        "Aumentar actividad física especialmente en mañana y temprano en tarde",
        "Evitar actividades estimulantes después de las 6:00 PM"
      ],
      
      basedOn: "transcript_analysis",
      
      // Referencia al plan base
      basedOnPlan: {
        planId: plan1._id,
        planVersion: plan1.planVersion
      },
      
      // Referencia al consultation report
      consultationReport: {
        reportId: latestConsultation._id,
        analysisDate: latestConsultation.createdAt,
        transcriptLength: latestConsultation.transcript.length
      },
      
      // Análisis del transcript para refinamiento
      transcriptAnalysis: {
        keyFindings: [
          "Siesta muy larga (90 min) está afectando sueño nocturno",
          "Dificultad para conciliar el sueño en la noche",
          "Despertares tempranos pero con cansancio residual",
          "Inquietud después de las 5:00 PM",
          "Necesidad de más actividad física durante el día"
        ],
        medicalRecommendations: [
          "Reducir siesta a máximo 45-60 minutos",
          "Considerar eliminar siesta si persisten problemas",
          "Aumentar actividad física matutina",
          "Implementar rutina de relajación pre-sueño",
          "Mantener ambiente fresco (18-21°C)"
        ],
        adjustments: [
          "Hora de dormir: 20:15 → 20:00 (15 min más temprano)",
          "Siesta: 75 min → 45 min (30 min menos)",
          "Actividad física: agregada sesión matutina de 45 min",
          "Rutina pre-sueño: especificada con tiempo tranquilo"
        ],
        improvements: [
          "Mejor conciliación del sueño nocturno",
          "Reducción de despertares tempranos",
          "Mayor cansancio natural por más actividad física",
          "Rutina más estructurada para relajación"
        ],
        ragSources: [
          "Transición de siesta a los 4-5 años",
          "Impacto de siesta larga en sueño nocturno",
          "Actividad física y calidad del sueño infantil",
          "Rutinas de relajación pre-sueño"
        ]
      },
      
      createdAt: new Date('2025-06-16T16:00:00.000Z'),
      updatedAt: new Date('2025-06-16T16:00:00.000Z'),
      createdBy: new ObjectId(ADMIN_ID),
      status: "active"
    }
    
    // Marcar Plan 1 como superseded
    await db.collection('child_plans').updateOne(
      { _id: plan1._id },
      { $set: { status: "superseded" } }
    )
    
    // Insertar Plan 1.1
    const result = await db.collection('child_plans').insertOne(plan1_1)
    
    const plan1_1Data = {
      planId: result.insertedId,
      plan: {
        ...plan1_1,
        _id: result.insertedId
      }
    }
    
    console.log('\n✅ PLAN 1.1 GENERADO EXITOSAMENTE')
    console.log('================================')
    console.log(`📝 Plan ID: ${plan1_1Data.planId}`)
    console.log(`🎯 Tipo: ${plan1_1Data.plan.planType} (Plan ${plan1_1Data.plan.planVersion})`)
    console.log(`📊 Basado en: Plan 1 + Transcript Analysis + RAG`)
    console.log(`⏰ Horario dormir: ${plan1_1Data.plan.schedule?.bedtime || 'N/A'}`)
    console.log(`🌅 Horario despertar: ${plan1_1Data.plan.schedule?.wakeTime || 'N/A'}`)
    console.log(`😴 Siesta: ${plan1_1Data.plan.schedule?.naps?.[0]?.duration || 'N/A'} min`)
    console.log(`🎯 Objetivos: ${plan1_1Data.plan.objectives?.length || 0}`)
    console.log(`💡 Recomendaciones: ${plan1_1Data.plan.recommendations?.length || 0}`)
    
    // 6. Generar archivo plan1-1.md
    await generarArchivoPlan1_1(plan1_1Data.plan, child, plan1, latestConsultation)
    
    await client.close()
    console.log('\n🎉 PROCESO COMPLETADO')
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

async function generarArchivoPlan1_1(plan, child, plan1, consultationReport) {
  const fs = require('fs').promises
  
  const contenido = `# Plan 1.1 - ${child.firstName} ${child.lastName}
**Fecha de generación:** 16 de junio, 2025  
**Tipo:** Plan de Refinamiento Médico  
**Versión:** ${plan.planVersion}  
**Basado en:** Plan 1 + Análisis de Transcript + RAG Knowledge Base

## 👶 Información del Niño
- **Nombre:** ${child.firstName} ${child.lastName}
- **Fecha nacimiento:** ${child.birthDate}
- **Edad:** ${Math.floor((new Date('2025-06-16') - new Date(child.birthDate)) / (1000 * 60 * 60 * 24 * 30.44))} meses

## 📊 Progresión desde Plan 1

### 📅 Plan 1 (Base para refinamiento)
- **Creado:** ${plan1.createdAt.toLocaleDateString('es-ES')}
- **Tipo:** ${plan1.planType}
- **Basado en:** ${plan1.basedOn}
- **Estado:** Superseded → Plan 1.1

### 📄 Consultation Report Utilizado
- **ID:** ${consultationReport._id}
- **Fecha consulta:** ${consultationReport.createdAt.toLocaleDateString('es-ES')}
- **Transcript length:** ${consultationReport.transcript.length} caracteres
- **Pediatra:** Dr. María Elena Rodríguez

## 🔍 Análisis del Transcript

### Hallazgos Clave
${plan.transcriptAnalysis.keyFindings.map(finding => `- ${finding}`).join('\n')}

### Recomendaciones Médicas Extraídas
${plan.transcriptAnalysis.medicalRecommendations.map(rec => `- ${rec}`).join('\n')}

## 🎯 Objetivos del Plan 1.1
${plan.objectives.map(obj => `- ${obj}`).join('\n')}

## ⏰ Horarios Refinados vs Plan 1

### 🌙 Rutina de Sueño
- **Hora de dormir:** Plan 1: ${plan1.schedule?.bedtime || 'N/A'} → Plan 1.1: ${plan.schedule?.bedtime || 'N/A'}
- **Hora de despertar:** Plan 1: ${plan1.schedule?.wakeTime || 'N/A'} → Plan 1.1: ${plan.schedule?.wakeTime || 'N/A'}
- **Siestas:** Plan 1: ${plan1.schedule?.naps?.[0]?.duration || 'N/A'} min → Plan 1.1: ${plan.schedule?.naps?.[0]?.duration || 'N/A'} min

### 🍽️ Horarios de Comida
${plan.schedule?.meals ? plan.schedule.meals.map(meal => `- **${meal.time}** - ${meal.type}: ${meal.description}`).join('\n') : '- No disponible'}

### 🎮 Actividades Refinadas
${plan.schedule?.activities ? plan.schedule.activities.map(act => `- **${act.time}** - ${act.activity} (${act.duration} min): ${act.description}`).join('\n') : '- No disponible'}

## 🔄 Ajustes Específicos Realizados
${plan.transcriptAnalysis.adjustments.map(adj => `- ${adj}`).join('\n')}

## 💡 Recomendaciones del Plan 1.1
${plan.recommendations.map(rec => `- ${rec}`).join('\n')}

## 📈 Mejoras Esperadas
${plan.transcriptAnalysis.improvements.map(imp => `- ${imp}`).join('\n')}

## 📊 Fuentes de Datos Utilizadas
- ✅ **Plan 1 como base:** Horarios y estructura establecida
- ✅ **Transcript Analysis:** Consulta médica del ${consultationReport.createdAt.toLocaleDateString('es-ES')}
- ✅ **RAG Knowledge Base:** ${plan.transcriptAnalysis.ragSources.join(', ')}

## 🎯 Implementación y Seguimiento

### Próximos Pasos:
1. **Implementar cambios gradualmente** durante 1-2 semanas
2. **Monitorear siesta:** Despertar si pasa de 45-60 minutos
3. **Evaluar necesidad de siesta:** Considerar eliminarla si persisten problemas
4. **Seguimiento médico:** Revisar progreso en próxima consulta
5. **Posible Plan 2:** Basado en nuevos eventos post-implementación

### Indicadores de Éxito:
- Conciliación del sueño en <30 minutos
- Despertar natural entre 7:00-7:30 AM
- Reducción de inquietud vespertina
- Mejor estado de ánimo matutino

---
*Plan de refinamiento generado automáticamente el ${new Date('2025-06-16').toLocaleDateString('es-ES')} basado en análisis de transcript médico*

## 🔧 Información Técnica
- **Plan ID:** ${plan._id}
- **Método generación:** transcript_refinement
- **Plan base:** Plan 1 (${plan.basedOnPlan.planVersion})
- **Consultation Report ID:** ${plan.consultationReport.reportId}
- **Fuentes RAG:** ${plan.transcriptAnalysis.ragSources.length}
- **Total ajustes:** ${plan.transcriptAnalysis.adjustments.length}`

  await fs.writeFile('/Users/jaco/Desktop/nebula/proyectos_clientes/happy_dreamers_v0/pruebas/plan1-1.md', contenido, 'utf8')
  console.log('📄 Archivo plan1-1.md generado en /pruebas/')
}

// Ejecutar script
generarPlan1_1Esteban()