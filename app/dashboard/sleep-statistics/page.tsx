"use client"

import { useState, useMemo } from "react"
import { Download, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePageHeaderConfig } from "@/context/page-header-context"
import EnhancedSleepMetricsCard from "@/components/sleep-statistics/EnhancedSleepMetricsCard"
import SleepDurationChart from "@/components/sleep-statistics/SleepDurationChart"
import SleepConsistencyChart from "@/components/sleep-statistics/SleepConsistencyChart"
import NightWakeupsEvolutionChart from "@/components/sleep-statistics/NightWakeupsEvolutionChart"
import SleepDistributionChart from "@/components/sleep-statistics/SleepDistributionChart"
import SleepDataStorytellingCard from "@/components/sleep-statistics/SleepDataStorytellingCard"
import SleepInsightsCard from "@/components/sleep-statistics/SleepInsightsCard"
import PositiveFeedbackCard from "@/components/sleep-statistics/PositiveFeedbackCard"
import TodayInstructionsCard from "@/components/parent/TodayInstructionsCard"
// import SleepComparison from "@/components/sleep-statistics/SleepComparison"
import { useActiveChild } from "@/context/active-child-context"
import { useToast } from "@/hooks/use-toast"

import { createLogger } from "@/lib/logger"

const logger = createLogger("SleepStatistics")

export default function SleepStatisticsPage() {
  const { activeChildId } = useActiveChild()
  const { toast } = useToast()
  const [dateRange, setDateRange] = useState("7-days")

  // Configurar el header dinámico - usar useMemo para estabilizar las acciones
  const headerActions = useMemo(() => (
    <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
      <Button
        variant={dateRange === "7-days" ? "default" : "ghost"}
        size="sm"
        onClick={() => setDateRange("7-days")}
        className={`text-xs md:text-sm ${dateRange === "7-days" ? "hd-gradient-button text-white shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
      >
        7 días
      </Button>
      <Button
        variant={dateRange === "30-days" ? "default" : "ghost"}
        size="sm"
        onClick={() => setDateRange("30-days")}
        className={`text-xs md:text-sm ${dateRange === "30-days" ? "hd-gradient-button text-white shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
      >
        30 días
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
  ), [dateRange])

  usePageHeaderConfig({
    title: "Estadísticas de Sueño",
    actions: headerActions,
    showChildSelector: true,
    showNotifications: true
  })

  return (
    <div className="space-y-6">
      {activeChildId ? (
        <>
          {/* Nueva Card de Métricas Mejorada - Incluye todo lo prioritario */}
          <EnhancedSleepMetricsCard childId={activeChildId} dateRange={dateRange} />

          {/* Mensajes positivos (solo padres) */}
          <PositiveFeedbackCard childId={activeChildId} dateRange={dateRange} />

          {/* Para Hoy (solo padres) */}
          <TodayInstructionsCard childId={activeChildId} />

          {/* Card de Análisis y Recomendaciones */}
          <SleepInsightsCard childId={activeChildId} dateRange={dateRange} />

          {/* Nuevo componente de Data Storytelling */}
          <SleepDataStorytellingCard childId={activeChildId} dateRange={dateRange} />

          {/* Evolución de despertares nocturnos - Después del análisis del sueño */}
          <NightWakeupsEvolutionChart childId={activeChildId} dateRange={dateRange} />

          {/* Distribución del sueño - Al final */}
          <SleepDistributionChart childId={activeChildId} dateRange={dateRange} />

          {/* Tabla Comparativa temporalmente deshabilitada 
          <SleepComparison childId={activeChildId} dateRange={dateRange} />
          */}
        </>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Selecciona un niño</h2>
          <p className="text-gray-500">
            Por favor, selecciona un niño en la parte superior para ver sus estadísticas de sueño.
          </p>
        </div>
      )}
    </div>
  )
}
