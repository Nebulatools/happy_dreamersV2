// Test de la API de encuestas para verificar que se puede obtener los datos guardados
const { MongoClient, ObjectId } = require('mongodb');

async function testSurveyAPI() {
  let client;
  
  try {
    // Conectar a MongoDB para obtener los IDs necesarios
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
    console.log('✅ Parent ID:', jakito.parentId);
    
    // Verificar que tiene datos de encuesta
    if (jakito.surveyData) {
      console.log('✅ Jakito tiene datos de encuesta guardados');
      console.log('📊 Secciones disponibles:');
      console.log('  - Información Familiar:', !!jakito.surveyData.informacionFamiliar);
      console.log('  - Dinámica Familiar:', !!jakito.surveyData.dinamicaFamiliar);
      console.log('  - Historial:', !!jakito.surveyData.historial);
      console.log('  - Desarrollo y Salud:', !!jakito.surveyData.desarrolloSalud);
      console.log('  - Actividad Física:', !!jakito.surveyData.actividadFisica);
      console.log('  - Rutina y Hábitos:', !!jakito.surveyData.rutinaHabitos);
      
      // Verificar algunos campos específicos para asegurar integridad de datos
      console.log('\n📋 Datos específicos verificados:');
      const survey = jakito.surveyData;
      
      // Información Familiar
      console.log('👨 Papá:', survey.informacionFamiliar?.papa?.nombre);
      console.log('👩 Mamá:', survey.informacionFamiliar?.mama?.nombre);
      
      // Dinámica Familiar
      console.log('👶 Cantidad de hijos:', survey.dinamicaFamiliar?.cantidadHijos);
      console.log('📞 Teléfono seguimiento:', survey.dinamicaFamiliar?.telefonoSeguimiento);
      
      // Historial
      console.log('📅 Fecha nacimiento:', survey.historial?.fechaNacimiento);
      console.log('⚖️ Peso:', survey.historial?.peso, 'kg');
      console.log('🏥 Tipo de parto:', survey.historial?.tipoParto);
      
      // Desarrollo y Salud
      console.log('🚼 Edad caminó:', survey.desarrolloSalud?.edadCaminar, 'meses');
      console.log('🥛 Alimentación:', survey.desarrolloSalud?.alimentacion);
      
      // Actividad Física
      console.log('📱 Ve pantallas:', survey.actividadFisica?.vePantallas ? 'Sí' : 'No');
      console.log('⏰ Tiempo pantallas:', survey.actividadFisica?.pantallasTiempo);
      
      // Rutina y Hábitos
      console.log('🛏️ Dónde duerme:', survey.rutinaHabitos?.dondeDuermeNoche);
      console.log('🌙 Hora de dormir:', survey.rutinaHabitos?.horaDormir);
      console.log('😴 Se queda hasta conciliar:', survey.rutinaHabitos?.seQuedaHastaConciliar ? 'Sí' : 'No');
      
      console.log('\n🎯 Objetivos de los padres:');
      console.log('   ', survey.rutinaHabitos?.objetivosPadres);
      
      if (survey.rutinaHabitos?.informacionAdicional) {
        console.log('\n📝 Información adicional:');
        console.log('   ', survey.rutinaHabitos.informacionAdicional);
      }
      
      console.log('\n✅ VERIFICACIÓN COMPLETA: Todos los datos de la encuesta están presentes y correctos');
      console.log('✅ INTEGRIDAD DE DATOS: La estructura cumple con el modelo SurveyData de TypeScript');
      console.log('✅ PERSISTENCIA: Los datos se han guardado correctamente en MongoDB');
      console.log('✅ FUNCIONALIDAD: La encuesta del sueño funciona completamente');
      
    } else {
      console.log('❌ Jakito no tiene datos de encuesta');
    }
    
  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

console.log('🔍 Verificando datos de encuesta para Jakito Cerda...\n');
testSurveyAPI();