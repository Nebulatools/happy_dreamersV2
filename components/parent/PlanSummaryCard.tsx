"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChildPlan } from "@/types/models"
import { Calendar, CheckCircle, Clock, Info, Moon, Sun } from "lucide-react"

interface PlanSummaryCardProps {
  plan: ChildPlan | null
  isLoading?: boolean
  error?: string | null
}

const formatTimeLabel = (value?: string | null) => {
  if (!value) return "No especificado"
  const [hours, minutes] = value.split(":")
  if (hours === undefined || minutes === undefined) return value
  const hh = parseInt(hours, 10)
  if (Number.isNaN(hh)) return value
  const suffix = hh >= 12 ? "PM" : "AM"
  const normalized = hh % 12 === 0 ? 12 : hh % 12
  return `${normalized}:${minutes} ${suffix}`
}

type SleepRoutineData = NonNullable<ChildPlan["sleepRoutine"]>

const hasLegacySleepRoutineDetails = (routine?: ChildPlan["sleepRoutine"] | null): routine is SleepRoutineData => {
  if (!routine || typeof routine !== "object") return false
  return Boolean(
    routine.suggestedBedtime ||
    routine.suggestedWakeTime ||
    routine.napDuration ||
    routine.wakeWindows ||
    (typeof routine.numberOfNaps === "number" && routine.numberOfNaps > 0)
  )
}

const getSleepRoutineNotes = (routine?: ChildPlan["sleepRoutine"] | null) => {
  if (!routine || typeof routine !== "object") return ""
  return routine.notes?.trim() || ""
}

const formatDateLabel = (value?: Date | string) => {
  if (!value) return "Sin fecha"
  const dateObj = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(dateObj.getTime())) return "Sin fecha"
  return dateObj.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function PlanSummaryCard({ plan, isLoading, error }: PlanSummaryCardProps) {
  if (isLoading) {
    return (
      <Card className="bg-white shadow-sm border-0">
        <CardHeader>
          <CardTitle className="text-sm text-slate-600">Cargando plan...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-white border-red-100">
        <CardHeader>
          <CardTitle className="text-sm text-red-700 flex items-center gap-2">
            <Info className="h-4 w-4" />
            No pudimos cargar el plan
          </CardTitle>
          <CardDescription className="text-xs text-red-600">
            {error}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!plan) {
    return (
      <Card className="bg-white shadow-sm border-0">
        <CardHeader>
          <CardTitle className="text-base text-slate-800">Aún no tienes un plan activo</CardTitle>
          <CardDescription>
            Cuando tu coach genere un plan, podrás verlo aquí automáticamente.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const sleepRoutineNotes = getSleepRoutineNotes(plan.sleepRoutine)
  const hasSleepRoutineNotes = sleepRoutineNotes.length > 0
  const legacySleepRoutine = hasLegacySleepRoutineDetails(plan.sleepRoutine) ? plan.sleepRoutine : null
  const objectives = plan.objectives?.filter(Boolean) || []
  const recommendations = plan.recommendations?.filter(Boolean) || []

  return (
    <Card className="bg-white shadow-sm border-0">
      <CardHeader>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-lg text-slate-900">Rutina personalizada</CardTitle>
            <CardDescription className="flex items-center gap-2 text-xs text-slate-500">
              <Calendar className="h-3.5 w-3.5" />
              Actualizado el {formatDateLabel(plan.updatedAt || plan.createdAt)}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="w-fit">
            Plan {plan.planVersion}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 p-4">
            <p className="text-sm font-semibold text-slate-700 mb-3">Rutina de sueño</p>
            {hasSleepRoutineNotes ? (
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{sleepRoutineNotes}</p>
            ) : legacySleepRoutine ? (
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Moon className="h-4 w-4 text-indigo-500" />
                  <span>Duerme: {formatTimeLabel(legacySleepRoutine.suggestedBedtime)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4 text-amber-500" />
                  <span>Despierta: {formatTimeLabel(legacySleepRoutine.suggestedWakeTime)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-500" />
                  <span>
                    Siestas: {typeof legacySleepRoutine.numberOfNaps === "number" ? legacySleepRoutine.numberOfNaps : "No especificado"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-500" />
                  <span>Duración siestas: {legacySleepRoutine.napDuration || "No especificado"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-500" />
                  <span>Ventanas vigilia: {legacySleepRoutine.wakeWindows || "No especificado"}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Tu coach aún no define una rutina específica.</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-100 p-4">
            <p className="text-sm font-semibold text-slate-700 mb-3">Objetivos clave</p>
            {objectives.length > 0 ? (
              <ul className="space-y-2 text-sm text-slate-600">
                {objectives.slice(0, 3).map((objective, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>{typeof objective === "string" ? objective : JSON.stringify(objective)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Una vez que tengas objetivos concretos, los verás aquí.</p>
            )}
          </div>
        </div>

        {recommendations.length > 0 && (
          <div className="rounded-2xl border border-slate-100 p-4">
            <p className="text-sm font-semibold text-slate-700 mb-3">Recomendaciones</p>
            <ul className="list-disc ml-5 text-sm text-slate-600 space-y-1">
              {recommendations.slice(0, 4).map((recommendation, index) => (
                <li key={index}>
                  {typeof recommendation === "string" ? recommendation : JSON.stringify(recommendation)}
                </li>
              ))}
            </ul>
            {recommendations.length > 4 && (
              <p className="text-xs text-slate-500 mt-2">
                Hay {recommendations.length - 4} recomendaciones adicionales en tu plan completo.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
