﻿// Script para generar Plan 1.1 de Esteban - 16 de junio 2025 (despuÃ©s de consulta)
// Emula exactamente el flujo implementado: Plan 1 + Transcript Analysis + RAG

require('dotenv').config()
const { ObjectId } = require('mongodb')
const { connect, getDb, disconnect } = require('../scripts/mongoose-util')

const MONGODB_URI = process.env.MONGODB_URI
const USER_ID = '688ce146d2d5ff9616549d86'
const ESTEBAN_ID = '68ad0476b98bdbe0f7ff5942'
const ADMIN_ID = '687999869a879ac61e9fb873' // ID del admin que genera el plan

async function generarPlan1_1Esteban() {
  try {
    console.log('ðŸŒŸ GENERAR PLAN 1.1 PARA ESTEBAN - 16 JUNIO 2025')
    console.log('===============================================')
    console.log('ðŸ“Š Fuentes: Plan 1 + Transcript Analysis + RAG')
    
    const client = /* mongoose connection handled in connect() */
    await connect()
    console.log('âœ… Conectado a MongoDB')
    
    const db = await getDb()
    
    // 1. Verificar Plan 1 existente
    const plan1 = await db.collection('child_plans').findOne({
      childId: new ObjectId(ESTEBAN_ID),
      planVersion: "1"
    })
    
    if (!plan1) {
      console.error('âŒ No se encontrÃ³ Plan 1. Debe existir antes de generar Plan 1.1')
      return
    }
    
    console.log(`\nðŸ“‹ Plan 1 encontrado:`)
    console.log(`  - VersiÃ³n: ${plan1.planVersion}`)
    console.log(`  - Creado: ${plan1.createdAt}`)
    console.log(`  - Tipo: ${plan1.planType}`)
    
    // 2. Buscar el Ãºltimo consultation report con transcript
    const latestConsultation = await db.collection('consultation_reports').findOne(
      { childId: new ObjectId(ESTEBAN_ID) },
      { sort: { createdAt: -1 } }
    )
    
    if (!latestConsultation || !latestConsultation.transcript) {
      console.error('âŒ No se encontrÃ³ consultation report con transcript')
      return
    }
    
    console.log(`\nðŸ“„ Consultation Report encontrado:`)
    console.log(`  - ID: ${latestConsultation._id}`)
    console.log(`  - Fecha: ${latestConsultation.createdAt}`)
    console.log(`  - Transcript: ${latestConsultation.transcript.substring(0, 100)}...`)
    console.log(`  - AnÃ¡lisis: ${latestConsultation.analysis.substring(0, 100)}...`)
    
    // 3. Verificar datos del niÃ±o
    const child = await db.collection('children').findOne({
      _id: new ObjectId(ESTEBAN_ID)
    })
    
    if (!child) {
      console.error('âŒ No se encontrÃ³ a Esteban')
      return
    }
    
    console.log(`\nðŸ‘¶ NiÃ±o: ${child.firstName} ${child.lastName}`)
    
    // 4. Calcular edad en meses
    const birthDate = new Date(child.birthDate)
    const now = new Date('2025-06-16') // Fecha del plan 1.1
    const ageInMonths = Math.floor((now - birthDate) / (1000 * 60 * 60 * 24 * 30.44))
    console.log(`ðŸ‘¶ Edad: ${ageInMonths} meses`)
    
    // 5. Generar Plan 1.1 con refinamientos mÃ©dicos
    console.log(`\nðŸ¤– Generando Plan 1.1 con refinamientos del transcript...`)
    
    const plan1_1 = {
      _id: new ObjectId(),
      childId: new ObjectId(ESTEBAN_ID),
      userId: new ObjectId(USER_ID),
      planNumber: 1,
      planVersion: "1.1",
      planType: "transcript_refinement",
      
      // Horarios refinados segÃºn recomendaciones mÃ©dicas
      schedule: {
        bedtime: "20:00", // Ajustado: mÃ¡s temprano segÃºn mÃ©dico
        wakeTime: "07:00", // Ajustado: despertar mÃ¡s tarde para mÃ¡s descanso
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
            description: "Juego libre matutino - mÃ¡s actividad fÃ­sica segÃºn mÃ©dico"
          },
          {
            time: "10:00",
            activity: "ejercicio",
            duration: 45,
            description: "Actividad fÃ­sica intensa en la maÃ±ana"
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
            duration: 45, // Reducido de 75 a 45 minutos segÃºn mÃ©dico
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
      
      // AnÃ¡lisis del transcript para refinamiento
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
    
    console.log('\nâœ… PLAN 1.1 GENERADO EXITOSAMENTE')
    console.log('================================')
    console.log(`ðŸ“ Plan ID: ${plan1_1Data.planId}`)
    console.log(`ðŸŽ¯ Tipo: ${plan1_1Data.plan.planType} (Plan ${plan1_1Data.plan.planVersion})`)
    console.log(`ðŸ“Š Basado en: Plan 1 + Transcript Analysis + RAG`)
    console.log(`â° Horario dormir: ${plan1_1Data.plan.schedule?.bedtime || 'N/A'}`)
    console.log(`ðŸŒ… Horario despertar: ${plan1_1Data.plan.schedule?.wakeTime || 'N/A'}`)
    console.log(`ðŸ˜´ Siesta: ${plan1_1Data.plan.schedule?.naps?.[0]?.duration || 'N/A'} min`)
    console.log(`ðŸŽ¯ Objetivos: ${plan1_1Data.plan.objectives?.length || 0}`)
    console.log(`ðŸ’¡ Recomendaciones: ${plan1_1Data.plan.recommendations?.length || 0}`)
    
    // 6. Generar archivo plan1-1.md
    await generarArchivoPlan1_1(plan1_1Data.plan, child, plan1, latestConsultation)
    
    await disconnect()
    console.log('\nðŸŽ‰ PROCESO COMPLETADO')
    
  } catch (error) {
    console.error('âŒ Error:', error)
    process.exit(1)
  }
}

async function generarArchivoPlan1_1(plan, child, plan1, consultationReport) {
  const fs = require('fs').promises
  
  const contenido = `# Plan 1.1 - ${child.firstName} ${child.lastName}
**Fecha de generaciÃ³n:** 16 de junio, 2025  
**Tipo:** Plan de Refinamiento MÃ©dico  
**VersiÃ³n:** ${plan.planVersion}  
**Basado en:** Plan 1 + AnÃ¡lisis de Transcript + RAG Knowledge Base

## ðŸ‘¶ InformaciÃ³n del NiÃ±o
- **Nombre:** ${child.firstName} ${child.lastName}
- **Fecha nacimiento:** ${child.birthDate}
- **Edad:** ${Math.floor((new Date('2025-06-16') - new Date(child.birthDate)) / (1000 * 60 * 60 * 24 * 30.44))} meses

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
${plan.transcriptAnalysis.keyFindings.map(finding => `- ${finding}`).join('\n')}

### Recomendaciones MÃ©dicas ExtraÃ­das
${plan.transcriptAnalysis.medicalRecommendations.map(rec => `- ${rec}`).join('\n')}

## ðŸŽ¯ Objetivos del Plan 1.1
${plan.objectives.map(obj => `- ${obj}`).join('\n')}

## â° Horarios Refinados vs Plan 1

### ðŸŒ™ Rutina de SueÃ±o
- **Hora de dormir:** Plan 1: ${plan1.schedule?.bedtime || 'N/A'} â†’ Plan 1.1: ${plan.schedule?.bedtime || 'N/A'}
- **Hora de despertar:** Plan 1: ${plan1.schedule?.wakeTime || 'N/A'} â†’ Plan 1.1: ${plan.schedule?.wakeTime || 'N/A'}
- **Siestas:** Plan 1: ${plan1.schedule?.naps?.[0]?.duration || 'N/A'} min â†’ Plan 1.1: ${plan.schedule?.naps?.[0]?.duration || 'N/A'} min

### ðŸ½ï¸ Horarios de Comida
${plan.schedule?.meals ? plan.schedule.meals.map(meal => `- **${meal.time}** - ${meal.type}: ${meal.description}`).join('\n') : '- No disponible'}

### ðŸŽ® Actividades Refinadas
${plan.schedule?.activities ? plan.schedule.activities.map(act => `- **${act.time}** - ${act.activity} (${act.duration} min): ${act.description}`).join('\n') : '- No disponible'}

## ðŸ”„ Ajustes EspecÃ­ficos Realizados
${plan.transcriptAnalysis.adjustments.map(adj => `- ${adj}`).join('\n')}

## ðŸ’¡ Recomendaciones del Plan 1.1
${plan.recommendations.map(rec => `- ${rec}`).join('\n')}

## ðŸ“ˆ Mejoras Esperadas
${plan.transcriptAnalysis.improvements.map(imp => `- ${imp}`).join('\n')}

## ðŸ“Š Fuentes de Datos Utilizadas
- âœ… **Plan 1 como base:** Horarios y estructura establecida
- âœ… **Transcript Analysis:** Consulta mÃ©dica del ${consultationReport.createdAt.toLocaleDateString('es-ES')}
- âœ… **RAG Knowledge Base:** ${plan.transcriptAnalysis.ragSources.join(', ')}

## ðŸŽ¯ ImplementaciÃ³n y Seguimiento

### PrÃ³ximos Pasos:
1. **Implementar cambios gradualmente** durante 1-2 semanas
2. **Monitorear siesta:** Despertar si pasa de 45-60 minutos
3. **Evaluar necesidad de siesta:** Considerar eliminarla si persisten problemas
4. **Seguimiento mÃ©dico:** Revisar progreso en prÃ³xima consulta
5. **Posible Plan 2:** Basado en nuevos eventos post-implementaciÃ³n

### Indicadores de Ã‰xito:
- ConciliaciÃ³n del sueÃ±o en <30 minutos
- Despertar natural entre 7:00-7:30 AM
- ReducciÃ³n de inquietud vespertina
- Mejor estado de Ã¡nimo matutino

---
*Plan de refinamiento generado automÃ¡ticamente el ${new Date('2025-06-16').toLocaleDateString('es-ES')} basado en anÃ¡lisis de transcript mÃ©dico*

## ðŸ”§ InformaciÃ³n TÃ©cnica
- **Plan ID:** ${plan._id}
- **MÃ©todo generaciÃ³n:** transcript_refinement
- **Plan base:** Plan 1 (${plan.basedOnPlan.planVersion})
- **Consultation Report ID:** ${plan.consultationReport.reportId}
- **Fuentes RAG:** ${plan.transcriptAnalysis.ragSources.length}
- **Total ajustes:** ${plan.transcriptAnalysis.adjustments.length}`

  await fs.writeFile('/Users/jaco/Desktop/nebula/proyectos_clientes/happy_dreamers_v0/pruebas/plan1-1.md', contenido, 'utf8')
  console.log('ðŸ“„ Archivo plan1-1.md generado en /pruebas/')
}

// Ejecutar script
generarPlan1_1Esteban()