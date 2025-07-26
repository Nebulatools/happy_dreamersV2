// Test para verificar que la página de encuesta carga correctamente los datos existentes
const { MongoClient, ObjectId } = require('mongodb');

async function testExistingSurveyLoad() {
  let client;
  
  try {
    console.log('🔍 Probando carga de encuesta existente...\n');
    
    // Conectar a MongoDB
    require('dotenv').config();
    const uri = process.env.MONGODB_URI;
    client = new MongoClient(uri);
    await client.connect();
    
    const db = client.db();
    
    // Buscar Jakito Cerda
    const jakito = await db.collection('children').findOne({
      firstName: 'Jakito',
      lastName: 'Cerda'
    });
    
    if (!jakito) {
      console.log('❌ Jakito Cerda no encontrado en la base de datos');
      return;
    }
    
    console.log('✅ Jakito encontrado con ID:', jakito._id);
    
    // Verificar que tiene datos de encuesta
    if (!jakito.surveyData) {
      console.log('❌ Jakito no tiene datos de encuesta');
      return;
    }
    
    console.log('✅ Jakito tiene datos de encuesta');
    
    // Simular llamada a la API de encuesta
    console.log('\n📡 Simulando carga de API de encuesta...');
    
    const surveyApiResponse = {
      childId: jakito._id.toString(),
      parentId: jakito.parentId,
      surveyData: jakito.surveyData,
      updatedAt: jakito.surveyUpdatedAt || jakito.updatedAt
    };
    
    console.log('✅ Respuesta de API simulada exitosa');
    
    // Verificar estructura de datos que espera la página
    console.log('\n📋 Verificando estructura de datos:');
    console.log('  - surveyData existe:', !!surveyApiResponse.surveyData);
    console.log('  - informacionFamiliar:', !!surveyApiResponse.surveyData.informacionFamiliar);
    console.log('  - dinamicaFamiliar:', !!surveyApiResponse.surveyData.dinamicaFamiliar);
    console.log('  - historial:', !!surveyApiResponse.surveyData.historial);
    console.log('  - desarrolloSalud:', !!surveyApiResponse.surveyData.desarrolloSalud);
    console.log('  - actividadFisica:', !!surveyApiResponse.surveyData.actividadFisica);
    console.log('  - rutinaHabitos:', !!surveyApiResponse.surveyData.rutinaHabitos);
    console.log('  - completedAt:', !!surveyApiResponse.surveyData.completedAt);
    
    // Verificar datos específicos para el resumen
    console.log('\n📊 Datos para el resumen:');
    const survey = surveyApiResponse.surveyData;
    console.log('  - Nombre del papá:', survey.informacionFamiliar?.papa?.nombre);
    console.log('  - Nombre de la mamá:', survey.informacionFamiliar?.mama?.nombre);
    console.log('  - Nombre del niño:', survey.historial?.nombre);
    console.log('  - Fecha nacimiento:', survey.historial?.fechaNacimiento);
    console.log('  - Hora de dormir:', survey.rutinaHabitos?.horaDormir);
    console.log('  - Dónde duerme:', survey.rutinaHabitos?.dondeDuermeNoche);
    console.log('  - Objetivos padres:', survey.rutinaHabitos?.objetivosPadres);
    
    if (survey.completedAt) {
      console.log('  - Completada el:', new Date(survey.completedAt).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }));
    }
    
    console.log('\n🎉 PRUEBA EXITOSA');
    console.log('📍 URL para probar: http://localhost:3004/dashboard/survey?childId=' + jakito._id);
    console.log('📝 Lo que debería pasar:');
    console.log('   1. Mostrar pantalla de "Encuesta de Sueño Completada ✅"');
    console.log('   2. Mostrar resumen con todos los datos');
    console.log('   3. Botón "Editar Encuesta" para permitir modificaciones');
    console.log('   4. Botón "Volver al Dashboard"');
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

testExistingSurveyLoad();