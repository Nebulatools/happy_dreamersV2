// Tab de resumen con estadisticas de sueno
// Incluye todas las metricas de sleep-statistics

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import ClinicalSummaryCard from "@/components/clinical-summary/ClinicalSummaryCard"
import EnhancedSleepMetricsCard from "@/components/sleep-statistics/EnhancedSleepMetricsCard"
import PositiveFeedbackCard from "@/components/sleep-statistics/PositiveFeedbackCard"
import NightWakeupsEvolutionChart from "@/components/sleep-statistics/NightWakeupsEvolutionChart"
import TodayInstructionsCard from "@/components/parent/TodayInstructionsCard"
import MedicalSurveyPrompt from "@/components/alerts/MedicalSurveyPrompt"

interface ResumenTabProps {
  childId: string
}

export default function ResumenTab({ childId }: ResumenTabProps) {
  const [dateRange, setDateRange] = useState("7-days")

  return (
    <div className="space-y-6">
      {/* Resumen clinico compacto */}
      <ClinicalSummaryCard childId={childId} />

      {/* Selector de rango de fecha */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
          <Button
            variant={dateRange === "7-days" ? "default" : "ghost"}
            size="sm"
            onClick={() => setDateRange("7-days")}
            className={`text-xs md:text-sm ${dateRange === "7-days" ? "hd-gradient-button text-white shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
          >
            7 dias
          </Button>
          <Button
            variant={dateRange === "30-days" ? "default" : "ghost"}
            size="sm"
            onClick={() => setDateRange("30-days")}
            className={`text-xs md:text-sm ${dateRange === "30-days" ? "hd-gradient-button text-white shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
          >
            30 dias
          </Button>
          <Button
            variant={dateRange === "90-days" ? "default" : "ghost"}
            size="sm"
            onClick={() => setDateRange("90-days")}
            className={`text-xs md:text-sm ${dateRange === "90-days" ? "hd-gradient-button text-white shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
          >
            3 meses
          </Button>
        </div>
      </div>

      {/* Metricas principales */}
      <EnhancedSleepMetricsCard childId={childId} dateRange={dateRange} />

      {/* Mensajes positivos */}
      <PositiveFeedbackCard childId={childId} dateRange={dateRange} />

      {/* Instrucciones para hoy (siempre visible para admin) */}
      <TodayInstructionsCard childId={childId} />

      {/* Encuesta medica (siempre visible para admin) */}
      <MedicalSurveyPrompt childId={childId} dateRange={dateRange} />

      {/* Evolucion de despertares nocturnos */}
      <NightWakeupsEvolutionChart childId={childId} dateRange={dateRange} />
    </div>
  )
}
