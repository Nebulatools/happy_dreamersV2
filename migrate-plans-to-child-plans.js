// Script para migrar planes de sleep_plans a child_plans con estructura correcta
// y crear planes históricos específicos como solicitado
require('dotenv').config()
const { MongoClient, ObjectId } = require('mongodb')
const { subDays, format, addDays } = require('date-fns')

const MONGODB_URI = process.env.MONGODB_URI
const USER_ID = '688ce146d2d5ff9616549d86'

async function migratePlansToChildPlans() {
  console.log('🚀 MIGRANDO PLANES A ESTRUCTURA CHILD_PLANS')
  console.log('=' * 60)
  
  try {
    const client = new MongoClient(MONGODB_URI)
    await client.connect()
    console.log('✅ Conectado a MongoDB')
    
    const db = client.db()
    
    // 1. VERIFICAR DATOS ACTUALES
    console.log('\n🔍 VERIFICANDO ESTADO ACTUAL...')
    
    const existingSleepPlans = await db.collection('sleep_plans')
      .find({ parentId: new ObjectId(USER_ID) })
      .toArray()
    console.log(`📊 Planes en sleep_plans: ${existingSleepPlans.length}`)
    
    const existingChildPlans = await db.collection('child_plans')
      .find({ userId: new ObjectId(USER_ID) })
      .toArray()
    console.log(`📊 Planes en child_plans: ${existingChildPlans.length}`)
    
    // 2. LIMPIAR CHILD_PLANS EXISTENTES
    if (existingChildPlans.length > 0) {
      console.log('\n🧹 Limpiando child_plans existentes...')
      const deleteResult = await db.collection('child_plans')
        .deleteMany({ userId: new ObjectId(USER_ID) })
      console.log(`   🗑️  ${deleteResult.deletedCount} planes eliminados`)
    }
    
    // 3. OBTENER NIÑOS PARA MAPPING
    const children = await db.collection('children')
      .find({ parentId: USER_ID })
      .toArray()
    console.log(`👶 Niños encontrados: ${children.length}`)
    
    if (children.length === 0) {
      console.log('❌ No se encontraron niños. Ejecute primero generate-fixed-test-data.js')
      await client.close()
      return
    }
    
    // 4. CREAR PLANES HISTÓRICOS ESPECÍFICOS
    console.log('\n📋 CREANDO PLANES HISTÓRICOS ESPECÍFICOS...')
    const newChildPlans = []
    
    // Buscar a Sofía González específicamente
    const sofia = children.find(child => 
      child.firstName === 'Sofía' && child.lastName === 'González'
    )
    
    if (sofia) {
      console.log('👑 Creando plan histórico para Sofía González...')
      
      // Plan creado hace 1 mes (20 julio 2025)
      const planDate = subDays(new Date(), 30) // Hace 1 mes
      
      const sofiaPlan = {
        _id: new ObjectId(),
        childId: sofia._id,
        userId: new ObjectId(USER_ID),
        planNumber: 0, // Plan inicial
        planType: "initial",
        title: `Plan Inicial para ${sofia.firstName}`,
        
        // Horarios estructurados basados en su perfil "dormilona"
        schedule: {
          bedtime: "19:30",
          wakeTime: "07:30", // Más tarde porque es dormilona
          meals: [
            {
              time: "08:15", 
              type: "desayuno", 
              description: "Desayuno completo con frutas"
            },
            {
              time: "12:00", 
              type: "almuerzo", 
              description: "Almuerzo nutritivo"
            },
            {
              time: "15:30", 
              type: "merienda", 
              description: "Merienda saludable"
            },
            {
              time: "18:30", 
              type: "cena", 
              description: "Cena ligera"
            }
          ],
          activities: [
            {
              time: "17:00",
              activity: "juego_tranquilo", 
              duration: 45,
              description: "Juego tranquilo antes de la cena"
            },
            {
              time: "19:00",
              activity: "rutina_dormir",
              duration: 30,
              description: "Rutina relajante: baño, cuentos"
            }
          ],
          naps: [
            {
              time: "13:30", 
              duration: 120, // 2 horas porque es dormilona
              description: "Siesta larga de tarde"
            }
          ]
        },
        
        objectives: [
          "Establecer rutina de sueño consistente de 12 horas nocturnas",
          "Mantener siesta de 2 horas en la tarde",
          "Reducir tiempo de latencia para dormir a menos de 15 minutos"
        ],
        
        recommendations: [
          "Mantener horario fijo de acostarse (19:30) todos los días",
          "Crear ambiente tranquilo 1 hora antes de dormir",
          "Implementar rutina de baño + cuentos + música suave",
          "Evitar pantallas después de las 18:00",
          "Usar sonidos blancos si es necesario para calmarla"
        ],
        
        basedOn: "survey_stats_rag",
        
        sourceData: {
          surveyDataUsed: true,
          childStatsUsed: true,
          ragSources: ["Guía de sueño infantil", "Rutinas para niños de 2 años"],
          ageInMonths: 24, // Aproximadamente 2 años
          totalEvents: 850
        },
        
        createdAt: planDate, // Hace 1 mes
        updatedAt: planDate,
        createdBy: new ObjectId('000000000000000000000001'), // Admin genérico
        status: "active"
      }
      
      newChildPlans.push(sofiaPlan)
      console.log(`   ✅ Plan para ${sofia.firstName} creado (fecha: ${format(planDate, 'dd/MM/yyyy')})`)
    }
    
    // Crear planes para otros niños con fechas variadas
    const otherChildren = children.filter(child => !(child.firstName === 'Sofía' && child.lastName === 'González'))
    
    for (let i = 0; i < Math.min(otherChildren.length, 3); i++) {
      const child = otherChildren[i]
      const planDate = subDays(new Date(), 15 + (i * 5)) // Fechas escalonadas
      
      console.log(`👶 Creando plan para ${child.firstName}...`)
      
      const childPlan = {
        _id: new ObjectId(),
        childId: child._id,
        userId: new ObjectId(USER_ID),
        planNumber: 0,
        planType: "initial",
        title: `Plan Inicial para ${child.firstName}`,
        
        schedule: {
          bedtime: child.profile === 'activo' ? "20:00" : "19:45",
          wakeTime: child.profile === 'activo' ? "06:30" : "07:15",
          meals: [
            { time: "08:00", type: "desayuno", description: "Desayuno equilibrado" },
            { time: "12:30", type: "almuerzo", description: "Almuerzo completo" },
            { time: "16:00", type: "merienda", description: "Merienda nutritiva" },
            { time: "19:00", type: "cena", description: "Cena temprana" }
          ],
          activities: [
            {
              time: "16:30",
              activity: child.profile === 'activo' ? "ejercicio_fisico" : "juego_creativo",
              duration: 60,
              description: child.profile === 'activo' ? "Actividad física" : "Juego creativo tranquilo"
            }
          ],
          naps: child.napGoal > 0 ? [
            { time: "14:00", duration: Math.floor(child.napGoal * 60), description: "Siesta de tarde" }
          ] : []
        },
        
        objectives: [
          `Establecer ${child.sleepGoal} horas de sueño nocturno`,
          child.napGoal > 0 ? `Mantener siesta de ${child.napGoal}h` : "Mantener rutina sin siestas",
          "Mejorar calidad de sueño y reducir despertares"
        ],
        
        recommendations: [
          "Mantener horarios consistentes",
          `Rutina adaptada al temperamento ${child.temperament}`,
          "Ambiente propicio para el descanso",
          "Seguimiento diario de patrones"
        ],
        
        basedOn: "survey_stats_rag",
        
        sourceData: {
          surveyDataUsed: true,
          childStatsUsed: true,
          ragSources: [`Guía específica para perfil ${child.profile}`],
          ageInMonths: Math.floor((Date.now() - new Date(child.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44)),
          totalEvents: 450 + (i * 100)
        },
        
        createdAt: planDate,
        updatedAt: planDate,
        createdBy: new ObjectId('000000000000000000000001'),
        status: "active"
      }
      
      newChildPlans.push(childPlan)
      console.log(`   ✅ Plan para ${child.firstName} creado (fecha: ${format(planDate, 'dd/MM/yyyy')})`)
    }
    
    // 5. GUARDAR PLANES MIGRADOS
    if (newChildPlans.length > 0) {
      console.log('\n💾 Guardando planes en child_plans...')
      await db.collection('child_plans').insertMany(newChildPlans)
      console.log(`   ✅ ${newChildPlans.length} planes insertados correctamente`)
    }
    
    // 6. VERIFICAR RESULTADO
    console.log('\n🔍 VERIFICANDO RESULTADO...')
    const finalChildPlans = await db.collection('child_plans')
      .find({ userId: new ObjectId(USER_ID) })
      .toArray()
    
    console.log(`📊 Total planes en child_plans: ${finalChildPlans.length}`)
    
    finalChildPlans.forEach((plan, i) => {
      console.log(`   ${i+1}. ${plan.title} - ${format(new Date(plan.createdAt), 'dd/MM/yyyy')}`)
    })
    
    await client.close()
    console.log('\n🎉 ¡MIGRACIÓN COMPLETADA EXITOSAMENTE!')
    console.log('=' * 60)
    console.log('✅ Los planes ahora deberían ser visibles en la interfaz')
    console.log('✅ Sofía González tiene un plan creado hace 1 mes')
    console.log('✅ Otros niños tienen planes con fechas escalonadas')
    
  } catch (error) {
    console.error('❌ Error en migración:', error)
  }
}

// Ejecutar migración
migratePlansToChildPlans()