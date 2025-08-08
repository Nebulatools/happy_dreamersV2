/**
 * Script para corregir valores de sleepDelay excesivos en la base de datos
 * Limita todos los sleepDelay a un máximo de 180 minutos (3 horas)
 * 
 * Ejecutar con: node scripts/fix-sleep-delay.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function fixSleepDelays() {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('❌ MONGODB_URI no está configurado en .env');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB');

    const db = client.db(process.env.MONGODB_DB || 'happy-dreamers');
    const collection = db.collection('children');

    // Buscar todos los niños con eventos
    const children = await collection.find({ events: { $exists: true } }).toArray();
    console.log(`📊 Encontrados ${children.length} niños con eventos`);

    let totalFixed = 0;
    let totalEvents = 0;

    for (const child of children) {
      if (!child.events || !Array.isArray(child.events)) continue;

      let childFixed = false;
      const updatedEvents = child.events.map(event => {
        totalEvents++;
        
        if (event.sleepDelay && event.sleepDelay > 180) {
          console.log(`  ⚠️ Niño: ${child.firstName} ${child.lastName || ''} - Evento ${event.eventType} con sleepDelay de ${event.sleepDelay} minutos`);
          console.log(`     Fecha: ${event.startTime ? new Date(event.startTime).toLocaleString() : 'Sin fecha'}`);
          console.log(`     Corrigiendo a 180 minutos (máximo permitido)`);
          
          totalFixed++;
          childFixed = true;
          
          return {
            ...event,
            sleepDelay: 180,
            notes: (event.notes || '') + ' [sleepDelay corregido automáticamente de ' + event.sleepDelay + ' a 180 minutos]'
          };
        }
        
        return event;
      });

      // Solo actualizar si hubo cambios
      if (childFixed) {
        await collection.updateOne(
          { _id: child._id },
          { $set: { events: updatedEvents } }
        );
        console.log(`  ✅ Actualizado niño: ${child.firstName} ${child.lastName || ''}`);
      }
    }

    console.log('\n📊 Resumen:');
    console.log(`  - Total de eventos procesados: ${totalEvents}`);
    console.log(`  - Eventos corregidos: ${totalFixed}`);
    console.log(`  - Porcentaje corregido: ${((totalFixed / totalEvents) * 100).toFixed(2)}%`);

    if (totalFixed > 0) {
      console.log('\n✅ Corrección completada exitosamente');
      console.log('ℹ️  Los valores de sleepDelay mayores a 180 minutos han sido limitados a 180 minutos');
      console.log('ℹ️  Se agregó una nota a cada evento corregido para mantener trazabilidad');
    } else {
      console.log('\n✅ No se encontraron eventos con sleepDelay mayor a 180 minutos');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔒 Conexión cerrada');
  }
}

// Ejecutar el script
fixSleepDelays().catch(console.error);