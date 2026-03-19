// Resumen clinico compacto para la vista de paciente (admin)
// Muestra datos medicos, rutina y plan activo en acordeon colapsable

"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Stethoscope,
  Clock,
  FileText,
  CheckCircle,
  AlertCircle,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClinicalSummaryCardProps {
  childId: string
}

interface SurveyResponse {
  surveyData: Record<string, any> | null
}

interface ActivePlanResponse {
  isDefault: boolean
  schedule?: {
    bedtime?: string
    wakeTime?: string
    meals?: Array<{ time: string; type: string; description?: string }>
    naps?: Array<{ time: string; duration?: number; description?: string }>
    activities?: Array<{
      time: string
      activity: string
      duration?: number
      description?: string
    }>
  }
  planNumber?: number
  planVersion?: string
  title?: string
  objectives?: string[]
  recommendations?: string[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Acceso seguro a propiedades anidadas
function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((acc, key) => acc?.[key], obj)
}

// Mapa de tokens del survey a etiquetas legibles
const PROBLEM_LABELS: Record<string, string> = {
  "ronca": "Ronca",
  "respira-boca": "Respira por boca",
  "reflujo": "Reflujo",
  "transpira": "Transpira mucho",
  "moja-cama": "Moja la cama",
  "pesadillas": "Pesadillas",
  "inquieto": "Muy inquieto",
  "colicos": "Colicos",
}

const SITUATION_LABELS: Record<string, string> = {
  "nariz-tapada": "Nariz tapada",
  "rinitis": "Rinitis",
  "dermatitis": "Dermatitis",
  "alergia-ambiental": "Alergia ambiental",
  "alergia-alimenticia": "Alergia alimenticia",
  "infecciones-oido": "Infecciones de oido",
  "problemas-medicos": "Problemas medicos",
  "dificultad-respirar": "Dificultad para respirar",
}

// Formatea hora tipo "20:00" a "8:00 PM"
function formatTime(time?: string): string {
  if (!time) return "--"
  const parts = time.split(":")
  if (parts.length < 2) return time
  const hh = parseInt(parts[0], 10)
  const mm = parts[1]
  if (isNaN(hh)) return time
  const suffix = hh >= 12 ? "PM" : "AM"
  const normalized = hh % 12 === 0 ? 12 : hh % 12
  return `${normalized}:${mm} ${suffix}`
}

// Normaliza actividadesLista a un array de strings legibles
function normalizeActivities(
  raw: string | string[] | { nombre: string; duracionMinutos?: number }[] | undefined
): string[] {
  if (!raw) return []
  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  }
  if (Array.isArray(raw)) {
    return raw.map((item) => {
      if (typeof item === "string") return item
      if (typeof item === "object" && item !== null && "nombre" in item) {
        const name = item.nombre
        const dur = item.duracionMinutos
        return dur ? `${name} (${dur} min)` : name
      }
      return String(item)
    })
  }
  return []
}

// ---------------------------------------------------------------------------
// Sub-componentes de seccion
// ---------------------------------------------------------------------------

