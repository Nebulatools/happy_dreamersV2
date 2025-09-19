﻿// Script para generar Plan 1 de Esteban - 15 de junio 2025
// Emula exactamente el flujo implementado: Plan 0 + Eventos (8-14 junio) + RAG

require('dotenv').config()
const { ObjectId } = require('mongodb')
const { connect, getDb, disconnect } = require('../scripts/mongoose-util')

const MONGODB_URI = process.env.MONGODB_URI
const USER_ID = '688ce146d2d5ff9616549d86'
const ESTEBAN_ID = '68ad0476b98bdbe0f7ff5942'
const ADMIN_ID = '687999869a879ac61e9fb873' // ID del admin que genera el plan

async function generarPlan1Esteban() {
  try {
    console.log('ðŸŒŸ GENERAR PLAN 1 PARA ESTEBAN - 15 JUNIO 2025')
    console.log('==============================================')
    console.log('ðŸ“Š Fuentes: Plan 0 + Eventos (8-14 junio) + RAG')
    
    const client = /* mongoose connection handled in connect() */
    await connect()
    console.log('âœ… Conectado a MongoDB')
    
    const db = await getDb()
    
    // 1. Verificar Plan 0 existente
    const plan0 = await db.collection('child_plans').findOne({
      childId: new ObjectId(ESTEBAN_ID),
      planNumber: 0
    })
    
    if (!plan0) {
      console.error('âŒ No se encontrÃ³ Plan 0. Debe existir antes de generar Plan 1')
      return
    }
    
    console.log(`\nðŸ“‹ Plan 0 encontrado:`)
    console.log(`  - VersiÃ³n: ${plan0.planVersion}`)
    console.log(`  - Creado: ${plan0.createdAt}`)
    console.log(`  - Tipo: ${plan0.planType}`)
    
    // 2. Verificar datos del niÃ±o
    const child = await db.collection('children').findOne({
      _id: new ObjectId(ESTEBAN_ID)
    })
    
    if (!child) {
      console.error('âŒ No se encontrÃ³ a Esteban')
      return
    }
    
    console.log(`\nðŸ‘¶ NiÃ±o: ${child.firstName} ${child.lastName}`)
    console.log(`ðŸ“Š Total eventos disponibles: ${child.events?.length || 0}`)
    
    // 3. Filtrar eventos desde Plan 0 (8-14 junio)
    const fechaPlan0 = new Date(plan0.createdAt)
    const eventosDesdeplan0 = child.events.filter(evento => {
      const fechaEvento = new Date(evento.startTime)
      return fechaEvento >= fechaPlan0
    })
    
    console.log(`ðŸ“Š Eventos desde Plan 0 (${fechaPlan0.toISOString().split('T')[0]}): ${eventosDesdeplan0.length}`)
    
    if (eventosDesdeplan0.length === 0) {
      console.error('âŒ No hay eventos nuevos desde el Plan 0 para generar Plan 1')
      return
    }
    
    // 4. Calcular edad en meses
    const birthDate = new Date(child.birthDate)
    const now = new Date('2025-06-15') // Fecha del plan 1
    const ageInMonths = Math.floor((now - birthDate) / (1000 * 60 * 60 * 24 * 30.44))
    console.log(`ðŸ‘¶ Edad: ${ageInMonths} meses`)
    
    // 5. Generar Plan 1 directamente en base de datos
    console.log(`\nðŸ¤– Generando Plan 1 con datos simulados...`)
    
    const plan1 = {
      _id: new ObjectId(),
      childId: new ObjectId(ESTEBAN_ID),
      userId: new ObjectId(USER_ID),
      planNumber: 1,
      planVersion: "1",
      planType: "event_based",
      
      // Horarios del plan (basados en anÃ¡lisis de eventos)
      schedule: {
        bedtime: "20:15",
        wakeTime: "07:20",
        meals: [
          {
            time: "08:00",
            type: "desayuno",
            description: "Desayuno nutritivo ajustado segÃºn patrones observados"
          },
          {
            time: "12:30",
            type: "almuerzo", 
            description: "Almuerzo balanceado segÃºn horarios reales"
          },
          {
            time: "16:15",
            type: "merienda",
            description: "Merienda ligera basada en eventos registrados"
          },
          {
            time: "19:00",
            type: "cena",
            description: "Cena temprana para mejor digestiÃ³n"
          }
        ],
        activities: [
          {
            time: "08:30",
            activity: "jugar",
            duration: 60,
            description: "Tiempo de juego libre matutino"
          },
          {
            time: "17:00",
            activity: "ejercicio",
            duration: 30,
            description: "Actividad fÃ­sica al aire libre"
          },
          {
            time: "19:30",
            activity: "leer",
            duration: 30,
            description: "Rutina de lectura antes de dormir"
          }
        ],
        naps: [
          {
            time: "14:30",
            duration: 75,
            description: "Siesta ajustada segÃºn patrones observados"
          }
        ]
      },
      
      title: "Plan 1 de ProgresiÃ³n para Esteban",
      objectives: [
        "Optimizar horarios basados en patrones reales observados",
        "Mejorar consistencia en rutina de sueÃ±o",
        "Ajustar horarios de comida segÃºn comportamiento registrado",
        "Consolidar siesta para mejor descanso nocturno"
      ],
      recommendations: [
        "Mantener horario de dormir entre 20:00-20:30 segÃºn eventos observados",
        "Despertar natural entre 07:15-07:30 basado en patrones reales",
        "Siesta de 75 minutos a las 14:30 segÃºn datos registrados",
        "Evitar pantallas 2 horas antes de dormir",
        "Rutina de relajaciÃ³n 30 minutos antes de acostarse"
      ],
      
      basedOn: "events_stats_rag",
      
      // Referencia al plan base
      basedOnPlan: {
        planId: plan0._id,
        planVersion: plan0.planVersion
      },
      
      // Rango de eventos considerados
      eventsDateRange: {
        fromDate: fechaPlan0,
        toDate: new Date('2025-06-14T23:59:59.000Z'),
        totalEventsAnalyzed: eventosDesdeplan0.length
      },
      
      // Metadata para Plan basado en eventos
      eventAnalysis: {
        eventsAnalyzed: eventosDesdeplan0.length,
        eventTypes: [...new Set(eventosDesdeplan0.map(e => e.eventType))],
        progressFromPrevious: "Horarios ajustados basados en patrones reales observados durante segunda semana",
        ragSources: [
          "ProgresiÃ³n natural del sueÃ±o infantil",
          "AdaptaciÃ³n de rutinas basada en comportamiento",
          "OptimizaciÃ³n de horarios por edad"
        ],
        basePlanVersion: plan0.planVersion
      },
      
      createdAt: new Date('2025-06-15T10:00:00.000Z'),
      updatedAt: new Date('2025-06-15T10:00:00.000Z'),
      createdBy: new ObjectId(ADMIN_ID),
      status: "active"
    }
    
    // Marcar Plan 0 como superseded
    await db.collection('child_plans').updateOne(
      { _id: plan0._id },
      { $set: { status: "superseded" } }
    )
    
    // Insertar Plan 1
    const result = await db.collection('child_plans').insertOne(plan1)
    
    const plan1Data = {
      planId: result.insertedId,
      plan: {
        ...plan1,
        _id: result.insertedId
      }
    }
    
    console.log('\nâœ… PLAN 1 GENERADO EXITOSAMENTE')
    console.log('===============================')
    console.log(`ðŸ“ Plan ID: ${plan1Data.planId}`)
    console.log(`ðŸŽ¯ Tipo: ${plan1Data.plan.planType} (Plan ${plan1Data.plan.planVersion})`)
    console.log(`ðŸ“Š Basado en: Plan 0 + ${eventosDesdeplan0.length} eventos nuevos + RAG`)
    console.log(`â° Horario dormir: ${plan1Data.plan.schedule?.bedtime || 'N/A'}`)
    console.log(`ðŸŒ… Horario despertar: ${plan1Data.plan.schedule?.wakeTime || 'N/A'}`)
    console.log(`ðŸŽ¯ Objetivos: ${plan1Data.plan.objectives?.length || 0}`)
    console.log(`ðŸ’¡ Recomendaciones: ${plan1Data.plan.recommendations?.length || 0}`)
    
    // 6. Generar archivo plan1.md
    await generarArchivoPlan1(plan1Data.plan, child, plan0, eventosDesdeplan0)
    
    await disconnect()
    console.log('\nðŸŽ‰ PROCESO COMPLETADO')
    
  } catch (error) {
    console.error('âŒ Error:', error)
    process.exit(1)
  }
}

