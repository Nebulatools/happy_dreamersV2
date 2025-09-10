"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useSleepComparison } from "@/hooks/use-sleep-comparison"

interface MedicalSurveyPromptProps {
  childId: string
  dateRange?: string
}

// Heurística simple para detectar empeoramiento de métricas
function isWorsening(data: ReturnType<typeof useSleepComparison>["data"]): boolean {
  if (!data) return false
  const worsenedSleep = (data.sleepDuration.change || 0) <= -0.5 // ↓ 0.5h o más
  const worsenedWakeups = (data.wakeups.change || 0) >= 0.5      // ↑ 0.5 o más
  const worsenedConsistency = (data.consistency.change || 0) >= 10 // ↑ variación 10m o más
  return worsenedSleep || worsenedWakeups || worsenedConsistency
}

export default function MedicalSurveyPrompt({ childId, dateRange = "7-days" }: MedicalSurveyPromptProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { data, loading } = useSleepComparison(childId, dateRange)

  // No mostrar a admin ni sin childId
  if (session?.user?.role === "admin" || !childId) return null

  // Gate semanal para no mostrar todos los días
  const storageKey = `medicalPrompt:lastShown:${childId}`
  const [shouldShow, setShouldShow] = React.useState(false)

  React.useEffect(() => {
    if (loading) return
    const last = localStorage.getItem(storageKey)
    const lastTs = last ? parseInt(last, 10) : 0
    const oneWeek = 7 * 24 * 60 * 60 * 1000
    const eligibleByTime = Date.now() - lastTs > oneWeek
    const worsen = isWorsening(data)
    setShouldShow(eligibleByTime && worsen)
  }, [loading, data, childId])

  const handleDismiss = () => {
    localStorage.setItem(storageKey, String(Date.now()))
    setShouldShow(false)
  }

  if (!shouldShow) return null

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div className="flex-1 text-sm text-amber-900">
            <p className="font-medium">¿Notas algún síntoma médico reciente?</p>
            <p className="text-amber-800 mt-1">Vimos cambios en sus métricas de sueño. Te sugerimos completar una breve encuesta de sintomatología para ajustar el plan.</p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" className="hd-gradient-button text-white" onClick={() => router.push(`/dashboard/survey?childId=${childId}&from=medical-trigger`)}>
                Responder ahora
              </Button>
              <Button size="sm" variant="outline" onClick={handleDismiss}>Recordar más tarde</Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

