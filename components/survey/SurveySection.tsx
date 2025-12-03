// Componente para visualizar las respuestas de una seccion de encuesta
// Renderiza los campos de forma legible para la doctora (admin)

"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

// Lista ordenada de TODOS los campos por seccion
// Esto permite mostrar todos los campos incluso si no tienen respuesta
const SECTION_ALL_FIELDS: Record<string, string[]> = {
  informacionFamiliar: [
    "primaryCaregiver",
    "papa",
    "mama",
  ],
  dinamicaFamiliar: [
    "otrosResidentes",
    "contactoPrincipal",
    "comoSupiste",
    "librosConsultados",
    "metodosContra",
    "otroAsesor",
    "otroAsesorDetalle",
    "quienAtiende",
  ],
  historial: [
    "nombreHijo",
    "fechaNacimiento",
    "pesoHijo",
    "percentilPeso",
    "embarazoPlaneado",
    "problemasEmbarazo",
    "problemasEmbarazoDetalle",
    "condicionesEmbarazo",
    "condicionesEmbarazoOtro",
    "tipoParto",
    "complicacionesParto",
    "complicacionesPartoDescripcion",
    "nacioTermino",
    "semanasNacimiento",
    "problemasNacer",
    "problemasNacerDetalle",
    "pediatra",
    "pediatraTelefono",
    "pediatraEmail",
    "pediatraDescarto",
    "pediatraConfirma",
    "pediatraConfirmaDetalle",
    "tratamientoMedico",
    "tratamientoMedicoDetalle",
  ],
  desarrolloSalud: [
    "rodarMeses",
    "sentarseMeses",
    "gatearMeses",
    "pararseMeses",
    "caminarMeses",
    "hijoUtiliza",
    "alimentacion",
    "alimentacionOtro",
    "comeSolidos",
    "problemasHijo",
    "planDejarDedo",
    "planDejarChupon",
    "nombreObjetoSeguridad",
    "problemasMedicosDetalle",
    "situacionesHijo",
    "alergiaAmbientalDetalle",
    "alergiaAlimenticiaDetalle",
    "infeccionesOidoDetalle",
    "dificultadRespirarDetalle",
  ],
  actividadFisica: [
    "vePantallas",
    "pantallasDetalle",
    "practicaActividad",
    "actividadesLista",
    "actividadesDespierto",
    "signosIrritabilidad",
    "irritabilidadDetalle",
  ],
  rutinaHabitos: [
    "diaTipico",
    "vaKinder",
    "kinderDetalle",
    "quienCuida",
    "quienCuidaNoche",
    "dondeDuermeSalida",
    "rutinaDormir",
    "horaDormir",
    "duermeSolo",
    "oscuridadCuarto",
    "colorLamparita",
    "ruidoBlanco",
    "temperaturaCuarto",
    "tipoPiyama",
    "usaSaco",
    "teQuedasHastaDuerma",
    "dondeDuerme",
    "comparteHabitacion",
    "comparteHabitacionCon",
    "horaAcostarBebe",
    "tiempoDormir",
    "horaDespertar",
    "despiertaNoche",
    "vecesDespierta",
    "tiempoDespierto",
    "desdeCuandoDespierta",
    "queHacesDespierta",
    "tomaSiestas",
    "numeroSiestas",
    "duracionTotalSiestas",
    "dondeSiestas",
    "principalPreocupacion",
    "desdeCuandoProblema",
    "objetivoPadres",
    "infoAdicional",
  ],
}

// Campos de papa y mama (objetos anidados)
const PARENT_FIELDS = [
  "nombre",
  "edad",
  "ocupacion",
  "direccion",
  "ciudad",
  "telefono",
  "email",
  "trabajaFueraCasa",
  "tieneAlergias",
  "alergias",
  "mismaDireccionPapa",
  "puedeDormir",
  "apetito",
  "pensamientosNegativos",
  "pensamientosNegativosDetalle",
]

