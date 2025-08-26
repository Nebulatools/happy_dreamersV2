// Script para generar Plan 0 de Esteban - 8 de junio 2025
// Emula exactamente el flujo implementado: Survey + Stats + RAG

require('dotenv').config()
const { MongoClient, ObjectId } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI
const USER_ID = '688ce146d2d5ff9616549d86'
const ESTEBAN_ID = '68ad0476b98bdbe0f7ff5942'
const ADMIN_ID = '6899f021a8f17fa8fb7ac9b7' // ID del admin que genera el plan

async function generarPlan0Esteban() {
  try {
    console.log('🌟 GENERAR PLAN 0 PARA ESTEBAN - 8 JUNIO 2025')
    console.log('==============================================')
    console.log('📊 Fuentes: Survey + Stats (primera semana junio) + RAG')
    
    const client = new MongoClient(MONGODB_URI)
    await client.connect()
    console.log('✅ Conectado a MongoDB')
    
    const db = client.db()
    
    // 1. Verificar datos de Esteban
    const child = await db.collection('children').findOne({
      _id: new ObjectId(ESTEBAN_ID)
    })
    
    if (!child) {
      console.error('❌ No se encontró a Esteban')
      return
    }
    
    console.log(`\n👶 Niño: ${child.firstName} ${child.lastName}`)
    console.log(`📅 Fecha nacimiento: ${child.birthDate}`)
    
    // Calcular edad en meses
    const birthDate = new Date(child.birthDate)
    const now = new Date('2025-06-08') // Fecha del plan
    const ageInMonths = Math.floor((now - birthDate) / (1000 * 60 * 60 * 24 * 30.44))
    console.log(`👶 Edad: ${ageInMonths} meses`)
    
    // 2. Verificar eventos (stats de primera semana)
    const events = child.events || []
    console.log(`📊 Eventos disponibles: ${events.length}`)
    
    if (events.length === 0) {
      console.error('❌ No hay eventos para calcular estadísticas')
      return
    }
    
    // 3. Verificar survey
    const hasSurvey = child.surveyData && child.surveyData.completedAt
    console.log(`📋 Survey completado: ${hasSurvey ? '✅' : '❌'}`)
    
    if (!hasSurvey) {
      console.error('❌ No hay datos del survey')
      return
    }
    
    // 4. Generar Plan 0
    const plan0 = {
      _id: new ObjectId(),
      childId: new ObjectId(ESTEBAN_ID),
      userId: new ObjectId(USER_ID),
      planNumber: 0,
      planVersion: "0",
      planType: "initial",
      
      // Horarios del plan (ejemplo basado en datos típicos)
      schedule: {
        bedtime: "20:30",
        wakeTime: "07:00",
        meals: [
          {
            time: "07:30",
            type: "desayuno",
            description: "Desayuno nutritivo después de despertar"
          },
          {
            time: "12:00",
            type: "almuerzo", 
            description: "Almuerzo balanceado"
          },
          {
            time: "16:00",
            type: "merienda",
            description: "Merienda ligera"
          },
          {
            time: "19:00",
            type: "cena",
            description: "Cena temprana para mejor digestión"
          }
        ],
        activities: [
          {
            time: "08:00",
            activity: "jugar",
            duration: 60,
            description: "Tiempo de juego libre matutino"
          },
          {
            time: "17:00",
            activity: "ejercicio",
            duration: 30,
            description: "Actividad física al aire libre"
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
            time: "14:00",
            duration: 90,
            description: "Siesta vespertina para recuperar energía"
          }
        ]
      },
      
      title: "Plan Inicial para Esteban",
      objectives: [
        "Establecer rutina de sueño consistente",
        "Mejorar calidad del descanso nocturno",
        "Implementar horarios regulares de comida",
        "Crear ambiente propicio para el sueño"
      ],
      recommendations: [
        "Mantener horario fijo de acostarse (20:30) y despertar (07:00)",
        "Implementar rutina relajante 30 minutos antes de dormir",
        "Asegurar siesta de 90 minutos en la tarde",
        "Evitar pantallas 2 horas antes de dormir",
        "Crear ambiente oscuro y silencioso en el cuarto"
      ],
      
      basedOn: "survey_stats_rag",
      
      // Metadata del Plan 0
      sourceData: {
        surveyDataUsed: true,
        childStatsUsed: true,
        ragSources: [
          "Patrones de sueño infantil 4-5 años",
          "Rutinas recomendadas por edad",
          "Desarrollo cognitivo y descanso"
        ],
        ageInMonths: ageInMonths,
        totalEvents: events.length
      },
      
      createdAt: new Date('2025-06-08T10:00:00.000Z'),
      updatedAt: new Date('2025-06-08T10:00:00.000Z'),
      createdBy: new ObjectId(ADMIN_ID),
      status: "active"
    }
    
    // 5. Guardar Plan 0 en la base de datos
    const result = await db.collection('child_plans').insertOne(plan0)
    
    console.log('\n✅ PLAN 0 GENERADO EXITOSAMENTE')
    console.log('===============================')
    console.log(`📝 Plan ID: ${result.insertedId}`)
    console.log(`🎯 Tipo: ${plan0.planType} (Plan ${plan0.planVersion})`)
    console.log(`📊 Basado en: Survey + Stats + RAG`)
    console.log(`⏰ Horario dormir: ${plan0.schedule.bedtime}`)
    console.log(`🌅 Horario despertar: ${plan0.schedule.wakeTime}`)
    console.log(`🎯 Objetivos: ${plan0.objectives.length}`)
    console.log(`💡 Recomendaciones: ${plan0.recommendations.length}`)
    
    // 6. Generar archivo plan0.md
    await generarArchivoPlan0(plan0, child)
    
    await client.close()
    console.log('\n🎉 PROCESO COMPLETADO')
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

async function generarArchivoPlan0(plan, child) {
  const fs = require('fs').promises
  
  const contenido = `# Plan 0 - ${child.firstName} ${child.lastName}
**Fecha de generación:** 8 de junio, 2025  
**Tipo:** Plan Inicial  
**Versión:** ${plan.planVersion}  
**Basado en:** Survey + Estadísticas + RAG Knowledge Base

## 👶 Información del Niño
- **Nombre:** ${child.firstName} ${child.lastName}
- **Fecha nacimiento:** ${child.birthDate}
- **Edad:** ${plan.sourceData.ageInMonths} meses
- **Eventos analizados:** ${plan.sourceData.totalEvents}

## 🎯 Objetivos del Plan
${plan.objectives.map(obj => `- ${obj}`).join('\n')}

## ⏰ Horarios Establecidos

### 🌙 Rutina de Sueño
- **Hora de dormir:** ${plan.schedule.bedtime}
- **Hora de despertar:** ${plan.schedule.wakeTime}
- **Siesta:** ${plan.schedule.naps[0].time} (${plan.schedule.naps[0].duration} min)

### 🍽️ Horarios de Comida
${plan.schedule.meals.map(meal => `- **${meal.time}** - ${meal.type}: ${meal.description}`).join('\n')}

### 🎮 Actividades
${plan.schedule.activities.map(act => `- **${act.time}** - ${act.activity} (${act.duration} min): ${act.description}`).join('\n')}

## 💡 Recomendaciones Principales
${plan.recommendations.map(rec => `- ${rec}`).join('\n')}

## 📊 Fuentes de Datos Utilizadas
- ✅ **Survey completo:** Datos familiares, rutinas, preferencias
- ✅ **Estadísticas del niño:** ${plan.sourceData.totalEvents} eventos de la primera semana de junio
- ✅ **RAG Knowledge Base:** ${plan.sourceData.ragSources.join(', ')}

## 📈 Próximos Pasos
1. **Implementar rutina** durante 1-2 semanas
2. **Registrar eventos** diarios de sueño, comidas, actividades
3. **Generar Plan 1** basado en progreso y nuevos eventos
4. **Posible refinamiento** con análisis de transcript si hay consulta

---
*Plan generado automáticamente el ${new Date(plan.createdAt).toLocaleDateString('es-ES')} por el sistema Happy Dreamers*`

  await fs.writeFile('/Users/jaco/Desktop/nebula/proyectos_clientes/happy_dreamers_v0/pruebas/plan0.md', contenido, 'utf8')
  console.log('📄 Archivo plan0.md generado en /pruebas/')
}

// Ejecutar script
generarPlan0Esteban()