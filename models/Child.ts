// Modelo Mongoose para Child
// Basado en la interfaz Child de types/models.ts

import mongoose, { Schema, Document, Types } from 'mongoose'

// Interfaces para el esquema de SurveyData
interface InformacionFamiliarPapa {
  nombre: string
  edad?: number
  ocupacion: string
  direccion: string
  ciudad?: string
  telefono?: string
  email: string
  trabajaFueraCasa: boolean
  tieneAlergias: boolean
  alergias?: string
}

interface InformacionFamiliarMama {
  nombre: string
  edad?: number
  ocupacion: string
  mismaDireccionPapa: boolean
  direccion?: string
  ciudad: string
  telefono: string
  email: string
  trabajaFueraCasa?: boolean
  puedeDormirConHijo: boolean
  apetito: string
  pensamientosNegativos: boolean
  tieneAlergias: boolean
  alergias?: string
}

interface DinamicaFamiliar {
  cantidadHijos: number
  hijosInfo: Array<{
    nombre: string
    fechaNacimiento: string
    edad: number
    esElQueNecesitaAyuda: boolean
  }>
  otrosEnCasa: string
  telefonoSeguimiento: string
  emailObservaciones: string
  comoConocioServicios: string
  librosConsultados?: string
  metodosEnContra?: string
  asesorAnterior?: string
  quienSeLevaantaNoche: string
}

interface Historial {
  nombre: string
  fechaNacimiento: string
  peso: number
  percentilPeso?: number
  embarazoPlaneado: boolean
  problemasEmbarazo: boolean
  problemasEmbarazoDescripcion?: string
  padecimientosEmbarazo: string[]
  tipoParto: "Vaginal" | "Cesárea" | "Vaginal después de Cesárea"
  complicacionesParto: boolean
  complicacionesPartoDescripcion?: string
  nacioPlazo: boolean
  problemasAlNacer: boolean
  problemasAlNacerDescripcion?: string
  pediatra?: string
  pediatraDescartaProblemas: boolean
  pediatraConfirmaCapacidadDormir: boolean
  tratamientoMedico: boolean
  tratamientoMedicoDescripcion?: string
}

interface DesarrolloSalud {
  edadRodar?: number
  edadSentarse?: number
  edadGatear?: number
  edadPararse?: number
  edadCaminar?: number
  usoVaso?: "Vaso" | "Biberón"
  alimentacion?: "Fórmula" | "Leche materna exclusiva" | "Leche materna y fórmula" | "Ninguna"
  comeSolidos?: boolean
  caracteristicas: string[]
}

interface ActividadFisica {
  vePantallas: boolean
  pantallasTiempo?: string
  practicaActividad: boolean
  actividades?: string
  actividadesDespierto?: string
  signosIrritabilidad: boolean
  situacionesSufridas?: string[]
}

interface RutinaHabitos {
  diaTypico: string
  vaGuarderia: boolean
  quienPasaTiempo: string
  quienCuidaNoche?: string
  dondeVurmePadresSalen?: string
  rutinaAntesAcostarse: string
  horaEspecificaDormir: boolean
  horaDormir?: string
  seQuedaDormirSolo: boolean
  oscuridadCuarto: string[]
  usaRuidoBlanco: boolean
  temperaturaCuarto?: string
  tipoPiyama: string
  usaSacoDormir: boolean
  seQuedaHastaConciliar: boolean
  dondeDuermeNoche: string
  comparteHabitacion: boolean
  conQuienComparte?: string
  intentaSalirCama: boolean
  sacaDesCamaNohe: boolean
  lloraAlDejarSolo: boolean
  golpeaCabeza: boolean
  despiertaEnNoche: boolean
  miendoOscuridad: boolean
  padresMiedoOscuridad: boolean
  temperamento: string
  reaccionDejarSolo: string
  metodosRelajarse: string
  haceSiestas: boolean
  otrosHijosProblemas?: boolean
  dondeViermesViaja?: string
  duermeMejorViaja?: "Mejor" | "Peor" | "No aplica"
  padresDispuestos: boolean
  objetivosPadres: string
  informacionAdicional?: string
}