// Labels en espanol para los campos de cada seccion
const FIELD_LABELS: Record<string, Record<string, string>> = {
  informacionFamiliar: {
    papa: "Informacion del Papa",
    mama: "Informacion de la Mama",
    primaryCaregiver: "Cuidador Principal",
    // Campos de papa/mama
    nombre: "Nombre",
    edad: "Edad",
    ocupacion: "Ocupacion",
    direccion: "Direccion",
    ciudad: "Ciudad",
    telefono: "Telefono",
    email: "Email",
    trabajaFueraCasa: "Trabaja fuera de casa",
    tieneAlergias: "Tiene alergias",
    alergias: "Alergias",
    mismaDireccionPapa: "Misma direccion que el papa",
    puedeDormir: "Puede dormir con el hijo",
    apetito: "Apetito",
    pensamientosNegativos: "Pensamientos negativos",
    pensamientosNegativosDetalle: "Detalle de pensamientos",
  },
  dinamicaFamiliar: {
    otrosResidentes: "Otros residentes en casa",
    contactoPrincipal: "Contacto principal",
    comoSupiste: "Como supiste de nosotros",
    librosConsultados: "Libros consultados",
    metodosContra: "Metodos en contra",
    otroAsesor: "Ha tenido otro asesor",
    otroAsesorDetalle: "Detalle del otro asesor",
    quienAtiende: "Quien atiende al nino en la noche",
  },
  historial: {
    nombreHijo: "Nombre del hijo",
    fechaNacimiento: "Fecha de nacimiento",
    pesoHijo: "Peso del hijo",
    percentilPeso: "Percentil de peso",
    embarazoPlaneado: "Embarazo planeado",
    problemasEmbarazo: "Problemas en el embarazo",
    problemasEmbarazoDetalle: "Detalle de problemas",
    condicionesEmbarazo: "Condiciones del embarazo",
    condicionesEmbarazoOtro: "Otra condicion (especificar)",
    tipoParto: "Tipo de parto",
    complicacionesParto: "Complicaciones del parto",
    complicacionesPartoDescripcion: "Descripcion de complicaciones",
    nacioTermino: "Nacio a termino",
    semanasNacimiento: "Semanas de nacimiento",
    problemasNacer: "Problemas al nacer",
    problemasNacerDetalle: "Detalle de problemas al nacer",
    pediatra: "Pediatra",
    pediatraTelefono: "Telefono del pediatra",
    pediatraEmail: "Email del pediatra",
    pediatraDescarto: "Pediatra descarto problemas",
    pediatraConfirma: "Pediatra confirma capacidad de dormir",
    pediatraConfirmaDetalle: "Detalle de porque no puede dormir",
    tratamientoMedico: "Tratamiento medico",
    tratamientoMedicoDetalle: "Detalle del tratamiento",
  },
  desarrolloSalud: {
    rodarMeses: "Edad al rodar (meses)",
    sentarseMeses: "Edad al sentarse (meses)",
    gatearMeses: "Edad al gatear (meses)",
    pararseMeses: "Edad al pararse (meses)",
    caminarMeses: "Edad al caminar (meses)",
    hijoUtiliza: "El hijo utiliza",
    alimentacion: "Tipo de alimentacion",
    alimentacionOtro: "Otra alimentacion",
    comeSolidos: "Come solidos",
    problemasHijo: "Caracteristicas del hijo",
    planDejarDedo: "Plan para dejar el dedo",
    planDejarChupon: "Plan para dejar el chupon",
    nombreObjetoSeguridad: "Nombre del objeto de seguridad",
    problemasMedicosDetalle: "Detalle de problemas medicos",
    situacionesHijo: "Situaciones de salud",
    alergiaAmbientalDetalle: "Detalle alergia ambiental",
    alergiaAlimenticiaDetalle: "Detalle alergia alimenticia",
    infeccionesOidoDetalle: "Detalle infecciones de oido",
    dificultadRespirarDetalle: "Detalle dificultad respirar",
  },
  actividadFisica: {
    vePantallas: "Ve pantallas",
    pantallasDetalle: "Detalle uso de pantallas",
    practicaActividad: "Practica actividad fisica",
    actividadesLista: "Lista de actividades",
    actividadesDespierto: "Actividades cuando esta despierto",
    signosIrritabilidad: "Signos de irritabilidad",
    irritabilidadDetalle: "Detalle de irritabilidad",
  },
  rutinaHabitos: {
    diaTipico: "Dia tipico",
    vaKinder: "Va al kinder o guarderia",
    kinderDetalle: "Detalle del kinder",
    quienCuida: "Quien cuida al nino",
    quienCuidaNoche: "Quien cuida en la noche",
    dondeDuermeSalida: "Donde duerme cuando salen",
    rutinaDormir: "Rutina para dormir",
    horaDormir: "Hora de dormir",
    duermeSolo: "Duerme de forma independiente",
    oscuridadCuarto: "Oscuridad del cuarto",
    colorLamparita: "Color de la lamparita",
    ruidoBlanco: "Usa ruido blanco",
    temperaturaCuarto: "Temperatura del cuarto",
    tipoPiyama: "Tipo de pijama",
    usaSaco: "Usa saco para dormir",
    teQuedasHastaDuerma: "Se queda hasta que duerma",
    dondeDuerme: "Donde duerme",
    comparteHabitacion: "Comparte habitacion",
    comparteHabitacionCon: "Con quien comparte habitacion",
    horaAcostarBebe: "Hora de acostar al bebe",
    tiempoDormir: "Tiempo para dormirse",
    horaDespertar: "Hora de despertar",
    despiertaNoche: "Despierta por la noche",
    vecesDespierta: "Veces que despierta",
    tiempoDespierto: "Tiempo despierto",
    desdeCuandoDespierta: "Desde cuando despierta",
    queHacesDespierta: "Que hace cuando despierta",
    tomaSiestas: "Toma siestas",
    numeroSiestas: "Numero y horario de siestas",
    duracionTotalSiestas: "Duracion total de siestas",
    dondeSiestas: "Donde toma siestas",
    principalPreocupacion: "Principal preocupacion",
    desdeCuandoProblema: "Desde cuando existe el problema",
    objetivoPadres: "Objetivo de los padres",
    infoAdicional: "Informacion adicional",
  },
}