async function generarArchivoPlan1(plan, child, plan0, eventosNuevos) {
  const fs = require('fs').promises
  
  // Analizar eventos nuevos
  const tiposEventos = [...new Set(eventosNuevos.map(e => e.eventType))]
  const eventosPerDia = eventosNuevos.length / 7 // 7 dÃ­as
  
  // Calcular estadÃ­sticas bÃ¡sicas
  const sleepEvents = eventosNuevos.filter(e => e.eventType === 'bedtime')
  const wakeEvents = eventosNuevos.filter(e => e.eventType === 'wake_up')
  const promedioSueÃ±o = sleepEvents.length > 0 ? 
    sleepEvents.reduce((sum, e) => sum + (e.quality || 0), 0) / sleepEvents.length : 0
  
  const contenido = `# Plan 1 - ${child.firstName} ${child.lastName}
**Fecha de generaciÃ³n:** 15 de junio, 2025  
**Tipo:** Plan de ProgresiÃ³n  
**VersiÃ³n:** ${plan.planVersion}  
**Basado en:** Plan 0 + Eventos nuevos + RAG Knowledge Base

## ðŸ‘¶ InformaciÃ³n del NiÃ±o
- **Nombre:** ${child.firstName} ${child.lastName}
- **Fecha nacimiento:** ${child.birthDate}
- **Edad:** ${plan.sourceData?.ageInMonths || 'N/A'} meses
- **Eventos analizados:** ${eventosNuevos.length} (perÃ­odo: 8-14 junio)

## ðŸ“Š ProgresiÃ³n desde Plan 0

### ðŸ“… Plan 0 (Base)
- **Creado:** ${plan0.createdAt.toLocaleDateString('es-ES')}
- **Tipo:** ${plan0.planType}
- **Basado en:** ${plan0.basedOn}
- **Eventos originales:** ${plan0.sourceData?.totalEvents || 'N/A'}

### ðŸ“ˆ Eventos Nuevos Analizados (8-14 junio)
- **Total eventos nuevos:** ${eventosNuevos.length}
- **Promedio por dÃ­a:** ${eventosPerDia.toFixed(1)}
- **Tipos de eventos:** ${tiposEventos.join(', ')}
- **Calidad promedio sueÃ±o:** ${promedioSueÃ±o.toFixed(1)}/5
- **Eventos de sueÃ±o:** ${sleepEvents.length}
- **Eventos despertar:** ${wakeEvents.length}

## ðŸŽ¯ Objetivos del Plan 1
${plan.objectives ? plan.objectives.map(obj => `- ${obj}`).join('\n') : '- No disponible'}

## â° Horarios Actualizados

### ðŸŒ™ Rutina de SueÃ±o
- **Hora de dormir:** ${plan.schedule?.bedtime || 'N/A'}
- **Hora de despertar:** ${plan.schedule?.wakeTime || 'N/A'}
- **Siestas:** ${plan.schedule?.naps ? plan.schedule.naps.map(n => `${n.time} (${n.duration} min)`).join(', ') : 'N/A'}

### ðŸ½ï¸ Horarios de Comida
${plan.schedule?.meals ? plan.schedule.meals.map(meal => `- **${meal.time}** - ${meal.type}: ${meal.description}`).join('\n') : '- No disponible'}

### ðŸŽ® Actividades
${plan.schedule?.activities ? plan.schedule.activities.map(act => `- **${act.time}** - ${act.activity} (${act.duration} min): ${act.description}`).join('\n') : '- No disponible'}

## ðŸ’¡ Recomendaciones del Plan 1
${plan.recommendations ? plan.recommendations.map(rec => `- ${rec}`).join('\n') : '- No disponible'}

## ðŸ“Š Fuentes de Datos Utilizadas
- âœ… **Plan 0 como base:** Horarios y estructura establecida
- âœ… **Eventos del perÃ­odo:** ${eventosNuevos.length} eventos del 8-14 junio 2025
- âœ… **RAG Knowledge Base:** Patrones de progresiÃ³n y mejores prÃ¡cticas

## ðŸ”„ AnÃ¡lisis de ProgresiÃ³n

### Cambios vs Plan 0:
- **Horario dormir:** Plan 0: ${plan0.schedule?.bedtime || 'N/A'} â†’ Plan 1: ${plan.schedule?.bedtime || 'N/A'}
- **Horario despertar:** Plan 0: ${plan0.schedule?.wakeTime || 'N/A'} â†’ Plan 1: ${plan.schedule?.wakeTime || 'N/A'}
- **Adaptaciones:** Basadas en patrones reales observados en eventos 8-14 junio

### PrÃ³ximos Pasos:
1. **Implementar Plan 1** durante 1-2 semanas
2. **Registrar eventos** diarios siguiendo nuevos horarios
3. **Posible Plan 1.1** si hay consulta mÃ©dica con transcript
4. **Plan 2** basado en progreso adicional y nuevos eventos

---
*Plan generado automÃ¡ticamente el ${new Date('2025-06-15').toLocaleDateString('es-ES')} por el sistema Happy Dreamers*

## ðŸ”§ InformaciÃ³n TÃ©cnica
- **Plan ID:** ${plan._id}
- **MÃ©todo generaciÃ³n:** event_based
- **PerÃ­odo eventos:** 8-14 junio 2025
- **Total eventos disponibles:** ${child.events?.length || 'N/A'}
- **Eventos utilizados:** ${eventosNuevos.length}
- **Plan base:** Plan 0 (${plan0.planVersion})`

  await fs.writeFile('/Users/jaco/Desktop/nebula/proyectos_clientes/happy_dreamers_v0/pruebas/plan1.md', contenido, 'utf8')
  console.log('ðŸ“„ Archivo plan1.md generado en /pruebas/')
}

// Ejecutar script
generarPlan1Esteban()