"use client"

import { useState } from "react"
import { Download, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import SleepMetricsGrid from "@/components/child-profile/SleepMetricsGrid"
import SleepDurationChart from "@/components/sleep-statistics/SleepDurationChart"
import SleepConsistencyChart from "@/components/sleep-statistics/SleepConsistencyChart"
import NightWakeupsChart from "@/components/sleep-statistics/NightWakeupsChart"
import SleepDistributionChart from "@/components/sleep-statistics/SleepDistributionChart"
// import SleepComparison from "@/components/sleep-statistics/SleepComparison"
import { useActiveChild } from "@/context/active-child-context"
import { useToast } from "@/hooks/use-toast"

import { createLogger } from "@/lib/logger"

const logger = createLogger("SleepStatistics")

export default function SleepStatisticsPage() {
  const { activeChildId } = useActiveChild()
  const { toast } = useToast()
  const [dateRange, setDateRange] = useState("7-days")

  return (
    <div className="min-h-screen bg-[#F5F9FF] p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header con título y botones de acción */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-[#2F2F2F]">
            Estadísticas de Sueño
          </h1>
          
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline" 
              className="flex items-center space-x-2 text-gray-600 border-gray-300 hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
              <span>Exportar</span>
            </Button>
            <Button 
              variant="outline"
              className="flex items-center space-x-2 text-gray-600 border-gray-300 hover:bg-gray-50"
            >
              <Share2 className="w-4 h-4" />
              <span>Compartir</span>
            </Button>
          </div>
        </div>

        {/* Panel de Filtros - Solo Rango de Fechas */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#2F2F2F]">Período de análisis</h2>
            <div className="flex items-center space-x-2">
              <Button
                variant={dateRange === "7-days" ? "default" : "outline"}
                size="sm"
                onClick={() => setDateRange("7-days")}
                className={dateRange === "7-days" ? "hd-gradient-button text-white" : "text-gray-600"}
              >
                7 días
              </Button>
              <Button
                variant={dateRange === "30-days" ? "default" : "outline"}
                size="sm"
                onClick={() => setDateRange("30-days")}
                className={dateRange === "30-days" ? "hd-gradient-button text-white" : "text-gray-600"}
              >
                30 días
              </Button>
              <Button
                variant={dateRange === "90-days" ? "default" : "outline"}
                size="sm"
                onClick={() => setDateRange("90-days")}
                className={dateRange === "90-days" ? "hd-gradient-button text-white" : "text-gray-600"}
              >
                3 meses
              </Button>
            </div>
          </div>
        </div>

        {/* Métricas Principales */}
        {activeChildId ? (
          <SleepMetricsGrid childId={activeChildId} dateRange={dateRange} />
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
            <p className="text-gray-500">Por favor selecciona un niño desde el menú superior para ver las estadísticas</p>
          </div>
        )}

        {/* Gráficos Principales con datos reales */}
        {activeChildId ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Duración del sueño */}
              <SleepDurationChart childId={activeChildId} dateRange={dateRange} />

              {/* Consistencia de horarios */}
              <SleepConsistencyChart childId={activeChildId} dateRange={dateRange} />
            </div>

            {/* Segunda fila de gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Despertares nocturnos */}
              <NightWakeupsChart childId={activeChildId} dateRange={dateRange} />

              {/* Distribución del sueño */}
              <SleepDistributionChart childId={activeChildId} dateRange={dateRange} />
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
            <p className="text-gray-500">Selecciona un niño para ver los gráficos detallados</p>
          </div>
        )}

        {/* Placeholder para Análisis y Recomendaciones */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[#2F2F2F]">
              Análisis y recomendaciones
            </h2>
            <Button variant="outline" className="border-[#628BE6] text-[#628BE6] hover:hd-gradient-button hover:text-white hover:border-transparent">
              Ver todas
            </Button>
          </div>
          
          <div className="text-center py-8 text-gray-500">
            <p>Cards de análisis próximamente...</p>
          </div>
        </div>

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
    </div>
  )
}
