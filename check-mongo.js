// Script para verificar datos de Jakito en MongoDB
const { MongoClient, ObjectId } = require('mongodb');

const uri = "mongodb+srv://jaco:nebulatools@nebulacluster01.1rmm8s4.mongodb.net/?retryWrites=true&w=majority&appName=NebulaCluster01";
const dbName = "jaco_db_ultimate_2025";
const childId = "68d1af5315d0e9b1cc189544";

async function checkJakitoData() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("✅ Conectado a MongoDB");

    const db = client.db(dbName);
    const collection = db.collection('children');

    // Buscar a Jakito
    const jakito = await collection.findOne({ _id: new ObjectId(childId) });

    if (!jakito) {
      console.log("❌ No se encontró a Jakito");
      return;
    }

    console.log("\n📊 DATOS DE JAKITO:");
    console.log("Nombre:", jakito.firstName, jakito.lastName);
    console.log("\n🔍 SURVEY DATA:");

    if (!jakito.surveyData) {
      console.log("❌ No tiene surveyData");
      return;
    }

    // Verificar rutinaHabitos
    if (jakito.surveyData.rutinaHabitos) {
      console.log("\n✅ rutinaHabitos existe");
      console.log("oscuridadCuarto:", jakito.surveyData.rutinaHabitos.oscuridadCuarto);
      console.log("colorLamparita:", jakito.surveyData.rutinaHabitos.colorLamparita);
      console.log("tiempoDormir:", jakito.surveyData.rutinaHabitos.tiempoDormir);
      console.log("numeroSiestas:", jakito.surveyData.rutinaHabitos.numeroSiestas);
      console.log("vecesDespierta:", jakito.surveyData.rutinaHabitos.vecesDespierta);

      console.log("\n📋 Todos los campos de rutinaHabitos:");
      console.log(JSON.stringify(jakito.surveyData.rutinaHabitos, null, 2));
    } else {
      console.log("❌ No tiene rutinaHabitos");
    }

    // Verificar actividadFisica
    if (jakito.surveyData.actividadFisica) {
      console.log("\n✅ actividadFisica existe");
      console.log("pantallasDetalle:", jakito.surveyData.actividadFisica.pantallasDetalle);
      console.log("actividadesLista:", jakito.surveyData.actividadFisica.actividadesLista);
      console.log("irritabilidadDetalle:", jakito.surveyData.actividadFisica.irritabilidadDetalle);
    }

    // Verificar desarrolloSalud
    if (jakito.surveyData.desarrolloSalud) {
      console.log("\n✅ desarrolloSalud existe");
      console.log("alergiaAlimenticiaDetalle:", jakito.surveyData.desarrolloSalud.alergiaAlimenticiaDetalle);
      console.log("alergiaAmbientalDetalle:", jakito.surveyData.desarrolloSalud.alergiaAmbientalDetalle);
    }

    // Mostrar última actualización
    console.log("\n⏰ ÚLTIMA ACTUALIZACIÓN:");
    console.log("surveyUpdatedAt:", jakito.surveyUpdatedAt);
    console.log("updatedAt:", jakito.updatedAt);

    // Verificar flags de completado
    console.log("\n🚩 FLAGS DE ESTADO:");
    console.log("completed:", jakito.surveyData.completed);
    console.log("isPartial:", jakito.surveyData.isPartial);
    console.log("completedAt:", jakito.surveyData.completedAt);
    console.log("lastSavedAt:", jakito.surveyData.lastSavedAt);

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
    console.log("\n✅ Conexión cerrada");
  }
}

checkJakitoData();
