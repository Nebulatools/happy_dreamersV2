// Test script para verificar que la encuesta completa se guarda correctamente
// Prueba con "Jakito Cerda"

const testSurveyData = {
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

console.log("=== TEST SURVEY DATA FOR JAKITO CERDA ===");
console.log("Datos completos de encuesta preparados para prueba:");
console.log("- Información Familiar: ✓");
console.log("- Dinámica Familiar: ✓");  
console.log("- Historial del Niño: ✓");
console.log("- Desarrollo y Salud: ✓");
console.log("- Actividad Física: ✓");
console.log("- Rutina y Hábitos de Sueño: ✓");
console.log("\nPuedes usar estos datos para probar la encuesta completa.");
console.log("\nPasos para la prueba:");
console.log("1. Ir a http://localhost:3004");
console.log("2. Loguearse como usuario");
console.log("3. Crear o seleccionar a 'Jakito Cerda'");
console.log("4. Ir a la encuesta del sueño");
console.log("5. Llenar todos los campos con los datos de arriba");
console.log("6. Guardar y verificar que se almacene correctamente");

// También exportamos los datos para uso programático
if (typeof module !== 'undefined' && module.exports) {
  module.exports = testSurveyData;
}