// Valores legibles para campos booleanos y enums
const VALUE_FORMATTERS: Record<string, (value: any) => string> = {
  primaryCaregiver: (v) => {
    const map: Record<string, string> = {
      father: "Papa",
      mother: "Mama",
      caregiver: "Cuidador",
    }
    return map[v] || v || "No especificado"
  },
  contactoPrincipal: (v) => (v === "mama" ? "Mama" : v === "papa" ? "Papa" : v || "No especificado"),
  tipoParto: (v) => v || "No especificado",
  alimentacion: (v) => v || "No especificado",
  usoVaso: (v) => v || "No especificado",
}

function formatValue(key: string, value: any): string | React.ReactNode {
  // Campos booleanos
  if (typeof value === "boolean") {
    return value ? "Si" : "No"
  }

  // Campos null o undefined
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground italic">Sin respuesta</span>
  }

  // Arrays
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-muted-foreground italic">Sin respuesta</span>
    }
    // Si es array de objetos (como hijosInfo)
    if (typeof value[0] === "object") {
      return (
        <div className="space-y-2">
          {value.map((item, idx) => (
            <div key={idx} className="pl-4 border-l-2 border-muted">
              {Object.entries(item).map(([k, v]) => (
                <div key={k} className="text-sm">
                  <span className="font-medium">{k}: </span>
                  <span>{String(v)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )
    }
    // Array simple
    return value.join(", ")
  }

  // Formatters especiales
  if (VALUE_FORMATTERS[key]) {
    return VALUE_FORMATTERS[key](value)
  }

  // Numeros
  if (typeof value === "number") {
    return String(value)
  }

  // Fechas
  if (value instanceof Date) {
    return value.toLocaleDateString("es-MX")
  }

  // Objetos anidados (como papa, mama)
  if (typeof value === "object" && value !== null) {
    return null // Se manejara por separado
  }

  return String(value)
}

interface FieldRowProps {
  label: string
  value: any
  fieldKey: string
}

function FieldRow({ label, value, fieldKey }: FieldRowProps) {
  const formattedValue = formatValue(fieldKey, value)

  // Si es null, el valor es un objeto que se manejara por separado
  if (formattedValue === null) {
    return null
  }

  return (
    <div className="grid grid-cols-2 gap-4 py-2">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{formattedValue}</dd>
    </div>
  )
}

interface NestedObjectSectionProps {
  title: string
  data: Record<string, any> | null | undefined
  sectionKey: string
  fieldsList?: string[]
}

function NestedObjectSection({ title, data, sectionKey, fieldsList }: NestedObjectSectionProps) {
  const labels = FIELD_LABELS[sectionKey] || {}
  const safeData = data || {}

  // Usar la lista de campos si se proporciona, sino usar las claves del objeto
  const fieldsToShow = fieldsList || Object.keys(safeData)

  return (
    <Card className="mb-4">
      <CardHeader className="py-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="divide-y divide-muted">
          {fieldsToShow.map((key) => {
            // Ignorar campos internos o de metadata
            if (key.startsWith("_") || key === "createdAt" || key === "updatedAt") {
              return null
            }
            const label = labels[key] || key
            const value = safeData[key]
            return <FieldRow key={key} label={label} value={value} fieldKey={key} />
          })}
        </dl>
      </CardContent>
    </Card>
  )
}

interface SurveySectionProps {
  sectionKey: string
  data: any
}

export function SurveySection({ sectionKey, data }: SurveySectionProps) {
  const labels = FIELD_LABELS[sectionKey] || {}
  const allFields = SECTION_ALL_FIELDS[sectionKey] || []
  const safeData = data || {}

  // Lista de campos que son objetos anidados (papa, mama)
  const nestedObjectKeys = ["papa", "mama"]

  // Campos de metadata a ignorar
  const metadataFields = ["_id", "createdAt", "updatedAt", "completed", "completedAt", "lastUpdated", "isPartial"]

  // Separar objetos anidados de campos simples basado en la lista completa
  const nestedObjects: Array<{ key: string; title: string; data: any }> = []
  const simpleFields: Array<{ key: string; label: string; value: any }> = []

  allFields.forEach((key) => {
    // Ignorar campos de metadata
    if (metadataFields.includes(key) || key.startsWith("_")) {
      return
    }

    const value = safeData[key]

    // Campos que son objetos anidados (como papa, mama)
    if (nestedObjectKeys.includes(key)) {
      const title = labels[key] || key
      nestedObjects.push({ key, title, data: value })
    } else {
      const label = labels[key] || key
      simpleFields.push({ key, label, value })
    }
  })

  // Si no hay campos definidos para esta seccion, mostrar mensaje
  if (allFields.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay campos definidos para esta seccion
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Campos simples primero */}
      {simpleFields.length > 0 && (
        <dl className="divide-y divide-muted">
          {simpleFields.map(({ key, label, value }) => (
            <FieldRow key={key} label={label} value={value} fieldKey={key} />
          ))}
        </dl>
      )}

      {/* Separador si hay ambos tipos */}
      {simpleFields.length > 0 && nestedObjects.length > 0 && (
        <Separator className="my-4" />
      )}

      {/* Objetos anidados (papa, mama) con lista de campos */}
      {nestedObjects.map(({ key, title, data: nestedData }) => (
        <NestedObjectSection
          key={key}
          title={title}
          data={nestedData}
          sectionKey={sectionKey}
          fieldsList={PARENT_FIELDS}
        />
      ))}
    </div>
  )
}

// Titulos de las secciones para uso externo
export const SECTION_TITLES: Record<string, string> = {
  informacionFamiliar: "Informacion Familiar",
  dinamicaFamiliar: "Dinamica Familiar",
  historial: "Historial del Nino",
  desarrolloSalud: "Desarrollo y Salud",
  actividadFisica: "Actividad Fisica",
  rutinaHabitos: "Rutina y Habitos",
}

export function getSectionTitle(sectionKey: string | null): string {
  if (!sectionKey) return ""
  return SECTION_TITLES[sectionKey] || sectionKey
}