interface SurveyData {
  completedAt?: Date
  informacionFamiliar: {
    papa: InformacionFamiliarPapa
    mama: InformacionFamiliarMama
  }
  dinamicaFamiliar: DinamicaFamiliar
  historial: Historial
  desarrolloSalud: DesarrolloSalud
  actividadFisica: ActividadFisica
  rutinaHabitos: RutinaHabitos
}

interface SleepProfile {
  promedioHorasSueno: number
  calidadSueno: "buena" | "regular" | "mala"
  despertaresNocturnos: number
  dificultadParaDormir: boolean
  ronquidos: boolean
  pesadillas: boolean
  ultimaActualizacion: Date
}

// Interfaz del documento Child para Mongoose
export interface IChild extends Document {
  _id: Types.ObjectId
  firstName: string
  lastName: string
  birthDate: string
  parentId: Types.ObjectId
  sharedWith?: Types.ObjectId[]
  surveyData?: SurveyData
  sleepProfile?: SleepProfile
  createdAt: Date
  updatedAt: Date
}

// Definir esquema Mongoose para Child
const ChildSchema = new Schema<IChild>({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  birthDate: {
    type: String,
    required: true
  },
  parentId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sharedWith: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  surveyData: {
    completedAt: { type: Date },
    informacionFamiliar: {
      papa: {
        nombre: { type: String, required: true },
        edad: { type: Number },
        ocupacion: { type: String, required: true },
        direccion: { type: String, required: true },
        ciudad: { type: String },
        telefono: { type: String },
        email: { type: String, required: true },
        trabajaFueraCasa: { type: Boolean, required: true },
        tieneAlergias: { type: Boolean, required: true },
        alergias: { type: String }
      },
      mama: {
        nombre: { type: String, required: true },
        edad: { type: Number },
        ocupacion: { type: String, required: true },
        mismaDireccionPapa: { type: Boolean, required: true },
        direccion: { type: String },
        ciudad: { type: String, required: true },
        telefono: { type: String, required: true },
        email: { type: String, required: true },
        trabajaFueraCasa: { type: Boolean },
        puedeDormirConHijo: { type: Boolean, required: true },
        apetito: { type: String, required: true },
        pensamientosNegativos: { type: Boolean, required: true },
        tieneAlergias: { type: Boolean, required: true },
        alergias: { type: String }
      }
    },
    dinamicaFamiliar: {
      cantidadHijos: { type: Number, required: true },
      hijosInfo: [{
        nombre: { type: String, required: true },
        fechaNacimiento: { type: String, required: true },
        edad: { type: Number, required: true },
        esElQueNecesitaAyuda: { type: Boolean, required: true }
      }],
      otrosEnCasa: { type: String, required: true },
      telefonoSeguimiento: { type: String, required: true },
      emailObservaciones: { type: String, required: true },
      comoConocioServicios: { type: String, required: true },
      librosConsultados: { type: String },
      metodosEnContra: { type: String },
      asesorAnterior: { type: String },
      quienSeLevaantaNoche: { type: String, required: true }
    },
    historial: {
      nombre: { type: String, required: true },
      fechaNacimiento: { type: String, required: true },
      peso: { type: Number, required: true },
      percentilPeso: { type: Number },
      embarazoPlaneado: { type: Boolean, required: true },
      problemasEmbarazo: { type: Boolean, required: true },
      problemasEmbarazoDescripcion: { type: String },
      padecimientosEmbarazo: [{ type: String }],
      tipoParto: { 
        type: String, 
        enum: ["Vaginal", "Cesárea", "Vaginal después de Cesárea"],
        required: true 
      },
      complicacionesParto: { type: Boolean, required: true },
      complicacionesPartoDescripcion: { type: String },
      nacioPlazo: { type: Boolean, required: true },
      problemasAlNacer: { type: Boolean, required: true },
      problemasAlNacerDescripcion: { type: String },
      pediatra: { type: String },
      pediatraDescartaProblemas: { type: Boolean, required: true },
      pediatraConfirmaCapacidadDormir: { type: Boolean, required: true },
      tratamientoMedico: { type: Boolean, required: true },
      tratamientoMedicoDescripcion: { type: String }
    },
    desarrolloSalud: {
      edadRodar: { type: Number },
      edadSentarse: { type: Number },
      edadGatear: { type: Number },
      edadPararse: { type: Number },
      edadCaminar: { type: Number },
      usoVaso: { 
        type: String,
        enum: ["Vaso", "Biberón"]
      },
      alimentacion: { 
        type: String,
        enum: ["Fórmula", "Leche materna exclusiva", "Leche materna y fórmula", "Ninguna"]
      },
      comeSolidos: { type: Boolean },
      caracteristicas: [{ type: String }]
    },
    actividadFisica: {
      vePantallas: { type: Boolean, required: true },
      pantallasTiempo: { type: String },
      practicaActividad: { type: Boolean, required: true },
      actividades: { type: String },
      actividadesDespierto: { type: String },
      signosIrritabilidad: { type: Boolean, required: true },
      situacionesSufridas: [{ type: String }]
    },
    rutinaHabitos: {
      diaTypico: { type: String, required: true },
      vaGuarderia: { type: Boolean, required: true },
      quienPasaTiempo: { type: String, required: true },
      quienCuidaNoche: { type: String },
      dondeVurmePadresSalen: { type: String },
      rutinaAntesAcostarse: { type: String, required: true },
      horaEspecificaDormir: { type: Boolean, required: true },
      horaDormir: { type: String },
      seQuedaDormirSolo: { type: Boolean, required: true },
      oscuridadCuarto: [{ type: String }],
      usaRuidoBlanco: { type: Boolean, required: true },
      temperaturaCuarto: { type: String },
      tipoPiyama: { type: String, required: true },
      usaSacoDormir: { type: Boolean, required: true },
      seQuedaHastaConciliar: { type: Boolean, required: true },
      dondeDuermeNoche: { type: String, required: true },
      comparteHabitacion: { type: Boolean, required: true },
      conQuienComparte: { type: String },
      intentaSalirCama: { type: Boolean, required: true },
      sacaDesCamaNohe: { type: Boolean, required: true },
      lloraAlDejarSolo: { type: Boolean, required: true },
      golpeaCabeza: { type: Boolean, required: true },
      despiertaEnNoche: { type: Boolean, required: true },
      miendoOscuridad: { type: Boolean, required: true },
      padresMiedoOscuridad: { type: Boolean, required: true },
      temperamento: { type: String, required: true },
      reaccionDejarSolo: { type: String, required: true },
      metodosRelajarse: { type: String, required: true },
      haceSiestas: { type: Boolean, required: true },
      otrosHijosProblemas: { type: Boolean },
      dondeViermesViaja: { type: String },
      duermeMejorViaja: { 
        type: String,
        enum: ["Mejor", "Peor", "No aplica"]
      },
      padresDispuestos: { type: Boolean, required: true },
      objetivosPadres: { type: String, required: true },
      informacionAdicional: { type: String }
    }
  },
  sleepProfile: {
    promedioHorasSueno: { type: Number, required: true },
    calidadSueno: { 
      type: String,
      enum: ["buena", "regular", "mala"],
      required: true 
    },
    despertaresNocturnos: { type: Number, required: true },
    dificultadParaDormir: { type: Boolean, required: true },
    ronquidos: { type: Boolean, required: true },
    pesadillas: { type: Boolean, required: true },
    ultimaActualizacion: { type: Date, required: true }
  }
}, {
  timestamps: true
})

// Índices para mejorar las consultas
ChildSchema.index({ parentId: 1 })
ChildSchema.index({ 'sharedWith': 1 })

// Métodos virtuales para obtener el nombre completo
ChildSchema.virtual('name').get(function(this: IChild) {
  return `${this.firstName} ${this.lastName}`
})

// Configurar JSON transform para incluir virtuals
ChildSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v
    return ret
  }
})

// Crear y exportar el modelo
const Child = mongoose.models.Child || mongoose.model<IChild>('Child', ChildSchema)

export default Child