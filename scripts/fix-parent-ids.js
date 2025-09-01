/**
 * Script de mantenimiento para corregir parentId en la colección children
 * 
 * Problema: Algunos niños tienen parentId guardado como string en lugar de ObjectId
 * Solución: Convertir todos los parentId de string a ObjectId
 * 
 * Uso: node scripts/fix-parent-ids.js
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env' });

async function fixParentIds() {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('❌ Error: MONGODB_URI no está configurado en .env');
    process.exit(1);
  }
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB');
    
    const db = client.db(process.env.MONGODB_DB || 'happy-dreamers');
    
    console.log('\n🔧 CORRIGIENDO parentId EN COLECCIÓN children');
    console.log('==============================================\n');
    
    // Buscar todos los niños
    const children = await db.collection('children').find({}).toArray();
    
    let fixed = 0;
    let alreadyCorrect = 0;
    let errors = 0;
    
    for (const child of children) {
      try {
        // Verificar si parentId es string
        if (typeof child.parentId === 'string') {
          console.log(`🔄 Corrigiendo niño: ${child.firstName} ${child.lastName || ''}`);
          console.log(`   parentId actual (string): ${child.parentId}`);
          
          // Validar que el string es un ObjectId válido
          if (!ObjectId.isValid(child.parentId)) {
            console.log(`   ⚠️ parentId no es un ObjectId válido, saltando...`);
            errors++;
            continue;
          }
          
          // Convertir a ObjectId
          const result = await db.collection('children').updateOne(
            { _id: child._id },
            { $set: { parentId: new ObjectId(child.parentId) } }
          );
          
          if (result.modifiedCount > 0) {
            console.log(`   ✅ Convertido a ObjectId\n`);
            fixed++;
          }
        } else if (child.parentId instanceof ObjectId) {
          alreadyCorrect++;
        } else {
          console.log(`⚠️ Niño ${child.firstName} tiene parentId de tipo desconocido:`, typeof child.parentId);
          errors++;
        }
      } catch (error) {
        console.error(`❌ Error procesando niño ${child._id}:`, error.message);
        errors++;
      }
    }
    
    // Resumen
    console.log('\n📊 RESUMEN:');
    console.log('============');
    console.log(`Total de niños revisados: ${children.length}`);
    console.log(`✅ Niños corregidos: ${fixed}`);
    console.log(`✅ Niños ya correctos: ${alreadyCorrect}`);
    if (errors > 0) {
      console.log(`⚠️ Errores encontrados: ${errors}`);
    }
    
    // Verificación final
    if (fixed > 0) {
      console.log('\n🔍 VERIFICACIÓN FINAL:');
      console.log('======================\n');
      
      const stillStrings = await db.collection('children').find({
        parentId: { $type: 'string' }
      }).toArray();
      
      if (stillStrings.length === 0) {
        console.log('✅ Todos los parentId son ahora ObjectId');
      } else {
        console.log(`⚠️ Aún quedan ${stillStrings.length} niños con parentId como string`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔒 Conexión cerrada');
  }
}

// Ejecutar el script
fixParentIds().catch(console.error);