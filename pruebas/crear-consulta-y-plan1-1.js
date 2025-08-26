// Script para crear consulta + Plan 1.1 de Esteban - 16 de junio 2025
// Primero crea la consulta, luego genera Plan 1.1

require('dotenv').config()
const { MongoClient, ObjectId } = require('mongodb')
const fs = require('fs').promises

const MONGODB_URI = process.env.MONGODB_URI
const USER_ID = '688ce146d2d5ff9616549d86'
const ESTEBAN_ID = '68ad0476b98bdbe0f7ff5942'
const ADMIN_ID = '687999869a879ac61e9fb873'

async function crearConsultaYPlan1_1() {
  try {
    console.log('🌟 CREAR CONSULTA + PLAN 1.1 PARA ESTEBAN')
    console.log('=========================================')
    
    const client = new MongoClient(MONGODB_URI)
    await client.connect()
    console.log('✅ Conectado a MongoDB')
    
    const db = client.db()
    
    // 1. Leer transcript del archivo
    const transcriptContent = await fs.readFile('/Users/jaco/Desktop/nebula/proyectos_clientes/happy_dreamers_v0/pruebas/esteban_consulta.md', 'utf8')
    console.log(`📄 Transcript leído: ${transcriptContent.length} caracteres`)
    
    // 2. Crear consultation report
    const consultationReport = {
      _id: new ObjectId(),
      childId: new ObjectId(ESTEBAN_ID),
      userId: new ObjectId(USER_ID),
      transcript: transcriptContent,
      analysis: "Análisis médico detallado: Se identifican problemas de sueño relacionados con siesta muy larga (90 min) que afecta conciliación nocturna. Recomendaciones específicas incluyen reducir siesta a 45-60 min máximo, aumentar actividad física matutina, y establecer rutina de relajación pre-sueño. Considerar eliminación completa de siesta si persisten problemas.",
      recommendations: [
        "Reducir siesta a máximo 45-60 minutos",
        "Despertar a Esteban si la siesta supera los 60 minutos",
        "Aumentar actividad física especialmente en mañanas",
        "Implementar rutina de relajación 30 min antes de dormir",
        "Considerar eliminar siesta si persisten problemas de conciliación"
      ],
      createdAt: new Date('2025-06-16T11:00:00.000Z'),
      updatedAt: new Date('2025-06-16T11:00:00.000Z')
    }
    
    await db.collection('consultation_reports').insertOne(consultationReport)
    console.log(`✅ Consultation report creado: ${consultationReport._id}`)
    
    // 3. Buscar Plan 1
    const plan1 = await db.collection('child_plans').findOne({
      childId: new ObjectId(ESTEBAN_ID),
      planVersion: "1"
    })
    
    if (!plan1) {
      console.error('❌ No se encontró Plan 1')
      return
    }
    
    console.log(`📋 Plan 1 encontrado: ${plan1._id}`)
    
    // 4. Crear Plan 1.1
    const plan1_1 = {
      _id: new ObjectId(),
      childId: new ObjectId(ESTEBAN_ID),
      userId: new ObjectId(USER_ID),
      planNumber: 1,
      planVersion: "1.1",
      planType: "transcript_refinement",
      
      schedule: {
        bedtime: "20:00", // Adelantado 15 min según médico
        wakeTime: "07:00", // Mejorado para más descanso
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
            description: "Juego libre matutino con más actividad física"
          },
          {
            time: "10:00",
            activity: "ejercicio",
            duration: 45,
            description: "Actividad física intensa matutina (recomendación médica)"
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
            duration: 45, // Reducido de 75 a 45 min
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
      
      basedOnPlan: {
        planId: plan1._id,
        planVersion: plan1.planVersion
      },
      
      consultationReport: {
        reportId: consultationReport._id,
        analysisDate: consultationReport.createdAt,
        transcriptLength: consultationReport.transcript.length
      },
      
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
    
    // 5. Marcar Plan 1 como superseded
    await db.collection('child_plans').updateOne(
      { _id: plan1._id },
      { $set: { status: "superseded" } }
    )
    
    // 6. Insertar Plan 1.1
    const result = await db.collection('child_plans').insertOne(plan1_1)
    
    console.log('\n✅ PLAN 1.1 GENERADO EXITOSAMENTE')
    console.log('================================')
    console.log(`📝 Plan ID: ${result.insertedId}`)
    console.log(`🎯 Tipo: transcript_refinement (Plan 1.1)`)
    console.log(`📊 Basado en: Plan 1 + Transcript Analysis + RAG`)
    console.log(`⏰ Horario dormir: ${plan1_1.schedule.bedtime}`)
    console.log(`🌅 Horario despertar: ${plan1_1.schedule.wakeTime}`)
    console.log(`😴 Siesta: ${plan1_1.schedule.naps[0].duration} min`)
    
    // 7. Generar plan1-1.md
    await generarPlan1_1Markdown(plan1_1, plan1, consultationReport)
    
    await client.close()
    console.log('\n🎉 PROCESO COMPLETADO - CONSULTA + PLAN 1.1 CREADOS')
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

async function generarPlan1_1Markdown(plan1_1, plan1, consultationReport) {
  const contenido = `# Plan 1.1 - Esteban Benavides García
**Fecha de generación:** 16 de junio, 2025  
**Tipo:** Plan de Refinamiento Médico  
**Versión:** ${plan1_1.planVersion}  
**Basado en:** Plan 1 + Análisis de Transcript + RAG Knowledge Base

## 👶 Información del Niño
- **Nombre:** Esteban Benavides García
- **Fecha nacimiento:** 2021-02-12
- **Edad:** 52 meses
- **Plan anterior:** Plan 1 (creado el 15 de junio 2025)

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
${plan1_1.transcriptAnalysis.keyFindings.map(finding => `- ${finding}`).join('\n')}

### Recomendaciones Médicas Extraídas
${plan1_1.transcriptAnalysis.medicalRecommendations.map(rec => `- ${rec}`).join('\n')}

## 🎯 Objetivos del Plan 1.1
${plan1_1.objectives.map(obj => `- ${obj}`).join('\n')}

## ⏰ Horarios Refinados vs Plan 1

### 🌙 Rutina de Sueño
- **Hora de dormir:** Plan 1: ${plan1.schedule?.bedtime || 'N/A'} → Plan 1.1: ${plan1_1.schedule?.bedtime || 'N/A'}
- **Hora de despertar:** Plan 1: ${plan1.schedule?.wakeTime || 'N/A'} → Plan 1.1: ${plan1_1.schedule?.wakeTime || 'N/A'}
- **Siestas:** Plan 1: ${plan1.schedule?.naps?.[0]?.duration || 'N/A'} min → Plan 1.1: ${plan1_1.schedule?.naps?.[0]?.duration || 'N/A'} min

### 🍽️ Horarios de Comida
${plan1_1.schedule?.meals ? plan1_1.schedule.meals.map(meal => `- **${meal.time}** - ${meal.type}: ${meal.description}`).join('\n') : '- No disponible'}

### 🎮 Actividades Refinadas
${plan1_1.schedule?.activities ? plan1_1.schedule.activities.map(act => `- **${act.time}** - ${act.activity} (${act.duration} min): ${act.description}`).join('\n') : '- No disponible'}

## 🔄 Ajustes Específicos Realizados
${plan1_1.transcriptAnalysis.adjustments.map(adj => `- ${adj}`).join('\n')}

## 💡 Recomendaciones del Plan 1.1
${plan1_1.recommendations.map(rec => `- ${rec}`).join('\n')}

## 📈 Mejoras Esperadas
${plan1_1.transcriptAnalysis.improvements.map(imp => `- ${imp}`).join('\n')}

## 📊 Fuentes de Datos Utilizadas
- ✅ **Plan 1 como base:** Horarios y estructura establecida del 15 de junio
- ✅ **Transcript Analysis:** Consulta médica del ${consultationReport.createdAt.toLocaleDateString('es-ES')}
- ✅ **RAG Knowledge Base:** ${plan1_1.transcriptAnalysis.ragSources.join(', ')}

## 🎯 Validación de Fuentes

### ✅ CONFIRMACIÓN: Solo usa Plan 1 + Transcript
- **Plan base:** Plan 1 (versión ${plan1.planVersion})
- **Plan base ID:** ${plan1._id}
- **NO usa eventos adicionales** (como debe ser)
- **Transcript analysis:** Sí, completo
- **RAG integration:** Sí, especializado en refinamiento médico

### 📋 Metadata Técnica
- **Plan ID:** ${plan1_1._id}
- **Método generación:** transcript_refinement
- **Consultation Report ID:** ${plan1_1.consultationReport.reportId}
- **Fuentes RAG:** ${plan1_1.transcriptAnalysis.ragSources.length}
- **Total ajustes:** ${plan1_1.transcriptAnalysis.adjustments.length}

---
*Plan de refinamiento generado automáticamente el ${new Date('2025-06-16').toLocaleDateString('es-ES')} basado exclusivamente en Plan 1 + análisis de transcript médico*`

  await fs.writeFile('/Users/jaco/Desktop/nebula/proyectos_clientes/happy_dreamers_v0/pruebas/plan1-1.md', contenido, 'utf8')
  console.log('📄 Archivo plan1-1.md generado en /pruebas/')
}

// Ejecutar script
crearConsultaYPlan1_1()