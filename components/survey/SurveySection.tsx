// Componente para visualizar las respuestas de una seccion de encuesta
// Renderiza los campos de forma legible para la doctora (admin)

"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { SurveyData } from "@/types/models"

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
    puedeDormirConHijo: "Puede dormir con el hijo",
    apetito: "Apetito",
    pensamientosNegativos: "Pensamientos negativos",
    pensamientosNegativosDetalle: "Detalle de pensamientos",
  },
  dinamicaFamiliar: {
    cantidadHijos: "Cantidad de hijos",
    hijosInfo: "Informacion de los hijos",
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
    genero: "Genero",
    pesoHijo: "Peso del hijo",
    percentilPeso: "Percentil de peso",
    embarazoPlaneado: "Embarazo planeado",
    problemasEmbarazo: "Problemas en el embarazo",
    problemasEmbarazoDetalle: "Detalle de problemas",
    condicionesEmbarazo: "Condiciones del embarazo",
    tipoParto: "Tipo de parto",
    semanasNacimiento: "Semanas de nacimiento",
    complicacionesParto: "Complicaciones del parto",
    complicacionesPartoDescripcion: "Descripcion de complicaciones",
    problemasHijo: "Problemas del hijo",
    problemasNacer: "Problemas al nacer",
    problemasNacerDetalle: "Detalle de problemas al nacer",
    pediatra: "Pediatra",
    pediatraTelefono: "Telefono del pediatra",
    pediatraEmail: "Email del pediatra",
    pediatraDescarto: "Pediatra descarto problemas",
    pediatraConfirma: "Pediatra confirma capacidad de dormir",
    tratamientoMedico: "Tratamiento medico",
    tratamientoMedicoDetalle: "Detalle del tratamiento",
  },
  desarrolloSalud: {
    rodarMeses: "Edad al rodar (meses)",
    sentarseMeses: "Edad al sentarse (meses)",
    gatearMeses: "Edad al gatear (meses)",
    pararseMeses: "Edad al pararse (meses)",
    caminarMeses: "Edad al caminar (meses)",
    usoVaso: "Uso de vaso",
    alimentacion: "Tipo de alimentacion",
    alimentacionOtro: "Otra alimentacion",
    comeSolidos: "Come solidos",
    hijoUtiliza: "El hijo utiliza",
    nombreObjetoSeguridad: "Nombre del objeto de seguridad",
    planDejarDedo: "Plan para dejar el dedo",
    planDejarChupon: "Plan para dejar el chupon",
  },
  actividadFisica: {
    tiempoPantalla: "Tiempo de pantalla",
    actividadesFisicas: "Actividades fisicas",
    irritabilidad: "Nivel de irritabilidad",
    sensibilidadRuido: "Sensibilidad al ruido",
    sensibilidadLuz: "Sensibilidad a la luz",
  },
  rutinaHabitos: {
    diaTypico: "Dia tipico",
    horaDespertar: "Hora de despertar",
    horaSiesta: "Hora de siesta",
    duracionSiesta: "Duracion de siesta",
    horaAcostarse: "Hora de acostarse",
    rutinaAntesDormir: "Rutina antes de dormir",
    tiempoEnDormirse: "Tiempo en dormirse",
    despiertasNocturnas: "Despertares nocturnos",
    comoSeVuelveADormir: "Como se vuelve a dormir",
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
  data: Record<string, any>
  sectionKey: string
}

function NestedObjectSection({ title, data, sectionKey }: NestedObjectSectionProps) {
  if (!data || typeof data !== "object") return null

  const labels = FIELD_LABELS[sectionKey] || {}

  return (
    <Card className="mb-4">
      <CardHeader className="py-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="divide-y divide-muted">
          {Object.entries(data).map(([key, value]) => {
            // Ignorar campos internos o de metadata
            if (key.startsWith("_") || key === "createdAt" || key === "updatedAt") {
              return null
            }
            const label = labels[key] || key
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
  if (!data) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay datos disponibles para esta seccion
      </div>
    )
  }

  const labels = FIELD_LABELS[sectionKey] || {}

  // Separar objetos anidados de campos simples
  const nestedObjects: Array<{ key: string; title: string; data: any }> = []
  const simpleFields: Array<{ key: string; label: string; value: any }> = []

  Object.entries(data).forEach(([key, value]) => {
    // Ignorar campos de metadata
    if (key.startsWith("_") || key === "createdAt" || key === "updatedAt" || key === "completed" || key === "completedAt" || key === "lastUpdated" || key === "isPartial") {
      return
    }

    // Campos que son objetos anidados (como papa, mama, hijosInfo)
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const title = labels[key] || key
      nestedObjects.push({ key, title, data: value })
    } else {
      const label = labels[key] || key
      simpleFields.push({ key, label, value })
    }
  })

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

      {/* Objetos anidados */}
      {nestedObjects.map(({ key, title, data: nestedData }) => (
        <NestedObjectSection
          key={key}
          title={title}
          data={nestedData}
          sectionKey={sectionKey}
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
