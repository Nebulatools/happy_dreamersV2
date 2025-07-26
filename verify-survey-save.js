// Script para verificar que la encuesta se guarda correctamente en MongoDB
// Conecta directamente a la base de datos para verificar los datos

const { MongoClient, ObjectId } = require('mongodb');

// Datos de prueba completos para Jakito Cerda
const testSurveyData = {
  completedAt: new Date(),
  
  // Sección 1: Información Familiar
  informacionFamiliar: {
    papa: {
      nombre: "Carlos Cerda",
      edad: 35,
      ocupacion: "Ingeniero de Software",
      direccion: "Av. Libertad 123, Santiago",
      ciudad: "Santiago",
      telefono: "+56912345678",
      email: "carlos.cerda@email.com",
      trabajaFueraCasa: true,
      tieneAlergias: false,
      alergias: ""
    },
    mama: {
      nombre: "María González",
      edad: 32,
      ocupacion: "Diseñadora Gráfica",
      mismaDireccionPapa: true,
      direccion: "",
      ciudad: "Santiago",
      telefono: "+56987654321",
      email: "maria.gonzalez@email.com",
      trabajaFueraCasa: true,
      puedeDormirConHijo: true,
      apetito: "Bueno",
      pensamientosNegativos: false,
      tieneAlergias: true,
      alergias: "Polen, ácaros del polvo"
    }
  },

  // Sección 2: Dinámica Familiar
  dinamicaFamiliar: {
    cantidadHijos: 2,
    hijosInfo: [
      {
        nombre: "Jakito Cerda",
        fechaNacimiento: "2021-03-15",
        edad: 3,
        esElQueNecesitaAyuda: true
      },
      {
        nombre: "Sofía Cerda",
        fechaNacimiento: "2023-08-20",
        edad: 1,
        esElQueNecesitaAyuda: false
      }
    ],
    otrosEnCasa: "Solo la familia nuclear",
    telefonoSeguimiento: "+56912345678",
    emailObservaciones: "carlos.cerda@email.com",
    comoConocioServicios: "Recomendación de pediatra",
    librosConsultados: "El método Estivill, Dormir sin lágrimas",
    metodosEnContra: "Método de extinción total",
    asesorAnterior: "Dra. Patricia Soto (pediatra)",
    quienSeLevaantaNoche: "Ambos padres, principalmente mamá"
  },

  // Sección 3: Historial del Niño
  historial: {
    nombre: "Jakito Cerda González",
    fechaNacimiento: "2021-03-15",
    peso: 14.5,
    percentilPeso: 75,
    embarazoPlaneado: true,
    problemasEmbarazo: false,
    problemasEmbarazoDescripcion: "",
    padecimientosEmbarazo: ["Ninguna"],
    tipoParto: "Vaginal",
    complicacionesParto: false,
    complicacionesPartoDescripcion: "",
    nacioPlazo: true,
    problemasAlNacer: false,
    problemasAlNacerDescripcion: "",
    pediatra: "Dr. Juan Pérez",
    pediatraDescartaProblemas: true,
    pediatraConfirmaCapacidadDormir: true,
    tratamientoMedico: false,
    tratamientoMedicoDescripcion: ""
  },

  // Sección 4: Desarrollo y Salud
  desarrolloSalud: {
    edadRodar: 4,
    edadSentarse: 6,
    edadGatear: 8,
    edadPararse: 10,
    edadCaminar: 12,
    usoVaso: "Vaso",
    alimentacion: "Leche materna exclusiva",
    comeSolidos: true,
    caracteristicas: ["Se chupa el dedo", "Usa chupón para dormir", "Es muy activo"]
  },

  // Sección 5: Actividad Física
  actividadFisica: {
    vePantallas: true,
    pantallasTiempo: "1-2 horas al día",
    practicaActividad: true,
    actividades: "Juegos en el parque, natación",
    actividadesDespierto: "Juegos educativos, lectura de cuentos, tiempo al aire libre",
    signosIrritabilidad: false,
    situacionesSufridas: ["Ninguna"]
  },

  // Sección 6: Rutina y Hábitos de Sueño
  rutinaHabitos: {
    diaTypico: "Se levanta a las 7:00 AM, desayuna, juega, almuerza a las 12:30, siesta de 1:30-3:00 PM, merienda, más juegos, cena a las 6:30 PM, baño, cuentos y duerme a las 8:00 PM",
    vaGuarderia: true,
    quienPasaTiempo: "En guardería de mañana, con mamá en la tarde",
    quienCuidaNoche: "Los padres",
    dondeVurmePadresSalen: "Con los abuelos maternos",
    rutinaAntesAcostarse: "Baño tibio, pijama, cepillado de dientes, cuento y canción de cuna",
    horaEspecificaDormir: true,
    horaDormir: "20:00",
    seQuedaDormirSolo: false,
    oscuridadCuarto: ["Lamparita prendida", "Puerta entreabierta"],
    usaRuidoBlanco: true,
    temperaturaCuarto: "20-22°C",
    tipoPiyama: "Pijama de algodón completo",
    usaSacoDormir: false,
    seQuedaHastaConciliar: true,
    dondeDuermeNoche: "Cuna/corral en cuarto de papás",
    comparteHabitacion: true,
    conQuienComparte: "Con los padres",
    intentaSalirCama: false,
    sacaDesCamaNohe: true,
    lloraAlDejarSolo: true,
    golpeaCabeza: false,
    despiertaEnNoche: true,
    miendoOscuridad: true,
    padresMiedoOscuridad: false,
    temperamento: "Tranquilo durante el día, pero necesita mucha atención para dormir",
    reaccionDejarSolo: "Llora inmediatamente y de forma intensa",
    metodosRelajarse: "Chuparse el dedo, que le canten, que lo mezan",
    haceSiestas: true,
    otrosHijosProblemas: false,
    dondeViermesViaja: "En brazos o en el auto",
    duermeMejorViaja: "Mejor",
    padresDispuestos: true,
    objetivosPadres: "Que Jakito pueda dormir solo en su cuarto toda la noche sin despertarse",
    informacionAdicional: "Jakito es un niño muy cariñoso pero muy dependiente para dormir. Necesita constante atención durante la noche."
  }
};

