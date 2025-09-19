/**
 * Script de mantenimiento para corregir parentId en la colecciÃ³n children
 * 
 * Problema: Algunos niÃ±os tienen parentId guardado como string en lugar de ObjectId
 * SoluciÃ³n: Convertir todos los parentId de string a ObjectId
 * 
 * Uso: node scripts/fix-parent-ids.js
 */

const { ObjectId } = require('mongodb')
const { connect, getDb, disconnect } = require('./mongoose-util');
require('dotenv').config({ path: '.env' });

async function fixParentIds() {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('âŒ Error: MONGODB_URI no estÃ¡ configurado en .env');
    process.exit(1);
  }
  
  /* mongoose connection handled in connect() */
  
  try {
    await connect();
    console.log('âœ… Conectado a MongoDB');
    
    const db = await getDb();
    
    console.log('\nðŸ”§ CORRIGIENDO parentId EN COLECCIÃ“N children');
    console.log('==============================================\n');
    
    // Buscar todos los niÃ±os
    const children = await db.collection('children').find({}).toArray();
    
    let fixed = 0;
    let alreadyCorrect = 0;
    let errors = 0;
    
    for (const child of children) {
      try {
        // Verificar si parentId es string
        if (typeof child.parentId === 'string') {
          console.log(`ðŸ”„ Corrigiendo niÃ±o: ${child.firstName} ${child.lastName || ''}`);
          console.log(`   parentId actual (string): ${child.parentId}`);
          
          // Validar que el string es un ObjectId vÃ¡lido
          if (!ObjectId.isValid(child.parentId)) {
            console.log(`   âš ï¸ parentId no es un ObjectId vÃ¡lido, saltando...`);
            errors++;
            continue;
          }
          
          // Convertir a ObjectId
          const result = await db.collection('children').updateOne(
            { _id: child._id },
            { $set: { parentId: new ObjectId(child.parentId) } }
          );
          
          if (result.modifiedCount > 0) {
            console.log(`   âœ… Convertido a ObjectId\n`);
            fixed++;
          }
        } else if (child.parentId instanceof ObjectId) {
          alreadyCorrect++;
        } else {
          console.log(`âš ï¸ NiÃ±o ${child.firstName} tiene parentId de tipo desconocido:`, typeof child.parentId);
          errors++;
        }
      } catch (error) {
        console.error(`âŒ Error procesando niÃ±o ${child._id}:`, error.message);
        errors++;
      }
    }
    
    // Resumen
    console.log('\nðŸ“Š RESUMEN:');
    console.log('============');
    console.log(`Total de niÃ±os revisados: ${children.length}`);
    console.log(`âœ… NiÃ±os corregidos: ${fixed}`);
    console.log(`âœ… NiÃ±os ya correctos: ${alreadyCorrect}`);
    if (errors > 0) {
      console.log(`âš ï¸ Errores encontrados: ${errors}`);
    }
    
    // VerificaciÃ³n final
    if (fixed > 0) {
      console.log('\nðŸ” VERIFICACIÃ“N FINAL:');
      console.log('======================\n');
      
      const stillStrings = await db.collection('children').find({
        parentId: { $type: 'string' }
      }).toArray();
      
      if (stillStrings.length === 0) {
        console.log('âœ… Todos los parentId son ahora ObjectId');
      } else {
        console.log(`âš ï¸ AÃºn quedan ${stillStrings.length} niÃ±os con parentId como string`);
      }
    }
    
  } catch (error) {
    console.error('âŒ Error:', error.message);
    process.exit(1);
  } finally {
    await disconnect();
    console.log('\nðŸ”’ ConexiÃ³n cerrada');
  }
}

// Ejecutar el script
fixParentIds().catch(console.error);