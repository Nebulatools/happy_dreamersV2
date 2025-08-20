// Script para inspeccionar y corregir fechas inválidas en los datos regenerados
require('dotenv').config()
const { MongoClient, ObjectId } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI
const USER_ID = '688ce146d2d5ff9616549d86'

async function inspectAndFixDates() {
  try {
    const client = new MongoClient(MONGODB_URI)
    await client.connect()
    console.log('✅ Conectado a MongoDB')
    
    const db = client.db()
    
    // Buscar todos los niños del usuario test
    const children = await db.collection('children')
      .find({ parentId: USER_ID })
      .toArray()
    
    console.log(`\n📊 Encontrados ${children.length} niños del usuario test`)
    
    let totalInvalidEvents = 0
    let totalValidEvents = 0
    
    for (const child of children) {
      console.log(`\n👶 NIÑO: ${child.firstName} (${child.events?.length || 0} eventos)`)
      
      if (!child.events || child.events.length === 0) {
        console.log('   Sin eventos para revisar')
        continue
      }
      
      const invalidEvents = []
      const validEvents = []
      
      child.events.forEach((event, index) => {
        let isValid = true
        let errors = []
        
        // Verificar startTime
        if (!event.startTime) {
          isValid = false
          errors.push('startTime missing')
        } else {
          try {
            const startDate = new Date(event.startTime)
            if (isNaN(startDate.getTime())) {
              isValid = false
              errors.push('startTime invalid')
            }
          } catch (error) {
            isValid = false
            errors.push(`startTime error: ${error.message}`)
          }
        }
        
        // Verificar endTime si existe
        if (event.endTime) {
          try {
            const endDate = new Date(event.endTime)
            if (isNaN(endDate.getTime())) {
              isValid = false
              errors.push('endTime invalid')
            }
          } catch (error) {
            isValid = false
            errors.push(`endTime error: ${error.message}`)
          }
        }
        
        if (isValid) {
          validEvents.push(event)
        } else {
          invalidEvents.push({ 
            index, 
            eventType: event.eventType,
            startTime: event.startTime,
            endTime: event.endTime,
            errors 
          })
        }
      })
      
      console.log(`   ✅ Eventos válidos: ${validEvents.length}`)
      console.log(`   ❌ Eventos inválidos: ${invalidEvents.length}`)
      
      if (invalidEvents.length > 0) {
        console.log(`   🔍 Primeros 3 eventos problemáticos:`)
        invalidEvents.slice(0, 3).forEach((invalid, i) => {
          console.log(`      ${i+1}. ${invalid.eventType}`)
          console.log(`         StartTime: "${invalid.startTime}"`)
          console.log(`         EndTime: "${invalid.endTime || 'N/A'}"`)
          console.log(`         Errores: ${invalid.errors.join(', ')}`)
        })
        
        // Actualizar el niño con solo eventos válidos
        const updateResult = await db.collection('children').updateOne(
          { _id: child._id },
          { $set: { events: validEvents } }
        )
        
        console.log(`   🔧 Base de datos actualizada: ${updateResult.modifiedCount} niño modificado`)
      }
      
      totalInvalidEvents += invalidEvents.length
      totalValidEvents += validEvents.length
    }
    
    await client.close()
    
    console.log('\n📊 RESUMEN FINAL:')
    console.log(`✅ Eventos válidos totales: ${totalValidEvents}`)
    console.log(`❌ Eventos inválidos eliminados: ${totalInvalidEvents}`)
    console.log(`🎯 Porcentaje válido: ${Math.round((totalValidEvents / (totalValidEvents + totalInvalidEvents)) * 100)}%`)
    
    if (totalInvalidEvents === 0) {
      console.log('\n🎉 ¡No se encontraron fechas inválidas! Los datos están limpios.')
    } else {
      console.log('\n✅ Limpieza completada. El calendario debería funcionar correctamente ahora.')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

inspectAndFixDates()