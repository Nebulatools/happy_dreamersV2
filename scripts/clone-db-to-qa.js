/**
 * Script para clonar colecciones de jaco_db_ultimate_2025 a happy_dreamers_qa01
 * Ejecutar con: node scripts/clone-db-to-qa.js
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://jaco:nebulatools@nebulacluster01.1rmm8s4.mongodb.net/?retryWrites=true&w=majority&appName=NebulaCluster01';
const SOURCE_DB = 'jaco_db_ultimate_2025';
const TARGET_DB = 'happy_dreamers_qa01';

async function cloneDatabase() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('Conectando a MongoDB Atlas...');
    await client.connect();
    console.log('✅ Conexión exitosa\n');

    const sourceDb = client.db(SOURCE_DB);
    const targetDb = client.db(TARGET_DB);

    // Obtener lista de colecciones en la base origen
    const collections = await sourceDb.listCollections().toArray();
    console.log(`📋 Colecciones encontradas en ${SOURCE_DB}:`);
    collections.forEach(col => console.log(`   - ${col.name}`));
    console.log(`\nTotal: ${collections.length} colecciones\n`);
    console.log('='.repeat(50));

    // Clonar cada colección
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;

      // Saltar colecciones del sistema
      if (collectionName.startsWith('system.')) {
        console.log(`⏭️  Saltando colección del sistema: ${collectionName}`);
        continue;
      }

      console.log(`\n📦 Clonando colección: ${collectionName}`);

      const sourceCollection = sourceDb.collection(collectionName);
      const targetCollection = targetDb.collection(collectionName);

      // Contar documentos en origen
      const sourceCount = await sourceCollection.countDocuments();
      console.log(`   Documentos en origen: ${sourceCount}`);

      if (sourceCount === 0) {
        console.log(`   ⚠️  Colección vacía, saltando...`);
        continue;
      }

      // Verificar si ya existe contenido en destino
      const targetCount = await targetCollection.countDocuments();
      if (targetCount > 0) {
        console.log(`   ⚠️  La colección destino ya tiene ${targetCount} documentos`);
        console.log(`   🗑️  Limpiando colección destino...`);
        await targetCollection.deleteMany({});
      }

      // Obtener todos los documentos
      const documents = await sourceCollection.find({}).toArray();

      // Insertar en destino
      if (documents.length > 0) {
        const result = await targetCollection.insertMany(documents);
        console.log(`   ✅ Insertados: ${result.insertedCount} documentos`);
      }

      // Verificar conteo final
      const finalCount = await targetCollection.countDocuments();
      if (finalCount === sourceCount) {
        console.log(`   ✅ Verificación exitosa: ${finalCount}/${sourceCount} documentos`);
      } else {
        console.log(`   ❌ Error de verificación: ${finalCount}/${sourceCount} documentos`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('\n🎉 CLONACIÓN COMPLETADA\n');

    // Resumen final
    console.log('📊 RESUMEN FINAL:');
    console.log(`   Base origen: ${SOURCE_DB}`);
    console.log(`   Base destino: ${TARGET_DB}\n`);

    const targetCollections = await targetDb.listCollections().toArray();
    for (const col of targetCollections) {
      if (!col.name.startsWith('system.')) {
        const count = await targetDb.collection(col.name).countDocuments();
        console.log(`   ${col.name}: ${count} documentos`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Conexión cerrada');
  }
}

// Ejecutar
cloneDatabase().catch(console.error);