function MedicalSection({ survey }: { survey: Record<string, any> }) {
  // Alergias de papa y mama
  const papaAlergias = getNestedValue(survey, "informacionFamiliar.papa.tieneAlergias")
  const papaAlergiasDetalle = getNestedValue(survey, "informacionFamiliar.papa.alergias")
  const mamaAlergias = getNestedValue(survey, "informacionFamiliar.mama.tieneAlergias")
  const mamaAlergiasDetalle = getNestedValue(survey, "informacionFamiliar.mama.alergias")

  // Condiciones del nino
  const problemasHijo: string[] = getNestedValue(survey, "desarrolloSalud.problemasHijo") || []
  const situacionesHijo: string[] = getNestedValue(survey, "desarrolloSalud.situacionesHijo") || []

  // Mapear tokens a badges
  const conditionBadges: string[] = []
  for (const token of problemasHijo) {
    const label = PROBLEM_LABELS[token]
    if (label) conditionBadges.push(label)
    else if (token) conditionBadges.push(token)
  }
  for (const token of situacionesHijo) {
    const label = SITUATION_LABELS[token]
    if (label) conditionBadges.push(label)
    else if (token) conditionBadges.push(token)
  }

  // Tratamiento medico
  const tratamiento = getNestedValue(survey, "historial.tratamientoMedico")
  const tratamientoDetalle =
    getNestedValue(survey, "historial.tratamientoMedicoDetalle") ||
    getNestedValue(survey, "historial.tratamientoMedicoDescripcion")

  // Pediatra
  const pediatra = getNestedValue(survey, "historial.pediatra")
  const pediatraTel = getNestedValue(survey, "historial.pediatraTelefono")

  const hasAnyData =
    papaAlergias ||
    mamaAlergias ||
    conditionBadges.length > 0 ||
    tratamiento ||
    pediatra

  if (!hasAnyData) {
    return (
      <p className="text-sm text-gray-400 italic">
        Sin condiciones medicas reportadas
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {/* Alergias familiares */}
      {(papaAlergias || mamaAlergias) && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">
            Alergias familiares
          </p>
          <div className="flex flex-wrap gap-1.5">
            {papaAlergias && (
              <Badge
                variant="secondary"
                className="bg-orange-50 text-orange-700 border border-orange-200 text-xs"
              >
                Papa{papaAlergiasDetalle ? `: ${papaAlergiasDetalle}` : ""}
              </Badge>
            )}
            {mamaAlergias && (
              <Badge
                variant="secondary"
                className="bg-orange-50 text-orange-700 border border-orange-200 text-xs"
              >
                Mama{mamaAlergiasDetalle ? `: ${mamaAlergiasDetalle}` : ""}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Condiciones del nino */}
      {conditionBadges.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">
            Condiciones del nino
          </p>
          <div className="flex flex-wrap gap-1.5">
            {conditionBadges.map((label) => (
              <Badge
                key={label}
                variant="secondary"
                className="bg-red-50 text-red-700 border border-red-200 text-xs"
              >
                {label}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Tratamiento actual */}
      {tratamiento && tratamientoDetalle && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">
            Tratamiento actual
          </p>
          <p className="text-sm text-gray-700">{tratamientoDetalle}</p>
        </div>
      )}

      {/* Pediatra */}
      {pediatra && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Pediatra</p>
          <p className="text-sm text-gray-700">
            {pediatra}
            {pediatraTel && (
              <span className="text-gray-400 ml-2">Tel: {pediatraTel}</span>
            )}
          </p>
        </div>
      )}
    </div>
  )
}

function RoutineSection({
  survey,
  plan,
}: {
  survey: Record<string, any> | null
  plan: ActivePlanResponse | null
}) {
  // Horarios: plan tiene prioridad, survey como fallback
  const wakeTime =
    plan?.schedule?.wakeTime ||
    getNestedValue(survey, "rutinaHabitos.horaDespertarManana") ||
    getNestedValue(survey, "rutinaHabitos.horaDespertar")
  const bedtime =
    plan?.schedule?.bedtime ||
    getNestedValue(survey, "rutinaHabitos.horaDormir") ||
    getNestedValue(survey, "rutinaHabitos.horaAcostarBebe")

  // Comidas del plan
  const meals = plan?.schedule?.meals || []
  // Siestas del plan
  const naps = plan?.schedule?.naps || []

  // Actividades del survey
  const actividadesRaw = getNestedValue(survey, "actividadFisica.actividadesLista")
  const actividades = normalizeActivities(actividadesRaw)

  // Despertares nocturnos del survey
  const vecesDespierta = getNestedValue(survey, "rutinaHabitos.vecesDespierta")
  const queHacesDespierta = getNestedValue(survey, "rutinaHabitos.queHacesDespierta")

  // Donde duerme
  const dondeDuerme = getNestedValue(survey, "rutinaHabitos.dondeDuerme")

  const hasAnyData = wakeTime || bedtime || meals.length > 0 || naps.length > 0

  if (!hasAnyData && !actividades.length && !vecesDespierta && !dondeDuerme) {
    return (
      <p className="text-sm text-gray-400 italic">
        Sin datos de rutina disponibles
      </p>
    )
  }

  // Construir timeline items
  type TimelineItem = { time: string; label: string }
  const timeline: TimelineItem[] = []

  if (wakeTime) timeline.push({ time: wakeTime, label: "Despertar" })

  // Ordenar comidas por hora
  const sortedMeals = [...meals].sort((a, b) => a.time.localeCompare(b.time))
  for (const meal of sortedMeals) {
    const mealLabel =
      meal.type.charAt(0).toUpperCase() + meal.type.slice(1)
    timeline.push({
      time: meal.time,
      label: meal.description || mealLabel,
    })
  }

  // Siestas
  for (const nap of naps) {
    const dur = nap.duration ? ` (${nap.duration} min)` : ""
    timeline.push({
      time: nap.time,
      label: `Siesta${dur}`,
    })
  }

  if (bedtime) timeline.push({ time: bedtime, label: "Bedtime" })

  // Ordenar timeline por hora (formato HH:MM)
  timeline.sort((a, b) => a.time.localeCompare(b.time))

  return (
    <div className="space-y-3">
      {/* Timeline vertical compacta */}
      {timeline.length > 0 && (
        <div className="space-y-1">
          {timeline.map((item, idx) => (
            <div
              key={`${item.time}-${idx}`}
              className="flex items-baseline gap-3 text-sm"
            >
              <span className="text-gray-400 font-mono text-xs w-14 text-right flex-shrink-0">
                {formatTime(item.time)}
              </span>
              <span className="text-gray-700">{item.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Donde duerme */}
      {dondeDuerme && (
        <div className="text-sm">
          <span className="text-gray-500">Duerme en: </span>
          <span className="text-gray-700">{dondeDuerme}</span>
        </div>
      )}

      {/* Actividades */}
      {actividades.length > 0 && (
        <div className="text-sm">
          <span className="text-gray-500">Actividades: </span>
          <span className="text-gray-700">{actividades.join(", ")}</span>
        </div>
      )}

      {/* Despertares nocturnos */}
      {vecesDespierta != null && (
        <div className="text-sm">
          <span className="text-gray-500">Despertares: </span>
          <span className="text-gray-700">
            {vecesDespierta} {vecesDespierta === 1 ? "vez" : "veces"}
            {queHacesDespierta && ` (${queHacesDespierta})`}
          </span>
        </div>
      )}
    </div>
  )
}

function CurrentPlanSection({ plan }: { plan: ActivePlanResponse | null }) {
  if (!plan || plan.isDefault) {
    return (
      <p className="text-sm text-gray-400 italic">Sin plan activo</p>
    )
  }

  const objectives = (plan.objectives || []).filter(Boolean)
  const recommendations = (plan.recommendations || []).filter(Boolean)

  // Linea resumen de horarios
  const scheduleItems: string[] = []
  if (plan.schedule?.bedtime) scheduleItems.push(`BT ${formatTime(plan.schedule.bedtime)}`)
  if (plan.schedule?.wakeTime) scheduleItems.push(`Wake ${formatTime(plan.schedule.wakeTime)}`)
  if (plan.schedule?.naps && plan.schedule.naps.length > 0) {
    scheduleItems.push(
      `${plan.schedule.naps.length} ${plan.schedule.naps.length === 1 ? "siesta" : "siestas"}`
    )
  }

  return (
    <div className="space-y-3">
      {/* Badge de version */}
      <div className="flex items-center gap-2">
        <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-xs">
          Plan v{plan.planVersion}
        </Badge>
        {scheduleItems.length > 0 && (
          <span className="text-xs text-gray-500">
            {scheduleItems.join(" / ")}
          </span>
        )}
      </div>

      {/* Objetivos */}
      {objectives.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Objetivos</p>
          <ul className="space-y-1">
            {objectives.slice(0, 3).map((obj, idx) => (
              <li key={idx} className="flex items-start gap-1.5 text-sm text-gray-700">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>{obj}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recomendaciones */}
      {recommendations.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">
            Recomendaciones
          </p>
          <ul className="list-disc ml-4 space-y-0.5">
            {recommendations.slice(0, 2).map((rec, idx) => (
              <li key={idx} className="text-sm text-gray-700">
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function ClinicalSummarySkeleton() {
  return (
    <Card className="border border-gray-100">
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function ClinicalSummaryCard({ childId }: ClinicalSummaryCardProps) {
  const [survey, setSurvey] = useState<Record<string, any> | null>(null)
  const [plan, setPlan] = useState<ActivePlanResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        setIsLoading(true)
        setError(null)

        const [surveyRes, planRes] = await Promise.all([
          fetch(`/api/children/${childId}/survey`),
          fetch(`/api/children/${childId}/active-plan`),
        ])

        if (!cancelled) {
          if (surveyRes.ok) {
            const surveyJson: SurveyResponse = await surveyRes.json()
            setSurvey(surveyJson.surveyData)
          } else {
            setSurvey(null)
          }

          if (planRes.ok) {
            const planJson: ActivePlanResponse = await planRes.json()
            setPlan(planJson)
          } else {
            setPlan(null)
          }
        }
      } catch (err) {
        console.error("Error fetching clinical summary data:", err)
        if (!cancelled) {
          setError("Error al cargar datos clinicos")
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      cancelled = true
    }
  }, [childId])

  if (isLoading) {
    return <ClinicalSummarySkeleton />
  }

  if (error) {
    return (
      <Card className="border border-red-100">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Sin datos del survey ni plan
  if (!survey && (!plan || plan.isDefault)) {
    return (
      <Card className="border border-gray-100">
        <CardContent className="p-4">
          <p className="text-sm text-gray-400 italic">
            Sin datos del cuestionario. La encuesta aun no ha sido completada.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border border-gray-100">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-gray-800">
          Resumen Clinico
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Accordion
          type="multiple"
          defaultValue={["medical", "routine", "plan"]}
          className="w-full"
        >
          {/* Seccion 1: Datos Medicos */}
          <AccordionItem value="medical" className="border-b border-gray-100">
            <AccordionTrigger className="py-3 text-sm font-medium text-gray-700 hover:no-underline">
              <span className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-red-500" />
                Datos Medicos
              </span>
            </AccordionTrigger>
            <AccordionContent>
              {survey ? (
                <MedicalSection survey={survey} />
              ) : (
                <p className="text-sm text-gray-400 italic">
                  Sin datos del cuestionario
                </p>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Seccion 2: Rutina */}
          <AccordionItem value="routine" className="border-b border-gray-100">
            <AccordionTrigger className="py-3 text-sm font-medium text-gray-700 hover:no-underline">
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                Rutina
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <RoutineSection survey={survey} plan={plan} />
            </AccordionContent>
          </AccordionItem>

          {/* Seccion 3: Plan Actual */}
          <AccordionItem value="plan" className="border-b-0">
            <AccordionTrigger className="py-3 text-sm font-medium text-gray-700 hover:no-underline">
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-500" />
                Plan Actual
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <CurrentPlanSection plan={plan} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  )
}
