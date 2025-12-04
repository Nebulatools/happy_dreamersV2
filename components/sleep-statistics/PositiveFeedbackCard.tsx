"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Trophy, ThumbsUp, TrendingUp } from "lucide-react"
import { useSession } from "next-auth/react"
import { useSleepData } from "@/hooks/use-sleep-data"
import { useSleepComparison } from "@/hooks/use-sleep-comparison"
import { getNightSleepDurationsHours } from "@/lib/sleep-stats"

interface PositiveFeedbackCardProps {
  childId: string
  dateRange?: string
}

export default function PositiveFeedbackCard({ childId, dateRange = "7-days" }: PositiveFeedbackCardProps) {
  const { data: session } = useSession()

  // IMPORTANTE: Todos los hooks deben ejecutarse ANTES de cualquier return temprano
  const { data: sleepData } = useSleepData(childId, dateRange)
  const { data: comparison } = useSleepComparison(childId, dateRange)

  // Solo para padres/usuarios no admin
  if (session?.user?.role === "admin") return null
  if (!childId) return null

  // Salvaguardas
  const awake = sleepData?.awakePeriods || []
  const events = sleepData?.events || []
  const sampleOk = (awake.length >= 5 || events.length >= 10)

  // KPIs
  const inRange24 = awake.filter(p => p.duration >= 120 && p.duration <= 240).length
  const pct24 = awake.length > 0 ? Math.round((inRange24 / awake.length) * 100) : 0

  const nightDurations = getNightSleepDurationsHours(events).sort((a,b)=>a-b)
  const nightMedian = nightDurations.length > 0 ? nightDurations[Math.floor(nightDurations.length/2)] : (sleepData?.avgSleepDuration || 0)

  const bedtimeVar = sleepData?.bedtimeVariation || 0
  const avgWakeups = sleepData?.avgWakeupsPerNight || 0

  // Progresos (comparación 7d vs prev)
  const dSleep = comparison?.sleepDuration?.change ?? 0 // horas
  const dWakeups = comparison?.wakeups?.change ?? 0
  const dConsistency = comparison?.consistency?.change ?? 0 // minutos

  type Msg = { text: string; score: number }
  const messages: Msg[] = []

  // Logros actuales
  if (pct24 >= 70) messages.push({ text: `¡Rutina consistente! ${pct24}% de las ventanas están entre 2–4 h. Vas muy bien.`, score: 90 })
  else if (pct24 >= 50) messages.push({ text: `Buen camino: ${pct24}% de ventanas en 2–4 h. Repetir horarios ayuda a consolidarlo.`, score: 70 })

  if (nightMedian >= 9 && nightMedian <= 12) messages.push({ text: `Noches reparadoras: mediana de sueño nocturno ~ ${nightMedian.toFixed(1)} h. Excelente.`, score: 85 })

  if (bedtimeVar <= 30 && bedtimeVar > 0) messages.push({ text: `Consistencia al acostarse: variación ~ ±${Math.round(bedtimeVar)} min. Gran trabajo.`, score: 80 })

  if (avgWakeups <= 1 && awake.length > 0) messages.push({ text: "Despertares bajos (≤1 por noche). Se nota la estabilidad.", score: 75 })

  // Progresos recientes
  if (dSleep >= 0.3) messages.push({ text: `¡Progreso! +${dSleep.toFixed(1)} h de sueño nocturno respecto al periodo anterior. 👏`, score: 72 })
  if (dWakeups <= -0.5) messages.push({ text: "Menos despertares por noche. Buen avance mantenido.", score: 68 })
  if (dConsistency <= -10) messages.push({ text: "Horarios más consistentes: variación al acostarse reducida.", score: 66 })

  // Si hay pocos datos
  if (!sampleOk && messages.length === 0) {
    messages.push({ text: "Estamos aprendiendo su rutina. Cada registro ayuda a personalizar mejor las recomendaciones.", score: 50 })
  }

  // Elegir las 2 mejores
  const top = messages.sort((a,b)=>b.score - a.score).slice(0, 2)
  if (top.length === 0) return null

  return (
    <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-100">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 text-emerald-600">
            <Trophy className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-sm text-gray-800">
            {top.map((m, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <ThumbsUp className="w-4 h-4 mt-0.5 text-emerald-600" />
                <p>{m.text}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

