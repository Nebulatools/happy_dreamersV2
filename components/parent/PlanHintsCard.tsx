"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Info, Lightbulb } from "lucide-react"
import { useSession } from "next-auth/react"
import { useSleepData } from "@/hooks/use-sleep-data"
import { derivePlanPolicy, getAgeInMonths } from "@/lib/plan-policies"

interface PlanHintsCardProps {
  childId: string
  childBirthDate?: string | null
  dateRange?: string
}

export default function PlanHintsCard({ childId, childBirthDate, dateRange = "7-days" }: PlanHintsCardProps) {
  const { data: session } = useSession()
  if (session?.user?.role === "admin") return null
  const { data: sleepData } = useSleepData(childId, dateRange)

  const ageInMonths = getAgeInMonths(childBirthDate || null)
  const policy = derivePlanPolicy({ ageInMonths, events: sleepData?.events || [] })

  return (
    <Card className="bg-blue-50/60 border-blue-100">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-slate-700 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          Sugerencias para ajustes
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 text-sm text-slate-700">
        <ul className="list-disc ml-5 space-y-1">
          <li>
            {policy.napTransition.isTransitionWindow ? (
              <>Transición 2→1 siestas (15–18 m): cambios graduales de <b>10–15 min</b> cada 3–4 días.</>
            ) : (
              <>Ajustes generales: puedes mover bloques de <b>30 min</b> si el niño lo tolera.</>
            )}
          </li>
          {policy.nightWeaning.isActive && (
            <li>
              Destete nocturno: mueve la toma <b>{policy.nightWeaning.shiftEarlierMinutesPerStep} min</b> más temprano y sube ~<b>{policy.nightWeaning.increaseBottleOzPerStep} oz</b> cada <b>{policy.nightWeaning.stepEveryDays} días</b>, de forma paulatina.
            </li>
          )}
        </ul>
        <div className="flex items-start gap-2 mt-2 text-xs text-slate-500">
          <Info className="w-3.5 h-3.5 mt-0.5" />
          <p>Estas pautas son orientativas; si notas incomodidad, reduce el tamaño del ajuste o aumenta el tiempo entre cambios.</p>
        </div>
      </CardContent>
    </Card>
  )
}