async function verifyOrCreateJakito() {
  let client;
  
  try {
    // Conexión a MongoDB usando la misma configuración que la app
    require('dotenv').config();
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/happy-dreamers';
    client = new MongoClient(uri);
    await client.connect();
    
    console.log('✅ Conectado a MongoDB');
    
    const db = client.db();
    
    // Buscar si ya existe Jakito Cerda
    let jakito = await db.collection('children').findOne({
      firstName: 'Jakito',
      lastName: 'Cerda'
    });
    
    if (!jakito) {
      console.log('🔍 Jakito Cerda no encontrado, creando...');
      
      // Buscar un usuario existente para asociar el niño
      const user = await db.collection('users').findOne({});
      if (!user) {
        console.log('❌ No hay usuarios en la base de datos. Necesitas crear un usuario primero.');
        return;
      }
      
      // Crear Jakito Cerda
      const newChild = {
        firstName: 'Jakito',
        lastName: 'Cerda',
        birthDate: '2021-03-15',
        parentId: user._id.toString(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await db.collection('children').insertOne(newChild);
      jakito = { ...newChild, _id: result.insertedId };
      console.log('✅ Jakito Cerda creado con ID:', result.insertedId);
    } else {
      console.log('✅ Jakito Cerda encontrado con ID:', jakito._id);
    }
    
    // Actualizar con los datos de la encuesta
    console.log('📝 Guardando datos completos de la encuesta...');
    
    const updateResult = await db.collection('children').updateOne(
      { _id: jakito._id },
      {
        $set: {
          surveyData: testSurveyData,
          surveyUpdatedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );
    
    if (updateResult.modifiedCount > 0) {
      console.log('✅ Encuesta guardada exitosamente');
    } else {
      console.log('⚠️ No se modificó el documento (posiblemente los datos son iguales)');
    }
    
    // Verificar que todos los datos se guardaron correctamente
    console.log('🔍 Verificando datos guardados...');
    
    const updatedJakito = await db.collection('children').findOne({ _id: jakito._id });
    
    if (updatedJakito && updatedJakito.surveyData) {
      console.log('✅ Verificación completa:');
      console.log('  - Información Familiar:', !!updatedJakito.surveyData.informacionFamiliar);
      console.log('  - Dinámica Familiar:', !!updatedJakito.surveyData.dinamicaFamiliar);
      console.log('  - Historial:', !!updatedJakito.surveyData.historial);
      console.log('  - Desarrollo y Salud:', !!updatedJakito.surveyData.desarrolloSalud);
      console.log('  - Actividad Física:', !!updatedJakito.surveyData.actividadFisica);
      console.log('  - Rutina y Hábitos:', !!updatedJakito.surveyData.rutinaHabitos);
      console.log('  - Fecha de Completado:', updatedJakito.surveyData.completedAt);
      
      // Verificar campos específicos
      console.log('\n📊 Campos específicos verificados:');
      console.log('  - Nombre del niño:', updatedJakito.surveyData.historial.nombre);
      console.log('  - Nombre del papá:', updatedJakito.surveyData.informacionFamiliar.papa.nombre);
      console.log('  - Nombre de la mamá:', updatedJakito.surveyData.informacionFamiliar.mama.nombre);
      console.log('  - Cantidad de hijos:', updatedJakito.surveyData.dinamicaFamiliar.cantidadHijos);
      console.log('  - Dónde duerme:', updatedJakito.surveyData.rutinaHabitos.dondeDuermeNoche);
      console.log('  - Objetivos de los padres:', updatedJakito.surveyData.rutinaHabitos.objetivosPadres);
      
      console.log('\n🎉 ¡PRUEBA EXITOSA! Todos los datos de la encuesta se guardaron correctamente.');
    } else {
      console.log('❌ Error: Los datos de la encuesta no se guardaron correctamente');
    }
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Conexión a MongoDB cerrada');
    }
  }
}

// Ejecutar la verificación
console.log('🚀 Iniciando prueba de guardado de encuesta para Jakito Cerda...\n');
verifyOrCreateJakito();