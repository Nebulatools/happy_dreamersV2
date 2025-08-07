"use client"

import { useState, useMemo } from "react"
import { Download, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePageHeaderConfig } from "@/context/page-header-context"
import SleepMetricsGrid from "@/components/child-profile/SleepMetricsGrid"
import SleepDurationChart from "@/components/sleep-statistics/SleepDurationChart"
import SleepConsistencyChart from "@/components/sleep-statistics/SleepConsistencyChart"
import NightWakeupsEvolutionChart from "@/components/sleep-statistics/NightWakeupsEvolutionChart"
import SleepDistributionChart from "@/components/sleep-statistics/SleepDistributionChart"
import SleepDataStorytellingCard from "@/components/sleep-statistics/SleepDataStorytellingCard"
import SleepInsightsCard from "@/components/sleep-statistics/SleepInsightsCard"
import SleepBreakdownCard from "@/components/sleep-statistics/SleepBreakdownCard"
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
    showSearch: true,
    showChildSelector: true,
    showNotifications: true
  })

  return (
    <div className="space-y-6">
      {/* Métricas Principales */}
      {activeChildId ? (
        <SleepMetricsGrid childId={activeChildId} dateRange={dateRange} />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
          <p className="text-gray-500">Por favor selecciona un niño desde el menú superior para ver las estadísticas</p>
        </div>
      )}

      {/* Desglose de Sueño Nocturno vs Siestas */}
      {activeChildId ? (
        <SleepBreakdownCard childId={activeChildId} dateRange={dateRange} />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
          <p className="text-gray-500">Por favor selecciona un niño para ver el desglose de sueño</p>
        </div>
      )}

      {/* Card de Análisis y Recomendaciones */}
      {activeChildId ? (
        <SleepInsightsCard childId={activeChildId} dateRange={dateRange} />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
          <p className="text-gray-500">Por favor selecciona un niño desde el menú superior para ver análisis y recomendaciones</p>
        </div>
      )}

      {/* Nuevo componente de Data Storytelling */}
      {activeChildId ? (
        <SleepDataStorytellingCard childId={activeChildId} dateRange={dateRange} />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
          <p className="text-gray-500">Selecciona un niño para ver el análisis detallado de sueño</p>
        </div>
      )}

      {/* Evolución de despertares nocturnos - Después del análisis del sueño */}
      {activeChildId ? (
        <NightWakeupsEvolutionChart childId={activeChildId} dateRange={dateRange} />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
          <p className="text-gray-500">Selecciona un niño para ver la evolución de despertares nocturnos</p>
        </div>
      )}

      {/* Distribución del sueño - Al final */}
      {activeChildId ? (
        <SleepDistributionChart childId={activeChildId} dateRange={dateRange} />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
          <p className="text-gray-500">Selecciona un niño para ver la distribución del sueño</p>
        </div>
      )}

      {/* Tabla Comparativa temporalmente deshabilitada 
      {activeChildId ? (
        <SleepComparison childId={activeChildId} dateRange={dateRange} />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
          <h2 className="text-xl font-bold text-[#2F2F2F] mb-4">
            Comparativa con períodos anteriores
          </h2>
          <p className="text-gray-500">Selecciona un niño para ver la comparativa</p>
        </div>
      )}
      */}
    </div>
  )
}
