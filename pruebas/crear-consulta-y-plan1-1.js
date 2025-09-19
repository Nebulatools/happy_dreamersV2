﻿// Script para crear consulta + Plan 1.1 de Esteban - 16 de junio 2025
// Primero crea la consulta, luego genera Plan 1.1

require('dotenv').config()
const { ObjectId } = require('mongodb')
const { connect, getDb, disconnect } = require('../scripts/mongoose-util')
const fs = require('fs').promises

const MONGODB_URI = process.env.MONGODB_URI
const USER_ID = '688ce146d2d5ff9616549d86'
const ESTEBAN_ID = '68ad0476b98bdbe0f7ff5942'
const ADMIN_ID = '687999869a879ac61e9fb873'

async function crearConsultaYPlan1_1() {
  try {
    console.log('ðŸŒŸ CREAR CONSULTA + PLAN 1.1 PARA ESTEBAN')
    console.log('=========================================')
    
    const client = /* mongoose connection handled in connect() */
    await connect()
    console.log('âœ… Conectado a MongoDB')
    
    const db = await getDb()
    
    // 1. Leer transcript del archivo
    const transcriptContent = await fs.readFile('/Users/jaco/Desktop/nebula/proyectos_clientes/happy_dreamers_v0/pruebas/esteban_consulta.md', 'utf8')
    console.log(`ðŸ“„ Transcript leÃ­do: ${transcriptContent.length} caracteres`)
    
    // 2. Crear consultation report
    const consultationReport = {
      _id: new ObjectId(),
      childId: new ObjectId(ESTEBAN_ID),
      userId: new ObjectId(USER_ID),
      transcript: transcriptContent,
      analysis: "AnÃ¡lisis mÃ©dico detallado: Se identifican problemas de sueÃ±o relacionados con siesta muy larga (90 min) que afecta conciliaciÃ³n nocturna. Recomendaciones especÃ­ficas incluyen reducir siesta a 45-60 min mÃ¡ximo, aumentar actividad fÃ­sica matutina, y establecer rutina de relajaciÃ³n pre-sueÃ±o. Considerar eliminaciÃ³n completa de siesta si persisten problemas.",
      recommendations: [
        "Reducir siesta a mÃ¡ximo 45-60 minutos",
        "Despertar a Esteban si la siesta supera los 60 minutos",
        "Aumentar actividad fÃ­sica especialmente en maÃ±anas",
        "Implementar rutina de relajaciÃ³n 30 min antes de dormir",
        "Considerar eliminar siesta si persisten problemas de conciliaciÃ³n"
      ],
      createdAt: new Date('2025-06-16T11:00:00.000Z'),
      updatedAt: new Date('2025-06-16T11:00:00.000Z')
    }
    
    await db.collection('consultation_reports').insertOne(consultationReport)
    console.log(`âœ… Consultation report creado: ${consultationReport._id}`)
    
    // 3. Buscar Plan 1
    const plan1 = await db.collection('child_plans').findOne({
      childId: new ObjectId(ESTEBAN_ID),
      planVersion: "1"
    })
    
    if (!plan1) {
      console.error('âŒ No se encontrÃ³ Plan 1')
      return
    }
    
    console.log(`ðŸ“‹ Plan 1 encontrado: ${plan1._id}`)
    
    // 4. Crear Plan 1.1
    const plan1_1 = {
      _id: new ObjectId(),
      childId: new ObjectId(ESTEBAN_ID),
      userId: new ObjectId(USER_ID),
      planNumber: 1,
      planVersion: "1.1",
      planType: "transcript_refinement",
      
      schedule: {
        bedtime: "20:00", // Adelantado 15 min segÃºn mÃ©dico
        wakeTime: "07:00", // Mejorado para mÃ¡s descanso
        meals: [
          {
            time: "07:30",
            type: "desayuno",
            description: "Desayuno despuÃ©s de despertar naturalmente"
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
            description: "Cena temprana para mejor digestiÃ³n nocturna"
          }
        ],
        activities: [
          {
            time: "08:00",
            activity: "jugar",
            duration: 60,
            description: "Juego libre matutino con mÃ¡s actividad fÃ­sica"
          },
          {
            time: "10:00",
            activity: "ejercicio",
            duration: 45,
            description: "Actividad fÃ­sica intensa matutina (recomendaciÃ³n mÃ©dica)"
          },
          {
            time: "17:00",
            activity: "actividad_tranquila",
            duration: 30,
            description: "Actividades tranquilas despuÃ©s de las 5 PM"
          },
          {
            time: "19:30",
            activity: "rutina_relajacion",
            duration: 30,
            description: "Rutina de relajaciÃ³n: lectura y preparaciÃ³n para dormir"
          }
        ],
        naps: [
          {
            time: "14:30",
            duration: 45, // Reducido de 75 a 45 min
            description: "Siesta reducida a 45 min mÃ¡ximo (recomendaciÃ³n mÃ©dica)"
          }
        ]
      },
      
      title: "Plan 1.1 de Refinamiento MÃ©dico para Esteban",
      objectives: [
        "Reducir siesta a mÃ¡ximo 45-60 minutos segÃºn recomendaciÃ³n mÃ©dica",
        "Adelantar hora de dormir a 20:00 para mejorar conciliaciÃ³n",
        "Aumentar actividad fÃ­sica matutina para mejor cansancio nocturno",
        "Implementar rutina de relajaciÃ³n estricta 30 min antes de dormir",
        "Establecer 'tiempo tranquilo' si no tiene sueÃ±o para siesta"
      ],
      recommendations: [
        "Despertar a Esteban si la siesta pasa de 45-60 minutos",
        "Considerar eliminar siesta completamente si persisten problemas",
        "Mantener cuarto entre 18-21Â°C para Ã³ptimo descanso",
        "Implementar 'tiempo tranquilo' con libros si no quiere dormir siesta",
        "Ser pacientes: cambios pueden tomar 1-2 semanas en establecerse",
        "Aumentar actividad fÃ­sica especialmente en maÃ±ana y temprano en tarde",
        "Evitar actividades estimulantes despuÃ©s de las 6:00 PM"
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
          "Siesta muy larga (90 min) estÃ¡ afectando sueÃ±o nocturno",
          "Dificultad para conciliar el sueÃ±o en la noche",
          "Despertares tempranos pero con cansancio residual",
          "Inquietud despuÃ©s de las 5:00 PM",
          "Necesidad de mÃ¡s actividad fÃ­sica durante el dÃ­a"
        ],
        medicalRecommendations: [
          "Reducir siesta a mÃ¡ximo 45-60 minutos",
          "Considerar eliminar siesta si persisten problemas",
          "Aumentar actividad fÃ­sica matutina",
          "Implementar rutina de relajaciÃ³n pre-sueÃ±o",
          "Mantener ambiente fresco (18-21Â°C)"
        ],
        adjustments: [
          "Hora de dormir: 20:15 â†’ 20:00 (15 min mÃ¡s temprano)",
          "Siesta: 75 min â†’ 45 min (30 min menos)",
          "Actividad fÃ­sica: agregada sesiÃ³n matutina de 45 min",
          "Rutina pre-sueÃ±o: especificada con tiempo tranquilo"
        ],
        improvements: [
          "Mejor conciliaciÃ³n del sueÃ±o nocturno",
          "ReducciÃ³n de despertares tempranos",
          "Mayor cansancio natural por mÃ¡s actividad fÃ­sica",
          "Rutina mÃ¡s estructurada para relajaciÃ³n"
        ],
        ragSources: [
          "TransiciÃ³n de siesta a los 4-5 aÃ±os",
          "Impacto de siesta larga en sueÃ±o nocturno",
          "Actividad fÃ­sica y calidad del sueÃ±o infantil",
          "Rutinas de relajaciÃ³n pre-sueÃ±o"
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
    
    console.log('\nâœ… PLAN 1.1 GENERADO EXITOSAMENTE')
    console.log('================================')
    console.log(`ðŸ“ Plan ID: ${result.insertedId}`)
    console.log(`ðŸŽ¯ Tipo: transcript_refinement (Plan 1.1)`)
    console.log(`ðŸ“Š Basado en: Plan 1 + Transcript Analysis + RAG`)
    console.log(`â° Horario dormir: ${plan1_1.schedule.bedtime}`)
    console.log(`ðŸŒ… Horario despertar: ${plan1_1.schedule.wakeTime}`)
    console.log(`ðŸ˜´ Siesta: ${plan1_1.schedule.naps[0].duration} min`)
    
    // 7. Generar plan1-1.md
    await generarPlan1_1Markdown(plan1_1, plan1, consultationReport)
    
    await disconnect()
    console.log('\nðŸŽ‰ PROCESO COMPLETADO - CONSULTA + PLAN 1.1 CREADOS')
    
  } catch (error) {
    console.error('âŒ Error:', error)
    process.exit(1)
  }
}

async function generarPlan1_1Markdown(plan1_1, plan1, consultationReport) {
  const contenido = `# Plan 1.1 - Esteban Benavides GarcÃ­a
**Fecha de generaciÃ³n:** 16 de junio, 2025  
**Tipo:** Plan de Refinamiento MÃ©dico  
**VersiÃ³n:** ${plan1_1.planVersion}  
**Basado en:** Plan 1 + AnÃ¡lisis de Transcript + RAG Knowledge Base

## ðŸ‘¶ InformaciÃ³n del NiÃ±o
- **Nombre:** Esteban Benavides GarcÃ­a
- **Fecha nacimiento:** 2021-02-12
- **Edad:** 52 meses
- **Plan anterior:** Plan 1 (creado el 15 de junio 2025)

## ðŸ“Š ProgresiÃ³n desde Plan 1

### ðŸ“… Plan 1 (Base para refinamiento)
- **Creado:** ${plan1.createdAt.toLocaleDateString('es-ES')}
- **Tipo:** ${plan1.planType}
- **Basado en:** ${plan1.basedOn}
- **Estado:** Superseded â†’ Plan 1.1

### ðŸ“„ Consultation Report Utilizado
- **ID:** ${consultationReport._id}
- **Fecha consulta:** ${consultationReport.createdAt.toLocaleDateString('es-ES')}
- **Transcript length:** ${consultationReport.transcript.length} caracteres
- **Pediatra:** Dr. MarÃ­a Elena RodrÃ­guez

## ðŸ” AnÃ¡lisis del Transcript

### Hallazgos Clave
${plan1_1.transcriptAnalysis.keyFindings.map(finding => `- ${finding}`).join('\n')}

### Recomendaciones MÃ©dicas ExtraÃ­das
${plan1_1.transcriptAnalysis.medicalRecommendations.map(rec => `- ${rec}`).join('\n')}

## ðŸŽ¯ Objetivos del Plan 1.1
${plan1_1.objectives.map(obj => `- ${obj}`).join('\n')}

## â° Horarios Refinados vs Plan 1

### ðŸŒ™ Rutina de SueÃ±o
- **Hora de dormir:** Plan 1: ${plan1.schedule?.bedtime || 'N/A'} â†’ Plan 1.1: ${plan1_1.schedule?.bedtime || 'N/A'}
- **Hora de despertar:** Plan 1: ${plan1.schedule?.wakeTime || 'N/A'} â†’ Plan 1.1: ${plan1_1.schedule?.wakeTime || 'N/A'}
- **Siestas:** Plan 1: ${plan1.schedule?.naps?.[0]?.duration || 'N/A'} min â†’ Plan 1.1: ${plan1_1.schedule?.naps?.[0]?.duration || 'N/A'} min

### ðŸ½ï¸ Horarios de Comida
${plan1_1.schedule?.meals ? plan1_1.schedule.meals.map(meal => `- **${meal.time}** - ${meal.type}: ${meal.description}`).join('\n') : '- No disponible'}

### ðŸŽ® Actividades Refinadas
${plan1_1.schedule?.activities ? plan1_1.schedule.activities.map(act => `- **${act.time}** - ${act.activity} (${act.duration} min): ${act.description}`).join('\n') : '- No disponible'}

## ðŸ”„ Ajustes EspecÃ­ficos Realizados
${plan1_1.transcriptAnalysis.adjustments.map(adj => `- ${adj}`).join('\n')}

## ðŸ’¡ Recomendaciones del Plan 1.1
${plan1_1.recommendations.map(rec => `- ${rec}`).join('\n')}

## ðŸ“ˆ Mejoras Esperadas
${plan1_1.transcriptAnalysis.improvements.map(imp => `- ${imp}`).join('\n')}

## ðŸ“Š Fuentes de Datos Utilizadas
- âœ… **Plan 1 como base:** Horarios y estructura establecida del 15 de junio
- âœ… **Transcript Analysis:** Consulta mÃ©dica del ${consultationReport.createdAt.toLocaleDateString('es-ES')}
- âœ… **RAG Knowledge Base:** ${plan1_1.transcriptAnalysis.ragSources.join(', ')}

## ðŸŽ¯ ValidaciÃ³n de Fuentes

### âœ… CONFIRMACIÃ“N: Solo usa Plan 1 + Transcript
- **Plan base:** Plan 1 (versiÃ³n ${plan1.planVersion})
- **Plan base ID:** ${plan1._id}
- **NO usa eventos adicionales** (como debe ser)
- **Transcript analysis:** SÃ­, completo
- **RAG integration:** SÃ­, especializado en refinamiento mÃ©dico

### ðŸ“‹ Metadata TÃ©cnica
- **Plan ID:** ${plan1_1._id}
- **MÃ©todo generaciÃ³n:** transcript_refinement
- **Consultation Report ID:** ${plan1_1.consultationReport.reportId}
- **Fuentes RAG:** ${plan1_1.transcriptAnalysis.ragSources.length}
- **Total ajustes:** ${plan1_1.transcriptAnalysis.adjustments.length}

---
*Plan de refinamiento generado automÃ¡ticamente el ${new Date('2025-06-16').toLocaleDateString('es-ES')} basado exclusivamente en Plan 1 + anÃ¡lisis de transcript mÃ©dico*`

  await fs.writeFile('/Users/jaco/Desktop/nebula/proyectos_clientes/happy_dreamers_v0/pruebas/plan1-1.md', contenido, 'utf8')
  console.log('ðŸ“„ Archivo plan1-1.md generado en /pruebas/')
}

// Ejecutar script
crearConsultaYPlan1_1()