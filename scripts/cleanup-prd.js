/**
 * Script para limpiar la base de datos de producción
 * Conserva ÚNICAMENTE el usuario mariana@admin.com y sus datos relacionados
 * Ejecutar con: node scripts/cleanup-prd.js
 */

const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://jaco:nebulatools@nebulacluster01.1rmm8s4.mongodb.net/?retryWrites=true&w=majority&appName=NebulaCluster01';
const TARGET_DB = 'happy_dreamers_prd01';
const ADMIN_EMAIL = 'mariana@admin.com';

async function cleanupDatabase() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('Conectando a MongoDB Atlas...');
    await client.connect();
    console.log('✅ Conexión exitosa\n');

    const db = client.db(TARGET_DB);

    console.log('='.repeat(60));
    console.log('🧹 LIMPIEZA DE BASE DE DATOS DE PRODUCCIÓN');
    console.log(`   Base de datos: ${TARGET_DB}`);
    console.log(`   Admin a conservar: ${ADMIN_EMAIL}`);
    console.log('='.repeat(60));

    // 1. Obtener el admin
    console.log('\n📋 PASO 1: Identificar usuario admin...');
    const admin = await db.collection('users').findOne({ email: ADMIN_EMAIL });

    if (!admin) {
      console.error(`❌ ERROR: No se encontró el usuario ${ADMIN_EMAIL}`);
      console.log('   Abortando limpieza para proteger los datos.');
      return;
    }

    const adminId = admin._id;
    console.log(`   ✅ Admin encontrado: ${admin.name || admin.email}`);
    console.log(`   ID: ${adminId}`);

    // 2. Obtener hijos del admin (si existen)
    console.log('\n📋 PASO 2: Identificar hijos del admin...');
    const adminChildren = await db.collection('children').find({
      $or: [
        { parentId: adminId },
        { parentId: adminId.toString() }
      ]
    }).toArray();

    const adminChildIds = adminChildren.map(c => c._id);
    console.log(`   Hijos del admin: ${adminChildIds.length}`);
    if (adminChildIds.length > 0) {
      adminChildren.forEach(child => {
        console.log(`   - ${child.name} (${child._id})`);
      });
    }

    // Estado inicial
    console.log('\n📊 ESTADO INICIAL:');
    const collections = ['users', 'children', 'events', 'child_plans', 'plans',
                         'consultation_reports', 'consultation_sessions',
                         'vector_documents', 'documents_metadata', 'zoom_accounts', 'userChildAccess'];

    for (const colName of collections) {
      try {
        const count = await db.collection(colName).countDocuments();
        console.log(`   ${colName}: ${count} documentos`);
      } catch (e) {
        console.log(`   ${colName}: (no existe)`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🗑️  INICIANDO LIMPIEZA...');
    console.log('='.repeat(60));

    // 3. Limpiar usuarios (conservar solo admin)
    console.log('\n📋 PASO 3: Limpiar usuarios...');
    const usersDeleted = await db.collection('users').deleteMany({
      email: { $ne: ADMIN_EMAIL }
    });
    console.log(`   ✅ Eliminados: ${usersDeleted.deletedCount} usuarios`);

    // 4. Limpiar children (conservar solo hijos del admin)
    console.log('\n📋 PASO 4: Limpiar children...');
    let childrenDeleted;
    if (adminChildIds.length > 0) {
      childrenDeleted = await db.collection('children').deleteMany({
        _id: { $nin: adminChildIds }
      });
    } else {
      childrenDeleted = await db.collection('children').deleteMany({});
    }
    console.log(`   ✅ Eliminados: ${childrenDeleted.deletedCount} children`);

    // 5. Limpiar events (conservar solo eventos de hijos del admin)
    console.log('\n📋 PASO 5: Limpiar events...');
    let eventsDeleted;
    if (adminChildIds.length > 0) {
      // Convertir a string para comparar ambos formatos
      const childIdStrings = adminChildIds.map(id => id.toString());
      eventsDeleted = await db.collection('events').deleteMany({
        $and: [
          { childId: { $nin: adminChildIds } },
          { childId: { $nin: childIdStrings } }
        ]
      });
    } else {
      eventsDeleted = await db.collection('events').deleteMany({});
    }
    console.log(`   ✅ Eliminados: ${eventsDeleted.deletedCount} events`);

    // 6. Limpiar child_plans
    console.log('\n📋 PASO 6: Limpiar child_plans...');
    let childPlansDeleted;
    if (adminChildIds.length > 0) {
      const childIdStrings = adminChildIds.map(id => id.toString());
      childPlansDeleted = await db.collection('child_plans').deleteMany({
        $and: [
          { childId: { $nin: adminChildIds } },
          { childId: { $nin: childIdStrings } }
        ]
      });
    } else {
      childPlansDeleted = await db.collection('child_plans').deleteMany({});
    }
    console.log(`   ✅ Eliminados: ${childPlansDeleted.deletedCount} child_plans`);

    // 7. Limpiar plans
    console.log('\n📋 PASO 7: Limpiar plans...');
    let plansDeleted;
    if (adminChildIds.length > 0) {
      const childIdStrings = adminChildIds.map(id => id.toString());
      plansDeleted = await db.collection('plans').deleteMany({
        $and: [
          { childId: { $nin: adminChildIds } },
          { childId: { $nin: childIdStrings } }
        ]
      });
    } else {
      plansDeleted = await db.collection('plans').deleteMany({});
    }
    console.log(`   ✅ Eliminados: ${plansDeleted.deletedCount} plans`);

    // 8. Limpiar consultation_reports
    console.log('\n📋 PASO 8: Limpiar consultation_reports...');
    const consultationReportsDeleted = await db.collection('consultation_reports').deleteMany({
      $and: [
        { odId: { $ne: adminId } },
        { odId: { $ne: adminId.toString() } }
      ]
    });
    console.log(`   ✅ Eliminados: ${consultationReportsDeleted.deletedCount} consultation_reports`);

    // 9. Limpiar consultation_sessions
    console.log('\n📋 PASO 9: Limpiar consultation_sessions...');
    const consultationSessionsDeleted = await db.collection('consultation_sessions').deleteMany({
      $and: [
        { odId: { $ne: adminId } },
        { odId: { $ne: adminId.toString() } }
      ]
    });
    console.log(`   ✅ Eliminados: ${consultationSessionsDeleted.deletedCount} consultation_sessions`);

    // 10. Limpiar vector_documents (eliminar todos - datos de IA)
    console.log('\n📋 PASO 10: Limpiar vector_documents...');
    const vectorDocsDeleted = await db.collection('vector_documents').deleteMany({});
    console.log(`   ✅ Eliminados: ${vectorDocsDeleted.deletedCount} vector_documents`);

    // 11. Limpiar documents_metadata
    console.log('\n📋 PASO 11: Limpiar documents_metadata...');
    const docsMetadataDeleted = await db.collection('documents_metadata').deleteMany({});
    console.log(`   ✅ Eliminados: ${docsMetadataDeleted.deletedCount} documents_metadata`);

    // 12. Limpiar userChildAccess
    console.log('\n📋 PASO 12: Limpiar userChildAccess...');
    const userChildAccessDeleted = await db.collection('userChildAccess').deleteMany({
      $and: [
        { odId: { $ne: adminId } },
        { odId: { $ne: adminId.toString() } }
      ]
    });
    console.log(`   ✅ Eliminados: ${userChildAccessDeleted.deletedCount} userChildAccess`);

    // Conservar zoom_accounts (configuración global)
    console.log('\n📋 PASO 13: Conservar zoom_accounts (configuración global)...');
    const zoomCount = await db.collection('zoom_accounts').countDocuments();
    console.log(`   ✅ Conservados: ${zoomCount} zoom_accounts`);

    // Estado final
    console.log('\n' + '='.repeat(60));
    console.log('📊 ESTADO FINAL:');
    console.log('='.repeat(60));

    for (const colName of collections) {
      try {
        const count = await db.collection(colName).countDocuments();
        console.log(`   ${colName}: ${count} documentos`);
      } catch (e) {
        console.log(`   ${colName}: (no existe)`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 LIMPIEZA COMPLETADA');
    console.log('='.repeat(60));
    console.log(`\n✅ Usuario conservado: ${ADMIN_EMAIL}`);
    console.log(`✅ Base de datos: ${TARGET_DB}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Conexión cerrada');
  }
}

// Ejecutar
cleanupDatabase().catch(console.error);
